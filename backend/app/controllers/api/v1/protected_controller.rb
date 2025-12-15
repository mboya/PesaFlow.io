module Api
  module V1
    class ProtectedController < ApplicationController
      before_action :authenticate_api_v1_user!

      # GET /api/v1/protected
      def index
        render json: {
          status: {
            code: 200,
            message: "Access granted"
          },
          data: {
            message: "This is a protected endpoint",
            user: Api::V1::UserSerializer.serialize(current_api_v1_user)
          }
        }, status: :ok
      end
    end
  end
end
