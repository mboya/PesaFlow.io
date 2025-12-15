module Api
  module V1
    class OtpSerializer
      def self.serialize(user, include_backup_codes: false)
        {
          secret: user.otp_secret_key,
          qr_code: user.qr_code_data_url,
          provisioning_uri: user.provisioning_uri,
          backup_codes: include_backup_codes ? user.backup_codes : nil
        }.compact
      end
    end
  end
end
