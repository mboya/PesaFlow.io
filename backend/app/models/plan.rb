class Plan < ApplicationRecord
  # Associations
  has_many :subscriptions, dependent: :restrict_with_error

  # Validations
  validates :name, presence: true
  validates :amount, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :currency, presence: true, length: { is: 3 }
  validates :billing_frequency, inclusion: { in: [1, 2, 3, 4] }, allow_nil: true
  # 1 = daily, 2 = weekly, 3 = monthly, 4 = yearly
  validates :billing_cycle_days, numericality: { greater_than: 0 }, allow_nil: true
  validates :trial_days, numericality: { greater_than_or_equal_to: 0 }

  # Scopes
  scope :active, -> { where(active: true) }
  scope :inactive, -> { where(active: false) }

  # Instance methods
  def monthly?
    billing_frequency == 3
  end

  def has_trial?
    has_trial && trial_days > 0
  end
end

