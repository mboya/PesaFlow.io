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
