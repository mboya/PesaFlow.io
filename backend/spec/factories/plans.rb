FactoryBot.define do
  factory :plan do
    name { Faker::Commerce.product_name }
    description { Faker::Lorem.paragraph }
    amount { Faker::Commerce.price(range: 100.0..10000.0) }
    currency { 'KES' }
    billing_frequency { 3 } # monthly
    billing_cycle_days { 30 }
    trial_days { 0 }
    active { true }
    features { { 'feature1' => true, 'feature2' => false } }

    trait :daily do
      billing_frequency { 1 }
      billing_cycle_days { 1 }
    end

    trait :weekly do
      billing_frequency { 2 }
      billing_cycle_days { 7 }
    end

    trait :yearly do
      billing_frequency { 4 }
      billing_cycle_days { 365 }
    end

    trait :with_trial do
      trial_days { 14 }
    end

    trait :inactive do
      active { false }
    end
  end
end

