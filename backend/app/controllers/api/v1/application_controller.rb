module Api
  module V1
    class ApplicationController < ::ApplicationController
      include Transactional

      before_action :authenticate_api_v1_user!

      protected

      def current_user
        current_api_v1_user
      end

      # Find customer associated with current user (by user_id or email)
      def current_user_customer
        @current_user_customer ||= Customer.find_by(user_id: current_user.id) ||
                                   Customer.find_by(email: current_user.email)
      end
    end
  end
end
