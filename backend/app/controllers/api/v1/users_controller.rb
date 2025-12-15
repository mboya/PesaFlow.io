module Api
  module V1
    class UsersController < ApplicationController
      before_action :authenticate_api_v1_user!

      # GET /api/v1/current_user
      def current_user
        render json: {
          status: {
            code: 200,
            message: "User retrieved successfully"
          },
          data: Api::V1::UserSerializer.serialize(current_api_v1_user)
        }, status: :ok
      end
    end
  end
end
