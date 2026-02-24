class DomainEvent < ApplicationRecord
  # Multi-tenancy
  acts_as_tenant :tenant, required: false
  belongs_to :tenant, optional: true

  belongs_to :actor, polymorphic: true, optional: true
  belongs_to :subject, polymorphic: true, optional: true

  validates :event_type, presence: true
  validates :occurred_at, presence: true
  validate :payload_and_metadata_are_hashes
  validate :skip_tenant_validation

  scope :recent, -> { order(occurred_at: :desc, id: :desc) }
  scope :by_event_type, ->(event_type) { where(event_type: event_type) }
  scope :for_subject, ->(subject) { where(subject_type: subject.class.name, subject_id: subject.id) }

  before_validation :set_occurred_at, on: :create

  private

  def set_occurred_at
    self.occurred_at ||= Time.current
  end

  def payload_and_metadata_are_hashes
    errors.add(:payload, "must be a JSON object") unless payload.is_a?(Hash)
    errors.add(:metadata, "must be a JSON object") unless metadata.is_a?(Hash)
  end

  def skip_tenant_validation
    errors.delete(:tenant)
  end
end
