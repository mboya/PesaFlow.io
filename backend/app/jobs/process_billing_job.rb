class ProcessBillingJob < ApplicationJob
  queue_as :critical
  
  def perform
    # Find all subscriptions due for billing today
    subscriptions_due = Subscription.active
                                   .where(next_billing_date: Date.current)
                                   .includes(:customer, :plan)
    
    subscriptions_due.find_each do |subscription|
      begin
        process_subscription_billing(subscription)
      rescue StandardError => e
        Rails.logger.error("Error processing billing for subscription #{subscription.id}: #{e.message}")
        Rails.logger.error(e.backtrace.join("\n"))
      end
    end
  end
  
  private
  
  def process_subscription_billing(subscription)
    # Check if subscription is still active and valid
    return unless subscription.is_active?
    return if subscription.outstanding_amount > 0 # Skip if already has outstanding balance
    
    # Create billing attempt
    billing_attempt = BillingAttempt.create!(
      subscription: subscription,
      amount: subscription.plan.amount,
      invoice_number: generate_invoice_number(subscription),
      payment_method: subscription.preferred_payment_method || 'ratiba',
      status: 'pending',
      attempted_at: Time.current,
      attempt_number: 1
    )
    
    # Process based on payment method
    case subscription.preferred_payment_method
    when 'ratiba'
      # Standing orders are automatic, just track the attempt
      # The Ratiba webhook will handle the actual payment
      billing_attempt.update!(status: 'processing')
      send_pre_billing_notification(subscription)
    when 'stk_push'
      # Initiate STK Push
      initiate_stk_push(subscription, billing_attempt)
    when 'c2b'
      # C2B is customer-initiated, send reminder
      send_c2b_reminder(subscription)
    else
      # Default to Ratiba if no preference
      billing_attempt.update!(status: 'processing')
      send_pre_billing_notification(subscription)
    end
  end
  
  def initiate_stk_push(subscription, billing_attempt)
    customer = subscription.customer
    amount = subscription.plan.amount
    
    # Build callback URL
    callback_url = Rails.application.routes.url_helpers.webhooks_stk_push_callback_url(
      host: ENV.fetch('APP_HOST', 'localhost:3000'),
      protocol: Rails.env.production? ? 'https' : 'http'
    )
    
    # Use SafaricomApi wrapper for STK Push
    response = SafaricomApi.client.mpesa.stk_push.initiate(
      phone_number: customer.phone_number,
      amount: amount,
      account_reference: subscription.reference_number,
      transaction_desc: "Subscription payment: #{subscription.plan.name}",
      callback_url: callback_url
    )
    
    # Update billing attempt with checkout request ID
    billing_attempt.update!(
      status: 'processing',
      stk_push_checkout_id: response.checkout_request_id,
      attempted_at: Time.current
    )
    
    send_sms(customer.phone_number,
             "Please complete payment of KES #{amount} for your #{subscription.plan.name} subscription. Check your phone for M-Pesa prompt.")
  rescue StandardError => e
    Rails.logger.error("Failed to initiate STK Push for subscription #{subscription.id}: #{e.message}")
    billing_attempt.update!(
      status: 'failed',
      failure_reason: e.message,
      next_retry_at: 1.hour.from_now
    )
    
    # Schedule retry
    RetryFailedPaymentJob.set(wait: 1.hour).perform_later(billing_attempt.id)
  end
  
  def send_pre_billing_notification(subscription)
    send_sms(subscription.customer.phone_number,
             "Your #{subscription.plan.name} subscription will be charged KES #{subscription.plan.amount} today. Reference: #{subscription.reference_number}")
  end
  
  def send_c2b_reminder(subscription)
    send_sms(subscription.customer.phone_number,
             "Please pay KES #{subscription.plan.amount} for your #{subscription.plan.name} subscription. Reference: #{subscription.reference_number}")
  end
  
  def generate_invoice_number(subscription)
    # Format: INV-YYYYMMDD-SUB-XXXXXXXX
    date_prefix = Date.current.strftime('%Y%m%d')
    "INV-#{date_prefix}-#{subscription.reference_number}"
  end
  
  def send_sms(phone_number, message)
    # TODO: Implement SMS sending via M-Pesa or other provider
    # For now, just log it
    Rails.logger.info("SMS to #{phone_number}: #{message}")
  end
end

