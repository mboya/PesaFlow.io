FactoryBot.define do
  factory :user do
    email { Faker::Internet.unique.email }
    password { "password123" }
    password_confirmation { "password123" }
    otp_enabled { false }
    otp_secret_key { nil }
    backup_codes { [] }
    
    # Tenant will be assigned via ensure_tenant callback if not provided
    # Use ActsAsTenant.without_tenant { create(:user, tenant: tenant) } to explicitly set tenant
    transient do
      tenant { nil }
    end

    before(:create) do |user, evaluator|
      if evaluator.tenant
        user.tenant = evaluator.tenant
      elsif user.tenant_id.nil?
        # Ensure default tenant exists and assign it
        ActsAsTenant.without_tenant do
          default_tenant = Tenant.find_or_create_by!(subdomain: 'default') do |t|
            t.name = 'Default Tenant'
            t.status = 'active'
            t.settings = {}
          end
          user.tenant_id = default_tenant.id
        end
      end
    end

    trait :with_otp do
      otp_secret_key { ROTP::Base32.random }
      otp_enabled { true }
      backup_codes { Array.new(10) { SecureRandom.alphanumeric(8).upcase } }
    end

    trait :otp_setup_but_not_enabled do
      otp_secret_key { ROTP::Base32.random }
      otp_enabled { false }
    end
  end
end
