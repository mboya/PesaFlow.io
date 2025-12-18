require 'rails_helper'

RSpec.describe ConvertTrialJob, type: :job do
  let(:customer) { create(:customer, phone_number: '254712345678') }
  let(:trial_subscription) do
    create(:subscription,
           :trial,
           customer: customer,
           amount: 1000.0,
           trial_ends_at: 1.day.ago)
  end

  describe '#perform' do
    context 'when customer has standing order enabled' do
      before do
        customer.update!(standing_order_enabled: true)
      end

      it 'creates billing attempt for Ratiba payment' do
        expect {
          ConvertTrialJob.perform_now(trial_subscription.id)
        }.to change(BillingAttempt, :count).by(1)
      end

      it 'converts trial to active subscription' do
        ConvertTrialJob.perform_now(trial_subscription.id)

        trial_subscription.reload
        expect(trial_subscription.is_trial).to be false
        expect(trial_subscription.status).to eq('active')
      end

      it 'sends conversion email' do
        expect {
          ConvertTrialJob.perform_now(trial_subscription.id)
        }.to have_enqueued_job(ActionMailer::MailDeliveryJob)
      end
    end

    context 'when customer does not have standing order' do
      before do
        customer.update!(standing_order_enabled: false)
        allow(SafaricomApi.client.mpesa.stk_push).to receive(:initiate).and_return(
          double(checkout_request_id: 'CHECKOUT123')
        )
      end

      it 'initiates STK Push payment' do
        expect {
          ConvertTrialJob.perform_now(trial_subscription.id)
        }.to change(BillingAttempt, :count).by(1)

        billing_attempt = BillingAttempt.last
        expect(billing_attempt.payment_method).to eq('stk_push')
        expect(billing_attempt.stk_push_checkout_id).to eq('CHECKOUT123')
      end
    end

    context 'when subscription does not exist' do
      it 'does not raise error' do
        expect {
          ConvertTrialJob.perform_now(99999)
        }.not_to raise_error
      end
    end

    context 'when subscription is already cancelled' do
      before do
        trial_subscription.update!(status: 'cancelled')
      end

      it 'does not convert cancelled subscription' do
        expect {
          ConvertTrialJob.perform_now(trial_subscription.id)
        }.not_to change { trial_subscription.reload.status }
      end
    end

    context 'when trial is not expired' do
      before do
        trial_subscription.update!(trial_ends_at: 1.week.from_now)
      end

      it 'does not convert active trial' do
        expect {
          ConvertTrialJob.perform_now(trial_subscription.id)
        }.not_to change { trial_subscription.reload.is_trial }
      end
    end

    context 'when STK Push initiation fails' do
      before do
        customer.update!(standing_order_enabled: false)
        allow(SafaricomApi.client.mpesa.stk_push).to receive(:initiate).and_raise(StandardError.new('API Error'))
      end

      it 'suspends subscription' do
        expect {
          ConvertTrialJob.perform_now(trial_subscription.id)
        }.to raise_error(StandardError, 'API Error')

        trial_subscription.reload
        expect(trial_subscription.status).to eq('suspended')
      end

      it 'sends conversion failed email' do
        expect {
          begin
            ConvertTrialJob.perform_now(trial_subscription.id)
          rescue StandardError
            # Expected error
          end
        }.to have_enqueued_job(ActionMailer::MailDeliveryJob)
      end
    end
  end
end
