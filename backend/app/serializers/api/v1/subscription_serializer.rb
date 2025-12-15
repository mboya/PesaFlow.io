class Api::V1::SubscriptionSerializer < Blueprinter::Base
  identifier :id
  
  fields :reference_number, :status, :outstanding_amount,
         :current_period_start, :current_period_end, :next_billing_date,
         :is_trial, :trial_ends_at, :preferred_payment_method,
         :activated_at, :suspended_at, :cancelled_at, :created_at, :updated_at
  
  association :plan, blueprint: Api::V1::PlanSerializer
  association :customer, blueprint: Api::V1::CustomerSerializer
  
  association :payments, blueprint: Api::V1::PaymentSerializer
  association :billing_attempts, blueprint: Api::V1::BillingAttemptSerializer
end
