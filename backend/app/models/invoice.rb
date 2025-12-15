class Invoice < ApplicationRecord
  # Associations
  belongs_to :subscription
  belongs_to :customer
  belongs_to :payment, optional: true

  # Validations
  validates :invoice_number, presence: true, uniqueness: true
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :status, inclusion: { in: %w[draft sent paid overdue void] }
  validates :issue_date, presence: true
  validates :due_date, presence: true

  # Scopes
  scope :draft, -> { where(status: 'draft') }
  scope :sent, -> { where(status: 'sent') }
  scope :paid, -> { where(status: 'paid') }
  scope :overdue, -> { where(status: 'overdue') }
  scope :void, -> { where(status: 'void') }

  # Callbacks
  before_validation :set_issue_date, on: :create

  # Instance methods
  def mark_as_paid!(payment_record = nil)
    update!(
      status: 'paid',
      paid_at: Time.current,
      payment: payment_record
    )
  end

  def mark_as_overdue!
    update!(status: 'overdue') if due_date < Date.current && status != 'paid'
  end

  def overdue?
    due_date < Date.current && status != 'paid'
  end

  private

  def set_issue_date
    self.issue_date ||= Date.current
  end
end

