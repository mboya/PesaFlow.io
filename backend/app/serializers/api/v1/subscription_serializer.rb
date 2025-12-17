class Api::V1::SubscriptionSerializer < Blueprinter::Base
  identifier :id
  
  fields :reference_number, :status, :outstanding_amount,
         :current_period_start, :current_period_end, :next_billing_date,
         :is_trial, :trial_ends_at, :preferred_payment_method,
         :activated_at, :suspended_at, :cancelled_at, :created_at, :updated_at,
         :name, :description, :amount, :currency, :billing_cycle_days,
         :plan_name, :plan_amount, :plan_currency, :plan_billing_frequency,
         :plan_billing_cycle_days, :plan_trial_days, :plan_has_trial, :plan_features
  
  # We no longer expose a nested Plan; subscription is self-contained.
  association :customer, blueprint: Api::V1::CustomerSerializer
  
  # Note: payments and billing_attempts are excluded to avoid circular references
  # Use dedicated endpoints to fetch these if needed
end
