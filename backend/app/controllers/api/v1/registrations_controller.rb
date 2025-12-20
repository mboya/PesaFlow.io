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
        # Use without_tenant when querying Tenant model since Tenant itself is not tenant-scoped
        # Priority 1: Header-based identification (X-Tenant-Subdomain)
        if request.headers['X-Tenant-Subdomain'].present?
          tenant = ActsAsTenant.without_tenant do
            Tenant.find_by(subdomain: request.headers['X-Tenant-Subdomain'].downcase.strip)
          end
          # If header provided but tenant not found, return nil (error)
          return nil unless tenant.present?
          # If tenant is not active (suspended/cancelled), return nil (will be handled by TenantScoped)
          return nil unless tenant.active?
          return tenant
        end

        # Priority 2: Header-based identification (X-Tenant-ID)
        if request.headers['X-Tenant-ID'].present?
          tenant = ActsAsTenant.without_tenant do
            Tenant.find_by(id: request.headers['X-Tenant-ID'])
          end
          # If header provided but tenant not found, return nil (error)
          return nil unless tenant.present?
          # If tenant is not active (suspended/cancelled), return nil
          return nil unless tenant.active?
          return tenant
        end

        # Priority 3: Subdomain-based identification
        if request.subdomain.present? && request.subdomain != 'www' && request.subdomain != 'api'
          tenant = ActsAsTenant.without_tenant do
            Tenant.active.find_by(subdomain: request.subdomain.downcase.strip)
          end
          return tenant if tenant.present?
        end

        # Priority 4: Auto-generate tenant from email if no tenant specified
        # This creates a new tenant for the user automatically
        if email.present?
          subdomain = Tenant.generate_unique_subdomain_from_email(email)
          if subdomain.present?
            tenant = ActsAsTenant.without_tenant do
              Tenant.create!(
                subdomain: subdomain,
                name: subdomain.humanize, # Convert "john-doe-example" to "John Doe Example"
                status: 'active',
                settings: {}
              )
            end
            Rails.logger.info("Auto-created tenant '#{subdomain}' for email '#{email}'")
            return tenant if tenant.present?
          end
        end

        # Priority 5: Use default tenant as fallback
        # Always ensure default tenant exists (create if missing)
        default_tenant = ActsAsTenant.without_tenant do
          Tenant.find_or_create_by!(subdomain: 'default') do |t|
            t.name = 'Default Tenant'
            t.status = 'active'
            t.settings = {}
          end
        end
        return default_tenant if default_tenant.present?

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
