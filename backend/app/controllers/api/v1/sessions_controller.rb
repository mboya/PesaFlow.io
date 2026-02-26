module Api
  module V1
    class SessionsController < Devise::SessionsController
      skip_before_action :verify_signed_out_user, only: [ :destroy ]
      before_action :configure_sign_in_params, only: [ :create ]
      prepend_before_action :ensure_devise_mapping_for_google, only: [ :google ]
      prepend_before_action :verify_jwt_token, only: [ :destroy ]
      around_action :audit_auth_request, only: [ :create, :google, :destroy ]

      # POST /api/v1/login
      def create
        user_params = sign_in_params
        email = user_params[:email]
        password = user_params[:password]

        # Normalize email (lowercase and strip whitespace)
        normalized_email = email&.downcase&.strip
        masked_email = Security::PiiMasker.mask_email(normalized_email)

        tenant = resolve_authentication_tenant
        user = find_user_for_authentication(normalized_email, tenant)
        password_valid = user&.valid_password?(password)

        # Log authentication attempt (without sensitive data)
        Rails.logger.info(
          "[Login] Attempting login for email: #{masked_email}, Tenant: #{tenant&.subdomain || "none"}, " \
          "User found: #{user.present?}, Has encrypted_password: #{user&.encrypted_password.present?}"
        )

        # Authenticate user
        if user && password_valid
          self.resource = user

          if resource.otp_enabled?
            return render_otp_required_response(resource)
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
            Rails.logger.warn("[Login] User not found for email: #{masked_email}")
          elsif !password_valid
            Rails.logger.warn("[Login] Invalid password for user: #{user.id} (#{masked_email})")
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
          capture_google_login_message(
            "Google login rejected: missing credential",
            level: :warning,
            extra: { failure_reason: "missing_credential" }
          )
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
          capture_google_login_message(
            "Google login misconfigured: client id missing",
            level: :error,
            extra: { failure_reason: "missing_google_client_id" }
          )
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
          Rails.logger.warn("[Google Login] Invalid credential: #{Security::PiiMasker.mask_free_text(e.message)}")
          capture_google_login_exception(
            e,
            level: :warning,
            extra: { failure_reason: "invalid_google_credential" }
          )
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
          capture_google_login_message(
            "Google login rejected: email or tenant could not be resolved",
            level: :warning,
            extra: {
              failure_reason: "missing_email_or_tenant",
              resolved_email: normalized_email.present?,
              resolved_tenant: tenant.present?
            }
          )
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
          capture_google_login_message(
            "Google login failed: user creation or lookup returned nil",
            level: :error,
            extra: {
              failure_reason: "user_resolution_failed",
              tenant_id: tenant.id
            }
          )
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
          return render_otp_required_response(resource)
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
      rescue StandardError => e
        Rails.logger.error("[Google Login] Unexpected error: #{Security::PiiMasker.mask_free_text(e.message)}")
        capture_google_login_exception(
          e,
          level: :error,
          extra: { failure_reason: "unexpected_error" }
        )

        render json: {
          status: {
            code: 500,
            message: "Unable to complete Google login"
          }
        }, status: :internal_server_error
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

      def render_otp_required_response(user)
        otp_code = user.generate_email_login_otp!
        UserMailer.login_otp_email(user, otp_code).deliver_now

        render json: {
          status: {
            code: 200,
            message: "OTP verification required"
          },
          otp_required: true,
          user_id: user.id
        }, status: :ok
      rescue StandardError => e
        masked_email = Security::PiiMasker.mask_email(user&.email)
        Rails.logger.error(
          "[Login OTP] Failed to issue email OTP for user #{user&.id} (#{masked_email}): " \
          "#{Security::PiiMasker.mask_free_text(e.message)}"
        )

        render json: {
          status: {
            code: 503,
            message: "Unable to deliver OTP code. Please try again."
          }
        }, status: :service_unavailable
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
          masked_email = Security::PiiMasker.mask_email(normalized_email)
          masked_errors = Security::PiiMasker.mask_free_text(user.errors.full_messages.join(", "))
          Rails.logger.warn("[Google Login] Failed creating user #{masked_email}: #{masked_errors}")
          capture_google_login_message(
            "Google login user creation failed validation",
            level: :warning,
            extra: {
              failure_reason: "user_validation_failed",
              tenant_id: tenant.id,
              validation_errors: user.errors.full_messages
            }
          )
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
          tenant = Tenant.find_or_initialize_by(subdomain: TenantScoped::DEFAULT_SUBDOMAIN)

          if tenant.new_record?
            tenant.name = "Default Tenant"
            tenant.status = "active"
            tenant.settings = {}
            tenant.save!
          elsif !tenant.active?
            tenant.update!(status: "active")
          end

          tenant
        end
      rescue StandardError => e
        Rails.logger.error("[Login] Failed to resolve default tenant: #{Security::PiiMasker.mask_free_text(e.message)}")
        nil
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
        Rails.logger.error("Failed to create customer for user #{user.id}: #{Security::PiiMasker.mask_free_text(e.message)}")
        capture_google_login_exception(
          e,
          level: :warning,
          extra: {
            failure_reason: "customer_creation_failed",
            user_id: user.id
          }
        )
      end

      def send_signup_welcome_email(user)
        return unless user.email.present?

        UserMailer.welcome_email(user).deliver_later
      rescue StandardError => e
        Rails.logger.error("Failed to queue welcome email for user #{user.id}: #{Security::PiiMasker.mask_free_text(e.message)}")
        capture_google_login_exception(
          e,
          level: :warning,
          extra: {
            failure_reason: "welcome_email_enqueue_failed",
            user_id: user.id
          }
        )
      end

      def sentry_available?
        defined?(Sentry) &&
          Sentry.respond_to?(:capture_message) &&
          Sentry.respond_to?(:capture_exception) &&
          Sentry.respond_to?(:with_scope)
      end

      def capture_google_login_message(message, level: :warning, extra: {})
        return unless sentry_available?

        Sentry.with_scope do |scope|
          scope.set_tags(auth_flow: "google_login", controller: self.class.name)
          scope.set_level(level)
          scope.set_context("google_login", sentry_google_login_context.merge(extra))
          Sentry.capture_message(message)
        end
      rescue StandardError => e
        Rails.logger.warn("[Google Login] Failed to send Sentry message: #{Security::PiiMasker.mask_free_text(e.message)}")
      end

      def capture_google_login_exception(exception, level: :error, extra: {})
        return unless sentry_available?

        Sentry.with_scope do |scope|
          scope.set_tags(auth_flow: "google_login", controller: self.class.name)
          scope.set_level(level)
          scope.set_context("google_login", sentry_google_login_context.merge(extra))
          Sentry.capture_exception(exception)
        end
      rescue StandardError => e
        Rails.logger.warn("[Google Login] Failed to send Sentry exception: #{Security::PiiMasker.mask_free_text(e.message)}")
      end

      def sentry_google_login_context
        {
          request_id: request.request_id,
          path: request.fullpath,
          tenant_subdomain_header: request.headers[TenantScoped::TENANT_SUBDOMAIN_HEADER],
          tenant_id_header: request.headers[TenantScoped::TENANT_ID_HEADER],
          user_agent: request.user_agent
        }.compact
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

      def audit_auth_request
        started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        yield
      ensure
        duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000).round(1)
        masked_email = Security::PiiMasker.mask_email(params.dig(:user, :email) || params[:email])

        Security::AuditLogger.log!(
          action: "auth.#{action_name}",
          status: Security::AuditLogger.status_from_response(response&.status),
          actor: current_api_v1_user,
          tenant: ActsAsTenant.current_tenant,
          request: request,
          response_status: response&.status,
          metadata: {
            auth_flow: action_name,
            email: masked_email,
            duration_ms: duration_ms
          }
        )
      end
    end
  end
end
