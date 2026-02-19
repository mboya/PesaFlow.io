module Api
  module V1
    class SessionsController < Devise::SessionsController
      skip_before_action :verify_signed_out_user, only: [ :destroy ]
      before_action :configure_sign_in_params, only: [ :create ]
      prepend_before_action :ensure_devise_mapping_for_google, only: [ :google ]
      prepend_before_action :verify_jwt_token, only: [ :destroy ]

      # POST /api/v1/login
      def create
        user_params = sign_in_params
        email = user_params[:email]
        password = user_params[:password]

        # Normalize email (lowercase and strip whitespace)
        normalized_email = email&.downcase&.strip

        tenant = resolve_authentication_tenant
        user = find_user_for_authentication(normalized_email, tenant)
        password_valid = user&.valid_password?(password)

        # Log authentication attempt (without sensitive data)
        Rails.logger.info(
          "[Login] Attempting login for email: #{normalized_email}, Tenant: #{tenant&.subdomain || "none"}, " \
          "User found: #{user.present?}, Has encrypted_password: #{user&.encrypted_password.present?}"
        )

        # Authenticate user
        if user && password_valid
          self.resource = user

          if resource.otp_enabled?
            # User has OTP enabled, require OTP verification before issuing JWT
            render json: {
              status: {
                code: 200,
                message: "OTP verification required"
              },
              otp_required: true,
              user_id: resource.id
            }, status: :ok
          else
            # User doesn't have OTP, issue JWT token immediately
            sign_in(resource_name, resource)

            # Generate JWT token manually for the response header
            # This ensures the token is always set, even if middleware doesn't run in time
            token = issue_jwt_token(resource)
            response.set_header("Authorization", "Bearer #{token}")

            render json: {
              status: {
                code: 200,
                message: "Logged in successfully"
              },
              data: Api::V1::UserSerializer.serialize(resource),
              token: token  # Include token in response body as fallback (for proxies that strip headers)
            }, status: :ok
          end
        else
          # Invalid credentials - log reason for debugging
          if user.nil?
            Rails.logger.warn("[Login] User not found for email: #{normalized_email}")
          elsif !password_valid
            Rails.logger.warn("[Login] Invalid password for user: #{user.id} (#{normalized_email})")
          end

          # Invalid credentials
          render json: {
            status: {
              code: 401,
              message: "Invalid email or password"
            }
          }, status: :unauthorized
        end
      end

      # POST /api/v1/google_login
      def google
        credential = google_sign_in_params[:credential]
        unless credential.present?
          render json: {
            status: {
              code: 401,
              message: "Google credential is required"
            }
          }, status: :unauthorized
          return
        end

        google_client_id = ENV["GOOGLE_CLIENT_ID"].presence || ENV["NEXT_PUBLIC_GOOGLE_CLIENT_ID"].presence
        unless google_client_id.present?
          Rails.logger.error("[Google Login] GOOGLE_CLIENT_ID is not configured")
          render json: {
            status: {
              code: 503,
              message: "Google login is not configured"
            }
          }, status: :service_unavailable
          return
        end

        begin
          payload = GoogleIdTokenVerifier.verify!(credential, audience: google_client_id)
        rescue GoogleIdTokenVerifier::VerificationError => e
          Rails.logger.warn("[Google Login] Invalid credential: #{e.message}")
          render json: {
            status: {
              code: 401,
              message: "Invalid Google credential"
            }
          }, status: :unauthorized
          return
        end

        normalized_email = payload["email"]&.downcase&.strip
        tenant = resolve_authentication_tenant

        if normalized_email.blank? || tenant.blank?
          render json: {
            status: {
              code: 401,
              message: "Unable to authenticate Google user"
            }
          }, status: :unauthorized
          return
        end

        user, created = find_or_create_google_user(normalized_email, tenant)
        unless user.present?
          render json: {
            status: {
              code: 422,
              message: "Unable to complete Google login"
            }
          }, status: :unprocessable_entity
          return
        end

        self.resource = user

        if resource.otp_enabled?
          render json: {
            status: {
              code: 200,
              message: "OTP verification required"
            },
            otp_required: true,
            user_id: resource.id
          }, status: :ok
          return
        end

        sign_in(resource_name, resource)
        token = issue_jwt_token(resource)
        response.set_header("Authorization", "Bearer #{token}")

        render json: {
          status: {
            code: 200,
            message: created ? "Signed in with Google successfully" : "Logged in successfully"
          },
          data: Api::V1::UserSerializer.serialize(resource),
          token: token
        }, status: :ok
      end

      # DELETE /api/v1/logout
      def destroy
        # Token validation is done in before_action :verify_jwt_token
        # If verify_jwt_token already rendered (401/unauthorized), the response is already set
        # In that case, we should not continue with logout
        if performed?
          # Response already rendered by verify_jwt_token (likely 401)
          return
        end

        # Only proceed if token is valid and not revoked
        signed_out = (Devise.sign_out_all_scopes ? sign_out : sign_out(resource_name))

        render json: {
          status: {
            code: 200,
            message: "Logged out successfully"
          }
        }, status: :ok
      end

      protected

      def ensure_devise_mapping_for_google
        request.env["devise.mapping"] = Devise.mappings[:api_v1_user] || Devise.mappings[:user]
      end

      def configure_sign_in_params
        devise_parameter_sanitizer.permit(:sign_in, keys: [ :email, :password ])
      end

      def sign_in_params
        params.require(:user).permit(:email, :password)
      end

      def google_sign_in_params
        params.permit(:credential)
      end

      def resolve_authentication_tenant
        # Explicit tenant header always wins for authentication.
        if request.headers[TenantScoped::TENANT_SUBDOMAIN_HEADER].present?
          return find_active_tenant_by_subdomain(request.headers[TenantScoped::TENANT_SUBDOMAIN_HEADER])
        end

        if request.headers[TenantScoped::TENANT_ID_HEADER].present?
          return find_active_tenant_by_id(request.headers[TenantScoped::TENANT_ID_HEADER])
        end

        # Fallback to request subdomain.
        request_subdomain = request.subdomain&.downcase&.strip
        if request_subdomain.present? && request_subdomain != "www" && request_subdomain != "api"
          tenant = find_active_tenant_by_subdomain(request_subdomain)
          return tenant if tenant.present?
        end

        # Final fallback for auth endpoints is the default tenant.
        default_tenant
      end

      def find_user_for_authentication(normalized_email, tenant)
        return nil if normalized_email.blank? || tenant.blank?

        ActsAsTenant.without_tenant do
          User.where("LOWER(email) = ?", normalized_email).find_by(tenant_id: tenant.id)
        end
      end

      def find_or_create_google_user(normalized_email, tenant)
        existing_user = find_user_for_authentication(normalized_email, tenant)
        return [ existing_user, false ] if existing_user.present?

        generated_password = Devise.friendly_token.first(32)
        user = ActsAsTenant.without_tenant do
          User.new(
            email: normalized_email,
            password: generated_password,
            password_confirmation: generated_password,
            tenant_id: tenant.id
          )
        end

        saved = ActsAsTenant.without_tenant { user.save }
        unless saved
          Rails.logger.warn("[Google Login] Failed creating user #{normalized_email}: #{user.errors.full_messages.join(', ')}")
          return [ nil, false ]
        end

        create_customer_for_user(user)
        send_signup_welcome_email(user)
        [ user, true ]
      end

      def find_active_tenant_by_subdomain(subdomain)
        normalized_subdomain = subdomain.to_s.downcase.strip
        return nil if normalized_subdomain.blank?

        ActsAsTenant.without_tenant do
          Tenant.active.find_by(subdomain: normalized_subdomain)
        end
      end

      def find_active_tenant_by_id(tenant_id)
        return nil if tenant_id.blank?

        ActsAsTenant.without_tenant do
          Tenant.active.find_by(id: tenant_id)
        end
      end

      def default_tenant
        ActsAsTenant.without_tenant do
          Tenant.active.find_by(subdomain: TenantScoped::DEFAULT_SUBDOMAIN)
        end
      end

      def issue_jwt_token(user)
        Warden::JWTAuth::UserEncoder.new.call(user, :api_v1_user, nil).first
      end

      def create_customer_for_user(user)
        return if ActsAsTenant.without_tenant { Customer.exists?(user_id: user.id) }

        name = user.email.split("@").first.split(/[._]/).map(&:capitalize).join(" ")
        name = user.email if name.blank?

        Customer.create!(
          user: user,
          tenant: user.tenant,
          name: name,
          email: user.email,
          phone_number: nil,
          status: "active"
        )
      rescue StandardError => e
        Rails.logger.error("Failed to create customer for user #{user.id}: #{e.message}")
      end

      def send_signup_welcome_email(user)
        return unless user.email.present?

        UserMailer.welcome_email(user).deliver_later
      rescue StandardError => e
        Rails.logger.error("Failed to queue welcome email for user #{user.id}: #{e.message}")
      end

      def respond_with(resource, _opts = {})
        # This method is called by Devise but we override create/destroy
        # so this is just a fallback
        render json: {
          status: {
            code: 200,
            message: "Signed in successfully"
          },
          data: Api::V1::UserSerializer.serialize(resource)
        }, status: :ok
      end

      def respond_to_on_destroy
        # This method is called by Devise but we override destroy
        # so this is just a fallback
        render json: {
          status: {
            code: 200,
            message: "Logged out successfully"
          }
        }, status: :ok
      end

      def verify_jwt_token
        # Check for valid JWT token before allowing logout
        token = request.headers["Authorization"]&.split(" ")&.last

        unless token.present?
          render json: {
            status: {
              code: 401,
              message: "No token provided"
            }
          }, status: :unauthorized
          return false
        end

        # Check if token is in denylist (already revoked)
        # This runs before Devise JWT's revocation middleware
        begin
          jwt_secret = ENV.fetch("DEVISE_JWT_SECRET_KEY") { Rails.application.credentials.devise_jwt_secret_key || Rails.application.secret_key_base }
          decoded = JWT.decode(token, jwt_secret, true, algorithm: "HS256")
          jti = decoded[0]["jti"]

          # JwtDenylist is not tenant-scoped, so query without tenant context
          if ActsAsTenant.without_tenant { JwtDenylist.exists?(jti: jti) }
            # Token is already revoked - return 401 and stop processing
            # This prevents Devise JWT's revocation middleware from trying to revoke it again
            render json: {
              status: {
                code: 401,
                message: "Token has been revoked"
              }
            }, status: :unauthorized
            return false
          end
        rescue JWT::DecodeError, JWT::ExpiredSignature => e
          render json: {
            status: {
              code: 401,
              message: "Invalid or expired token"
            }
          }, status: :unauthorized
          return false
        rescue => e
          # If token decode fails for any reason, return 401
          render json: {
            status: {
              code: 401,
              message: "Invalid token"
            }
          }, status: :unauthorized
          return false
        end

        true
      end
    end
  end
end
