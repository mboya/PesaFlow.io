class Api::V1::PlanSerializer < Blueprinter::Base
  identifier :id
  
  fields :name, :description, :amount, :currency, :billing_cycle_days,
         :features, :trial_days, :has_trial, :created_at, :updated_at
  
  # Convert billing_frequency integer to string
  field :billing_frequency do |plan|
    case plan.billing_frequency
    when 1 then 'daily'
    when 2 then 'weekly'
    when 3 then 'monthly'
    when 4 then 'yearly'
    else 'monthly'
    end
  end
  
  # Map active to is_active for frontend compatibility
  field :is_active do |plan|
    plan.active
  end
end
