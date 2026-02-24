class SupportInteraction < ApplicationRecord
  CHANNELS = %w[sms email call whatsapp in_app system].freeze
  DIRECTIONS = %w[inbound outbound].freeze
  STATUSES = %w[logged pending resolved failed].freeze

  # Multi-tenancy
  acts_as_tenant :tenant, required: false
  belongs_to :tenant, optional: true

  belongs_to :customer, optional: true
  belongs_to :subscription, optional: true
  belongs_to :actor, polymorphic: true, optional: true

  validates :channel, presence: true, inclusion: { in: CHANNELS }
  validates :direction, presence: true, inclusion: { in: DIRECTIONS }
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :topic, presence: true
  validates :occurred_at, presence: true
  validate :metadata_is_hash
  validate :skip_tenant_validation

  scope :recent, -> { order(occurred_at: :desc, id: :desc) }
  scope :by_topic, ->(topic) { where(topic: topic) }
  scope :by_channel, ->(channel) { where(channel: channel) }
  scope :inbound, -> { where(direction: "inbound") }
  scope :outbound, -> { where(direction: "outbound") }

  before_validation :set_occurred_at, on: :create

  private

  def set_occurred_at
    self.occurred_at ||= Time.current
  end

  def metadata_is_hash
    errors.add(:metadata, "must be a JSON object") unless metadata.is_a?(Hash)
  end

  def skip_tenant_validation
    errors.delete(:tenant)
  end
end
