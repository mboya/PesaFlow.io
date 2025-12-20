module Api
  module V1
    class SessionsController < Devise::SessionsController
      skip_before_action :verify_signed_out_user, only: [ :destroy ]
      before_action :configure_sign_in_params, only: [ :create ]
      prepend_before_action :verify_jwt_token, only: [ :destroy ]

      # POST /api/v1/login
      def create
        user_params = sign_in_params
        email = user_params[:email]
        password = user_params[:password]

        # Find user by email - use without_tenant to avoid scoping issues
        user = ActsAsTenant.without_tenant { User.find_by(email: email) }

        # Authenticate user
        if user && user.valid_password?(password)
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
            token = Warden::JWTAuth::UserEncoder.new.call(resource, :api_v1_user, nil).first
            response.set_header("Authorization", "Bearer #{token}")
            
            render json: {
              status: {
                code: 200,
                message: "Logged in successfully"
              },
              data: Api::V1::UserSerializer.serialize(resource)
            }, status: :ok
          end
        else
          # Invalid credentials
          render json: {
            status: {
              code: 401,
              message: "Invalid email or password"
            }
          }, status: :unauthorized
        end
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

      def configure_sign_in_params
        devise_parameter_sanitizer.permit(:sign_in, keys: [ :email, :password ])
      end

      def sign_in_params
        params.require(:user).permit(:email, :password)
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
