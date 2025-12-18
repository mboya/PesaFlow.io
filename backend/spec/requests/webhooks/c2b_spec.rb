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
    let(:customer) { create(:customer, phone_number: '254712345678') }
    let(:subscription) { create(:subscription, customer: customer, reference_number: 'SUB-12345678', amount: 1000.0) }
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

    before do
      subscription # ensure subscription exists
    end

    it 'processes successful C2B payment' do
      # Verify subscription exists before request
      expect(Subscription.find_by(reference_number: 'SUB-12345678')).to eq(subscription)

      post '/webhooks/c2b/confirmation', params: payload.to_json, headers: { 'Content-Type' => 'application/json' }

      expect(response).to have_http_status(:ok)
      expect(Payment.count).to eq(1)

      payment = Payment.last
      expect(payment.subscription).to eq(subscription)
      expect(payment.amount.to_f).to eq(100.0)
      expect(payment.payment_method).to eq('c2b')
      expect(payment.status).to eq('completed')
    end

    it 'marks subscription as paid' do
      subscription.update!(outstanding_amount: 100.0)

      post '/webhooks/c2b/confirmation', params: payload.to_json, headers: { 'Content-Type' => 'application/json' }

      expect(response).to have_http_status(:ok)
      subscription.reload
      # Outstanding amount is reduced by payment amount (100.0 - 100.0 = 0)
      expect(subscription.outstanding_amount.to_f).to eq(0.0)
      expect(subscription.status).to eq('active')
    end

    it 'sends payment receipt email' do
      # Customer must have an email for the mailer to be called
      expect(customer.email).to be_present

      post '/webhooks/c2b/confirmation', params: payload.to_json, headers: { 'Content-Type' => 'application/json' }

      expect(response).to have_http_status(:ok)
      # Check that a mail delivery job was enqueued
      expect(ActionMailer::MailDeliveryJob).to have_been_enqueued
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
