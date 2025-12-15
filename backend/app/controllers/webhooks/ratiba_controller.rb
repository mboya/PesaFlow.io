class Webhooks::RatibaController < ActionController::Base
  include WebhookLoggable
  
  skip_before_action :verify_authenticity_token
  protect_from_forgery with: :null_session
  
  def callback
    payload = JSON.parse(request.body.read)
    log_webhook('ratiba', payload, request.headers.to_h)
    
    # Find subscription by account reference
    subscription = Subscription.find_by(
      reference_number: payload['AccountReference']
    )
    
    return head :ok unless subscription
    
    if payload['ResultCode'] == 0
      # Standing order payment successful
      process_successful_payment(subscription, payload)
    else
      # Standing order payment failed
      process_failed_payment(subscription, payload)
    end
    
    head :ok
  rescue JSON::ParserError => e
    Rails.logger.error("Invalid JSON payload in Ratiba webhook: #{e.message}")
    head :bad_request
  rescue StandardError => e
    Rails.logger.error("Error processing Ratiba webhook: #{e.message}")
    Rails.logger.error(e.backtrace.join("\n"))
    head :internal_server_error
  end
  
  private
  
  def process_successful_payment(subscription, payload)
    payment = Payment.create!(
      subscription: subscription,
      amount: payload['TransAmount'],
      payment_method: 'ratiba',
      mpesa_transaction_id: payload['TransID'],
      mpesa_receipt_number: payload['TransID'],
      phone_number: payload['MSISDN'],
      status: 'completed',
      paid_at: Time.current
    )
    
    # Extend subscription period
    subscription.extend_period!
    subscription.mark_as_paid!
    
    # Generate invoice
    Billing::InvoiceGenerator.new(subscription, payment).generate
    
    # Send receipt
    NotificationService.send_payment_receipt(payment)
  end
  
  def process_failed_payment(subscription, payload)
    billing_attempt = BillingAttempt.create!(
      subscription: subscription,
      amount: subscription.plan.amount,
      invoice_number: generate_invoice_number(subscription),
      payment_method: 'ratiba',
      status: 'failed',
      failure_reason: payload['ResultDesc'],
      attempted_at: Time.current,
      next_retry_at: 1.hour.from_now
    )
    
    # Handle failed payment through dunning manager
    Billing::DunningManager.new.handle_failed_payment(subscription)
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

