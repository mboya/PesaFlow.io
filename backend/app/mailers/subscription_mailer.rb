class SubscriptionMailer < ApplicationMailer
  def payment_receipt(subscription, payment)
    @subscription = subscription
    @payment = payment
    @customer = subscription.customer

    mail(
      to: @customer.email,
      subject: "Payment Receipt - #{@subscription.reference_number}"
    )
  end

  def service_suspended(subscription)
    @subscription = subscription
    @customer = subscription.customer
    @paybill = ENV.fetch('MPESA_PAYBILL', ENV.fetch('business_short_code', 'N/A'))

    mail(
      to: @customer.email,
      subject: "Service Suspended - #{@subscription.reference_number}"
    )
  end

  def trial_converted(subscription)
    @subscription = subscription
    @customer = subscription.customer

    mail(
      to: @customer.email,
      subject: "Trial Period Ended - #{@subscription.reference_number}"
    )
  end

  def trial_conversion_failed(subscription)
    @subscription = subscription
    @customer = subscription.customer

    mail(
      to: @customer.email,
      subject: "Action Required - Trial Period Ended - #{@subscription.reference_number}"
    )
  end

  def subscription_confirmation(subscription)
    @subscription = subscription
    @customer = subscription.customer

    mail(
      to: @customer.email,
      subject: "Welcome! Your #{@subscription.plan_name} Subscription is Active"
    )
  end

  def invoice(subscription, invoice)
    @subscription = subscription
    @customer = subscription.customer
    @invoice = invoice

    mail(
      to: @customer.email,
      subject: "Invoice #{@invoice.invoice_number} - #{@subscription.reference_number}"
    )
  end

  def upcoming_invoice(subscription, invoice)
    @subscription = subscription
    @customer = subscription.customer
    @invoice = invoice

    mail(
      to: @customer.email,
      subject: "Upcoming Invoice - #{@invoice.invoice_number} - Due #{@invoice.due_date.strftime('%B %d, %Y')}"
    )
  end

  private

  # Helper method for email templates
  def billing_frequency_text(frequency)
    case frequency
    when 1 then 'day'
    when 2 then 'week'
    when 3 then 'month'
    when 4 then 'year'
    else 'period'
    end
  end
  helper_method :billing_frequency_text
end
