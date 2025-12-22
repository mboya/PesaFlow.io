# Concern for logging webhook requests
module WebhookLoggable
  extend ActiveSupport::Concern

  # Headers to capture for webhook logging
  RELEVANT_HEADERS = %w[
    Content-Type
    User-Agent
    X-Forwarded-For
    X-Real-IP
    Host
    Accept
  ].freeze

  def log_webhook(source, payload, headers = {})
    # Extract only relevant headers to avoid serialization issues
    filtered_headers = filter_headers(headers)

    # Get tenant from current tenant or infer from payload
    tenant = ActsAsTenant.current_tenant || infer_tenant_from_webhook_payload(payload)

    WebhookLog.create!(
      tenant: tenant,
      source: source,
      event_type: extract_event_type(payload),
      payload: payload.is_a?(String) ? payload : payload.to_json,
      headers: filtered_headers.to_json,
      status: "received"
    )
  rescue StandardError => e
    Rails.logger.error("Failed to log webhook: #{e.message}")
  end

  def infer_tenant_from_webhook_payload(payload)
    return nil unless payload.is_a?(Hash)

    # Try to find tenant from subscription reference
    if payload["AccountReference"].present?
      subscription = Subscription.find_by(reference_number: payload["AccountReference"])
      return subscription&.tenant
    end

    # Try to find tenant from checkout request ID (STK Push)
    if payload.dig("Body", "stkCallback", "CheckoutRequestID").present?
      checkout_id = payload.dig("Body", "stkCallback", "CheckoutRequestID")
      billing_attempt = BillingAttempt.find_by(stk_push_checkout_id: checkout_id)
      return billing_attempt&.subscription&.tenant
    end

    nil
  end

  def log_error(source, error)
    Rails.logger.error("#{source} webhook error: #{error.message}")
    Rails.logger.error(error.backtrace.join("\n"))
  end

  private

  def filter_headers(headers)
    return {} unless headers.is_a?(Hash)

    filtered = {}
    RELEVANT_HEADERS.each do |header|
      # Try both formats: HTTP_CONTENT_TYPE and Content-Type
      key = header.upcase.tr("-", "_")
      http_key = "HTTP_#{key}"

      value = headers[header] || headers[http_key] || headers[header.downcase]
      filtered[header] = value.to_s if value.present?
    end
    filtered
  end

  def extract_event_type(payload)
    case payload
    when Hash
      payload["ResultCode"] || payload.dig("Body", "stkCallback", "ResultCode") || "unknown"
    else
      "unknown"
    end
  end
end
