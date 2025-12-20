module Api
  module V1
    class UsersController < ApplicationController
      before_action :authenticate_api_v1_user!

      # GET /api/v1/current_user
      def current_user
        # Ensure we get the user without tenant scoping to avoid issues with header-based tenant
        user = ActsAsTenant.without_tenant { User.find_by(id: current_api_v1_user.id) }
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
