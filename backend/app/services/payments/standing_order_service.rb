module Payments
  # Service for managing M-Pesa Ratiba (Standing Orders)
  class StandingOrderService
    include Transactional

    def initialize(subscription)
      @subscription = subscription
      @client = SafaricomApi.client
    end

    def create
      with_transaction do
        phone = @subscription.customer.phone_number
        raise ArgumentError, "Customer phone number is required for Ratiba standing orders" if phone.blank?

        amount = @subscription.amount
        raise ArgumentError, "Subscription amount is required for Ratiba standing orders" if amount.blank? || amount.to_f <= 0

        Rails.logger.info("Creating standing order for #{phone}, amount: #{amount}")
        Rails.logger.info("Webhook URL: #{webhook_url}")

        response = @client.mpesa.ratiba.create(
          standing_order_name: standing_order_name,
          phone_number: phone,
          amount: amount,
          frequency: map_frequency(@subscription.billing_frequency),
          start_date: @subscription.current_period_start || Date.current,
          end_date: @subscription.current_period_end || 1.year.from_now.to_date,
          account_reference: @subscription.reference_number,
          transaction_desc: "#{@subscription.name} subscription",
          callback_url: webhook_url
        )

        Rails.logger.info("Ratiba API response: #{response.inspect}")
        Rails.logger.info("Ratiba API response class: #{response.class}")
        Rails.logger.info("Ratiba API response methods: #{response.methods - Object.methods}")

        if response.success?
          @subscription.update!(
            standing_order_id: response.standing_order_id,
            preferred_payment_method: "ratiba",
            status: "active"
          )
          @subscription.customer.update!(standing_order_enabled: true)
        else
          # Try to extract error message from various possible response attributes
          error_msg = response.try(:error_message).presence ||
                      response.try(:response_description).presence ||
                      response.try(:result_desc).presence ||
                      response.try(:error_code).presence ||
                      response.try(:body).to_s.presence ||
                      "Unknown error from M-Pesa API (check logs for response.inspect)"
          raise "Standing order creation failed: #{error_msg}"
        end

        response
      end
    rescue StandardError => e
      Rails.logger.error("Error creating standing order: #{e.message}")
      Rails.logger.error(e.backtrace.first(5).join("\n")) if e.backtrace
      raise
    end

    def update_amount(new_amount)
      with_transaction do
        # Cancel old standing order
        cancel if @subscription.standing_order_id.present?

        # Create new one with updated amount
        @subscription.update!(amount: new_amount)
        create
      end
    end

    def cancel
      with_transaction do
        return unless @subscription.standing_order_id.present?

        response = @client.mpesa.ratiba.cancel(
          standing_order_id: @subscription.standing_order_id
        )

        if response.success?
          @subscription.update!(
            standing_order_id: nil,
            preferred_payment_method: nil
          )
          @subscription.customer.update!(standing_order_enabled: false)
        end

        response
      end
    rescue StandardError => e
      Rails.logger.error("Error canceling standing order: #{e.message}")
      raise
    end

    private

    def standing_order_name
      customer_name = @subscription.customer.name.presence || @subscription.customer.phone_number
      "#{customer_name} - #{@subscription.name}"
    end

    def map_frequency(billing_frequency)
      # Map Plan billing_frequency to Ratiba frequency codes
      # Plan: 1=daily, 2=weekly, 3=monthly, 4=yearly
      # Ratiba: 1=Daily, 2=Weekly, 3=Monthly, 4=Bi-Monthly, 5=Quarterly, 6=Half-Year, 7=Yearly
      case billing_frequency
      when 1 then 1  # Daily
      when 2 then 2  # Weekly
      when 3 then 3  # Monthly
      when 4 then 7  # Yearly
      else 3 # Default to monthly
      end
    end

    def webhook_url
      Rails.application.routes.url_helpers.webhooks_ratiba_callback_url(
        host: ENV.fetch("APP_HOST", "localhost:3000"),
        protocol: Rails.env.production? ? "https" : "https"
      )
    end
  end
end
