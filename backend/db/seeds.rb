# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

puts "Seeding plans..."

# Clear existing plans (optional - comment out if you want to keep existing plans)
# Plan.destroy_all

# Define industry-standard plans
plans_data = [
  # Free/Basic Plan
  {
    name: "Free",
    description: "Perfect for getting started. Try our service at no cost.",
    amount: 0.00,
    currency: "KES",
    billing_frequency: 3, # monthly
    billing_cycle_days: 30,
    has_trial: false,
    trial_days: 0,
    setup_fee: 0.00,
    active: true,
    features: {
      "subscriptions": "Up to 10 active subscriptions",
      "transactions": "1,000 transactions/month",
      "payment_methods": "STK Push only",
      "support": "Community support",
      "api_access": "Basic API access",
      "webhooks": "5 webhook endpoints",
      "reports": false,
      "advanced_analytics": false,
      "priority_support": false,
      "white_label": false
    }
  },
  
  # Starter Plan - Monthly
  {
    name: "Starter",
    description: "Ideal for small businesses and individuals. Get started with essential features.",
    amount: 500.00,
    currency: "KES",
    billing_frequency: 3, # monthly
    billing_cycle_days: 30,
    has_trial: true,
    trial_days: 14,
    setup_fee: 0.00,
    active: true,
    features: {
      "subscriptions": "Up to 100 active subscriptions",
      "transactions": "10,000 transactions/month",
      "payment_methods": "STK Push & Ratiba",
      "support": "Email support",
      "api_access": "Full API access",
      "webhooks": "20 webhook endpoints",
      "reports": "Basic reports & exports",
      "advanced_analytics": false,
      "priority_support": false,
      "white_label": false
    }
  },
  
  # Starter Plan - Yearly (2 months free)
  {
    name: "Starter (Yearly)",
    description: "Ideal for small businesses. Save 17% with annual billing.",
    amount: 5000.00, # 10 months * 500 = 5000 (2 months free)
    currency: "KES",
    billing_frequency: 4, # yearly
    billing_cycle_days: 365,
    has_trial: true,
    trial_days: 14,
    setup_fee: 0.00,
    active: true,
    features: {
      "subscriptions": "Up to 100 active subscriptions",
      "transactions": "10,000 transactions/month",
      "payment_methods": "STK Push & Ratiba",
      "support": "Email support",
      "api_access": "Full API access",
      "webhooks": "20 webhook endpoints",
      "reports": "Basic reports & exports",
      "advanced_analytics": false,
      "priority_support": false,
      "white_label": false,
      "savings": "Save 17% annually"
    }
  },
  
  # Professional Plan - Monthly
  {
    name: "Professional",
    description: "For growing businesses. Advanced features and better support.",
    amount: 2000.00,
    currency: "KES",
    billing_frequency: 3, # monthly
    billing_cycle_days: 30,
    has_trial: true,
    trial_days: 14,
    setup_fee: 0.00,
    active: true,
    features: {
      "subscriptions": "Unlimited subscriptions",
      "transactions": "100,000 transactions/month",
      "payment_methods": "All payment methods (STK Push, Ratiba, C2B, B2C)",
      "support": "Priority email support",
      "api_access": "Full API access with rate limits",
      "webhooks": "Unlimited webhook endpoints",
      "reports": "Advanced reports & analytics",
      "advanced_analytics": true,
      "priority_support": true,
      "white_label": false,
      "integrations": "All integrations included"
    }
  },
  
  # Professional Plan - Yearly (2 months free)
  {
    name: "Professional (Yearly)",
    description: "For growing businesses. Save 17% with annual billing.",
    amount: 20000.00, # 10 months * 2000 = 20000 (2 months free)
    currency: "KES",
    billing_frequency: 4, # yearly
    billing_cycle_days: 365,
    has_trial: true,
    trial_days: 14,
    setup_fee: 0.00,
    active: true,
    features: {
      "subscriptions": "Unlimited subscriptions",
      "transactions": "100,000 transactions/month",
      "payment_methods": "All payment methods (STK Push, Ratiba, C2B, B2C)",
      "support": "Priority email support",
      "api_access": "Full API access with rate limits",
      "webhooks": "Unlimited webhook endpoints",
      "reports": "Advanced reports & analytics",
      "advanced_analytics": true,
      "priority_support": true,
      "white_label": false,
      "integrations": "All integrations included",
      "savings": "Save 17% annually"
    }
  },
  
  # Enterprise Plan - Monthly
  {
    name: "Enterprise",
    description: "For large organizations. Unlimited everything with dedicated support.",
    amount: 8000.00,
    currency: "KES",
    billing_frequency: 3, # monthly
    billing_cycle_days: 30,
    has_trial: true,
    trial_days: 30,
    setup_fee: 0.00,
    active: true,
    features: {
      "subscriptions": "Unlimited subscriptions",
      "transactions": "Unlimited transactions",
      "payment_methods": "All payment methods + custom integrations",
      "support": "24/7 phone & email support",
      "api_access": "Unlimited API calls",
      "webhooks": "Unlimited webhook endpoints",
      "reports": "Custom reports & analytics",
      "advanced_analytics": true,
      "priority_support": true,
      "white_label": true,
      "integrations": "All integrations + custom integrations",
      "dedicated_account_manager": true,
      "sla": "99.9% uptime SLA",
      "onboarding": "Dedicated onboarding"
    }
  },
  
  # Enterprise Plan - Yearly (2 months free)
  {
    name: "Enterprise (Yearly)",
    description: "For large organizations. Save 17% with annual billing.",
    amount: 80000.00, # 10 months * 8000 = 80000 (2 months free)
    currency: "KES",
    billing_frequency: 4, # yearly
    billing_cycle_days: 365,
    has_trial: true,
    trial_days: 30,
    setup_fee: 0.00,
    active: true,
    features: {
      "subscriptions": "Unlimited subscriptions",
      "transactions": "Unlimited transactions",
      "payment_methods": "All payment methods + custom integrations",
      "support": "24/7 phone & email support",
      "api_access": "Unlimited API calls",
      "webhooks": "Unlimited webhook endpoints",
      "reports": "Custom reports & analytics",
      "advanced_analytics": true,
      "priority_support": true,
      "white_label": true,
      "integrations": "All integrations + custom integrations",
      "dedicated_account_manager": true,
      "sla": "99.9% uptime SLA",
      "onboarding": "Dedicated onboarding",
      "savings": "Save 17% annually"
    }
  }
]

