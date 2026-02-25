require "rails_helper"

RSpec.describe Security::PiiMasker do
  describe ".mask_hash" do
    it "masks sensitive keys recursively" do
      payload = {
        email: "john.doe@example.com",
        phone_number: "+254712345678",
        token: "secret-token",
        metadata: {
          message: "Reach me at john.doe@example.com and +254712345678"
        }
      }

      masked = described_class.mask_hash(payload)

      expect(masked[:email]).not_to eq("john.doe@example.com")
      expect(masked[:phone_number]).not_to eq("+254712345678")
      expect(masked[:token]).to eq(Security::PiiMasker::FILTERED)
      expect(masked[:metadata][:message]).not_to include("john.doe@example.com")
      expect(masked[:metadata][:message]).not_to include("+254712345678")
    end
  end
end
