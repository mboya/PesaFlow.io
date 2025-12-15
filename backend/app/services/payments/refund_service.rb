module Payments
  # Service for processing refunds via M-Pesa B2C
  class RefundService
    def initialize
      @client = SafaricomApi.client
    end

    def process(subscription:, amount:, reason:, initiated_by: 'system')
      # Create refund record
      refund = subscription.refunds.create!(
        payment: subscription.payments.completed.last,
        amount: amount,
        reason: reason,
        status: 'pending',
        requested_at: Time.current
      )

      # Initiate B2C payment
      response = @client.mpesa.b2c.pay(
        phone_number: subscription.customer.phone_number,
        amount: amount,
        command_id: 'BusinessPayment',
        remarks: "Refund: #{reason}",
        occasion: refund.id.to_s,
        result_url: result_webhook_url,
        timeout_url: timeout_webhook_url
      )

      if response.success?
        refund.update!(
          status: 'processing',
          conversation_id: response.conversation_id,
          originator_conversation_id: response.originator_conversation_id
        )
      else
        refund.update!(
          status: 'failed',
          failure_reason: response.error_message
        )
        raise "Refund initiation failed: #{response.error_message}"
      end

      refund
    rescue StandardError => e
      Rails.logger.error("Error processing refund: #{e.message}")
      refund&.update!(status: 'failed', failure_reason: e.message)
      raise
    end

    def process_proration(subscription, cancellation_date = Date.current)
      return 0 unless subscription.active?

      days_used = (cancellation_date - subscription.current_period_start).to_i
      total_days = (subscription.current_period_end - subscription.current_period_start).to_i
      days_remaining = total_days - days_used

      return 0 if days_remaining <= 0

      refund_amount = (subscription.plan.amount.to_f / total_days) * days_remaining
      refund_amount.round(2)
    end

    private

    def result_webhook_url
      Rails.application.routes.url_helpers.webhooks_b2c_result_url(
        host: ENV.fetch('APP_HOST', 'localhost:3000'),
        protocol: Rails.env.production? ? 'https' : 'http'
      )
    end

    def timeout_webhook_url
      Rails.application.routes.url_helpers.webhooks_b2c_timeout_url(
        host: ENV.fetch('APP_HOST', 'localhost:3000'),
        protocol: Rails.env.production? ? 'https' : 'http'
      )
    end
  end
end

