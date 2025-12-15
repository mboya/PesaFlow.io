module AuthHelpers
  # Extract JWT token from response headers
  def extract_jwt_token(response)
    auth_header = response.headers["Authorization"]
    return nil unless auth_header

    auth_header.split(" ").last
  end

  # Create authenticated request headers with JWT token
  def auth_headers(token)
    { "Authorization" => "Bearer #{token}" }
  end

  # Login user and return JWT token
  def login_user(user, password = "password123")
    post "/api/v1/login", params: {
      user: {
        email: user.email,
        password: password
      }
    }, as: :json

    extract_jwt_token(response)
  end

  # Generate valid OTP code for user
  def generate_valid_otp_for(user)
    return nil unless user.otp_secret_key.present?

    totp = ROTP::TOTP.new(user.otp_secret_key)
    totp.now
  end

  # Setup OTP for user (generates secret and enables)
  def setup_otp_for(user)
    user.generate_otp_secret
    otp_code = generate_valid_otp_for(user)
    user.verify_otp(otp_code)
    user.update(otp_enabled: true)
    user.generate_backup_codes
    { secret: user.otp_secret_key, otp_code: otp_code, backup_codes: user.backup_codes }
  end

  # Login with OTP (two-step process)
  def login_with_otp(user, password = "password123", otp_code = nil)
    # Step 1: Login with password
    post "/api/v1/login", params: {
      user: {
        email: user.email,
        password: password
      }
    }, as: :json

    return nil unless response.status == 200

    # Step 2: Verify OTP
    otp_code ||= generate_valid_otp_for(user)
    post "/api/v1/otp/verify_login", params: {
      user_id: user.id,
      otp_code: otp_code
    }, as: :json

    extract_jwt_token(response)
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :request
end
