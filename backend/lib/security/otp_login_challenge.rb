module Security
  class OtpLoginChallenge
    PURPOSE = "otp_login_challenge".freeze

    class << self
      def issue(user_id:, ttl:)
        return nil if user_id.blank? || ttl.blank?

        payload = {
          user_id: user_id.to_i,
          exp: (Time.current + ttl).to_i
        }

        encryptor.encrypt_and_sign(payload, purpose: PURPOSE)
      end

      def resolve_user_id(token)
        return nil if token.blank?

        payload = encryptor.decrypt_and_verify(token, purpose: PURPOSE)
        return nil unless payload.is_a?(Hash)

        exp = payload[:exp] || payload["exp"]
        return nil if exp.blank? || Time.at(exp.to_i) < Time.current

        user_id = payload[:user_id] || payload["user_id"]
        user_id.to_i if user_id.present?
      rescue ActiveSupport::MessageEncryptor::InvalidMessage
        nil
      end

      private

      def encryptor
        @encryptor ||= begin
          key_len = ActiveSupport::MessageEncryptor.key_len
          generator = ActiveSupport::KeyGenerator.new(Rails.application.secret_key_base, iterations: 1000)
          secret = generator.generate_key(PURPOSE, key_len)
          ActiveSupport::MessageEncryptor.new(secret)
        end
      end
    end
  end
end
