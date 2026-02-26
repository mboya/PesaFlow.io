module Api
  module V1
    class UsersController < ApplicationController
      before_action :authenticate_api_v1_user!

      # GET /api/v1/current_user
      def show_current
        # Ensure we get the user without tenant scoping to avoid issues with header-based tenant
        authenticated_user = current_api_v1_user
        unless authenticated_user
          render_enveloped_error(
            status_code: 401,
            message: "Unauthorized",
            error_code: "unauthorized",
            http_status: :unauthorized
          )
          return
        end

        user = ActsAsTenant.without_tenant { User.find_by(id: authenticated_user.id) }
        render_enveloped(
          resource: Api::V1::UserSerializer.serialize(user),
          status_code: 200,
          message: "User retrieved successfully"
        )
      end
    end
  end
end
