module Api
  module V1
    class RegistrationsController < Devise::RegistrationsController
      before_action :configure_sign_up_params, only: [ :create ]

      # POST /api/v1/signup
      def create
        build_resource(sign_up_params)

        resource.save
        if resource.persisted?
          if resource.active_for_authentication?
            # Sign in the user (session is null store, so no data is stored)
            # devise-jwt will automatically generate JWT token in response headers
            sign_in(resource_name, resource)
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
    end
  end
end
