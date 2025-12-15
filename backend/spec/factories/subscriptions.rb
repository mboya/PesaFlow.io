FactoryBot.define do
  factory :subscription do
    association :customer
    association :plan
    reference_number { "SUB-#{SecureRandom.alphanumeric(8).upcase}" }
    status { 'active' }
    outstanding_amount { 0 }
    preferred_payment_method { nil }
    is_trial { false }
    trial_ends_at { nil }
    current_period_start { Date.current }
    current_period_end { 30.days.from_now.to_date }
    next_billing_date { 30.days.from_now.to_date }
    activated_at { Time.current }

    trait :pending do
      status { 'pending' }
      activated_at { nil }
    end

    trait :suspended do
      status { 'suspended' }
      suspended_at { Time.current }
      outstanding_amount { plan.amount }
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
    end

    trait :with_outstanding do
      outstanding_amount { plan.amount }
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

