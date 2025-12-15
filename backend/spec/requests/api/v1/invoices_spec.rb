require 'rails_helper'

RSpec.describe 'Api::V1::Invoices', type: :request do
  let(:user) { create(:user) }
  let(:customer) { create(:customer, email: user.email) }
  let(:plan) { create(:plan) }
  let(:subscription) { create(:subscription, customer: customer, plan: plan) }
  let(:token) { login_user(user) }
  let(:headers) { auth_headers(token) }

  before do
    customer.update(email: user.email)
  end

  describe 'GET /api/v1/invoices' do
    let!(:billing_attempt1) { create(:billing_attempt, subscription: subscription, invoice_number: 'INV-001') }
    let!(:billing_attempt2) { create(:billing_attempt, subscription: subscription, invoice_number: 'INV-002') }
    let!(:other_billing_attempt) { create(:billing_attempt, invoice_number: 'INV-003') }

    it 'returns all invoices for the customer' do
      get '/api/v1/invoices', headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json.length).to eq(2)
      invoice_numbers = json.map { |i| i['invoice_number'] }
      expect(invoice_numbers).to include('INV-001', 'INV-002')
      expect(invoice_numbers).not_to include('INV-003')
    end

    it 'requires authentication' do
      get '/api/v1/invoices'

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'GET /api/v1/invoices/:id' do
    let(:billing_attempt) { create(:billing_attempt, subscription: subscription, invoice_number: 'INV-12345') }

    it 'returns the invoice details' do
      get "/api/v1/invoices/#{billing_attempt.invoice_number}", headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['invoice_number']).to eq('INV-12345')
      expect(json['amount']).to eq(billing_attempt.amount.to_s)
    end

    it 'returns 404 for non-existent invoice' do
      get '/api/v1/invoices/INV-99999', headers: headers

      expect(response).to have_http_status(:not_found)
    end

    it 'returns unauthorized for other customer\'s invoice' do
      other_billing_attempt = create(:billing_attempt, invoice_number: 'INV-OTHER')
      get "/api/v1/invoices/#{other_billing_attempt.invoice_number}", headers: headers

      expect(response).to have_http_status(:unauthorized)
    end

    it 'requires authentication' do
      get "/api/v1/invoices/#{billing_attempt.invoice_number}"

      expect(response).to have_http_status(:unauthorized)
    end
  end
end

