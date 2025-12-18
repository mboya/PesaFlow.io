FactoryBot.define do
  factory :payment do
    association :subscription
    association :billing_attempt, factory: :billing_attempt, status: 'completed'
    amount { subscription.amount || 1000.0 }
    payment_method { 'ratiba' }
    status { 'completed' }
    mpesa_transaction_id { "MPESA#{SecureRandom.alphanumeric(8).upcase}" }
    mpesa_receipt_number { mpesa_transaction_id }
    phone_number { subscription.customer.phone_number }
    paid_at { Time.current }
    reconciled { false }

    trait :refunded do
      status { 'refunded' }
    end

    trait :disputed do
      status { 'disputed' }
    end

    trait :reconciled do
      reconciled { true }
      reconciled_at { Time.current }
    end

    trait :stk_push do
      payment_method { 'stk_push' }
    end

    trait :c2b do
      payment_method { 'c2b' }
    end
  end
end
