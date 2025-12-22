class User < ApplicationRecord
  # Include default devise modules
  # Note: We override email uniqueness validation with tenant-scoped version
  devise :database_authenticatable, :registerable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

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

  # Callbacks
  before_validation :ensure_tenant, on: :create
  before_validation :ensure_devise_validator_removed
  after_validation :clear_devise_email_uniqueness_error_if_no_tenant_duplicate

  # Validations
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }

  # Custom email uniqueness validation scoped by tenant_id
  # This overrides Devise's global uniqueness validation
  # Run BEFORE Devise's validators (prepend: true) to prevent Devise from adding errors
  # We'll add our own error if there's a duplicate within the tenant
  validate :validate_email_uniqueness_within_tenant, prepend: true

  def validate_email_uniqueness_within_tenant
    return unless email.present?

    # Get tenant_id from association if not directly set
    tenant_id_to_check = tenant_id || tenant&.id
    return unless tenant_id_to_check.present?

    # Check for existing user with same email in the same tenant
    # Use without_tenant to query across all tenants for uniqueness check
    # For new records (id is nil), we need to check if any user exists with this email in this tenant
    # For existing records, we exclude the current record from the check
    existing_user = ActsAsTenant.without_tenant do
      scope = User.where("LOWER(email) = ?", email.downcase.strip)
                   .where(tenant_id: tenant_id_to_check)

      # Exclude current record if this is an update
      scope = scope.where.not(id: id) if id.present?

      scope.exists?
    end

    if existing_user
      # Add our tenant-scoped error
      # This will prevent Devise's validator from running (validation stops on first error)
      errors.add(:email, :taken, value: email)
    end
    # If no duplicate found within the tenant, don't add any error
    # Devise's validator will run after ours, but we'll clear its error in an after_validation callback
  end

  # Serialize backup_codes as array
  serialize :backup_codes, coder: JSON

  # Note: OTP secret key should be encrypted at rest in production
  # For now, storing as plain text. Consider using attr_encrypted gem
  # or Rails encrypted attributes for production

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

  def verify_otp(code)
    return false unless otp_secret_key.present?

    totp = ROTP::TOTP.new(otp_secret_key)
    totp.verify(code.to_s, drift_behind: OTP_DRIFT_BEHIND, drift_ahead: OTP_DRIFT_AHEAD).present?
  end

  # Generate backup codes
  BACKUP_CODE_COUNT = 10
  BACKUP_CODE_LENGTH = 8

  def generate_backup_codes
    codes = Array.new(BACKUP_CODE_COUNT) { SecureRandom.alphanumeric(BACKUP_CODE_LENGTH).upcase }
    self.backup_codes = codes
    save!
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
    admin == true
  end

  private

  DEFAULT_TENANT_SUBDOMAIN = "default"

  def ensure_devise_validator_removed
    self.class.remove_devise_email_uniqueness_validator
  end

  def clear_devise_email_uniqueness_error_if_no_tenant_duplicate
    return unless email.present?
    
    tenant_id_to_check = tenant_id || tenant&.id
    return unless tenant_id_to_check.present?

    # Check if there's actually a duplicate within the tenant
    # If not, clear Devise's global uniqueness error
    has_tenant_duplicate = ActsAsTenant.without_tenant do
      scope = User.where("LOWER(email) = ?", email.downcase.strip)
                   .where(tenant_id: tenant_id_to_check)
      scope = scope.where.not(id: id) if id.present?
      scope.exists?
    end

    # If there's no duplicate within the tenant, clear Devise's "taken" errors
    # This allows same email across different tenants
    unless has_tenant_duplicate
      if errors.details[:email].present?
        taken_indices = []
        errors.details[:email].each_with_index do |detail, index|
          is_taken = detail[:error] == :taken || 
                    (errors[:email][index].present? && errors[:email][index].to_s.downcase.include?('taken'))
          taken_indices << index if is_taken
        end
        
        # Remove "taken" errors by index (in reverse order to maintain indices)
        taken_indices.reverse.each do |index|
          errors.details[:email].delete_at(index) if errors.details[:email].present?
          errors[:email].delete_at(index) if errors[:email].present?
        end
      end
    end
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

  # Class method to remove Devise's email uniqueness validator
  # This must be called after the class is fully loaded
  def self.remove_devise_email_uniqueness_validator
    begin
      # Clear validators cache first to force Rails to rebuild it
      User._validators_cache.clear if User._validators_cache

      # Remove non-scoped email uniqueness validators added by Devise
      # Keep only our tenant-scoped validation
      if User._validators && User._validators[:email]
        User._validators[:email].reject! do |validator|
          validator.is_a?(ActiveRecord::Validations::UniquenessValidator) &&
          !validator.options.key?(:scope)
        end
      end
      
      # Also check _validate_callbacks for any uniqueness validations
      # Devise adds validators via callbacks, so we need to remove them from the callback chain
      if User._validate_callbacks
        User._validate_callbacks.reject! do |callback|
          callback.filter.is_a?(ActiveRecord::Validations::UniquenessValidator) &&
          callback.filter.attributes.include?(:email) &&
          !callback.filter.options.key?(:scope)
        end
      end

      # Clear validators cache again after removal
      User._validators_cache.clear if User._validators_cache
    rescue => e
      # Ignore errors - validator might already be removed
      Rails.logger.debug("Failed to remove Devise email uniqueness validator: #{e.message}")
    end
  end
end

# Remove Devise's email uniqueness validator (added by :validatable)
# We use our own tenant-scoped validation instead
# This must be done after the class is fully loaded and in tests
Rails.application.config.after_initialize do
  User.remove_devise_email_uniqueness_validator
end

# RSpec configuration is handled in spec/rails_helper.rb
