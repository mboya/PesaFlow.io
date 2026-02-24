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
  after_commit :publish_created_event, on: :create
  after_commit :publish_status_change_event, on: :update, if: :saved_change_to_status?
  after_commit :publish_retry_scheduled_event, on: :update, if: :saved_change_to_next_retry_at?

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

  def publish_created_event
    Events::Publisher.publish(
      event_type: "billing_attempt.created",
      subject: self,
      tenant: tenant,
      source: self.class.name,
      payload: {
        subscription_id: subscription_id,
        amount: amount.to_s,
        payment_method: payment_method,
        status: status,
        attempt_number: attempt_number,
        invoice_number: invoice_number,
        attempted_at: attempted_at,
        retry_count: retry_count,
        next_retry_at: next_retry_at
      }
    )
  end

  def publish_status_change_event
    previous_status, current_status = saved_change_to_status
    Events::Publisher.publish(
      event_type: "billing_attempt.status_changed",
      subject: self,
      tenant: tenant,
      source: self.class.name,
      payload: {
        subscription_id: subscription_id,
        from: previous_status,
        to: current_status,
        failure_reason: failure_reason,
        retry_count: retry_count,
        next_retry_at: next_retry_at
      }
    )
  end

  def publish_retry_scheduled_event
    _previous_retry_at, current_retry_at = saved_change_to_next_retry_at
    return if current_retry_at.blank?

    Events::Publisher.publish(
      event_type: "billing_attempt.retry_scheduled",
      subject: self,
      tenant: tenant,
      source: self.class.name,
      payload: {
        subscription_id: subscription_id,
        retry_count: retry_count,
        next_retry_at: current_retry_at,
        status: status
      }
    )
  end
end
