FactoryBot.define do
  factory :subscription do
    association :customer
    reference_number { "SUB-#{SecureRandom.alphanumeric(8).upcase}" }
    status { 'active' }
    outstanding_amount { 0 }
    preferred_payment_method { 'ratiba' }
    is_trial { false }
    trial_ends_at { nil }
    current_period_start { Date.current }
    current_period_end { 30.days.from_now.to_date }
    next_billing_date { 30.days.from_now.to_date }
    activated_at { Time.current }

    # Direct subscription fields
    name { Faker::Commerce.product_name }
    description { Faker::Lorem.sentence }
    amount { 1000.0 }
    currency { 'KES' }
    billing_frequency { 3 } # monthly
    billing_cycle_days { 30 }
    trial_days { 0 }
    has_trial { false }

    trait :pending do
      status { 'pending' }
      activated_at { nil }
    end

    trait :suspended do
      status { 'suspended' }
      suspended_at { Time.current }
      outstanding_amount { 1000.0 }
    end

    trait :cancelled do
      status { 'cancelled' }
      cancelled_at { Time.current }
    end

    trait :expired do
      status { 'expired' }
    end

    trait :trial do
      is_trial { true }
      trial_ends_at { 14.days.from_now.to_date }
      status { 'active' }
      has_trial { true }
      trial_days { 14 }
    end

    trait :with_outstanding do
      outstanding_amount { 1000.0 }
    end

    trait :with_ratiba do
      preferred_payment_method { 'ratiba' }
      standing_order_id { "RATIBA-#{SecureRandom.alphanumeric(10).upcase}" }
    end

    trait :with_stk_push do
      preferred_payment_method { 'stk_push' }
    end

    trait :with_c2b do
      preferred_payment_method { 'c2b' }
    end
  end
end
