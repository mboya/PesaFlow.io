module Subscriptions
  # Service for upgrading subscriptions
  class UpgradeService
    def initialize(subscription)
      @subscription = subscription
    end

    def call(new_plan)
      ActiveRecord::Base.transaction do
        old_plan = @subscription.plan

        # Validate upgrade
        if new_plan.amount <= old_plan.amount
          raise "New plan amount must be higher than current plan"
        end

        # Calculate prorated charges
        days_remaining = (@subscription.current_period_end - Date.current).to_i
        total_days = (@subscription.current_period_end - @subscription.current_period_start).to_i

        # Credit for unused time on old plan
        credit = (old_plan.amount.to_f / total_days) * days_remaining

        # Charge for new plan (prorated)
        new_charge = (new_plan.amount.to_f / total_days) * days_remaining

        difference = new_charge - credit

        if difference > 0
          # Customer owes money - charge via STK Push
          Payments::StkPushService.new(@subscription).initiate(
            payment_type: 'upgrade',
            amount: difference,
            description: "Upgrade charge: #{old_plan.name} -> #{new_plan.name}"
          )
        elsif difference < 0
          # Customer gets credit - store for next billing
          @subscription.update!(account_credit: difference.abs)
        end

        # Update standing order with new amount
        if @subscription.standing_order_id.present?
          Payments::StandingOrderService.new(@subscription).update_amount(new_plan.amount)
        end

        # Update subscription
        @subscription.update!(
          plan: new_plan,
          amount: new_plan.amount
        )

        # Send notification
        NotificationService.send_upgrade_confirmation(@subscription, old_plan, new_plan)

        @subscription
      end
    rescue StandardError => e
      Rails.logger.error("Error upgrading subscription: #{e.message}")
      raise
    end
  end
end