# Create plans only if they don't exist (idempotent)
plans_data.each do |plan_data|
  plan = Plan.find_by(name: plan_data[:name])
  
  if plan
    puts "  ⊙ Skipped (exists): #{plan.name} - #{plan.amount} #{plan.currency}/#{plan.billing_frequency == 3 ? 'month' : 'year'}"
  else
    plan = Plan.new(plan_data)
    
    if plan.save
      puts "  ✓ Created: #{plan.name} - #{plan.amount} #{plan.currency}/#{plan.billing_frequency == 3 ? 'month' : 'year'}"
    else
      puts "  ✗ Failed to create: #{plan.name} - #{plan.errors.full_messages.join(', ')}"
    end
  end
end

created_count = Plan.count
puts "\nSeeding complete! Total plans in database: #{created_count}"
puts "\nActive plans:"
Plan.active.order(:amount).each do |plan|
  frequency = case plan.billing_frequency
              when 1 then "daily"
              when 2 then "weekly"
              when 3 then "monthly"
              when 4 then "yearly"
              else "custom"
              end
  
  trial_info = plan.has_trial? ? " (#{plan.trial_days}-day trial)" : ""
  puts "  - #{plan.name}: #{plan.amount} #{plan.currency}/#{frequency}#{trial_info}"
end
