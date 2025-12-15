module Api
  module V1
    class SessionsController < Devise::SessionsController
      before_action :configure_sign_in_params, only: [ :create ]

      # POST /api/v1/login
      def create
        self.resource = warden.authenticate!(auth_options)

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
          render json: {
            status: {
              code: 200,
              message: "Logged in successfully"
            },
            data: Api::V1::UserSerializer.serialize(resource)
          }, status: :ok
        end
      end

      # DELETE /api/v1/logout
      def destroy
        signed_out = (Devise.sign_out_all_scopes ? sign_out : sign_out(resource_name))

        if signed_out
          render json: {
            status: {
              code: 200,
              message: "Logged out successfully"
            }
          }, status: :ok
        else
          render json: {
            status: {
              code: 401,
              message: "User not authenticated"
            }
          }, status: :unauthorized
        end
      end

      protected

      def configure_sign_in_params
        devise_parameter_sanitizer.permit(:sign_in, keys: [ :email, :password ])
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
    end
  end
end
