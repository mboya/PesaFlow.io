class AuditLog < ApplicationRecord
  STATUSES = %w[success failure denied].freeze

  # Multi-tenancy
  acts_as_tenant :tenant, required: false
  belongs_to :tenant, optional: true

  belongs_to :actor, polymorphic: true, optional: true
  belongs_to :auditable, polymorphic: true, optional: true

  validates :action, presence: true
  validates :request_id, presence: true
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :occurred_at, presence: true
  validate :changeset_and_metadata_are_hashes
  validate :skip_tenant_validation

  before_validation :set_occurred_at, on: :create
  before_update :prevent_mutation
  before_destroy :prevent_mutation

  scope :recent, -> { order(occurred_at: :desc, id: :desc) }

  private

  def set_occurred_at
    self.occurred_at ||= Time.current
  end

  def prevent_mutation
    errors.add(:base, "Audit logs are immutable")
    throw(:abort)
  end

  def changeset_and_metadata_are_hashes
    errors.add(:changeset, "must be a JSON object") unless changeset.is_a?(Hash)
    errors.add(:metadata, "must be a JSON object") unless metadata.is_a?(Hash)
  end

  def skip_tenant_validation
    errors.delete(:tenant)
  end
end
