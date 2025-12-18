# Preview all emails at http://localhost:3000/rails/mailers/subscription_mailer_mailer
class SubscriptionMailerPreview < ActionMailer::Preview
  # Preview this email at http://localhost:3000/rails/mailers/subscription_mailer_mailer/payment_receipt
  def payment_receipt
    SubscriptionMailer.payment_receipt
  end
end
