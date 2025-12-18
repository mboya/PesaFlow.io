require "rails_helper"

RSpec.describe "Authentication Integration", type: :request do
  describe "Full authentication flow" do
    it "allows sign up, login, access protected endpoint, and logout" do
      # Sign up new user
      post "/api/v1/signup", params: {
        user: {
          email: "integration@example.com",
          password: "password123"
        }
      }, as: :json

      expect(response).to have_http_status(:ok)
      token = extract_jwt_token(response)
      expect(token).to be_present

      # Access protected endpoint with token
      get "/api/v1/protected", headers: auth_headers(token), as: :json
      expect(response).to have_http_status(:ok)

      # Logout
      delete "/api/v1/logout", headers: auth_headers(token), as: :json
      expect(response).to have_http_status(:ok)

      # Verify token is revoked
      get "/api/v1/protected", headers: auth_headers(token), as: :json
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "Full OTP flow" do
    let(:user) { create(:user, email: "otp@example.com", password: "password123") }

    it "allows login, enable OTP, verify OTP, and login with OTP" do
      # Login and get JWT token
      token = login_user(user)
      expect(token).to be_present

      # Enable OTP (get secret and QR code)
      post "/api/v1/otp/enable", headers: auth_headers(token), as: :json
      expect(response).to have_http_status(:ok)

      json_response = JSON.parse(response.body)
      expect(json_response["data"]["secret"]).to be_present

      # Verify OTP with valid code
      otp_code = generate_valid_otp_for(user.reload)
      post "/api/v1/otp/verify", params: {
        otp_code: otp_code
      }, headers: auth_headers(token), as: :json

      expect(response).to have_http_status(:ok)
      expect(user.reload.otp_enabled).to be true

      # Receive backup codes
      backup_codes = JSON.parse(response.body)["backup_codes"]
      expect(backup_codes.length).to eq(10)

      # Logout
      delete "/api/v1/logout", headers: auth_headers(token), as: :json

      # Login with password (should require OTP)
      post "/api/v1/login", params: {
        user: {
          email: "otp@example.com",
          password: "password123"
        }
      }, as: :json

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["otp_required"]).to be true

      # Verify OTP to complete login
      new_otp_code = generate_valid_otp_for(user.reload)
      post "/api/v1/otp/verify_login", params: {
        user_id: user.id,
        otp_code: new_otp_code
      }, as: :json

      expect(response).to have_http_status(:ok)
      new_token = extract_jwt_token(response)
      expect(new_token).to be_present

      # Access protected endpoint
      get "/api/v1/protected", headers: auth_headers(new_token), as: :json
      expect(response).to have_http_status(:ok)
    end
  end

  describe "OTP backup code flow" do
    let(:user) { create(:user, :with_otp, email: "backup@example.com", password: "password123") }
    let(:backup_code) { user.backup_codes.first }

    it "allows login with backup code and removes it" do
      # Setup OTP and save backup codes
      expect(user.backup_codes.length).to eq(10)

      # Logout (if logged in)
      # Login with password
      post "/api/v1/login", params: {
        user: {
          email: "backup@example.com",
          password: "password123"
        }
      }, as: :json

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["otp_required"]).to be true

      # Use backup code instead of OTP
      post "/api/v1/otp/verify_login", params: {
        user_id: user.id,
        otp_code: backup_code
      }, as: :json

      expect(response).to have_http_status(:ok)
      token = extract_jwt_token(response)
      expect(token).to be_present

      # Verify backup code is removed
      expect(user.reload.backup_codes).not_to include(backup_code)
      expect(user.backup_codes.length).to eq(9)

      # Cannot reuse same backup code
      post "/api/v1/otp/verify_login", params: {
        user_id: user.id,
        otp_code: backup_code
      }, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "OTP disable flow" do
    let(:user) { create(:user, :with_otp, email: "disable@example.com", password: "password123") }
    let(:token) { login_with_otp(user) }

    it "allows disable OTP with password and current OTP" do
      # Enable OTP (already enabled in factory)
      expect(user.otp_enabled).to be true

      # Disable OTP with password + current OTP
      otp_code = generate_valid_otp_for(user)
      post "/api/v1/otp/disable", params: {
        password: "password123",
        otp_code: otp_code
      }, headers: auth_headers(token), as: :json

      expect(response).to have_http_status(:ok)
      expect(user.reload.otp_enabled).to be false

      # Login should not require OTP anymore
      delete "/api/v1/logout", headers: auth_headers(token), as: :json

      post "/api/v1/login", params: {
        user: {
          email: "disable@example.com",
          password: "password123"
        }
      }, as: :json

      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response["otp_required"]).to be_nil
      expect(extract_jwt_token(response)).to be_present
    end
  end
end
