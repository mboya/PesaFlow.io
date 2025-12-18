class Api::V1::PaymentSerializer < Blueprinter::Base
  identifier :id
  
  fields :amount, :payment_method, :status, :mpesa_transaction_id,
         :mpesa_receipt_number, :phone_number, :paid_at, :reconciled,
         :reconciled_at, :created_at, :updated_at

  # Alias for frontend compatibility
  field :transaction_id do |payment|
    payment.mpesa_transaction_id
  end

  # Currency from subscription
  field :currency do |payment|
    payment.subscription&.currency || 'KES'
  end
end
