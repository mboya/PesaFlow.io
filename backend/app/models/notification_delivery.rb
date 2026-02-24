class NotificationDelivery < ApplicationRecord
  CHANNELS = %w[sms email whatsapp push in_app].freeze
  STATUSES = %w[queued sent failed skipped].freeze

  # Multi-tenancy
  acts_as_tenant :tenant, required: false
  belongs_to :tenant, optional: true

  belongs_to :context, polymorphic: true, optional: true

  validates :channel, presence: true, inclusion: { in: CHANNELS }
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :recipient, presence: true
  validate :skip_tenant_validation

  scope :sent, -> { where(status: "sent") }
  scope :failed, -> { where(status: "failed") }
  scope :queued, -> { where(status: "queued") }
  scope :recent, -> { order(created_at: :desc, id: :desc) }

  def mark_as_sent!(provider_message_id: nil, metadata: nil)
    update!(
      status: "sent",
      delivered_at: Time.current,
      failed_at: nil,
      error_message: nil,
      provider_message_id: provider_message_id || self.provider_message_id,
      metadata: metadata || self.metadata
    )
  end

  def mark_as_failed!(error_message:, metadata: nil)
    update!(
      status: "failed",
      failed_at: Time.current,
      error_message: error_message,
      metadata: metadata || self.metadata
    )
  end

  def mark_as_skipped!(reason:)
    update!(
      status: "skipped",
      failed_at: nil,
      delivered_at: nil,
      error_message: reason
    )
  end

  private

  def skip_tenant_validation
    errors.delete(:tenant)
  end

end
