module Subscriptions
  # Service for upgrading subscriptions
  class UpgradeService
    def initialize(subscription)
      @subscription = subscription
    end

    def call(new_plan)
      ActiveRecord::Base.transaction do
        old_amount = @subscription.plan_amount
        old_name = @subscription.plan_name

        # Validate upgrade
        if new_plan.amount <= old_amount
          raise "New plan amount must be higher than current plan"
        end

        # Calculate prorated charges
        days_remaining = (@subscription.current_period_end - Date.current).to_i
        total_days = (@subscription.current_period_end - @subscription.current_period_start).to_i
        total_days = 1 if total_days <= 0 # Prevent division by zero

        # Credit for unused time on old plan
        credit = (old_amount.to_f / total_days) * days_remaining

        # Charge for new plan (prorated)
        new_charge = (new_plan.amount.to_f / total_days) * days_remaining

        difference = new_charge - credit

        if difference > 0
          # Customer owes money - charge via STK Push
          ::Payments::StkPushService.new(@subscription).initiate(
            payment_type: 'upgrade',
            amount: difference,
            description: "Upgrade charge: #{old_name} -> #{new_plan.name}"
          )
        elsif difference < 0
          # Customer gets credit - store for next billing
          @subscription.update!(account_credit: difference.abs)
        end

        # Update standing order with new amount
        if @subscription.standing_order_id.present?
          ::Payments::StandingOrderService.new(@subscription).update_amount(new_plan.amount)
        end

        # Update subscription and snapshot fields
        @subscription.update!(
          plan: new_plan,
          amount: new_plan.amount,
          plan_name: new_plan.name,
          plan_amount: new_plan.amount,
          plan_currency: new_plan.currency,
          plan_billing_frequency: new_plan.billing_frequency,
          plan_billing_cycle_days: new_plan.billing_cycle_days,
          plan_trial_days: new_plan.trial_days,
          plan_has_trial: new_plan.has_trial?,
          plan_features: new_plan.features || {}
        )

        # Send notification
        ::NotificationService.send_upgrade_confirmation(@subscription, old_name, new_plan)

        @subscription
      end
    rescue StandardError => e
      Rails.logger.error("Error upgrading subscription: #{e.message}")
      raise
    end
  end
end

