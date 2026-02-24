class WebhookLog < ApplicationRecord
  # Multi-tenancy
  acts_as_tenant :tenant, required: false
  belongs_to :tenant, optional: true

  # Validations
  validates :source, presence: true, inclusion: { in: %w[ratiba stk_push c2b b2c] }
  validates :status, inclusion: { in: %w[received processed failed] }
  validate :skip_tenant_validation

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

  private

  def skip_tenant_validation
    errors.delete(:tenant)
  end
end
