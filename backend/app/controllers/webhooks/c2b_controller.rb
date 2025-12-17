class Webhooks::C2bController < ActionController::API
  include WebhookLoggable
  
  # POST /webhooks/c2b/validation
  def validation
    # M-Pesa sends validation request before processing payment
    # We should validate the transaction and return appropriate response
    payload = JSON.parse(request.body.read)
    log_webhook('c2b', payload.merge(event_type: 'validation'), request.env)
    
    Rails.logger.info("C2B Validation received: #{payload.inspect}")
    
    # Validate the transaction
    # Return success to allow transaction, or failure to reject
    render json: {
      ResultCode: 0,
      ResultDesc: 'Accepted'
    }
  rescue JSON::ParserError => e
    Rails.logger.error("Failed to parse C2B validation payload: #{e.message}")
    render json: {
      ResultCode: 1,
      ResultDesc: 'Invalid payload'
    }, status: :bad_request
  end
  
  # POST /webhooks/c2b/confirmation
  def confirmation
    # M-Pesa sends confirmation after processing payment
    payload = JSON.parse(request.body.read)
    log_webhook('c2b', payload.merge(event_type: 'confirmation'), request.env)
    
    Rails.logger.info("C2B Confirmation received: #{payload.inspect}")
    
    # Find subscription by account reference
    account_reference = payload.dig('BillRefNumber') || payload.dig('BillReferenceNumber')
    subscription = Subscription.find_by(reference_number: account_reference)
    
    return head :ok unless subscription
    
    if payload['TransAmount'] && payload['TransID']
      # Process successful payment
      process_c2b_payment(subscription, payload)
    end
    
    head :ok
  rescue JSON::ParserError => e
    Rails.logger.error("Failed to parse C2B confirmation payload: #{e.message}")
    head :bad_request
  rescue StandardError => e
    Rails.logger.error("Error processing C2B confirmation: #{e.message}")
    head :internal_server_error
  end
  
  private
  
  def process_c2b_payment(subscription, payload)
    payment = Payment.create!(
      subscription: subscription,
      amount: payload['TransAmount'],
      payment_method: 'c2b',
      mpesa_transaction_id: payload['TransID'],
      mpesa_receipt_number: payload['TransID'],
      phone_number: payload['MSISDN'],
      status: 'completed',
      paid_at: Time.current
    )
    
    # Reactivate subscription if suspended
    if subscription.suspended?
      subscription.reactivate!
      subscription.reset_failed_payment_count!
    end
    
    # Extend subscription period
    subscription.extend_period!
    subscription.mark_as_paid!
    
    # Generate invoice
    Billing::InvoiceGenerator.new(subscription, payment).generate
    
    # Send receipt
    NotificationService.send_payment_receipt(payment)
  end
end

