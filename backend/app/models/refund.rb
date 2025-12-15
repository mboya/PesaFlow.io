class Refund < ApplicationRecord
  # Associations
  belongs_to :subscription
  belongs_to :payment, optional: true
  belongs_to :approved_by, class_name: 'User', optional: true

  # Validations
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :status, inclusion: { in: %w[pending approved completed failed rejected] }
  validates :reason, presence: true

  # Scopes
  scope :pending, -> { where(status: 'pending') }
  scope :approved, -> { where(status: 'approved') }
  scope :completed, -> { where(status: 'completed') }
  scope :failed, -> { where(status: 'failed') }
  scope :rejected, -> { where(status: 'rejected') }

  # Callbacks
  before_validation :set_requested_at, on: :create

  # Instance methods
  def approve!(user:)
    update!(
      status: 'approved',
      approved_by: user,
      approved_at: Time.current
    )
  end

  def reject!(reason: nil)
    update!(
      status: 'rejected',
      failure_reason: reason
    )
  end

  def mark_as_completed!(mpesa_transaction_id: nil, conversation_id: nil, originator_conversation_id: nil)
    update!(
      status: 'completed',
      completed_at: Time.current,
      mpesa_transaction_id: mpesa_transaction_id,
      conversation_id: conversation_id,
      originator_conversation_id: originator_conversation_id
    )
  end

  def mark_as_failed!(reason: nil)
    update!(
      status: 'failed',
      failure_reason: reason
    )
  end

  def can_be_approved?
    status == 'pending'
  end

  def can_be_processed?
    status == 'approved'
  end

  private

  def set_requested_at
    self.requested_at ||= Time.current
  end
end

