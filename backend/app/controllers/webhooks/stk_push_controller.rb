class Webhooks::StkPushController < ActionController::API
  include WebhookLoggable
  include Transactional

  def callback
    payload = JSON.parse(request.body.read)
    log_webhook("stk_push", payload, request.env)

    result_code = payload.dig("Body", "stkCallback", "ResultCode")
    checkout_request_id = payload.dig("Body", "stkCallback", "CheckoutRequestID")

    billing_attempt = BillingAttempt.find_by(stk_push_checkout_id: checkout_request_id)
    return head :ok unless billing_attempt

    if result_code == 0
      # Payment successful
      callback_metadata = payload.dig("Body", "stkCallback", "CallbackMetadata", "Item")
      process_successful_stk_push(billing_attempt, callback_metadata)
    else
      # Payment failed
      result_desc = payload.dig("Body", "stkCallback", "ResultDesc")
      process_failed_stk_push(billing_attempt, result_desc)
    end

    head :ok
  rescue JSON::ParserError => e
    Rails.logger.error("Invalid JSON payload in STK Push webhook: #{e.message}")
    head :bad_request
  rescue StandardError => e
    Rails.logger.error("Error processing STK Push webhook: #{e.message}")
    Rails.logger.error(e.backtrace.join("\n"))
    head :internal_server_error
  end

  private

  def process_successful_stk_push(billing_attempt, metadata)
    with_transaction do
      mpesa_receipt = metadata.find { |item| item["Name"] == "MpesaReceiptNumber" }&.dig("Value")
      amount = metadata.find { |item| item["Name"] == "Amount" }&.dig("Value")
      phone = metadata.find { |item| item["Name"] == "PhoneNumber" }&.dig("Value")
      transaction_date = metadata.find { |item| item["Name"] == "TransactionDate" }&.dig("Value")

      return unless mpesa_receipt && amount && phone

      subscription = billing_attempt.subscription

      # Parse M-Pesa transaction date (format: YYYYMMDDHHmmss, e.g., "20251217160028")
      paid_at = parse_mpesa_timestamp(transaction_date) || Time.current

      payment = Payment.create!(
        subscription: subscription,
        billing_attempt: billing_attempt,
        amount: amount,
        payment_method: "stk_push",
        mpesa_transaction_id: mpesa_receipt,
        mpesa_receipt_number: mpesa_receipt,
        phone_number: phone,
        status: "completed",
        paid_at: paid_at
      )

      billing_attempt.update!(
        status: "completed",
        mpesa_receipt_number: mpesa_receipt,
        mpesa_transaction_id: mpesa_receipt
      )

      # Extend subscription period
      subscription.extend_period!
      subscription.mark_as_paid!

      # Generate invoice (non-blocking - enqueued)
      Billing::InvoiceGenerator.new(subscription, payment).generate

      # Send receipt (non-blocking - enqueued)
      NotificationService.send_payment_receipt(payment)
    end
  end

  def process_failed_stk_push(billing_attempt, result_desc)
    with_transaction do
      billing_attempt.update!(
        status: "failed",
        failure_reason: result_desc
      )

      subscription = billing_attempt.subscription

      # Update subscription outstanding amount
      subscription.update!(outstanding_amount: billing_attempt.amount)

      # Handle failed payment through dunning manager
      Billing::DunningManager.new.handle_failed_payment(subscription)
    end
  end

  def calculate_next_retry_time(retry_count)
    # Exponential backoff: 1 hour, 4 hours, 24 hours
    hours = [ 1, 4, 24 ][retry_count - 1] || 24
    hours.hours.from_now
  end

  def time_until_retry(retry_time)
    distance = retry_time - Time.current
    if distance < 1.hour
      "#{(distance / 1.minute).round} minutes"
    elsif distance < 1.day
      "#{(distance / 1.hour).round} hours"
    else
      "#{(distance / 1.day).round} days"
    end
  end

  def send_manual_payment_reminder(subscription)
    # Send notification that manual payment is required
    send_sms(subscription.customer.phone_number,
             "Payment failed after multiple attempts. Please pay KES #{subscription.outstanding_amount} manually. Reference: #{subscription.reference_number}")

    # Optionally send email
    # SubscriptionMailer.manual_payment_required(subscription).deliver_later
  end

  def send_sms(phone_number, message)
    # TODO: Implement SMS sending via M-Pesa or other provider
    # For now, just log it
    Rails.logger.info("SMS to #{phone_number}: #{message}")
  end

  # Parse M-Pesa timestamp format (YYYYMMDDHHmmss) to Time object
  def parse_mpesa_timestamp(timestamp)
    return nil if timestamp.blank?

    timestamp_str = timestamp.to_s

    # M-Pesa format: YYYYMMDDHHmmss (e.g., "20251217160028")
    if timestamp_str.match?(/^\d{14}$/)
      Time.strptime(timestamp_str, "%Y%m%d%H%M%S")
    else
      # Try parsing as ISO format or other common formats
      Time.parse(timestamp_str)
    end
  rescue ArgumentError => e
    Rails.logger.warn("Failed to parse M-Pesa timestamp '#{timestamp}': #{e.message}")
    nil
  end
end
