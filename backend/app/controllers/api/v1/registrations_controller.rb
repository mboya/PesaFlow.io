module Api
  module V1
    class RegistrationsController < Devise::RegistrationsController
      before_action :configure_sign_up_params, only: [ :create ]
      around_action :audit_signup_request, only: [ :create ]

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
              message: "Failed to resolve an active tenant for registration."
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

        # Log password presence before save (for debugging)
        masked_email = Security::PiiMasker.mask_email(resource.email)
        Rails.logger.info("[Signup] User email: #{masked_email}, Password present: #{resource.password.present?}, Encrypted password present: #{resource.encrypted_password.present?}")

        # Save the resource - tenant_id is already set
        # Save within tenant context to ensure proper scoping during save
        resource.save

        # Log after save to verify password was encrypted
        if resource.persisted?
          Rails.logger.info("[Signup] User saved successfully. ID: #{resource.id}, Encrypted password present: #{resource.encrypted_password.present?}")
        else
          masked_errors = Security::PiiMasker.mask_free_text(resource.errors.full_messages.join(", "))
          Rails.logger.error("[Signup] User save failed. Errors: #{masked_errors}")
        end
        if resource.persisted?
          # Reload to ensure tenant is persisted
          resource.reload

          # Verify tenant was saved
          unless resource.tenant_id.present?
            Rails.logger.error("User #{resource.id} was created without tenant_id")
          end
          # Create associated Customer record (1:1 relationship)
          Users::OnboardingService.ensure_customer(resource)
          Users::OnboardingService.send_welcome_email(resource)

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
              data: Api::V1::UserSerializer.serialize(resource),
              token: token  # Include token in response body as fallback (for proxies that strip headers)
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
        devise_parameter_sanitizer.permit(:sign_up, keys: [ :email, :password, :password_confirmation ])
      end

      def sign_up_params
        params.require(:user).permit(:email, :password, :password_confirmation)
      end

      def find_tenant_for_registration(email = nil)
        masked_email = Security::PiiMasker.mask_email(email)
        Rails.logger.info("find_tenant_for_registration called with email: #{masked_email}")
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

        # Priority 4: Use existing active default tenant as fallback.
        begin
          default_tenant = ActsAsTenant.without_tenant do
            Tenant.active.find_by(subdomain: TenantScoped::DEFAULT_SUBDOMAIN)
          end
          return default_tenant if default_tenant.present?
        rescue StandardError => e
          Rails.logger.error("Unexpected error while resolving default tenant: #{e.class.name}: #{Security::PiiMasker.mask_free_text(e.message)}")
          Rails.logger.error(e.backtrace.join("\n"))
        end

        Rails.logger.error("find_tenant_for_registration returning nil - no active tenant found")
        nil
      end

      def audit_signup_request
        started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        yield
      ensure
        duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000).round(1)
        masked_email = Security::PiiMasker.mask_email(params.dig(:user, :email))

        Security::AuditLogger.log!(
          action: "auth.signup",
          status: Security::AuditLogger.status_from_response(response&.status),
          actor: current_api_v1_user,
          tenant: ActsAsTenant.current_tenant,
          request: request,
          response_status: response&.status,
          metadata: {
            email: masked_email,
            duration_ms: duration_ms
          }
        )
      end
    end
  end
end
