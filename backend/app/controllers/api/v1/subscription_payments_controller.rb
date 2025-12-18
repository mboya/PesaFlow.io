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
        
        render json: Api::V1::PaymentSerializer.render(@payments)
      end

      private

      def set_subscription
        @subscription = Subscription.find(params[:subscription_id])
      end

      def authorize_subscription!
        customer = current_user_customer
        unless customer && @subscription.customer == customer
          render json: { error: 'Unauthorized' }, status: :unauthorized
          return
        end
      end
    end
  end
end

