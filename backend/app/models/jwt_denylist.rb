class JwtDenylist < ApplicationRecord
  include Devise::JWT::RevocationStrategies::Denylist

  self.table_name = "jwt_denylists"

  # JwtDenylist is not tenant-scoped - tokens are global
  # Override acts_as_tenant to prevent tenant scoping
  self.default_scopes = []

  def self.acts_as_tenant(*args)
    # No-op: JwtDenylist is not tenant-scoped
  end

  # Override the revocation method to ensure it runs without tenant scoping
  # Also handle the case where token is already revoked (idempotent)
  def self.revoke_jwt(payload, user)
    ActsAsTenant.without_tenant do
      jti = payload["jti"]
      exp = Time.at(payload["exp"].to_i)

      # Check if already revoked (idempotent revocation)
      existing = find_by(jti: jti)
      return existing if existing.present?

      # Create new denylist entry
      create!(jti: jti, exp: exp)
    end
  end

  # Skip tenant validation
  validate :skip_tenant_validation, on: :create

  def skip_tenant_validation
    errors.delete(:tenant)
  end

  validates :jti, presence: true, uniqueness: true
  validates :exp, presence: true
end
