class Api::V1::BillingAttemptSerializer < Blueprinter::Base
  identifier :id
  
  fields :amount, :invoice_number, :payment_method, :status,
         :attempt_number, :retry_count, :stk_push_checkout_id,
         :mpesa_receipt_number, :failure_reason, :attempted_at,
         :next_retry_at, :created_at, :updated_at
  
  # Add subscription association for invoice display
  association :subscription, blueprint: Api::V1::SubscriptionSerializer, if: ->(billing_attempt, _options) { billing_attempt.subscription.present? }
  
  # Map fields for invoice compatibility
  field :due_date do |billing_attempt|
    billing_attempt.attempted_at&.to_date
  end
  
  field :paid_at do |billing_attempt|
    billing_attempt.status == 'completed' ? billing_attempt.attempted_at : nil
  end
  
  field :currency, default: 'KES'
end
