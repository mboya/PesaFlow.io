class Api::V1::PaymentMethodsController < Api::V1::ApplicationController
  before_action :authenticate_api_v1_user!

  # POST /api/v1/payment_methods/ratiba
  def setup_ratiba
    customer = current_user_customer
    return render json: { error: "Customer not found" }, status: :not_found unless customer

    with_transaction do
      # Update customer phone number if provided
      if params[:phone_number].present?
        customer.update!(phone_number: params[:phone_number])
      end

      # Find subscription by reference or use active subscription
      subscription = if params[:reference].present?
        customer.subscriptions.find_by(reference_number: params[:reference]) || customer.subscriptions.active.first
      else
        customer.subscriptions.active.first
      end

      return render json: { error: "No active subscription found" }, status: :not_found unless subscription

      # Use StandingOrderService to create standing order
      response = Payments::StandingOrderService.new(subscription).create

      render json: {
        message: "Ratiba standing order setup successfully",
        standing_order_id: subscription.reload.standing_order_id,
        subscription: Api::V1::SubscriptionSerializer.render(subscription)
      }
    end
  rescue StandardError => e
    Rails.logger.error("Error setting up Ratiba: #{e.message}")
    render json: { error: e.message }, status: :unprocessable_entity
  end

  # POST /api/v1/payment_methods/setup_standing_order
  def setup_standing_order
    customer = current_user_customer
    return render json: { error: "Customer not found" }, status: :not_found unless customer

    with_transaction do
      subscription = customer.subscriptions.find(params[:subscription_id])

      # Use StandingOrderService to create standing order
      response = Payments::StandingOrderService.new(subscription).create

      render json: {
        message: "Standing order setup successfully",
        standing_order_id: subscription.reload.standing_order_id,
        subscription: Api::V1::SubscriptionSerializer.render(subscription)
      }
    end
  rescue StandardError => e
    Rails.logger.error("Error setting up standing order: #{e.message}")
    render json: { error: e.message }, status: :unprocessable_entity
  end

  # POST /api/v1/payment_methods/stk_push (frontend endpoint)
  def initiate_stk_push
    customer = current_user_customer
    return render json: { error: "Customer not found" }, status: :not_found unless customer

    with_transaction do
      # Update customer phone number if provided
      phone_number = params[:phone_number] || customer.phone_number
      if params[:phone_number].present? && phone_number != customer.phone_number
        customer.update!(phone_number: phone_number)
      end

      return render json: { error: "Phone number is required" }, status: :unprocessable_entity unless phone_number.present?

      # Find subscription by reference or use active subscription
      subscription = if params[:reference].present?
        customer.subscriptions.find_by(reference_number: params[:reference]) || customer.subscriptions.active.first
      else
        customer.subscriptions.active.first
      end

      return render json: { error: "No active subscription found" }, status: :not_found unless subscription

      amount = params[:amount] || subscription.outstanding_amount || subscription.amount

      # Create billing attempt
      billing_attempt = BillingAttempt.create!(
        subscription: subscription,
        amount: amount,
        invoice_number: generate_invoice_number(subscription),
        payment_method: "stk_push",
        status: "pending",
        attempted_at: Time.current,
        attempt_number: 1
      )

      # Build callback URL
      callback_url = Rails.application.routes.url_helpers.webhooks_stk_push_callback_url(
        host: ENV.fetch("APP_HOST", "localhost:3000"),
        protocol: Rails.env.production? ? "https" : "https"
      )

      # Initiate STK Push
      response = SafaricomApi.client.mpesa.stk_push.initiate(
        phone_number: phone_number,
        amount: amount,
        account_reference: params[:reference] || subscription.reference_number,
        transaction_desc: "Payment for #{subscription.name}",
        callback_url: callback_url
      )

      # Update billing attempt
      billing_attempt.update!(
        status: "processing",
        stk_push_checkout_id: response.checkout_request_id,
        attempted_at: Time.current
      )

      render json: {
        message: "STK Push initiated successfully",
        checkout_request_id: response.checkout_request_id,
        billing_attempt: Api::V1::BillingAttemptSerializer.render(billing_attempt)
      }
    end
  rescue StandardError => e
    Rails.logger.error("Error initiating STK Push: #{e.message}")
    render json: { error: e.message }, status: :unprocessable_entity
  end

  private

  def generate_invoice_number(subscription)
    date_prefix = Date.current.strftime("%Y%m%d")
    "INV-#{date_prefix}-#{subscription.reference_number}"
  end
end
