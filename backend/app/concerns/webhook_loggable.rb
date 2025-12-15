# Concern for logging webhook requests
module WebhookLoggable
  extend ActiveSupport::Concern

  def log_webhook(source, payload, headers = {})
    WebhookLog.create!(
      source: source,
      event_type: extract_event_type(payload),
      payload: payload.to_json,
      headers: headers.to_json,
      status: 'received'
    )
  rescue StandardError => e
    Rails.logger.error("Failed to log webhook: #{e.message}")
  end

  def log_error(source, error)
    Rails.logger.error("#{source} webhook error: #{error.message}")
    Rails.logger.error(error.backtrace.join("\n"))
  end

  private

  def extract_event_type(payload)
    case payload
    when Hash
      payload['ResultCode'] || payload.dig('Body', 'stkCallback', 'ResultCode') || 'unknown'
    else
      'unknown'
    end
  end
end

