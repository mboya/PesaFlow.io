class Subscription < ApplicationRecord
  # Multi-tenancy
  acts_as_tenant :tenant
  belongs_to :tenant

  # Associations
  belongs_to :customer
  has_many :billing_attempts, dependent: :destroy
  has_many :payments, dependent: :destroy
  has_many :refunds, dependent: :destroy
  # Note: Invoices are represented by billing_attempts with invoice_number

  # Validations
  validates :reference_number, presence: true, uniqueness: { scope: :tenant_id }
  validates :status, inclusion: { in: %w[pending active suspended cancelled expired] }
  validates :preferred_payment_method, inclusion: { in: %w[ratiba stk_push c2b] }, allow_nil: true
  validates :outstanding_amount, numericality: { greater_than_or_equal_to: 0 }

  # Scopes
  scope :active, -> { where(status: "active") }
  scope :pending, -> { where(status: "pending") }
  scope :suspended, -> { where(status: "suspended") }
  scope :cancelled, -> { where(status: "cancelled") }
  scope :expired, -> { where(status: "expired") }
  scope :due_for_billing, -> { where("next_billing_date <= ?", Date.current) }
  scope :trial, -> { where(is_trial: true) }

  # Callbacks
  before_validation :generate_reference_number, on: :create
  before_validation :set_tenant_from_customer, on: :create
  before_save :set_tenant_from_customer

  # Instance methods

  def activate!
    update!(
      status: "active",
      activated_at: Time.current,
      current_period_start: Date.current
    )
  end

  def suspend!
    update!(
      status: "suspended",
      suspended_at: Time.current
    )
  end

  def cancel!
    update!(
      status: "cancelled",
      cancelled_at: Time.current
    )
  end

  def expire!
    update!(status: "expired")
  end

  def is_active?
    status == "active"
  end

  def cancelled?
    status == "cancelled"
  end

  def suspended?
    status == "suspended"
  end

  def is_trial_active?
    is_trial && trial_ends_at.present? && trial_ends_at >= Date.current
  end

  def total_paid
    payments.where(status: "completed").sum(:amount)
  end

  def last_payment
    payments.order(paid_at: :desc).first
  end

  def calculate_period_end
    cycle_days = billing_cycle_days
    return nil unless cycle_days

    start_date = current_period_start || Date.current
    start_date + cycle_days.days
  end

  def calculate_next_billing_date
    return nil unless billing_cycle_days

    end_date = current_period_end || calculate_period_end
    return nil unless end_date

    # If customer has preferred payment day, use it
    if customer&.preferred_payment_day.present?
      day = customer.preferred_payment_day.to_i
      next_billing = end_date.beginning_of_month + (day - 1).days
      # If the preferred day has passed this month, use next month
      next_billing = next_billing.next_month if next_billing < end_date
      next_billing
    else
      end_date
    end
  end

  def mark_as_paid!
    update!(
      status: "active",
      outstanding_amount: 0,
      current_period_start: Date.current,
      current_period_end: calculate_period_end,
      next_billing_date: calculate_next_billing_date
    )

    # Reset customer failed payment count on successful payment
    customer.reset_failed_payment_count! if customer.failed_payment_count > 0
  end

  def extend_period!
    billing_interval = billing_cycle_days || 30

    self.current_period_start = current_period_end || Date.current
    self.current_period_end = current_period_start + billing_interval.days
    self.next_billing_date = calculate_next_billing_date
    save!
  end

  def reactivate!
    billing_interval = billing_cycle_days.presence || 30
    period_start = Date.current
    period_end = period_start + billing_interval.days

    self.status = "active"
    self.outstanding_amount = 0
    self.activated_at = Time.current
    self.suspended_at = nil
    self.cancelled_at = nil
    self.current_period_start = period_start
    self.current_period_end = period_end
    self.next_billing_date = period_end
    self.next_billing_date = calculate_next_billing_date if billing_cycle_days.present?
    save!

    customer.reset_failed_payment_count! if customer.failed_payment_count.to_i > 0
  end

  def reset_failed_payment_count!
    customer.reset_failed_payment_count!
  end

  def suspended_for
    return 0 unless suspended? && suspended_at
    Time.current - suspended_at
  end

  def days_until_due
    return 0 unless current_period_end
    (current_period_end - Date.current).to_i
  end

  def overdue?
    current_period_end && current_period_end < Date.current
  end

  private

  def generate_reference_number
    return if reference_number.present?

    loop do
      self.reference_number = "SUB-#{SecureRandom.alphanumeric(8).upcase}"
      break unless Subscription.exists?(reference_number: reference_number)
    end
  end

  def set_tenant_from_customer
    return unless customer.present? && tenant_id.nil?

    # Use without_tenant to avoid scoping issues when accessing customer.tenant_id
    ActsAsTenant.without_tenant do
      customer_tenant_id = customer.tenant_id
      self.tenant_id = customer_tenant_id if customer_tenant_id.present?
    end
  end
end
