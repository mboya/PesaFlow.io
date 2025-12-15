require "rails_helper"

RSpec.describe "OTP API", type: :request do
  let(:user) { create(:user) }
  let(:token) { login_user(user) }

  describe "POST /api/v1/otp/enable" do
    context "with authenticated user" do
      it "generates OTP secret" do
        post "/api/v1/otp/enable", headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response["data"]["secret"]).to be_present
        expect(user.reload.otp_secret_key).to be_present
      end

      it "returns QR code data" do
        post "/api/v1/otp/enable", headers: auth_headers(token), as: :json

        json_response = JSON.parse(response.body)
        expect(json_response["data"]["qr_code"]).to be_present
        expect(json_response["data"]["qr_code"]).to start_with("data:image/png;base64,")
        expect(json_response["data"]["provisioning_uri"]).to be_present
      end
    end

    context "when OTP already enabled" do
      let(:user) { create(:user, :with_otp) }
      let(:token) { login_user(user) }

      it "returns 422" do
        post "/api/v1/otp/enable", headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        json_response = JSON.parse(response.body)
        expect(json_response["status"]["message"]).to include("already enabled")
      end
    end

    context "without authentication" do
      it "returns 401" do
        post "/api/v1/otp/enable", as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "POST /api/v1/otp/verify" do
    let(:user) { create(:user, :otp_setup_but_not_enabled) }
    let(:token) { login_user(user) }
    let(:otp_code) { generate_valid_otp_for(user) }

    context "with valid OTP code" do
      it "enables 2FA" do
        post "/api/v1/otp/verify", params: {
          otp_code: otp_code
        }, headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:ok)
        expect(user.reload.otp_enabled).to be true
      end

      it "returns backup codes" do
        post "/api/v1/otp/verify", params: {
          otp_code: otp_code
        }, headers: auth_headers(token), as: :json

        json_response = JSON.parse(response.body)
        expect(json_response["backup_codes"]).to be_present
        expect(json_response["backup_codes"].length).to eq(10)
      end
    end

    context "with invalid OTP code" do
      it "returns 422" do
        post "/api/v1/otp/verify", params: {
          otp_code: "000000"
        }, headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        json_response = JSON.parse(response.body)
        expect(json_response["status"]["message"]).to include("Invalid OTP")
      end
    end

    context "without OTP secret setup" do
      let(:user) { create(:user) }
      let(:token) { login_user(user) }

      it "returns 422" do
        post "/api/v1/otp/verify", params: {
          otp_code: "123456"
        }, headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        json_response = JSON.parse(response.body)
        expect(json_response["status"]["message"]).to include("not generated")
      end
    end
  end

  describe "POST /api/v1/otp/disable" do
    let(:user) { create(:user, :with_otp) }
    let(:token) { login_user(user) }
    let(:otp_code) { generate_valid_otp_for(user) }

    context "with valid password and OTP" do
      it "disables 2FA" do
        post "/api/v1/otp/disable", params: {
          password: "password123",
          otp_code: otp_code
        }, headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:ok)
        expect(user.reload.otp_enabled).to be false
        expect(user.otp_secret_key).to be_nil
        expect(user.backup_codes).to be_empty
      end
    end

    context "with invalid password" do
      it "returns 401" do
        post "/api/v1/otp/disable", params: {
          password: "wrongpassword",
          otp_code: otp_code
        }, headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with invalid OTP" do
      it "returns 422" do
        post "/api/v1/otp/disable", params: {
          password: "password123",
          otp_code: "000000"
        }, headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    context "when OTP not enabled" do
      let(:user) { create(:user) }
      let(:token) { login_user(user) }

      it "returns 422" do
        post "/api/v1/otp/disable", params: {
          password: "password123",
          otp_code: "123456"
        }, headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe "POST /api/v1/otp/verify_login" do
    let(:user) { create(:user, :with_otp) }
    let(:otp_code) { generate_valid_otp_for(user) }

    context "with valid OTP code" do
      it "returns JWT token" do
        post "/api/v1/otp/verify_login", params: {
          user_id: user.id,
          otp_code: otp_code
        }, as: :json

        expect(response).to have_http_status(:ok)
        expect(response.headers["Authorization"]).to be_present
        expect(response.headers["Authorization"]).to start_with("Bearer ")
      end
    end

    context "with valid backup code" do
      let(:backup_code) { user.backup_codes.first }

      it "returns JWT token" do
        post "/api/v1/otp/verify_login", params: {
          user_id: user.id,
          otp_code: backup_code
        }, as: :json

        expect(response).to have_http_status(:ok)
        expect(response.headers["Authorization"]).to be_present
      end

      it "removes backup code from list" do
        expect {
          post "/api/v1/otp/verify_login", params: {
            user_id: user.id,
            otp_code: backup_code
          }, as: :json
        }.to change { user.reload.backup_codes.length }.by(-1)
      end
    end

    context "with invalid OTP code" do
      it "returns 401" do
        post "/api/v1/otp/verify_login", params: {
          user_id: user.id,
          otp_code: "000000"
        }, as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with used backup code" do
      let(:backup_code) { user.backup_codes.first }

      before do
        post "/api/v1/otp/verify_login", params: {
          user_id: user.id,
          otp_code: backup_code
        }, as: :json
      end

      it "returns 401" do
        post "/api/v1/otp/verify_login", params: {
          user_id: user.id,
          otp_code: backup_code
        }, as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "POST /api/v1/otp/backup_codes" do
    let(:user) { create(:user, :with_otp) }
    let(:token) { login_user(user) }

    context "with valid password" do
      it "generates new codes" do
        old_codes = user.backup_codes.dup

        post "/api/v1/otp/backup_codes", params: {
          password: "password123"
        }, headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response["backup_codes"]).to be_present
        expect(json_response["backup_codes"].length).to eq(10)
        expect(user.reload.backup_codes).not_to eq(old_codes)
      end

      it "replaces old backup codes" do
        old_codes = user.backup_codes

        post "/api/v1/otp/backup_codes", params: {
          password: "password123"
        }, headers: auth_headers(token), as: :json

        new_codes = user.reload.backup_codes
        expect(new_codes).not_to eq(old_codes)
        expect((new_codes & old_codes).empty?).to be true
      end
    end

    context "without OTP enabled" do
      let(:user) { create(:user) }
      let(:token) { login_user(user) }

      it "returns 422" do
        post "/api/v1/otp/backup_codes", params: {
          password: "password123"
        }, headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe "GET /api/v1/otp/qr_code" do
    let(:user) { create(:user, :with_otp) }
    let(:token) { login_user(user) }

    context "with OTP secret" do
      it "returns QR code image data" do
        get "/api/v1/otp/qr_code", headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response["qr_code"]).to be_present
        expect(json_response["qr_code"]).to start_with("data:image/png;base64,")
      end
    end

    context "without OTP secret" do
      let(:user) { create(:user) }
      let(:token) { login_user(user) }

      it "returns 422" do
        get "/api/v1/otp/qr_code", headers: auth_headers(token), as: :json

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end
end
