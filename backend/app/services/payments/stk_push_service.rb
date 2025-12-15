module Payments
  # Service for managing M-Pesa STK Push payments
  class StkPushService
    def initialize(subscription)
      @subscription = subscription
      @client = SafaricomApi.client
    end

    def initiate(payment_type: 'subscription', amount: nil, description: nil)
      amount ||= @subscription.plan.amount

      response = @client.mpesa.stk_push.initiate(
        phone_number: @subscription.customer.phone_number,
        amount: amount,
        account_reference: generate_reference(payment_type),
        transaction_desc: description || "#{@subscription.plan.name} payment",
        callback_url: webhook_url
      )

      if response.success?
        # Create pending payment record
        payment = @subscription.payments.create!(
          payment_reference: response.checkout_request_id,
          payment_method: 'stk_push',
          amount: amount,
          status: 'pending',
          phone_number: @subscription.customer.phone_number,
          description: description
        )

        @subscription.update!(last_payment_attempt: Time.current)
        payment
      else
        raise "STK Push initiation failed: #{response.error_message}"
      end
    rescue StandardError => e
      Rails.logger.error("Error initiating STK Push: #{e.message}")
      raise
    end

    def query(checkout_request_id:)
      @client.mpesa.stk_push.query(checkout_request_id: checkout_request_id)
    end

    private

    def generate_reference(payment_type)
      case payment_type
      when 'setup_fee'
        "SETUP-#{@subscription.reference_number}"
      when 'retry'
        "RETRY-#{@subscription.reference_number}-#{@subscription.customer.failed_payment_count}"
      when 'addon'
        "ADDON-#{@subscription.reference_number}"
      else
        @subscription.reference_number
      end
    end

    def webhook_url
      Rails.application.routes.url_helpers.webhooks_stk_push_callback_url(
        host: ENV.fetch('APP_HOST', 'localhost:3000'),
        protocol: Rails.env.production? ? 'https' : 'http'
      )
    end
  end
end

