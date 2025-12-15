class SubscriptionMailer < ApplicationMailer
  def payment_receipt(subscription, payment)
    @subscription = subscription
    @payment = payment
    @customer = subscription.customer
    @plan = subscription.plan

    mail(
      to: @customer.email,
      subject: "Payment Receipt - #{@subscription.reference_number}"
    )
  end

  def service_suspended(subscription)
    @subscription = subscription
    @customer = subscription.customer
    @plan = subscription.plan
    @paybill = ENV.fetch('MPESA_PAYBILL', ENV.fetch('business_short_code', 'N/A'))

    mail(
      to: @customer.email,
      subject: "Service Suspended - #{@subscription.reference_number}"
    )
  end

  def trial_converted(subscription)
    @subscription = subscription
    @customer = subscription.customer
    @plan = subscription.plan

    mail(
      to: @customer.email,
      subject: "Trial Period Ended - #{@subscription.reference_number}"
    )
  end

  def trial_conversion_failed(subscription)
    @subscription = subscription
    @customer = subscription.customer
    @plan = subscription.plan

    mail(
      to: @customer.email,
      subject: "Action Required - Trial Period Ended - #{@subscription.reference_number}"
    )
  end
end
