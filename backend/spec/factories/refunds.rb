FactoryBot.define do
  factory :refund do
    association :subscription
    association :payment
    amount { payment.amount }
    reason { 'Customer requested refund' }
    status { 'pending' }
    requested_at { Time.current }

    trait :approved do
      status { 'approved' }
      approved_by { association(:user) }
      approved_at { Time.current }
    end

    trait :completed do
      status { 'completed' }
      completed_at { Time.current }
      mpesa_transaction_id { "MPESA#{SecureRandom.alphanumeric(8).upcase}" }
      conversation_id { "CONV#{SecureRandom.alphanumeric(10).upcase}" }
      originator_conversation_id { "ORIG#{SecureRandom.alphanumeric(10).upcase}" }
    end

    trait :failed do
      status { 'failed' }
      failure_reason { 'Refund processing failed' }
    end

    trait :rejected do
      status { 'rejected' }
      failure_reason { 'Refund request rejected' }
    end
  end
end
