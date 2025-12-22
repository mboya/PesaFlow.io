class BillingAttempt < ApplicationRecord
  include TenantAssignment

  # Multi-tenancy
  acts_as_tenant :tenant
  belongs_to :tenant

  # Associations
  belongs_to :subscription
  has_many :payments, dependent: :nullify

  # Validations
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :payment_method, inclusion: { in: %w[ratiba stk_push c2b manual] }
  validates :status, inclusion: { in: %w[pending processing completed failed] }
  validates :attempt_number, numericality: { greater_than: 0 }

  # Scopes
  scope :pending, -> { where(status: "pending") }
  scope :processing, -> { where(status: "processing") }
  scope :completed, -> { where(status: "completed") }
  scope :failed, -> { where(status: "failed") }
  scope :due_for_retry, -> { where("next_retry_at <= ?", Time.current).where(status: "failed") }

  # Callbacks
  before_validation :set_attempted_at, on: :create

  # Instance methods
  def mark_as_processing!
    update!(status: "processing", attempted_at: Time.current)
  end

  def mark_as_completed!(mpesa_transaction_id: nil, mpesa_receipt_number: nil)
    update!(
      status: "completed",
      mpesa_transaction_id: mpesa_transaction_id,
      mpesa_receipt_number: mpesa_receipt_number
    )
  end

  def mark_as_failed!(reason: nil)
    increment!(:retry_count)
    update!(
      status: "failed",
      failure_reason: reason,
      next_retry_at: calculate_next_retry_at
    )
  end

  def completed?
    status == "completed"
  end

  def can_retry?
    retry_count < max_retries
  end

  MAX_RETRIES = 3

  def max_retries
    MAX_RETRIES
  end

  private

  def set_attempted_at
    self.attempted_at ||= Time.current
  end

  RETRY_DELAYS_HOURS = [1, 4, 24].freeze
  DEFAULT_RETRY_DELAY_HOURS = 24

  def calculate_next_retry_at
    # Exponential backoff: 1 hour, 4 hours, 24 hours
    hours = RETRY_DELAYS_HOURS[retry_count - 1] || DEFAULT_RETRY_DELAY_HOURS
    hours.hours.from_now
  end
end
