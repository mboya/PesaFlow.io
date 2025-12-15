class Api::V1::CustomerSerializer < Blueprinter::Base
  identifier :id
  
  fields :name, :email, :phone_number, :status,
         :standing_order_enabled, :preferred_payment_day,
         :failed_payment_count, :last_payment_at, :created_at, :updated_at
end
