class RetryFailedPaymentJob < ApplicationJob
  queue_as :default
  
  def perform(billing_attempt_id)
    billing_attempt = BillingAttempt.find_by(id: billing_attempt_id)
    return unless billing_attempt

    subscription = billing_attempt.subscription
    
    # Don't retry if subscription is cancelled or payment completed elsewhere
    return if subscription.cancelled? || billing_attempt.completed?
    
    # Don't retry if payment was already successful
    return if subscription.outstanding_amount.zero?
    
    # Attempt STK Push
    callback_url = Rails.application.routes.url_helpers.webhooks_stk_push_callback_url(
      host: ENV.fetch('APP_HOST', 'localhost:3000'),
      protocol: Rails.env.production? ? 'https' : 'http'
    )
    
    response = SafaricomApi.client.mpesa.stk_push.initiate(
      phone_number: subscription.customer.phone_number,
      amount: subscription.outstanding_amount,
      account_reference: subscription.reference_number,
      transaction_desc: "Retry payment: #{subscription.plan_name}",
      callback_url: callback_url
    )
    
    billing_attempt.update!(
      stk_push_checkout_id: response.checkout_request_id,
      status: 'processing',
      attempted_at: Time.current
    )
    
    # Notify customer
    send_sms(subscription.customer.phone_number,
             "Please complete your payment of KES #{subscription.outstanding_amount} for #{subscription.plan_name}")
    
  rescue StandardError => e
    billing_attempt.update!(
      status: 'failed',
      failure_reason: e.message
    )
    Rails.logger.error("Error retrying payment for billing attempt #{billing_attempt_id}: #{e.message}")
    Rails.logger.error(e.backtrace.join("\n"))
  end
  
  private
  
  def send_sms(phone_number, message)
    # TODO: Implement SMS sending via M-Pesa or other provider
    # For now, just log it
    Rails.logger.info("SMS to #{phone_number}: #{message}")
  end
end
