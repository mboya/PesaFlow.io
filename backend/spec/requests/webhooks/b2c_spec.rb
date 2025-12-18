require 'rails_helper'

RSpec.describe 'Webhooks::B2c', type: :request do
  let(:customer) { create(:customer, phone_number: '254712345678') }
  let(:subscription) { create(:subscription, customer: customer, plan_amount: 1000.0) }
  let(:payment) { create(:payment, subscription: subscription, status: 'completed') }
  let(:refund) { create(:refund, :approved, subscription: subscription, payment: payment) }

  describe 'POST /webhooks/b2c/result' do
    context 'when payment is successful' do
      let(:payload) do
        {
          'Result' => {
            'ResultCode' => 0,
            'ResultDesc' => 'The service request is processed successfully.',
            'OriginatorConversationID' => refund.originator_conversation_id || 'ORIG123',
            'ConversationID' => refund.conversation_id || 'CONV123',
            'ResultParameters' => {
              'ResultParameter' => [
                { 'Key' => 'TransactionReceipt', 'Value' => 'MPESA123456' },
                { 'Key' => 'TransactionAmount', 'Value' => '100.00' },
                { 'Key' => 'B2CWorkingAccountAvailableFunds', 'Value' => '1000.00' },
                { 'Key' => 'B2CUtilityAccountAvailableFunds', 'Value' => '500.00' },
                { 'Key' => 'TransactionCompletedDateTime', 'Value' => '2024-01-01 12:00:00' },
                { 'Key' => 'ReceiverPartyPublicName', 'Value' => '254712345678 - John Doe' },
                { 'Key' => 'B2CChargesPaidAccountAvailableFunds', 'Value' => '100.00' },
                { 'Key' => 'B2CRecipientIsRegisteredCustomer', 'Value' => 'Y' }
              ]
            }
          }
        }
      end

      before do
        refund.update!(
          conversation_id: 'CONV123',
          originator_conversation_id: 'ORIG123'
        )
      end

      it 'marks refund as completed' do
        post '/webhooks/b2c/result', params: payload.to_json, headers: { 'Content-Type' => 'application/json' }

        expect(response).to have_http_status(:ok)
        refund.reload
        expect(refund.status).to eq('completed')
        expect(refund.mpesa_transaction_id).to eq('MPESA123456')
      end

      it 'marks payment as refunded' do
        post '/webhooks/b2c/result', params: payload.to_json, headers: { 'Content-Type' => 'application/json' }

        payment.reload
        expect(payment.status).to eq('refunded')
      end
    end

    context 'when payment fails' do
      let(:payload) do
        {
          'Result' => {
            'ResultCode' => 1,
            'ResultDesc' => 'Insufficient balance',
            'OriginatorConversationID' => refund.originator_conversation_id || 'ORIG123',
            'ConversationID' => refund.conversation_id || 'CONV123'
          }
        }
      end

      before do
        refund.update!(
          conversation_id: 'CONV123',
          originator_conversation_id: 'ORIG123'
        )
      end

      it 'marks refund as failed' do
        post '/webhooks/b2c/result', params: payload.to_json, headers: { 'Content-Type' => 'application/json' }

        expect(response).to have_http_status(:ok)
        refund.reload
        expect(refund.status).to eq('failed')
        expect(refund.failure_reason).to include('Insufficient balance')
      end
    end

    context 'when refund not found' do
      let(:payload) do
        {
          'Result' => {
            'ResultCode' => 0,
            'ConversationID' => 'UNKNOWN123',
            'OriginatorConversationID' => 'UNKNOWN123'
          }
        }
      end

      it 'returns ok without processing' do
        post '/webhooks/b2c/result', params: payload.to_json, headers: { 'Content-Type' => 'application/json' }

        expect(response).to have_http_status(:ok)
      end
    end

    it 'handles invalid JSON' do
      post '/webhooks/b2c/result', params: 'invalid json', headers: { 'Content-Type' => 'application/json' }

      expect(response).to have_http_status(:bad_request)
    end
  end

  describe 'POST /webhooks/b2c/timeout' do
    let(:payload) do
      {
        'Result' => {
          'ConversationID' => refund.conversation_id || 'CONV123',
          'OriginatorConversationID' => refund.originator_conversation_id || 'ORIG123'
        }
      }
    end

    before do
      refund.update!(
        conversation_id: 'CONV123',
        originator_conversation_id: 'ORIG123'
      )
    end

    it 'marks refund as failed with timeout reason' do
      post '/webhooks/b2c/timeout', params: payload.to_json, headers: { 'Content-Type' => 'application/json' }

      expect(response).to have_http_status(:ok)
      refund.reload
      expect(refund.status).to eq('failed')
      expect(refund.failure_reason).to include('timeout')
    end

    it 'handles invalid JSON' do
      post '/webhooks/b2c/timeout', params: 'invalid json', headers: { 'Content-Type' => 'application/json' }

      expect(response).to have_http_status(:bad_request)
    end
  end
end
