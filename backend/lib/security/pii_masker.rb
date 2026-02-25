module Security
  module PiiMasker
    FILTERED = "[FILTERED]".freeze

    EMAIL_REGEX = /\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b/i
    PHONE_REGEX = /(?<!\w)(?:\+?\d[\d\-\s]{7,}\d)(?!\w)/

    SECRET_KEY_PATTERN = /(passw|secret|token|credential|authorization|api[_-]?key|jwt|otp|backup|private[_-]?key|client_secret|session|cookie)/i
    EMAIL_KEY_PATTERN = /email|recipient/i
    PHONE_KEY_PATTERN = /phone|msisdn|mobile|tel/i
    FREE_TEXT_KEY_PATTERN = /message|reason|description|notes?|comment|body|error/i

    extend self

    def mask_hash(value)
      hash = normalize_hash(value)
      hash.each_with_object({}) do |(key, raw_value), acc|
        acc[key] = mask_value(raw_value, key: key.to_s)
      end
    end

    def mask_value(value, key: nil)
      case value
      when Hash
        mask_hash(value)
      when Array
        value.map { |item| mask_value(item, key: key) }
      else
        mask_scalar(value, key: key)
      end
    end

    def mask_email(value)
      normalized = value.to_s.strip
      return FILTERED unless normalized.include?("@")

      local, domain = normalized.split("@", 2)
      return FILTERED if local.to_s.empty? || domain.to_s.empty?

      "#{mask_segment(local)}@#{mask_domain(domain)}"
    end

    def mask_phone(value)
      digits = value.to_s.gsub(/\D/, "")
      return FILTERED if digits.empty?

      visible_length = [ 4, digits.length ].min
      masked_prefix = "*" * [ digits.length - visible_length, 0 ].max
      "#{masked_prefix}#{digits[-visible_length, visible_length]}"
    end

    def mask_free_text(value)
      text = value.to_s
      return text if text.empty?

      masked = text.gsub(EMAIL_REGEX) { |email| mask_email(email) }
      masked = masked.gsub(PHONE_REGEX) { |phone| mask_phone(phone) }
      masked.gsub(/(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*/i, "\\1#{FILTERED}")
    end

    private

    def mask_scalar(value, key:)
      return value if value.nil?
      return FILTERED if secret_key?(key)

      if email_key?(key)
        return mask_email(value)
      end

      if phone_key?(key)
        return mask_phone(value)
      end

      if free_text_key?(key)
        return mask_free_text(value)
      end

      return value unless value.is_a?(String)

      mask_free_text(value)
    end

    def normalize_hash(value)
      return {} if value.nil?
      return value.to_unsafe_h if defined?(ActionController::Parameters) && value.is_a?(ActionController::Parameters)
      return value if value.is_a?(Hash)

      { value: value }
    end

    def mask_segment(segment)
      normalized = segment.to_s
      return "*" if normalized.empty?
      return "#{normalized[0]}*" if normalized.length == 2
      return normalized if normalized.length == 1

      "#{normalized[0]}#{'*' * (normalized.length - 2)}#{normalized[-1]}"
    end

    def mask_domain(domain)
      normalized = domain.to_s
      parts = normalized.split(".")
      return mask_segment(normalized) if parts.length < 2

      host = parts[0]
      suffix = parts[1..].join(".")
      "#{mask_segment(host)}.#{suffix}"
    end

    def secret_key?(key)
      key.to_s.match?(SECRET_KEY_PATTERN)
    end

    def email_key?(key)
      key.to_s.match?(EMAIL_KEY_PATTERN)
    end

    def phone_key?(key)
      key.to_s.match?(PHONE_KEY_PATTERN)
    end

    def free_text_key?(key)
      key.to_s.match?(FREE_TEXT_KEY_PATTERN)
    end
  end
end
