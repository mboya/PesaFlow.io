# Service for sending notifications (SMS, Email)
module NotificationService
  class << self
    def send_subscription_confirmation(subscription)
      customer = subscription.customer

      # Email
      SubscriptionMailer.subscription_confirmation(subscription).deliver_later if customer.email.present?

      # SMS
      send_sms(
        customer.phone_number,
        "Welcome! Your #{subscription.plan.name} subscription is active. " \
        "#{subscription.plan.amount} KES will be charged #{billing_frequency_text(subscription.plan.billing_frequency)}."
      )
    end

    def send_payment_receipt(payment)
      customer = payment.subscription.customer

      EmailService.send(
        to: customer.email,
        subject: "Payment Receipt - #{payment.mpesa_receipt_number}",
        template: 'payment_receipt',
        data: { payment: payment }
      ) if customer.email.present?

      send_sms(
        customer.phone_number,
        "Payment received: #{payment.amount} KES. Receipt: #{payment.mpesa_receipt_number}. Thank you!"
      )
    end

    def send_refund_confirmation(refund)
      send_sms(
        refund.subscription.customer.phone_number,
        "Refund processed: #{refund.amount} KES. Ref: #{refund.mpesa_transaction_id}"
      )
    end

    def send_suspension_notice(subscription)
      paybill = ENV.fetch('business_short_code', '600000')
      message = <<~SMS
        Your subscription is suspended due to payment failure.
        Pay manually: Paybill #{paybill},
        Account: #{subscription.reference_number},
        Amount: #{subscription.outstanding_amount || subscription.plan.amount} KES
      SMS

      send_sms(subscription.customer.phone_number, message)
    end

    def send(customer, template, data = {})
      # Generic notification sender
      case template
      when :payment_failed_retry_1, :payment_failed_retry_2, :payment_failed_final_warning
        send_payment_failed_notification(customer, template, data[:subscription])
      when :subscription_suspended
        send_suspension_notice(data[:subscription])
      when :subscription_cancelled
        send_cancellation_confirmation(data[:subscription])
      end
    end

    def send_sms(phone_number, message)
      # TODO: Implement SMS sending via M-Pesa or AfricasTalking
      # For now, just log it
      Rails.logger.info("SMS to #{phone_number}: #{message}")
    end

    def send_email(to, subject, template, data = {})
      # TODO: Implement email sending via SendGrid or ActionMailer
      Rails.logger.info("Email to #{to}: #{subject}")
    end

    def send_cancellation_confirmation(subscription)
      send_sms(
        subscription.customer.phone_number,
        "Your #{subscription.plan.name} subscription has been cancelled. Thank you for using our service."
      )
    end

    def send_upgrade_confirmation(subscription, old_plan, new_plan)
      send_sms(
        subscription.customer.phone_number,
        "Subscription upgraded from #{old_plan.name} to #{new_plan.name}. New amount: #{new_plan.amount} KES."
      )
    end

    def send_downgrade_confirmation(subscription, old_plan, new_plan)
      send_sms(
        subscription.customer.phone_number,
        "Subscription will be downgraded from #{old_plan.name} to #{new_plan.name} at next billing cycle."
      )
    end

    private

    def send_payment_failed_notification(customer, template, subscription)
      messages = {
        payment_failed_retry_1: "Payment failed. We'll retry in 1 hour. Please ensure sufficient funds.",
        payment_failed_retry_2: "Payment failed again. We'll retry in 3 days. Please check your M-Pesa balance.",
        payment_failed_final_warning: "Final attempt: Payment will be retried in 7 days. Failure may result in suspension."
      }

      send_sms(customer.phone_number, messages[template])
    end

    def billing_frequency_text(frequency)
      {
        1 => 'daily',
        2 => 'weekly',
        3 => 'monthly',
        4 => 'yearly'
      }[frequency] || 'monthly'
    end
  end
end

