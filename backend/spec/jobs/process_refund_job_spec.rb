require 'rails_helper'

RSpec.describe ProcessRefundJob, type: :job do
  let(:customer) { create(:customer, phone_number: '254712345678') }
  let(:subscription) { create(:subscription, customer: customer, amount: 1000.0) }
  let(:payment) { create(:payment, subscription: subscription, status: 'completed') }
  let(:refund) { create(:refund, :approved, subscription: subscription, payment: payment) }

  describe '#perform' do
    context 'when refund can be processed' do
      before do
        allow_any_instance_of(ProcessRefundJob).to receive(:initiate_b2c_refund).and_return(
          {
            'ResponseCode' => '0',
            'ResponseDescription' => 'Success',
            'ConversationID' => 'CONV123',
            'OriginatorConversationID' => 'ORIG123'
          }
        )
      end

      it 'processes the refund' do
        ProcessRefundJob.perform_now(refund.id)

        refund.reload
        expect(refund.status).to eq('completed')
        expect(refund.conversation_id).to eq('CONV123')
      end
    end

    context 'when refund does not exist' do
      it 'does not raise error' do
        expect {
          ProcessRefundJob.perform_now(99999)
        }.not_to raise_error
      end
    end

    context 'when refund is pending' do
      before do
        refund.update!(status: 'pending')
      end

      it 'auto-approves and processes the pending refund' do
        ProcessRefundJob.perform_now(refund.id)

        refund.reload
        # Pending refunds are auto-approved and processed
        expect(refund.status).to eq('completed')
      end
    end

    context 'when refund is already completed' do
      before do
        refund.update!(status: 'completed')
      end

      it 'does not process again' do
        expect_any_instance_of(ProcessRefundJob).not_to receive(:initiate_b2c_refund)
        ProcessRefundJob.perform_now(refund.id)
      end
    end

    context 'when B2C refund initiation fails' do
      before do
        allow_any_instance_of(ProcessRefundJob).to receive(:initiate_b2c_refund).and_return(
          {
            'ResponseCode' => '1',
            'ResponseDescription' => 'Failed'
          }
        )
      end

      it 'marks refund as failed' do
        ProcessRefundJob.perform_now(refund.id)

        refund.reload
        expect(refund.status).to eq('failed')
        expect(refund.failure_reason).to include('Failed')
      end
    end

    context 'when exception occurs' do
      before do
        allow_any_instance_of(ProcessRefundJob).to receive(:initiate_b2c_refund).and_raise(StandardError.new('API Error'))
      end

      it 'marks refund as failed with error message' do
        expect {
          ProcessRefundJob.perform_now(refund.id)
        }.to raise_error(StandardError, 'API Error')

        refund.reload
        expect(refund.status).to eq('failed')
        expect(refund.failure_reason).to include('API Error')
      end
    end
  end
end
