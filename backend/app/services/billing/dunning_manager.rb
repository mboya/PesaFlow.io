module Billing
  # Service for managing failed payment dunning process
  class DunningManager
    include Transactional

    def handle_failed_payment(subscription)
      with_transaction do
        subscription.customer.increment!(:failed_payment_count)
        subscription.update!(last_payment_attempt: Time.current)

        case subscription.customer.failed_payment_count
        when 1
          # Immediate retry
          schedule_retry(subscription, delay: 1.hour)
          NotificationService.send(subscription.customer, :payment_failed_retry_1, subscription: subscription)

        when 2
          # Retry after 3 days
          schedule_retry(subscription, delay: 3.days)
          NotificationService.send(subscription.customer, :payment_failed_retry_2, subscription: subscription)

        when 3
          # Final retry after 7 days
          schedule_retry(subscription, delay: 7.days)
          NotificationService.send(subscription.customer, :payment_failed_final_warning, subscription: subscription)

        when 4
          # Suspend after 10 days
          subscription.suspend!
          NotificationService.send(subscription.customer, :subscription_suspended, subscription: subscription)
          send_manual_payment_instructions(subscription)

        else
          # Cancel after 30 days suspended
          if subscription.suspended? && subscription.suspended_at < 30.days.ago
            Subscriptions::CancelService.new(subscription).call(
              reason: "non_payment",
              refund_unused: false
            )
          end
        end
      end
    end

    private

    def schedule_retry(subscription, delay:)
      billing_attempt = subscription.billing_attempts.create!(
        amount: subscription.amount,
        invoice_number: generate_invoice_number(subscription),
        payment_method: "stk_push",
        status: "pending",
        attempt_number: subscription.customer.failed_payment_count,
        attempted_at: Time.current,
        next_retry_at: delay.from_now
      )

      RetryFailedPaymentJob.set(wait: delay).perform_later(billing_attempt.id)
    end

    def send_manual_payment_instructions(subscription)
      paybill = ENV.fetch("business_short_code", "600000")
      amount = subscription.outstanding_amount || subscription.amount
      account = subscription.reference_number

      message = <<~SMS
        Your subscription payment failed. To avoid suspension, pay manually:
        1. M-Pesa > Lipa na M-Pesa > Paybill
        2. Business No: #{paybill}
        3. Account: #{account}
        4. Amount: #{amount} KES
      SMS

      NotificationService.send_sms(subscription.customer.phone_number, message)

      if subscription.customer.email.present?
        NotificationService.send_email(
          subscription.customer.email,
          "Payment Required - Manual Payment Instructions",
          "manual_payment_instructions",
          {
            paybill: paybill,
            account_number: account,
            amount: amount,
            subscription: subscription
          }
        )
      end
    end

    def generate_invoice_number(subscription)
      date_prefix = Date.current.strftime("%Y%m%d")
      "INV-#{date_prefix}-#{subscription.reference_number}"
    end
  end
end
