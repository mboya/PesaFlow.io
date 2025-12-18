require 'rails_helper'

RSpec.describe 'Api::V1::Invoices', type: :request do
  let(:user) { create(:user) }
  let(:customer) { create(:customer, user: user, email: user.email) }
  let(:subscription) { create(:subscription, customer: customer, amount: 1000.0) }
  let(:token) { login_user(user) }
  let(:headers) { auth_headers(token) }

  # Share customer and subscription across all examples to reduce setup time
  before do
    customer
    subscription
  end

  describe 'GET /api/v1/invoices' do
    # Create billing attempts once for this describe block
    before do
      create(:billing_attempt, subscription: subscription, invoice_number: 'INV-001')
      create(:billing_attempt, subscription: subscription, invoice_number: 'INV-002')
      # Create other customer's billing attempt
      other_customer = create(:customer)
      other_subscription = create(:subscription, customer: other_customer)
      create(:billing_attempt, subscription: other_subscription, invoice_number: 'INV-003')
    end

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
      other_customer = create(:customer)
      other_subscription = create(:subscription, customer: other_customer)
      other_billing_attempt = create(:billing_attempt, subscription: other_subscription, invoice_number: 'INV-OTHER')
      get "/api/v1/invoices/#{other_billing_attempt.invoice_number}", headers: headers

      expect(response).to have_http_status(:unauthorized)
    end

    it 'requires authentication' do
      get "/api/v1/invoices/#{billing_attempt.invoice_number}"

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
