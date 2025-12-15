require "rails_helper"

RSpec.describe JwtDenylist, type: :model do
  describe "table name" do
    it "uses jwt_denylists table" do
      expect(described_class.table_name).to eq("jwt_denylists")
    end
  end

  describe "revocation strategy" do
    it "includes Devise::JWT::RevocationStrategies::Denylist" do
      expect(described_class.included_modules).to include(Devise::JWT::RevocationStrategies::Denylist)
    end
  end

  describe "validations" do
    it "requires jti" do
      denylist = build(:jwt_denylist, jti: nil)
      expect(denylist).not_to be_valid
    end

    it "requires exp" do
      denylist = build(:jwt_denylist, exp: nil)
      expect(denylist).not_to be_valid
    end
  end
end
