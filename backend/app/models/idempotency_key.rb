class IdempotencyKey < ApplicationRecord
  belongs_to :user

  validates :user_id, :endpoint, :idempotency_key, presence: true
  validates :idempotency_key, uniqueness: { scope: %i[user_id endpoint] }
end

