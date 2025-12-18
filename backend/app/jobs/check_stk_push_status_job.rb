# Job to check pending STK Push transactions and process successful ones
# This handles cases where the callback failed but the payment succeeded
class CheckStkPushStatusJob < ApplicationJob
  include Transactional

  queue_as :default

  # Check a specific billing attempt
  def perform(billing_attempt_id = nil)
    if billing_attempt_id
      check_single_attempt(billing_attempt_id)
    else
      check_all_pending_attempts
    end
  end

  private

  def check_all_pending_attempts
    # Find billing attempts with STK Push checkout IDs that are still pending/processing
    pending_attempts = BillingAttempt.where(payment_method: "stk_push")
                                     .where(status: [ "pending", "processing" ])
                                     .where.not(stk_push_checkout_id: [ nil, "" ])
                                     .where("attempted_at > ?", 24.hours.ago) # Only check recent ones

    Rails.logger.info("Checking #{pending_attempts.count} pending STK Push transactions")

    pending_attempts.find_each do |attempt|
      check_single_attempt(attempt.id)
    rescue StandardError => e
      Rails.logger.error("Error checking STK Push status for attempt #{attempt.id}: #{e.message}")
    end
  end

  def check_single_attempt(attempt_id)
    attempt = BillingAttempt.find_by(id: attempt_id)
    return unless attempt
    return unless attempt.stk_push_checkout_id.present?
    return if attempt.status == "completed" # Already processed

    Rails.logger.info("Querying STK Push status for checkout ID: #{attempt.stk_push_checkout_id}")

    # Query M-Pesa for transaction status
    response = SafaricomApi.client.mpesa.stk_push_query.query(
      checkout_request_id: attempt.stk_push_checkout_id
    )

    Rails.logger.info("STK Push Query response: #{response.inspect}")

    if response.success?
      # Check if the payment was successful
      result_code = response.response_code

      if result_code == "0" || result_code == 0
        process_successful_payment(attempt, response)
      else
        # Payment failed or was cancelled
        process_failed_payment(attempt, response)
      end
    else
      # Query itself failed - might be too early or transaction expired
      Rails.logger.warn("STK Push query failed for #{attempt.stk_push_checkout_id}: #{response.error_message}")

      # If the attempt is old (>1 hour), mark as failed
      if attempt.attempted_at && attempt.attempted_at < 1.hour.ago
        attempt.update!(
          status: "failed",
          failure_reason: "Transaction timed out - no response received"
        )
      end
    end
  end

  def process_successful_payment(billing_attempt, response)
    subscription = billing_attempt.subscription
    customer = subscription.customer

    # Extract payment details from response
    # Note: STK Push Query response may have limited metadata
    mpesa_receipt = extract_receipt_number(response)
    amount = billing_attempt.amount
    phone = customer.phone_number

    Rails.logger.info("Processing successful STK Push payment: Receipt=#{mpesa_receipt}, Amount=#{amount}")

    ActiveRecord::Base.transaction do
      # Create payment record
      payment = Payment.create!(
        subscription: subscription,
        billing_attempt: billing_attempt,
        amount: amount,
        payment_method: "stk_push",
        mpesa_transaction_id: mpesa_receipt || "STK-#{billing_attempt.stk_push_checkout_id}",
        mpesa_receipt_number: mpesa_receipt || "STK-#{billing_attempt.stk_push_checkout_id}",
        phone_number: phone,
        status: "completed",
        paid_at: Time.current
      )

      # Update billing attempt
      billing_attempt.update!(
        status: "completed",
        mpesa_receipt_number: mpesa_receipt,
        mpesa_transaction_id: mpesa_receipt
      )

      # Extend subscription period
      subscription.extend_period!
      subscription.mark_as_paid!

      # Generate invoice
      Billing::InvoiceGenerator.new(subscription, payment).generate

      # Send receipt notification
      NotificationService.send_payment_receipt(payment)

      Rails.logger.info("Successfully processed STK Push payment for subscription #{subscription.reference_number}")
    end
  rescue ActiveRecord::RecordInvalid => e
    # Payment might already exist (duplicate processing)
    if e.message.include?("Mpesa transaction") && e.message.include?("already been taken")
      Rails.logger.info("Payment already processed for #{billing_attempt.stk_push_checkout_id}")
      billing_attempt.update!(status: "completed") if billing_attempt.status != "completed"
    else
      raise e
    end
  end

  def process_failed_payment(billing_attempt, response)
    with_transaction do
      result_desc = response.response_description || "Payment failed or was cancelled by user"

      billing_attempt.update!(
        status: "failed",
        failure_reason: result_desc
      )

      subscription = billing_attempt.subscription

      # Update subscription outstanding amount
      subscription.update!(outstanding_amount: billing_attempt.amount)

      Rails.logger.info("STK Push payment failed for #{billing_attempt.stk_push_checkout_id}: #{result_desc}")
    end
  end

  def extract_receipt_number(response)
    # Try to extract receipt number from various possible response fields
    response.raw_response["MpesaReceiptNumber"] ||
      response.raw_response.dig("CallbackMetadata", "Item")&.find { |i| i["Name"] == "MpesaReceiptNumber" }&.dig("Value") ||
      response.raw_response["TransactionID"]
  end
end
