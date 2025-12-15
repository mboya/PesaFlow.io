class Api::V1::BillingAttemptSerializer < Blueprinter::Base
  identifier :id
  
  fields :amount, :invoice_number, :payment_method, :status,
         :attempt_number, :retry_count, :stk_push_checkout_id,
         :mpesa_receipt_number, :failure_reason, :attempted_at,
         :next_retry_at, :created_at, :updated_at
end
