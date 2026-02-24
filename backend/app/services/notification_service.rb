# Service for sending notifications (SMS, Email)
module NotificationService
  PROVIDER_LOGGER = "application_logger".freeze

  class << self
    def send_subscription_confirmation(subscription)
      customer = subscription.customer

      # Email
      SubscriptionMailer.subscription_confirmation(subscription).deliver_later if customer.email.present?

      # SMS
      send_sms(
        customer.phone_number,
        "Welcome! Your #{subscription.name} subscription is active. " \
        "#{subscription.amount} KES will be charged #{billing_frequency_text(subscription.billing_frequency)}.",
        template: "subscription_confirmation",
        tenant: subscription.tenant,
        context: subscription
      )
    end

    def send_payment_receipt(payment)
      customer = payment.subscription.customer

      # Send email receipt
      if customer.email.present?
        SubscriptionMailer.payment_receipt(payment.subscription, payment).deliver_later
      end

      # Send SMS
      send_sms(
        customer.phone_number,
        "Payment received: #{payment.amount} KES. Receipt: #{payment.mpesa_receipt_number}. Thank you!",
        template: "payment_receipt",
        tenant: payment.tenant,
        context: payment
      )
    end

    def send_refund_confirmation(refund)
      send_sms(
        refund.subscription.customer.phone_number,
        "Refund processed: #{refund.amount} KES. Ref: #{refund.mpesa_transaction_id}",
        template: "refund_confirmation",
        tenant: refund.tenant,
        context: refund
      )
    end

    def send_suspension_notice(subscription)
      paybill = ENV.fetch("business_short_code", "600000")
      message = <<~SMS
        Your subscription is suspended due to payment failure.
        Pay manually: Paybill #{paybill},
        Account: #{subscription.reference_number},
        Amount: #{subscription.outstanding_amount || subscription.amount} KES
      SMS

      send_sms(
        subscription.customer.phone_number,
        message,
        template: "subscription_suspended",
        tenant: subscription.tenant,
        context: subscription
      )
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

    def send_sms(phone_number, message, template: nil, tenant: nil, context: nil, metadata: {})
      resolved_tenant = resolve_tenant(tenant, context)
      normalized_phone = phone_number.to_s.strip

      delivery = create_delivery!(
        tenant: resolved_tenant,
        channel: "sms",
        template: template,
        provider: PROVIDER_LOGGER,
        recipient: normalized_phone.presence || "unknown",
        message: message.to_s,
        context: context,
        metadata: metadata
      )

      if normalized_phone.blank?
        delivery.mark_as_skipped!(reason: "Missing recipient phone number")
        publish_delivery_event("notification.skipped", delivery, source: "NotificationService#send_sms")
        return delivery
      end

      Rails.logger.info("SMS to #{normalized_phone}: #{message}")

      delivery.mark_as_sent!
      publish_delivery_event("notification.sent", delivery, source: "NotificationService#send_sms")
      delivery
    rescue StandardError => e
      delivery&.mark_as_failed!(error_message: e.message)
      publish_delivery_event("notification.failed", delivery, source: "NotificationService#send_sms", error_message: e.message)
      Rails.logger.error("SMS delivery failed: #{e.message}")
      nil
    end

    def send_email(to, subject, template, data = {}, tenant: nil, context: nil, metadata: {})
      resolved_tenant = resolve_tenant(tenant, context)
      normalized_to = to.to_s.strip
      merged_metadata = metadata.merge(data: data)

      delivery = create_delivery!(
        tenant: resolved_tenant,
        channel: "email",
        template: template.to_s,
        provider: PROVIDER_LOGGER,
        recipient: normalized_to.presence || "unknown",
        subject: subject.to_s,
        context: context,
        metadata: merged_metadata
      )

      if normalized_to.blank?
        delivery.mark_as_skipped!(reason: "Missing recipient email")
        publish_delivery_event("notification.skipped", delivery, source: "NotificationService#send_email")
        return delivery
      end

      # TODO: Implement email sending via SendGrid or ActionMailer
      Rails.logger.info("Email to #{normalized_to}: #{subject}")

      delivery.mark_as_sent!
      publish_delivery_event("notification.sent", delivery, source: "NotificationService#send_email")
      delivery
    rescue StandardError => e
      delivery&.mark_as_failed!(error_message: e.message)
      publish_delivery_event("notification.failed", delivery, source: "NotificationService#send_email", error_message: e.message)
      Rails.logger.error("Email delivery failed: #{e.message}")
      nil
    end

    def send_cancellation_confirmation(subscription)
      send_sms(
        subscription.customer.phone_number,
        "Your #{subscription.name} subscription has been cancelled. Thank you for using our service.",
        template: "subscription_cancelled",
        tenant: subscription.tenant,
        context: subscription
      )
    end


    private

    def send_payment_failed_notification(customer, template, subscription)
      messages = {
        payment_failed_retry_1: "Payment failed. We'll retry in 1 hour. Please ensure sufficient funds.",
        payment_failed_retry_2: "Payment failed again. We'll retry in 3 days. Please check your M-Pesa balance.",
        payment_failed_final_warning: "Final attempt: Payment will be retried in 7 days. Failure may result in suspension."
      }

      send_sms(
        customer.phone_number,
        messages[template],
        template: template.to_s,
        tenant: subscription&.tenant || customer&.tenant,
        context: subscription || customer
      )
    end

    def create_delivery!(tenant:, channel:, recipient:, template: nil, provider: PROVIDER_LOGGER, subject: nil, message: nil, context: nil, metadata: {})
      attributes = {
        tenant: tenant,
        channel: channel,
        template: template,
        provider: provider,
        recipient: recipient,
        subject: subject,
        message: message,
        context: context,
        status: "queued",
        metadata: metadata || {}
      }

      with_tenant_scope(tenant) do
        NotificationDelivery.create!(attributes)
      end
    end

    def publish_delivery_event(event_type, delivery, source:, error_message: nil)
      return unless delivery

      payload = {
        channel: delivery.channel,
        status: delivery.status,
        template: delivery.template,
        recipient: delivery.recipient,
        provider: delivery.provider,
        context_type: delivery.context_type,
        context_id: delivery.context_id
      }
      payload[:error_message] = error_message if error_message.present?

      Events::Publisher.publish(
        event_type: event_type,
        subject: delivery,
        tenant: delivery.tenant,
        source: source,
        payload: payload
      )
    end

    def with_tenant_scope(tenant)
      if tenant.present?
        ActsAsTenant.with_tenant(tenant) { yield }
      else
        ActsAsTenant.without_tenant { yield }
      end
    end

    def resolve_tenant(tenant, context)
      return tenant if tenant.present?
      return context.tenant if context.respond_to?(:tenant) && context.tenant.present?
      return ActsAsTenant.current_tenant if ActsAsTenant.current_tenant.present?

      nil
    end

    def billing_frequency_text(frequency)
      {
        1 => "daily",
        2 => "weekly",
        3 => "monthly",
        4 => "yearly"
      }[frequency] || "monthly"
    end
  end
end
