class User < ApplicationRecord
  # Include default devise modules.
  # We intentionally avoid :validatable to enforce tenant-scoped email uniqueness.
  devise :database_authenticatable, :registerable,
         :jwt_authenticatable, :argon2,
         jwt_revocation_strategy: JwtDenylist,
         argon2_options: {
           secret: ENV["ARGON2_SECRET_KEY"]
         }

  # Multi-tenancy
  acts_as_tenant :tenant, required: false
  belongs_to :tenant, optional: true

  # Override find_for_jwt_authentication to ensure user lookup isn't tenant-scoped
  # JWT authentication should work across tenants
  def self.find_for_jwt_authentication(sub)
    # Temporarily disable tenant scoping to find user by JWT subject
    ActsAsTenant.without_tenant do
      find_by(id: sub)
    end
  end

  # Associations
  has_one :customer, dependent: :destroy
  has_many :audit_logs, as: :actor, dependent: :nullify

  ROLES = {
    member: "member",
    support: "support",
    admin: "admin",
    owner: "owner"
  }.freeze

  enum :role, ROLES, prefix: true

  # Callbacks
  before_validation :ensure_tenant, on: :create
  before_validation :normalize_email
  before_validation :set_default_role
  before_validation :sync_legacy_admin_flag_from_role

  # Validations
  validates :email, presence: true,
                    format: { with: URI::MailTo::EMAIL_REGEXP },
                    uniqueness: { scope: :tenant_id, case_sensitive: false }
  validates :password, presence: true, confirmation: true, length: { in: Devise.password_length }, if: :password_required?
  validates :password_confirmation, presence: true, if: :password_required?
  validates :role, inclusion: { in: ROLES.values }

  # Serialize backup_codes as array
  serialize :backup_codes, coder: JSON

  OTP_SECRET_ENCRYPTION_PREFIX = "enc:v1:".freeze

  # OTP Methods (public for controller access)

  # Generate a new OTP secret key
  def generate_otp_secret
    self.otp_secret_key = ROTP::Base32.random
    save!
    otp_secret_key
  end

  # Get current OTP code (6-digit)
  def current_otp
    return nil unless otp_secret_key.present?

    totp = ROTP::TOTP.new(otp_secret_key)
    totp.now
  end

  # Verify OTP code with drift tolerance (±1 time step = 90 seconds total)
  OTP_DRIFT_BEHIND = 1
  OTP_DRIFT_AHEAD = 1

  EMAIL_LOGIN_OTP_LENGTH = 6
  EMAIL_LOGIN_OTP_TTL = 10.minutes

  def verify_otp(code)
    return false unless otp_secret_key.present?

    totp = ROTP::TOTP.new(otp_secret_key)
    totp.verify(code.to_s, drift_behind: OTP_DRIFT_BEHIND, drift_ahead: OTP_DRIFT_AHEAD).present?
  end

  def generate_email_login_otp!
    code = format("%0#{EMAIL_LOGIN_OTP_LENGTH}d", SecureRandom.random_number(10**EMAIL_LOGIN_OTP_LENGTH))
    Security::LoginOtpStore.write(user_id: id, code: code, ttl: EMAIL_LOGIN_OTP_TTL)
    code
  end

  def verify_email_login_otp(code)
    Security::LoginOtpStore.verify_and_consume(user_id: id, code: code)
  end

  # Generate backup codes
  BACKUP_CODE_COUNT = 10
  BACKUP_CODE_LENGTH = 8
  BACKUP_CODE_HASH_PREFIX = "bcrypt:".freeze

  def generate_backup_codes
    codes = Array.new(BACKUP_CODE_COUNT) { SecureRandom.alphanumeric(BACKUP_CODE_LENGTH).upcase }
    self.backup_codes = codes.map { |code| hash_backup_code(code) }
    save!
    codes
  end

  # Verify and remove a backup code
  def verify_backup_code(code)
    return false unless backup_codes.present?

    normalized_code = code.to_s.upcase
    mutable_codes = backup_codes.dup

    matched_index = mutable_codes.index { |stored_code| backup_code_matches?(stored_code, normalized_code) }
    return false unless matched_index

    mutable_codes.delete_at(matched_index)
    self.backup_codes = mutable_codes
    # Persist best-effort without blocking authentication on validation issues.
    save(validate: false)
    true
  end

  # Generate provisioning URI for QR code
  def provisioning_uri(issuer = DEFAULT_ISSUER)
    return nil unless otp_secret_key.present?

    ROTP::TOTP.new(otp_secret_key, issuer: issuer).provisioning_uri(email)
  end

  # QR code generation constants
  QR_CODE_SIZE = 300
  QR_CODE_BORDER = 4
  QR_CODE_MODULE_SIZE = 6
  DEFAULT_ISSUER = "PesaFlow"

  # Generate QR code as data URL
  def qr_code_data_url(issuer = DEFAULT_ISSUER)
    return nil unless otp_secret_key.present?

    uri = provisioning_uri(issuer)
    return nil unless uri

    qr = RQRCode::QRCode.new(uri)
    png = qr.as_png(
      bit_depth: 1,
      border_modules: QR_CODE_BORDER,
      color_mode: ChunkyPNG::COLOR_GRAYSCALE,
      color: "black",
      file: nil,
      fill: "white",
      module_px_size: QR_CODE_MODULE_SIZE,
      resize_exactly_to: false,
      resize_gte_to: false,
      size: QR_CODE_SIZE
    )
    "data:image/png;base64,#{Base64.strict_encode64(png.to_s)}"
  end

  # Admin check
  def admin?
    role_admin? || role_owner? || self[:admin] == true
  end

  def support?
    role_support? || admin?
  end

  # Encrypt/decrypt otp_secret_key transparently at rest.
  def otp_secret_key
    decrypt_otp_secret_key(self[:otp_secret_key])
  end

  def otp_secret_key=(value)
    self[:otp_secret_key] = encrypt_otp_secret_key(value)
  end

  private

  DEFAULT_TENANT_SUBDOMAIN = "default"

  def set_default_role
    self.role = self[:admin] ? "admin" : "member" if role.blank?
  end

  def sync_legacy_admin_flag_from_role
    self[:admin] = %w[admin owner].include?(role.to_s)
  end

  def password_required?
    !persisted? || password.present? || password_confirmation.present?
  end

  def normalize_email
    self.email = email.to_s.downcase.strip if email.present?
  end

  def ensure_tenant
    return if tenant_id.present?

    # Only set default tenant if no tenant was explicitly assigned
    # This allows controllers to set tenant before validation
    ActsAsTenant.without_tenant do
      default_tenant = Tenant.find_by(subdomain: DEFAULT_TENANT_SUBDOMAIN)
      self.tenant_id = default_tenant.id if default_tenant
    end
  end

  def hash_backup_code(code)
    bcrypt_digest = BCrypt::Password.create(code.to_s.upcase)
    "#{BACKUP_CODE_HASH_PREFIX}#{bcrypt_digest}"
  end

  def backup_code_matches?(stored_code, candidate)
    raw = stored_code.to_s
    return false if raw.blank?

    if raw.start_with?(BACKUP_CODE_HASH_PREFIX)
      digest = raw.delete_prefix(BACKUP_CODE_HASH_PREFIX)
      BCrypt::Password.new(digest).is_password?(candidate)
    else
      # Legacy plaintext compatibility for existing rows.
      ActiveSupport::SecurityUtils.secure_compare(raw.upcase, candidate)
    end
  rescue BCrypt::Errors::InvalidHash
    false
  rescue ArgumentError
    false
  end

  def encrypt_otp_secret_key(value)
    return nil if value.blank?

    ciphertext = self.class.otp_secret_encryptor.encrypt_and_sign(value.to_s)
    "#{OTP_SECRET_ENCRYPTION_PREFIX}#{ciphertext}"
  end

  def decrypt_otp_secret_key(value)
    return nil if value.blank?

    raw = value.to_s
    return raw unless raw.start_with?(OTP_SECRET_ENCRYPTION_PREFIX)

    token = raw.delete_prefix(OTP_SECRET_ENCRYPTION_PREFIX)
    self.class.otp_secret_encryptor.decrypt_and_verify(token)
  rescue ActiveSupport::MessageEncryptor::InvalidMessage
    nil
  end

  def self.otp_secret_encryptor
    @otp_secret_encryptor ||= begin
      key_len = ActiveSupport::MessageEncryptor.key_len
      generator = ActiveSupport::KeyGenerator.new(Rails.application.secret_key_base, iterations: 1000)
      secret = generator.generate_key("user_otp_secret_key", key_len)
      ActiveSupport::MessageEncryptor.new(secret)
    end
  end
end
