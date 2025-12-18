module Subscriptions
  # Service for downgrading subscriptions
  class DowngradeService
    def initialize(subscription)
      @subscription = subscription
    end

    def call(new_plan)
      ActiveRecord::Base.transaction do
        old_amount = @subscription.plan_amount
        old_name = @subscription.plan_name

        # Validate downgrade
        if new_plan.amount >= old_amount
          raise "New plan amount must be lower than current plan"
        end

        # Downgrade takes effect at next billing cycle
        # Update standing order for next period
        if @subscription.standing_order_id.present?
          # Cancel current standing order
          ::Payments::StandingOrderService.new(@subscription).cancel
          
          # Create new one starting at next billing date
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
          ::Payments::StandingOrderService.new(@subscription).create
        else
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
        end

        # Send notification
        ::NotificationService.send_downgrade_confirmation(@subscription, old_name, new_plan)

        @subscription
      end
    rescue StandardError => e
      Rails.logger.error("Error downgrading subscription: #{e.message}")
      raise
    end
  end
end

