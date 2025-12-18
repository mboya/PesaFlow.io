require "rails_helper"

RSpec.describe SubscriptionMailer, type: :mailer do
  let(:customer) { create(:customer) }
  let(:subscription) { create(:subscription, customer: customer, amount: 1000.0, name: 'Premium Plan') }
  let(:payment) { create(:payment, subscription: subscription, amount: 1000.0, status: 'completed') }

  describe "payment_receipt" do
    let(:mail) { SubscriptionMailer.payment_receipt(subscription, payment) }

    it "renders the headers" do
      expect(mail.subject).to eq("Payment Receipt - #{subscription.reference_number}")
      expect(mail.to).to eq([customer.email])
      # Check from address exists (may vary by environment)
      expect(mail.from).to be_present
    end

    it "renders the body" do
      expect(mail.body.encoded).to include(customer.name)
    end
  end

  describe "subscription_confirmation" do
    let(:mail) { SubscriptionMailer.subscription_confirmation(subscription) }

    it "renders the headers" do
      expect(mail.subject).to eq("Welcome! Your #{subscription.name} Subscription is Active")
      expect(mail.to).to eq([customer.email])
    end

    it "renders the body" do
      expect(mail.body.encoded).to include(subscription.name)
    end
  end

  describe "service_suspended" do
    let(:mail) { SubscriptionMailer.service_suspended(subscription) }

    it "renders the headers" do
      expect(mail.subject).to eq("Service Suspended - #{subscription.reference_number}")
      expect(mail.to).to eq([customer.email])
    end

    it "renders the body" do
      expect(mail.body.encoded).to include(subscription.reference_number)
    end
  end

  describe "trial_converted" do
    let(:mail) { SubscriptionMailer.trial_converted(subscription) }

    it "renders the headers" do
      expect(mail.subject).to eq("Trial Period Ended - #{subscription.reference_number}")
      expect(mail.to).to eq([customer.email])
    end
  end

  describe "trial_conversion_failed" do
    let(:mail) { SubscriptionMailer.trial_conversion_failed(subscription) }

    it "renders the headers" do
      expect(mail.subject).to include("Action Required")
      expect(mail.to).to eq([customer.email])
    end
  end
end
