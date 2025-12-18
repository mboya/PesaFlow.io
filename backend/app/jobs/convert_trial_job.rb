class ConvertTrialJob < ApplicationJob
  queue_as :default
  
  def perform(subscription_id)
    subscription = Subscription.find_by(id: subscription_id)
    return unless subscription
    
    # Skip if already converted or cancelled
    return if subscription.status == 'cancelled'
    return unless subscription.is_trial
    return if subscription.trial_ends_at.nil? || subscription.trial_ends_at >= Date.current
    
    # Attempt to charge the customer
    if subscription.customer.standing_order_enabled?
      # If customer has standing order, create billing attempt
      # The Ratiba webhook will handle the actual payment
      billing_attempt = BillingAttempt.create!(
        subscription: subscription,
        amount: subscription.plan_amount,
        invoice_number: generate_invoice_number(subscription),
        payment_method: 'ratiba',
        status: 'pending',
        attempted_at: Time.current,
        attempt_number: 1
      )
      
      # Update subscription to active (assuming payment will succeed)
      subscription.update!(
        is_trial: false,
        status: 'active',
        activated_at: Time.current,
        current_period_start: Date.current,
        current_period_end: subscription.calculate_period_end,
        next_billing_date: subscription.calculate_next_billing_date
      )
      
      # Notify customer
      SubscriptionMailer.trial_converted(subscription).deliver_later
    else
      # No standing order, initiate STK Push
      initiate_stk_push_for_trial(subscription)
    end
  rescue StandardError => e
    Rails.logger.error("Error converting trial subscription #{subscription_id}: #{e.message}")
    Rails.logger.error(e.backtrace.join("\n"))
    
    # If conversion fails, suspend the subscription
    subscription&.update!(
      status: 'suspended',
      suspended_at: Time.current
    )
    
    # Notify customer
    SubscriptionMailer.trial_conversion_failed(subscription).deliver_later if subscription
  end
  
  private
  
  def initiate_stk_push_for_trial(subscription)
    customer = subscription.customer
    amount = subscription.plan_amount
    
    # Create billing attempt
    billing_attempt = BillingAttempt.create!(
      subscription: subscription,
      amount: amount,
      invoice_number: generate_invoice_number(subscription),
      payment_method: 'stk_push',
      status: 'pending',
      attempted_at: Time.current,
      attempt_number: 1
    )
    
    # Build callback URL
    callback_url = Rails.application.routes.url_helpers.webhooks_stk_push_callback_url(
      host: ENV.fetch('APP_HOST', 'localhost:3000'),
      protocol: Rails.env.production? ? 'https' : 'http'
    )
    
    # Initiate STK Push
    response = SafaricomApi.client.mpesa.stk_push.initiate(
      phone_number: customer.phone_number,
      amount: amount,
      account_reference: subscription.reference_number,
      transaction_desc: "Trial conversion: #{subscription.plan_name}",
      callback_url: callback_url
    )
    
    # Update billing attempt
    billing_attempt.update!(
      status: 'processing',
      stk_push_checkout_id: response.checkout_request_id,
      attempted_at: Time.current
    )
    
    # Notify customer
    send_sms(customer.phone_number,
             "Your trial period has ended. Please complete payment of KES #{amount} to continue your #{subscription.plan_name} subscription. Check your phone for M-Pesa prompt.")
  rescue StandardError => e
    Rails.logger.error("Failed to initiate STK Push for trial conversion #{subscription.id}: #{e.message}")
    billing_attempt&.update!(
      status: 'failed',
      failure_reason: e.message
    )
    raise e
  end
  
  def generate_invoice_number(subscription)
    date_prefix = Date.current.strftime('%Y%m%d')
    "INV-#{date_prefix}-#{subscription.reference_number}"
  end
  
  def send_sms(phone_number, message)
    # TODO: Implement SMS sending via M-Pesa or other provider
    # For now, just log it
    Rails.logger.info("SMS to #{phone_number}: #{message}")
  end
end

