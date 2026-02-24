class Customer < ApplicationRecord
  # Multi-tenancy
  acts_as_tenant :tenant
  belongs_to :tenant

  # Associations
  belongs_to :user
  has_many :subscriptions, dependent: :destroy
  has_many :support_interactions, dependent: :nullify

  # Callbacks
  before_validation :format_phone_number
  before_validation :set_tenant_from_user, on: :create
  before_save :set_tenant_from_user
  after_commit :publish_status_change_event, on: :update, if: :saved_change_to_status?
  after_commit :publish_failed_payment_count_change_event, on: :update, if: :saved_change_to_failed_payment_count?

  # Validations
  validates :name, presence: true
  validates :phone_number, uniqueness: { scope: :tenant_id }, allow_nil: true
  validates :email, uniqueness: { scope: :tenant_id }, allow_nil: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :status, inclusion: { in: %w[active suspended churned] }
  validates :preferred_payment_day, inclusion: { in: (1..28).map(&:to_s) }, allow_nil: true

  # Scopes
  scope :active, -> { where(status: "active") }
  scope :suspended, -> { where(status: "suspended") }
  scope :churned, -> { where(status: "churned") }

  # Instance methods
  def active_subscriptions
    subscriptions.where(status: "active")
  end

  def has_active_subscription?
    active_subscriptions.exists?
  end

  def increment_failed_payment_count!
    increment!(:failed_payment_count)
  end

  def reset_failed_payment_count!
    update(failed_payment_count: 0)
  end

  def full_name
    name.presence || email.presence || phone_number
  end

  def format_phone_number
    # Convert to 254XXXXXXXXX format
    return unless phone_number.present?

    cleaned = phone_number.gsub(/\D/, "") # Remove non-digits
    if cleaned.start_with?("0")
      self.phone_number = "254#{cleaned[1..-1]}"
    elsif cleaned.start_with?("7")
      self.phone_number = "254#{cleaned}"
    elsif cleaned.start_with?("254")
      self.phone_number = cleaned
    end
  end

  def set_tenant_from_user
    return unless user.present? && tenant_id.nil?

    # Use without_tenant to avoid scoping issues when accessing user.tenant_id
    ActsAsTenant.without_tenant do
      user_tenant_id = user.tenant_id
      self.tenant_id = user_tenant_id if user_tenant_id.present?
    end
  end

  def publish_status_change_event
    previous_status, current_status = saved_change_to_status

    Events::Publisher.publish(
      event_type: "customer.status_changed",
      subject: self,
      tenant: tenant,
      source: self.class.name,
      payload: {
        user_id: user_id,
        from: previous_status,
        to: current_status
      }
    )
  end

  def publish_failed_payment_count_change_event
    previous_count, current_count = saved_change_to_failed_payment_count

    Events::Publisher.publish(
      event_type: "customer.failed_payment_count_changed",
      subject: self,
      tenant: tenant,
      source: self.class.name,
      payload: {
        user_id: user_id,
        from: previous_count,
        to: current_count
      }
    )
  end
end
