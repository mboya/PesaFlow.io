module Api
  module V1
    class RegistrationsController < Devise::RegistrationsController
      before_action :configure_sign_up_params, only: [ :create ]

      # POST /api/v1/signup
      def create
        # Get email from params before building resource (needed for tenant generation)
        email = sign_up_params[:email] rescue params.dig(:user, :email)

        # Find or create tenant for registration
        # If no tenant header is provided, a tenant will be auto-generated from the email
        tenant = find_tenant_for_registration(email)

        unless tenant
          return render json: {
            status: {
              code: 422,
              message: "Failed to create or find tenant for registration."
            }
          }, status: :unprocessable_entity
        end

        # Temporarily set current tenant for acts_as_tenant scoping
        # But we also set tenant_id directly on the resource
        ActsAsTenant.current_tenant = tenant

        build_resource(sign_up_params)

        # Assign tenant to user (set tenant_id directly to avoid association issues)
        # This must be done before validation so ensure_tenant callback doesn't override it
        resource.tenant_id = tenant.id

        # Ensure tenant_id is set before saving
        unless resource.tenant_id.present?
          Rails.logger.error("Failed to set tenant_id for user during registration")
          return render json: {
            status: {
              code: 422,
              message: "Failed to assign tenant to user."
            }
          }, status: :unprocessable_entity
        end

        # Save the resource - tenant_id is already set
        # Save within tenant context to ensure proper scoping during save
        resource.save
        if resource.persisted?
          # Reload to ensure tenant is persisted
          resource.reload

          # Verify tenant was saved
          unless resource.tenant_id.present?
            Rails.logger.error("User #{resource.id} was created without tenant_id")
          end
          # Create associated Customer record (1:1 relationship)
          create_customer_for_user(resource)

          if resource.active_for_authentication?
            # Sign in the user (session is null store, so no data is stored)
            sign_in(resource_name, resource)

            # Generate JWT token manually for the response header
            # This ensures the token is always set, even if middleware doesn't run in time
            token = Warden::JWTAuth::UserEncoder.new.call(resource, :api_v1_user, nil).first
            response.set_header("Authorization", "Bearer #{token}")

            # UserSerializer now includes tenant_subdomain automatically
            render json: {
              status: {
                code: 200,
                message: "Signed up successfully."
              },
              data: Api::V1::UserSerializer.serialize(resource)
            }, status: :ok
          else
            render json: {
              status: {
                code: 200,
                message: "Signed up but account is not active."
              },
              data: Api::V1::UserSerializer.serialize(resource)
            }, status: :ok
          end
        else
          clean_up_passwords resource
          set_minimum_password_length
          render json: {
            status: {
              code: 422,
              message: "User couldn't be created successfully."
            },
            errors: resource.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      protected

      def configure_sign_up_params
        devise_parameter_sanitizer.permit(:sign_up, keys: [ :email, :password ])
      end

      def sign_up_params
        params.require(:user).permit(:email, :password)
      end

      def find_tenant_for_registration(email = nil)
        Rails.logger.info("find_tenant_for_registration called with email: #{email}")
        Rails.logger.info("Tenant header (subdomain): #{request.headers[TenantScoped::TENANT_SUBDOMAIN_HEADER]}")
        Rails.logger.info("Tenant header (ID): #{request.headers[TenantScoped::TENANT_ID_HEADER]}")
        Rails.logger.info("Request subdomain: #{request.subdomain}")
        
        # Priority 1: Header-based identification (subdomain)
        if request.headers[TenantScoped::TENANT_SUBDOMAIN_HEADER].present?
          header_subdomain = request.headers[TenantScoped::TENANT_SUBDOMAIN_HEADER].downcase.strip
          tenant = ActsAsTenant.without_tenant do
            Tenant.find_by(subdomain: header_subdomain)
          end
          # If tenant exists and is active, use it
          return tenant if tenant&.active?
          # If tenant exists but is not active, return nil (error)
          return nil if tenant
          # If tenant doesn't exist and header was explicitly provided, return nil (error)
          # Don't auto-create from header - user must provide valid existing tenant
          return nil
        end

        # Priority 2: Header-based identification (ID)
        if request.headers[TenantScoped::TENANT_ID_HEADER].present?
          tenant = ActsAsTenant.without_tenant do
            Tenant.find_by(id: request.headers[TenantScoped::TENANT_ID_HEADER])
          end
          return nil unless tenant&.active?
          return tenant if tenant
        end

        # Priority 3: Subdomain-based identification
        if request.subdomain.present? && request.subdomain != "www" && request.subdomain != "api"
          tenant = ActsAsTenant.without_tenant do
            Tenant.active.find_by(subdomain: request.subdomain.downcase.strip)
          end
          return tenant if tenant.present?
        end

        # Priority 4: Use default tenant as fallback (don't auto-generate from email)
        # Auto-generation from email was removed - always use default tenant if no tenant specified
        begin
          default_tenant = ActsAsTenant.without_tenant do
            tenant = Tenant.find_by(subdomain: TenantScoped::DEFAULT_SUBDOMAIN)
            
            if tenant.nil?
              # Create new default tenant
              tenant = Tenant.create!(
                subdomain: TenantScoped::DEFAULT_SUBDOMAIN,
                name: "Default Tenant",
                status: "active",
                settings: {}
              )
              Rails.logger.info("Created default tenant: #{tenant.inspect}")
            else
              # Ensure existing default tenant is active
              if tenant.status != "active"
                tenant.update!(status: "active")
                Rails.logger.info("Updated default tenant status to active: #{tenant.inspect}")
              else
                Rails.logger.info("Found existing default tenant: #{tenant.inspect}")
              end
            end
            
            tenant
          end
          
          return default_tenant if default_tenant.present? && default_tenant.active?
        rescue ActiveRecord::RecordInvalid => e
          Rails.logger.error("Failed to create/update default tenant: #{e.message}")
          Rails.logger.error("Validation errors: #{e.record.errors.full_messages.join(', ')}")
        rescue StandardError => e
          Rails.logger.error("Unexpected error with default tenant: #{e.class.name}: #{e.message}")
          Rails.logger.error(e.backtrace.join("\n"))
        end

        Rails.logger.error("find_tenant_for_registration returning nil - no tenant found or created")
        nil
      end

      def create_customer_for_user(user)
        # Generate a name from email (e.g., "john.doe@example.com" -> "John Doe")
        name = user.email.split("@").first.split(/[._]/).map(&:capitalize).join(" ")
        name = user.email if name.blank? # Fallback to email if name generation fails

        Customer.create!(
          user: user,
          tenant: user.tenant,
          name: name,
          email: user.email,
          phone_number: nil, # Can be added later by the user
          status: "active"
        )
      rescue StandardError => e
        # Log error but don't fail signup if customer creation fails
        Rails.logger.error("Failed to create customer for user #{user.id}: #{e.message}")
        Rails.logger.error(e.backtrace.join("\n"))
      end
    end
  end
end
