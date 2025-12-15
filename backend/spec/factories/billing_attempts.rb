FactoryBot.define do
  factory :billing_attempt do
    association :subscription
    amount { subscription.plan.amount }
    invoice_number { "INV-#{Date.current.strftime('%Y%m%d')}-#{subscription.reference_number}" }
    payment_method { 'ratiba' }
    status { 'pending' }
    attempt_number { 1 }
    retry_count { 0 }
    attempted_at { Time.current }

    trait :processing do
      status { 'processing' }
    end

    trait :completed do
      status { 'completed' }
      mpesa_receipt_number { "MPESA#{SecureRandom.alphanumeric(8).upcase}" }
    end

    trait :failed do
      status { 'failed' }
      failure_reason { 'Payment failed' }
      retry_count { 1 }
      next_retry_at { 1.hour.from_now }
    end

    trait :with_stk_push do
      payment_method { 'stk_push' }
      stk_push_checkout_id { "CHECKOUT#{SecureRandom.alphanumeric(10).upcase}" }
    end

    trait :with_c2b do
      payment_method { 'c2b' }
    end
  end
end

