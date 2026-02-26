module Api
  module V1
    class ProtectedController < ApplicationController
      before_action :authenticate_api_v1_user!

      # GET /api/v1/protected
      def index
        render_enveloped(
          resource: {
            message: "This is a protected endpoint",
            user: Api::V1::UserSerializer.serialize(current_api_v1_user)
          },
          status_code: 200,
          message: "Access granted"
        )
      end
    end
  end
end
