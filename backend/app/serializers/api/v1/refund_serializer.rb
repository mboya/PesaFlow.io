class Api::V1::RefundSerializer < Blueprinter::Base
  identifier :id
  
  fields :amount, :reason, :status, :mpesa_transaction_id,
         :conversation_id, :originator_conversation_id, :failure_reason,
         :requested_at, :approved_at, :completed_at, :created_at, :updated_at
  
  association :payment, blueprint: Api::V1::PaymentSerializer
end
