class Tenant < ApplicationRecord
  # Tenant model should NOT be tenant-scoped (it IS the tenant)
  # Clear default scopes that acts_as_tenant might have added
  self.default_scopes = []

  # Override the acts_as_tenant method to do nothing for Tenant model
  def self.acts_as_tenant(*args)
    # No-op: Tenant is not tenant-scoped
  end

  # Validations
  validates :name, presence: true
  validates :subdomain, presence: true, uniqueness: { case_sensitive: false }, format: { with: /\A[a-z0-9-]+\z/, message: "can only contain lowercase letters, numbers, and hyphens" }
  validates :status, inclusion: { in: %w[active suspended cancelled] }
  validates :domain, uniqueness: true, allow_nil: true

  # Scopes
  scope :active, -> { where(status: "active") }
  scope :suspended, -> { where(status: "suspended") }
  scope :cancelled, -> { where(status: "cancelled") }

  # Associations
  has_many :users, dependent: :destroy
  has_many :customers, dependent: :destroy
  has_many :subscriptions, through: :customers
  has_many :payments, through: :subscriptions
  has_many :billing_attempts, through: :subscriptions
  has_many :refunds, through: :subscriptions
  has_many :webhook_logs, dependent: :destroy

  # Callbacks
  before_validation :normalize_subdomain

  # Skip tenant validation - Tenant model doesn't belong to itself
  validate :skip_tenant_validation, on: :create

  def skip_tenant_validation
    # Override any tenant presence validation from acts_as_tenant
    errors.delete(:tenant)
  end

  # Instance methods
  def active?
    status == "active"
  end

  def suspended?
    status == "suspended"
  end

  def cancelled?
    status == "cancelled"
  end

  # Class methods
  def self.generate_unique_subdomain_from_email(email)
    return nil unless email.present?

    # Extract the local part and domain from email
    # e.g., "john.doe@example.com" -> ["john.doe", "example.com"]
    local_part, domain = email.downcase.strip.split("@")
    return nil unless local_part.present? && domain.present?

    # Clean the local part: replace dots, underscores, plus signs with hyphens, remove invalid chars
    # e.g., "john.doe" -> "john-doe", "test.user+tag" -> "test-user-tag"
    cleaned_local = local_part.gsub(/[._+]/, "-").gsub(/[^a-z0-9-]/, "").gsub(/-+/, "-").gsub(/^-|-$/, "")

    # Extract domain name (without TLD)
    # e.g., "example.com" -> "example", "company.co.uk" -> "company"
    domain_name = domain.split(".").first
    cleaned_domain = (domain_name || "user").gsub(/[^a-z0-9-]/, "")

    # Combine: "john-doe-example"
    base_subdomain = "#{cleaned_local}-#{cleaned_domain}"

    # Remove consecutive hyphens and trim from ends
    base_subdomain = base_subdomain.gsub(/-+/, "-").gsub(/^-|-$/, "")

    # Ensure it's not empty
    return "user" if base_subdomain.blank?

    # Ensure it's not too long (subdomain length limits, typically 63 chars)
    # Reserve space for uniqueness suffix (e.g., "-2" = 2 chars)
    max_base_length = 50
    base_subdomain = base_subdomain[0..max_base_length-1] if base_subdomain.length > max_base_length

    # Ensure uniqueness by appending a number if needed
    subdomain = base_subdomain
    counter = 1

    while Tenant.exists?(subdomain: subdomain)
      suffix = "-#{counter}"
      # Ensure total length doesn't exceed limits (63 chars for DNS)
      max_length = 60 - suffix.length
      truncated = base_subdomain[0..max_length-1]
      subdomain = "#{truncated}#{suffix}"
      counter += 1

      # Safety check to prevent infinite loops
      if counter > 1000
        # Fallback to timestamp-based subdomain
        subdomain = "#{base_subdomain[0..40]}-#{Time.current.to_i}"
        break
      end
    end

    subdomain
  end

  private

  def normalize_subdomain
    return unless subdomain.present?
    self.subdomain = subdomain.downcase.strip
  end
end

# Remove tenant association after class loads (for queries)
# Note: We keep a custom validator to override the presence validation
Rails.application.config.after_initialize do
  Tenant._reflections.delete("tenant") if Tenant._reflections.key?("tenant")
end

begin
  Tenant._reflections.delete("tenant") if Tenant._reflections.key?("tenant")
rescue
  # Ignore if Tenant class isn't fully loaded yet
end
