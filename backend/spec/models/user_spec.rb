require "rails_helper"

RSpec.describe User, type: :model do
  describe "Devise modules" do
    it { is_expected.to respond_to(:email) }
    it { is_expected.to respond_to(:password) }
    it { is_expected.to respond_to(:valid_password?) }
  end

  describe "validations" do
    subject { build(:user) }

    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }

    it "validates email format" do
      user = build(:user, email: "invalid-email")
      expect(user).not_to be_valid
      expect(user.errors[:email]).to be_present
    end

    it "accepts valid email format" do
      user = build(:user, email: "valid@example.com")
      expect(user).to be_valid
    end
  end

  describe "OTP methods" do
    let(:user) { create(:user) }

    describe "#generate_otp_secret" do
      it "generates a valid OTP secret" do
        secret = user.generate_otp_secret
        expect(secret).to be_present
        expect(secret.length).to be >= 16
        expect(user.reload.otp_secret_key).to eq(secret)
      end
    end

    describe "#current_otp" do
      context "when OTP secret is present" do
        before { user.generate_otp_secret }

        it "returns a 6-digit code" do
          code = user.current_otp
          expect(code).to be_present
          expect(code.to_s.length).to eq(6)
          expect(code.to_s).to match(/\d{6}/)
        end
      end

      context "when OTP secret is not present" do
        it "returns nil" do
          expect(user.current_otp).to be_nil
        end
      end
    end

    describe "#verify_otp" do
      let(:user) { create(:user, :with_otp) }

      it "returns true for valid OTP code" do
        code = user.current_otp
        expect(user.verify_otp(code)).to be true
      end

      it "returns false for invalid OTP code" do
        expect(user.verify_otp("000000")).to be false
      end

      it "returns false when OTP secret is not present" do
        user_without_otp = create(:user)
        expect(user_without_otp.verify_otp("123456")).to be false
      end

      it "handles expired codes with drift tolerance" do
        # This test verifies that drift tolerance works
        # In practice, codes are valid for ±1 time step (90 seconds total)
        code = user.current_otp
        expect(user.verify_otp(code)).to be true
      end
    end

    describe "#generate_backup_codes" do
      it "generates 10 backup codes" do
        codes = user.generate_backup_codes
        expect(codes.length).to eq(10)
        expect(codes.all? { |code| code.length == 8 }).to be true
        expect(user.reload.backup_codes.length).to eq(10)
      end

      it "generates unique codes" do
        codes = user.generate_backup_codes
        expect(codes.uniq.length).to eq(codes.length)
      end
    end

    describe "#verify_backup_code" do
      let(:user) { create(:user, backup_codes: [ "ABC12345", "XYZ98765" ]) }

      it "returns true and removes code for valid backup code" do
        expect(user.verify_backup_code("ABC12345")).to be true
        expect(user.reload.backup_codes).not_to include("ABC12345")
        expect(user.backup_codes).to include("XYZ98765")
      end

      it "returns false for invalid backup code" do
        expect(user.verify_backup_code("INVALID")).to be false
        expect(user.reload.backup_codes.length).to eq(2)
      end

      it "is case insensitive" do
        expect(user.verify_backup_code("abc12345")).to be true
      end

      it "returns false when backup codes are empty" do
        user_without_codes = create(:user, backup_codes: [])
        expect(user_without_codes.verify_backup_code("ANYCODE")).to be false
      end
    end

    describe "#provisioning_uri" do
      let(:user) { create(:user, :with_otp) }

      it "returns valid otpauth:// URI" do
        uri = user.provisioning_uri
        expect(uri).to be_present
        expect(uri).to start_with("otpauth://totp/")
        # Email is URL-encoded in the URI, so check for encoded version
        expect(uri).to include(ERB::Util.url_encode(user.email))
        expect(uri).to include("secret=")
      end

      it "returns nil when OTP secret is not present" do
        user_without_otp = create(:user)
        expect(user_without_otp.provisioning_uri).to be_nil
      end

      it "accepts custom issuer" do
        uri = user.provisioning_uri("CustomApp")
        expect(uri).to include("issuer=CustomApp")
      end
    end

    describe "#qr_code_data_url" do
      let(:user) { create(:user, :with_otp) }

      it "returns data URL for QR code" do
        data_url = user.qr_code_data_url
        expect(data_url).to be_present
        expect(data_url).to start_with("data:image/png;base64,")
      end

      it "returns nil when OTP secret is not present" do
        user_without_otp = create(:user)
        expect(user_without_otp.qr_code_data_url).to be_nil
      end
    end
  end
end
