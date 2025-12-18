class JwtDenylist < ApplicationRecord
  include Devise::JWT::RevocationStrategies::Denylist

  self.table_name = "jwt_denylists"

  validates :jti, presence: true, uniqueness: true
  validates :exp, presence: true
end
