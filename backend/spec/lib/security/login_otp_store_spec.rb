require "rails_helper"

RSpec.describe Security::LoginOtpStore do
  describe ".write and .verify_and_consume" do
    let(:user) { create(:user) }
    let(:code) { "123456" }

    it "verifies and consumes a matching code" do
      described_class.write(user_id: user.id, code: code, ttl: 10.minutes)

      expect(described_class.verify_and_consume(user_id: user.id, code: code)).to be(true)
      expect(described_class.verify_and_consume(user_id: user.id, code: code)).to be(false)
    end

    it "rejects invalid codes" do
      described_class.write(user_id: user.id, code: code, ttl: 10.minutes)

      expect(described_class.verify_and_consume(user_id: user.id, code: "000000")).to be(false)
    end
  end
end
