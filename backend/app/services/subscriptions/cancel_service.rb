module Subscriptions
  # Service for canceling subscriptions
  class CancelService
    def initialize(subscription)
      @subscription = subscription
    end

    def call(reason:, refund_unused: false)
      ActiveRecord::Base.transaction do
        # Calculate prorated refund if mid-cycle
        if refund_unused && @subscription.active?
          refund_amount = ::Payments::RefundService.new.process_proration(@subscription)
          
          if refund_amount > 0
            ::Payments::RefundService.new.process(
              subscription: @subscription,
              amount: refund_amount,
              reason: "Prorated refund: #{reason}",
              initiated_by: 'system'
            )
          end
        end

        # Cancel standing order in M-Pesa
        if @subscription.standing_order_id.present?
          ::Payments::StandingOrderService.new(@subscription).cancel
        end

        # Update subscription
        @subscription.update!(
          status: 'cancelled',
          cancelled_at: Time.current,
          cancellation_reason: reason
        )

        # Send confirmation
        ::NotificationService.send_cancellation_confirmation(@subscription)

        @subscription
      end
    rescue StandardError => e
      Rails.logger.error("Error canceling subscription: #{e.message}")
      raise
    end
  end
end

