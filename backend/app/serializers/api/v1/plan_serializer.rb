class Api::V1::PlanSerializer < Blueprinter::Base
  identifier :id
  
  fields :name, :description, :amount, :billing_cycle_days,
         :features, :active, :created_at, :updated_at
end
