class WebhookLog < ApplicationRecord
  # Validations
  validates :source, presence: true, inclusion: { in: %w[ratiba stk_push c2b b2c] }
  validates :status, inclusion: { in: %w[received processed failed] }

  # Scopes
  scope :by_source, ->(source) { where(source: source) }
  scope :failed, -> { where(status: "failed") }
  scope :processed, -> { where(status: "processed") }

  # Instance methods
  def mark_as_processed!
    update!(status: "processed")
  end

  def mark_as_failed!(error_message)
    update!(status: "failed", error_message: error_message)
  end
end
