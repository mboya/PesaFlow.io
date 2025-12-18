class Customer < ApplicationRecord
  # Associations
  belongs_to :user
  has_many :subscriptions, dependent: :destroy
  has_many :plans, through: :subscriptions

  # Callbacks
  before_validation :format_phone_number

  # Validations
  validates :name, presence: true
  validates :phone_number, uniqueness: true, allow_nil: true
  validates :email, uniqueness: true, allow_nil: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :status, inclusion: { in: %w[active suspended churned] }
  validates :preferred_payment_day, inclusion: { in: (1..28).map(&:to_s) }, allow_nil: true

  # Scopes
  scope :active, -> { where(status: 'active') }
  scope :suspended, -> { where(status: 'suspended') }
  scope :churned, -> { where(status: 'churned') }

  # Instance methods
  def active_subscriptions
    subscriptions.where(status: 'active')
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
    
    cleaned = phone_number.gsub(/\D/, '') # Remove non-digits
    if cleaned.start_with?('0')
      self.phone_number = "254#{cleaned[1..-1]}"
    elsif cleaned.start_with?('7')
      self.phone_number = "254#{cleaned}"
    elsif cleaned.start_with?('254')
      self.phone_number = cleaned
    end
  end
end

