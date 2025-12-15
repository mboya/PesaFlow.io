class User < ApplicationRecord
  # Include default devise modules
  devise :database_authenticatable, :registerable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  # Associations
  has_one :customer, dependent: :destroy

  # Validations
  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }

  # Serialize backup_codes as array
  serialize :backup_codes, coder: JSON

  # Note: OTP secret key should be encrypted at rest in production
  # For now, storing as plain text. Consider using attr_encrypted gem
  # or Rails encrypted attributes for production

  # OTP Methods

  # Generate a new OTP secret key
  def generate_otp_secret
    self.otp_secret_key = ROTP::Base32.random
    save
    otp_secret_key
  end

  # Get current OTP code (6-digit)
  def current_otp
    return nil unless otp_secret_key.present?

    totp = ROTP::TOTP.new(otp_secret_key)
    totp.now
  end

  # Verify OTP code with drift tolerance (±1 time step = 90 seconds total)
  def verify_otp(code)
    return false unless otp_secret_key.present?

    totp = ROTP::TOTP.new(otp_secret_key)
    totp.verify(code.to_s, drift_behind: 1, drift_ahead: 1)
  end

  # Generate 10 backup codes (8-character alphanumeric)
  def generate_backup_codes
    codes = Array.new(10) { SecureRandom.alphanumeric(8).upcase }
    self.backup_codes = codes
    save
    codes
  end

  # Verify and remove a backup code
  def verify_backup_code(code)
    return false unless backup_codes.present?

    normalized_code = code.to_s.upcase
    if backup_codes.include?(normalized_code)
      self.backup_codes = backup_codes - [ normalized_code ]
      save
      true
    else
      false
    end
  end

  # Generate provisioning URI for QR code
  def provisioning_uri(issuer = "PesaFlow")
    return nil unless otp_secret_key.present?

    ROTP::TOTP.new(otp_secret_key, issuer: issuer).provisioning_uri(email)
  end

  # Generate QR code as data URL
  def qr_code_data_url(issuer = "PesaFlow")
    return nil unless otp_secret_key.present?

    uri = provisioning_uri(issuer)
    return nil unless uri

    qr = RQRCode::QRCode.new(uri)
    png = qr.as_png(
      bit_depth: 1,
      border_modules: 4,
      color_mode: ChunkyPNG::COLOR_GRAYSCALE,
      color: "black",
      file: nil,
      fill: "white",
      module_px_size: 6,
      resize_exactly_to: false,
      resize_gte_to: false,
      size: 300
    )
    "data:image/png;base64,#{Base64.strict_encode64(png.to_s)}"
  end
end
