FactoryBot.define do
  factory :customer do
    association :user
    name { Faker::Name.name }
    email { user&.email || Faker::Internet.email }
    phone_number { "254#{rand(700000000..799999999)}" }
    status { 'active' }
    standing_order_enabled { false }
    preferred_payment_day { nil }
    failed_payment_count { 0 }
    last_payment_at { nil }

    trait :with_standing_order do
      standing_order_enabled { true }
      preferred_payment_day { '15' }
    end

    trait :suspended do
      status { 'suspended' }
    end

    trait :churned do
      status { 'churned' }
    end
  end
end
