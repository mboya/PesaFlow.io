module Subscriptions
  # Service for downgrading subscriptions
  class DowngradeService
    def initialize(subscription)
      @subscription = subscription
    end

    def call(new_plan)
      ActiveRecord::Base.transaction do
        old_plan = @subscription.plan

        # Validate downgrade
        if new_plan.amount >= old_plan.amount
          raise "New plan amount must be lower than current plan"
        end

        # Downgrade takes effect at next billing cycle
        # Update standing order for next period
        if @subscription.standing_order_id.present?
          # Cancel current standing order
          Payments::StandingOrderService.new(@subscription).cancel
          
          # Create new one starting at next billing date
          @subscription.update!(plan: new_plan, amount: new_plan.amount)
          Payments::StandingOrderService.new(@subscription).create
        else
          @subscription.update!(plan: new_plan, amount: new_plan.amount)
        end

        # Send notification
        NotificationService.send_downgrade_confirmation(@subscription, old_plan, new_plan)

        @subscription
      end
    rescue StandardError => e
      Rails.logger.error("Error downgrading subscription: #{e.message}")
      raise
    end
  end
end

