module Security
  class LoginOtpStore
    KEY_PREFIX = "security:login_otp".freeze

    class << self
      def write(user_id:, code:, ttl:)
        return if user_id.blank? || code.blank?

        cache_store.write(cache_key(user_id), payload_for(code), expires_in: ttl)
      end

      def verify_and_consume(user_id:, code:)
        return false if user_id.blank? || code.blank?

        key = cache_key(user_id)
        payload = cache_store.read(key)
        return false unless payload.is_a?(Hash)

        digest = payload[:digest] || payload["digest"]
        return false if digest.blank?

        if secure_compare(digest, digest_code(code))
          cache_store.delete(key)
          true
        else
          false
        end
      end

      def clear(user_id:)
        return if user_id.blank?

        cache_store.delete(cache_key(user_id))
      end

      private

      def payload_for(code)
        { digest: digest_code(code.to_s) }
      end

      def digest_code(code)
        secret = Rails.application.secret_key_base.to_s
        OpenSSL::HMAC.hexdigest("SHA256", secret, code.to_s)
      end

      def secure_compare(left, right)
        ActiveSupport::SecurityUtils.secure_compare(left, right)
      rescue ArgumentError
        false
      end

      def cache_store
        @cache_store ||= begin
          if Rails.env.test?
            ActiveSupport::Cache::MemoryStore.new
          elsif ENV["REDIS_URL"].present?
            ActiveSupport::Cache::RedisCacheStore.new(url: ENV["REDIS_URL"])
          elsif defined?(Rack::Attack) && Rack::Attack.respond_to?(:cache) && Rack::Attack.cache.respond_to?(:store) && Rack::Attack.cache.store.present?
            Rack::Attack.cache.store
          else
            Rails.cache
          end
        rescue StandardError => e
          Rails.logger.error("LoginOtpStore cache initialization failed: #{Security::PiiMasker.mask_free_text(e.message)}")
          Rails.cache
        end
      end

      def cache_key(user_id)
        "#{KEY_PREFIX}:#{user_id}"
      end
    end
  end
end
