class Payment < ApplicationRecord
  include TenantAssignment

  # Multi-tenancy
  acts_as_tenant :tenant
  belongs_to :tenant

  # Associations
  belongs_to :subscription
  belongs_to :billing_attempt, optional: true
  has_many :refunds, dependent: :restrict_with_error

  # Validations
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :payment_method, inclusion: { in: %w[ratiba stk_push c2b] }
  validates :status, inclusion: { in: %w[completed refunded disputed] }
  validates :mpesa_transaction_id, presence: true, uniqueness: { scope: :tenant_id }
  validates :phone_number, presence: true

  # Scopes
  scope :completed, -> { where(status: "completed") }
  scope :refunded, -> { where(status: "refunded") }
  scope :disputed, -> { where(status: "disputed") }
  scope :unreconciled, -> { where(reconciled: false) }
  scope :reconciled, -> { where(reconciled: true) }

  # Callbacks
  before_validation :set_paid_at, on: :create
  after_commit :publish_created_event, on: :create
  after_commit :publish_status_change_event, on: :update, if: :saved_change_to_status?

  # Instance methods
  def mark_as_refunded!
    update!(status: "refunded")
  end

  def mark_as_disputed!
    update!(status: "disputed")
  end

  def reconcile!
    update!(reconciled: true, reconciled_at: Time.current)
  end

  def can_be_refunded?
    status == "completed" && refunds.where(status: %w[pending approved completed]).empty?
  end

  def total_refunded
    refunds.where(status: "completed").sum(:amount)
  end

  private

  def set_paid_at
    self.paid_at ||= Time.current
  end

  def publish_created_event
    Events::Publisher.publish(
      event_type: "payment.created",
      subject: self,
      tenant: tenant,
      source: self.class.name,
      payload: {
        subscription_id: subscription_id,
        billing_attempt_id: billing_attempt_id,
        amount: amount.to_s,
        payment_method: payment_method,
        status: status,
        mpesa_transaction_id: mpesa_transaction_id,
        paid_at: paid_at
      }
    )
  end

  def publish_status_change_event
    previous_status, current_status = saved_change_to_status
    Events::Publisher.publish(
      event_type: "payment.status_changed",
      subject: self,
      tenant: tenant,
      source: self.class.name,
      payload: {
        subscription_id: subscription_id,
        billing_attempt_id: billing_attempt_id,
        from: previous_status,
        to: current_status,
        mpesa_transaction_id: mpesa_transaction_id
      }
    )
  end
end
