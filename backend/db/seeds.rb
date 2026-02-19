# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

# Create default tenant if it doesn't exist
default_tenant = Tenant.find_or_create_by!(subdomain: 'default') do |t|
  t.name = 'Default Tenant'
  t.status = 'active'
  t.settings = {}
end

puts "✓ Default tenant created: #{default_tenant.name} (#{default_tenant.subdomain})"

# Assign default tenant to users without a tenant
User.where(tenant_id: nil).find_each do |user|
  user.update_column(:tenant_id, default_tenant.id)
  puts "  → Assigned default tenant to user: #{user.email}"
end

puts "Seeding complete!"
puts "Subscriptions are created directly by users with custom details."

# Optional: generate realistic demo transaction history for one existing user.
# Usage:
#   SIMULATE_TRANSACTIONS=true SIM_TX_USER_EMAIL=user@example.com rails db:seed
#   SIMULATE_TRANSACTIONS=true SIM_TX_USER_ID=1 SIM_TX_MONTHS=3 rails db:seed
simulate_transactions = ActiveModel::Type::Boolean.new.cast(ENV.fetch("SIMULATE_TRANSACTIONS", "false"))
if simulate_transactions
  require_relative "seeds/transaction_simulation"
  Seeds::TransactionSimulation.run_from_env
else
  puts "Tip: set SIMULATE_TRANSACTIONS=true to seed demo transactions for an existing user."
end
