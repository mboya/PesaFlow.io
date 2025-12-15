module Payments
  # Service for managing M-Pesa Ratiba (Standing Orders)
  class StandingOrderService
    def initialize(subscription)
      @subscription = subscription
      @client = SafaricomApi.client
    end

    def create
      response = @client.mpesa.ratiba.create(
        standing_order_name: standing_order_name,
        phone_number: @subscription.customer.phone_number,
        amount: @subscription.plan.amount,
        frequency: map_frequency(@subscription.plan.billing_frequency),
        start_date: @subscription.current_period_start || Date.current,
        end_date: @subscription.current_period_end || 1.year.from_now.to_date,
        account_reference: @subscription.reference_number,
        transaction_desc: "#{@subscription.plan.name} subscription",
        callback_url: webhook_url
      )

      if response.success?
        @subscription.update!(
          standing_order_id: response.standing_order_id,
          preferred_payment_method: 'ratiba',
          status: 'active'
        )
        @subscription.customer.update!(standing_order_enabled: true)
      else
        raise "Standing order creation failed: #{response.error_message}"
      end

      response
    rescue StandardError => e
      Rails.logger.error("Error creating standing order: #{e.message}")
      raise
    end

    def update_amount(new_amount)
      # Cancel old standing order
      cancel if @subscription.standing_order_id.present?

      # Create new one with updated amount
      @subscription.update!(amount: new_amount)
      create
    end

    def cancel
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
    rescue StandardError => e
      Rails.logger.error("Error canceling standing order: #{e.message}")
      # Even if API call fails, update local record
      @subscription.update!(standing_order_id: nil)
      raise
    end

    private

    def standing_order_name
      customer_name = @subscription.customer.name.presence || @subscription.customer.phone_number
      "#{customer_name} - #{@subscription.plan.name}"
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
        host: ENV.fetch('APP_HOST', 'localhost:3000'),
        protocol: Rails.env.production? ? 'https' : 'http'
      )
    end
  end
end

