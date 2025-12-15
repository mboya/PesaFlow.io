require 'rails_helper'

RSpec.describe 'Webhooks::C2b', type: :request do
  describe 'POST /webhooks/c2b/validation' do
    let(:payload) do
      {
        'TransactionType' => 'Pay Bill',
        'TransID' => 'MPESA123456',
        'TransTime' => '20240101120000',
        'TransAmount' => '100.00',
        'BusinessShortCode' => '174379',
        'BillRefNumber' => 'SUB-12345678',
        'InvoiceNumber' => '',
        'OrgAccountBalance' => '1000.00',
        'ThirdPartyTransID' => '',
        'MSISDN' => '254712345678'
      }
    end

    it 'returns success response' do
      post '/webhooks/c2b/validation', params: payload.to_json, headers: { 'Content-Type' => 'application/json' }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['ResultCode']).to eq(0)
      expect(json['ResultDesc']).to eq('Accepted')
    end

    it 'handles invalid JSON' do
      post '/webhooks/c2b/validation', params: 'invalid json', headers: { 'Content-Type' => 'application/json' }

      expect(response).to have_http_status(:bad_request)
    end
  end

  describe 'POST /webhooks/c2b/confirmation' do
    let(:subscription) { create(:subscription, reference_number: 'SUB-12345678') }
    let(:payload) do
      {
        'TransactionType' => 'Pay Bill',
        'TransID' => 'MPESA123456',
        'TransTime' => '20240101120000',
        'TransAmount' => '100.00',
        'BusinessShortCode' => '174379',
        'BillRefNumber' => 'SUB-12345678',
        'InvoiceNumber' => '',
        'OrgAccountBalance' => '1000.00',
        'ThirdPartyTransID' => '',
        'MSISDN' => '254712345678'
      }
    end

    it 'processes successful C2B payment' do
      expect {
        post '/webhooks/c2b/confirmation', params: payload.to_json, headers: { 'Content-Type' => 'application/json' }
      }.to change(Payment, :count).by(1)

      expect(response).to have_http_status(:ok)
      
      payment = Payment.last
      expect(payment.subscription).to eq(subscription)
      expect(payment.amount).to eq(100.0)
      expect(payment.payment_method).to eq('c2b')
      expect(payment.status).to eq('completed')
    end

    it 'marks subscription as paid' do
      subscription.update!(outstanding_amount: 100.0)
      
      post '/webhooks/c2b/confirmation', params: payload.to_json, headers: { 'Content-Type' => 'application/json' }

      subscription.reload
      expect(subscription.outstanding_amount).to eq(0)
      expect(subscription.status).to eq('active')
    end

    it 'sends payment receipt email' do
      expect {
        post '/webhooks/c2b/confirmation', params: payload.to_json, headers: { 'Content-Type' => 'application/json' }
      }.to have_enqueued_job(ActionMailer::MailDeliveryJob)
    end

    it 'returns ok even if subscription not found' do
      payload['BillRefNumber'] = 'SUB-NOTFOUND'
      
      post '/webhooks/c2b/confirmation', params: payload.to_json, headers: { 'Content-Type' => 'application/json' }

      expect(response).to have_http_status(:ok)
    end

    it 'handles invalid JSON' do
      post '/webhooks/c2b/confirmation', params: 'invalid json', headers: { 'Content-Type' => 'application/json' }

      expect(response).to have_http_status(:bad_request)
    end
  end
end

