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

    webhook_log = WebhookLog.create!(
      tenant: tenant,
      source: source,
      event_type: extract_event_type(payload),
      payload: payload.is_a?(String) ? payload : payload.to_json,
      headers: filtered_headers.to_json,
      status: "received"
    )

    Events::Publisher.publish(
      event_type: "webhook.received",
      subject: webhook_log,
      tenant: webhook_log.tenant,
      source: "#{self.class.name}#log_webhook",
      payload: {
        source: webhook_log.source,
        event_type: webhook_log.event_type,
        status: webhook_log.status
      }
    )

    webhook_log
  rescue StandardError => e
    Rails.logger.error("Failed to log webhook: #{e.message}")
    nil
  end

  def mark_webhook_processed(webhook_log)
    return unless webhook_log

    with_webhook_tenant(webhook_log) do
      webhook_log.mark_as_processed!
    end

    Events::Publisher.publish(
      event_type: "webhook.processed",
      subject: webhook_log,
      tenant: webhook_log.tenant,
      source: self.class.name,
      payload: {
        source: webhook_log.source,
        event_type: webhook_log.event_type,
        status: webhook_log.status
      }
    )
  rescue StandardError => e
    Rails.logger.error("Failed to mark webhook as processed: #{e.message}")
  end

  def mark_webhook_failed(webhook_log, error_message)
    return unless webhook_log

    with_webhook_tenant(webhook_log) do
      webhook_log.mark_as_failed!(error_message)
    end

    Events::Publisher.publish(
      event_type: "webhook.failed",
      subject: webhook_log,
      tenant: webhook_log.tenant,
      source: self.class.name,
      payload: {
        source: webhook_log.source,
        event_type: webhook_log.event_type,
        status: webhook_log.status,
        error_message: error_message
      }
    )
  rescue StandardError => e
    Rails.logger.error("Failed to mark webhook as failed: #{e.message}")
  end

  def infer_tenant_from_webhook_payload(payload)
    return nil unless payload.is_a?(Hash)

    # Try to find tenant from subscription reference
    if payload["AccountReference"].present?
      subscription = ActsAsTenant.without_tenant do
        Subscription.find_by(reference_number: payload["AccountReference"])
      end
      return subscription&.tenant
    end

    # Try to find tenant from checkout request ID (STK Push)
    if payload.dig("Body", "stkCallback", "CheckoutRequestID").present?
      checkout_id = payload.dig("Body", "stkCallback", "CheckoutRequestID")
      billing_attempt = ActsAsTenant.without_tenant do
        BillingAttempt.find_by(stk_push_checkout_id: checkout_id)
      end
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

      value = headers[header] || headers[key] || headers[http_key] || headers[header.downcase]
      filtered[header] = value.to_s if value.present?
    end
    filtered
  end

  def extract_event_type(payload)
    case payload
    when Hash
      payload["event_type"] ||
        payload[:event_type] ||
        payload["ResultCode"] ||
        payload.dig("Body", "stkCallback", "ResultCode") ||
        "unknown"
    else
      "unknown"
    end
  end

  def with_webhook_tenant(webhook_log)
    if webhook_log.tenant.present?
      ActsAsTenant.with_tenant(webhook_log.tenant) { yield }
    else
      ActsAsTenant.without_tenant { yield }
    end
  end
end
