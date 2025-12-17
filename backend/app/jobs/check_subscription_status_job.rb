class CheckSubscriptionStatusJob < ApplicationJob
  queue_as :default
  
  def perform
    # Find subscriptions with outstanding payments past grace period
    overdue_subscriptions = Subscription.active
                                       .where('outstanding_amount > 0')
                                       .where('next_billing_date < ?', 3.days.ago)
    
    overdue_subscriptions.find_each do |subscription|
      begin
        suspend_subscription(subscription)
      rescue StandardError => e
        Rails.logger.error("Error suspending subscription #{subscription.id}: #{e.message}")
        Rails.logger.error(e.backtrace.join("\n"))
      end
    end
    
    # Find expired trials
    expired_trials = Subscription.where(is_trial: true)
                                .where('trial_ends_at < ?', Date.current)
                                .where.not(status: 'cancelled')
    
    expired_trials.find_each do |subscription|
      begin
        # Attempt to convert trial to paid
        ConvertTrialJob.perform_later(subscription.id)
      rescue StandardError => e
        Rails.logger.error("Error converting trial subscription #{subscription.id}: #{e.message}")
        Rails.logger.error(e.backtrace.join("\n"))
      end
    end
  end
  
  private
  
  def suspend_subscription(subscription)
    # Skip if already suspended or cancelled
    return if subscription.status == 'suspended' || subscription.status == 'cancelled'
    
    # Suspend service using the model method
    subscription.suspend!
    
    # Notify customer via SMS
    send_sms(
      subscription.customer.phone_number,
      "Your #{subscription.plan_name} subscription has been suspended due to non-payment. " \
      "Pay KES #{subscription.outstanding_amount} to Paybill #{ENV.fetch('MPESA_PAYBILL', ENV.fetch('business_short_code', 'N/A'))}, " \
      "Account: #{subscription.reference_number}"
    )
    
    # Send email notification
    SubscriptionMailer.service_suspended(subscription).deliver_later
  end
  
  def send_sms(phone_number, message)
    # TODO: Implement SMS sending via M-Pesa or other provider
    # For now, just log it
    Rails.logger.info("SMS to #{phone_number}: #{message}")
  end
end

