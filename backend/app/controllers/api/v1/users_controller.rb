module Api
  module V1
    class UsersController < ApplicationController
      before_action :authenticate_api_v1_user!

      # GET /api/v1/current_user
      def show_current
        # Ensure we get the user without tenant scoping to avoid issues with header-based tenant
        authenticated_user = current_api_v1_user
        unless authenticated_user
          render json: {
            status: {
              code: 401,
              message: "Unauthorized"
            }
          }, status: :unauthorized
          return
        end

        user = ActsAsTenant.without_tenant { User.find_by(id: authenticated_user.id) }
        render json: {
          status: {
            code: 200,
            message: "User retrieved successfully"
          },
          data: Api::V1::UserSerializer.serialize(user)
        }, status: :ok
      end
    end
  end
end
