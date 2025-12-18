require 'rails_helper'

RSpec.describe RetryFailedPaymentJob, type: :job do
  let(:customer) { create(:customer, phone_number: '254712345678') }
  let(:subscription) { create(:subscription, customer: customer, amount: 1000.0, status: 'active', outstanding_amount: 1000) }
  let(:billing_attempt) { create(:billing_attempt, :failed, subscription: subscription, retry_count: 1) }

  describe '#perform' do
    context 'when billing attempt exists and can be retried' do
      before do
        allow(SafaricomApi.client.mpesa.stk_push).to receive(:initiate).and_return(
          double(checkout_request_id: 'CHECKOUT123')
        )
      end

      it 'initiates STK Push payment' do
        RetryFailedPaymentJob.perform_now(billing_attempt.id)

        billing_attempt.reload
        expect(billing_attempt.status).to eq('processing')
        expect(billing_attempt.stk_push_checkout_id).to eq('CHECKOUT123')
      end

      it 'updates attempted_at timestamp' do
        expect {
          RetryFailedPaymentJob.perform_now(billing_attempt.id)
        }.to change { billing_attempt.reload.attempted_at }
      end
    end

    context 'when billing attempt does not exist' do
      it 'does not raise error' do
        expect {
          RetryFailedPaymentJob.perform_now(99999)
        }.not_to raise_error
      end
    end

    context 'when subscription is cancelled' do
      before do
        subscription.update!(status: 'cancelled')
      end

      it 'does not retry payment' do
        expect(SafaricomApi.client.mpesa.stk_push).not_to receive(:initiate)
        RetryFailedPaymentJob.perform_now(billing_attempt.id)
      end
    end

    context 'when billing attempt is already completed' do
      before do
        billing_attempt.update!(status: 'completed')
      end

      it 'does not retry payment' do
        expect(SafaricomApi.client.mpesa.stk_push).not_to receive(:initiate)
        RetryFailedPaymentJob.perform_now(billing_attempt.id)
      end
    end

    context 'when outstanding amount is zero' do
      before do
        subscription.update!(outstanding_amount: 0)
      end

      it 'does not retry payment' do
        expect(SafaricomApi.client.mpesa.stk_push).not_to receive(:initiate)
        RetryFailedPaymentJob.perform_now(billing_attempt.id)
      end
    end

    context 'when STK Push initiation fails' do
      before do
        allow(SafaricomApi.client.mpesa.stk_push).to receive(:initiate).and_raise(StandardError.new('API Error'))
      end

      it 'updates billing attempt status to failed' do
        expect {
          RetryFailedPaymentJob.perform_now(billing_attempt.id)
        }.to raise_error(StandardError, 'API Error')

        billing_attempt.reload
        expect(billing_attempt.status).to eq('failed')
        expect(billing_attempt.failure_reason).to include('API Error')
      end
    end
  end
end
