require "rails_helper"

RSpec.describe Security::OtpLoginChallenge do
  describe ".issue and .resolve_user_id" do
    it "issues a challenge token and resolves user id" do
      token = described_class.issue(user_id: 42, ttl: 10.minutes)

      expect(token).to be_present
      expect(described_class.resolve_user_id(token)).to eq(42)
    end

    it "returns nil for invalid token" do
      expect(described_class.resolve_user_id("invalid-token")).to be_nil
    end

    it "returns nil for expired token" do
      token = described_class.issue(user_id: 7, ttl: 1.second)
      future_time = Time.current + 2.seconds
      allow(Time).to receive(:current).and_return(future_time)

      expect(described_class.resolve_user_id(token)).to be_nil
    end
  end
end
