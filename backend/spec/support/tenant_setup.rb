# Ensure default tenant exists in test environment
# This runs before each test suite to set up the default tenant

RSpec.configure do |config|
  config.before(:suite) do
    ActsAsTenant.without_tenant do
      Tenant.find_or_create_by!(subdomain: 'default') do |t|
        t.name = 'Default Tenant'
        t.status = 'active'
        t.settings = {}
      end
    end
  end

  # Clear tenant context before each test to ensure clean state
  config.before(:each) do
    ActsAsTenant.current_tenant = nil
  end
end