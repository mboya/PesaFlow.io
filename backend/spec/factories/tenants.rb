FactoryBot.define do
  factory :tenant do
    sequence(:name) { |n| "Tenant #{n}" }
    sequence(:subdomain) { |n| "tenant#{n}" }
    status { "active" }
    domain { nil }
    settings { {} }

    # Always create tenants without tenant scoping
    to_create { |instance| ActsAsTenant.without_tenant { instance.save! } }

    trait :suspended do
      status { "suspended" }
    end

    trait :cancelled do
      status { "cancelled" }
    end

    trait :with_custom_domain do
      domain { "custom.example.com" }
    end
  end
end
