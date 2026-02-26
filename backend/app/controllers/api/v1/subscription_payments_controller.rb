module Api
  module V1
    class SubscriptionPaymentsController < ApplicationController
      before_action :authenticate_api_v1_user!
      before_action :set_subscription

      # GET /api/v1/subscriptions/:subscription_id/payments
      def index
        authorize_subscription!
        return if performed?

        @payments = @subscription.payments.order(paid_at: :desc, created_at: :desc)

        render_enveloped(
          resource: Api::V1::PaymentSerializer.render_as_hash(@payments),
          status_code: 200,
          message: "Payments retrieved successfully"
        )
      end

      private

      def set_subscription
        @subscription = Subscription.find(params[:subscription_id])
      end

      def authorize_subscription!
        customer = current_user_customer
        unless customer && @subscription.customer == customer
          render_enveloped_error(
            status_code: 403,
            message: "Forbidden",
            error_code: "forbidden",
            http_status: :forbidden
          )
          nil
        end
      end
    end
  end
end
