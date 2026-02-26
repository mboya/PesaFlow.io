# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

# Seeds should not create tenant/user accounts in production. Reuse existing records only.
# However, we ensure a default tenant exists in non-production environments for local development.
if !Rails.env.production?
  ActsAsTenant.without_tenant do
    default_tenant = Tenant.find_or_initialize_by(subdomain: TenantScoped::DEFAULT_SUBDOMAIN)
    if default_tenant.new_record?
      default_tenant.name = "Default Tenant"
      default_tenant.status = "active"
      default_tenant.settings ||= {}
      default_tenant.save!
      puts "✓ Created default tenant for #{Rails.env} environment (subdomain: #{default_tenant.subdomain})"
    elsif !default_tenant.active?
      default_tenant.update!(status: "active")
      puts "✓ Ensured default tenant is active for #{Rails.env} environment"
    else
      puts "✓ Default tenant already present for #{Rails.env} environment (subdomain: #{default_tenant.subdomain})"
    end
  end
end

target_user = ActsAsTenant.without_tenant do
  if ENV["SEED_USER_EMAIL"].present?
    User.find_by(email: ENV["SEED_USER_EMAIL"].strip.downcase)
  elsif ENV["SEED_USER_ID"].present?
    User.find_by(id: ENV["SEED_USER_ID"].to_i)
  else
    User.where.not(tenant_id: nil).order(:id).first || User.order(:id).first
  end
end

if target_user
  tenant_label = target_user.tenant&.subdomain || "none"
  puts "✓ Using existing user for seeds: #{target_user.email} (tenant: #{tenant_label})"
else
  puts "WARNING: No existing users found. No account records were created."
end

puts "Seeding complete (no new tenant/user accounts created)."
puts "Subscriptions are created directly by users with custom details."

# Optional: generate realistic demo transaction history for one existing user.
# Usage:
#   SIMULATE_TRANSACTIONS=true SIM_TX_USER_EMAIL=user@example.com rails db:seed
#   SIMULATE_TRANSACTIONS=true SIM_TX_USER_ID=1 SIM_TX_MONTHS=3 rails db:seed
#   SIMULATE_TRANSACTIONS=true SIM_TX_TENANT_SUBDOMAIN=acme rails db:seed
#   SIMULATE_TRANSACTIONS=true SIM_TX_TENANT_ID=2 rails db:seed
simulate_transactions = ActiveModel::Type::Boolean.new.cast(ENV.fetch("SIMULATE_TRANSACTIONS", "false"))
if simulate_transactions
  require_relative "seeds/transaction_simulation"
  Seeds::TransactionSimulation.run_from_env
else
  puts "Tip: set SIMULATE_TRANSACTIONS=true to seed demo transactions for an existing user."
end
