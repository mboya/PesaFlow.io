require 'rails_helper'

RSpec.describe 'Api::V1::PaymentMethods', type: :request do
  let(:user) { create(:user) }
  let(:customer) { create(:customer, user: user, email: user.email, phone_number: '254712345678') }
  let(:subscription) { create(:subscription, customer: customer, amount: 1000.0, status: 'active') }
  let(:token) { login_user(user) }
  let(:headers) { auth_headers(token) }

  before do
    customer # ensure customer exists
  end

  describe 'POST /api/v1/payment_methods/setup_standing_order' do
    let(:params) { { subscription_id: subscription.id } }

    before do
      # Mock the StandingOrderService instead of non-existent controller method
      allow_any_instance_of(Payments::StandingOrderService).to receive(:create).and_return(
        double(standing_order_id: 'RATIBA-1234567890')
      )
      allow_any_instance_of(Subscription).to receive(:standing_order_id).and_return('RATIBA-1234567890')
    end

    it 'sets up standing order for subscription' do
      post '/api/v1/payment_methods/setup_standing_order', params: params, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['message']).to include('Standing order setup successfully')
    end

    it 'requires authentication' do
      post '/api/v1/payment_methods/setup_standing_order', params: params, as: :json

      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns error if subscription not found' do
      post '/api/v1/payment_methods/setup_standing_order', 
           params: { subscription_id: 99999 }, 
           headers: headers, 
           as: :json

      # ActiveRecord::RecordNotFound is rescued and returns 422 with error message
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'POST /api/v1/payment_methods/stk_push' do
    let(:params) { { reference: subscription.reference_number, amount: subscription.amount } }

    before do
      allow(SafaricomApi.client.mpesa.stk_push).to receive(:initiate).and_return(
        double(checkout_request_id: 'CHECKOUT123456')
      )
    end

    it 'initiates STK Push payment' do
      expect {
        post '/api/v1/payment_methods/stk_push', params: params, headers: headers, as: :json
      }.to change(BillingAttempt, :count).by(1)

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['message']).to include('STK Push initiated successfully')
      expect(json['checkout_request_id']).to eq('CHECKOUT123456')
    end

    it 'requires authentication' do
      post '/api/v1/payment_methods/stk_push', params: params, as: :json

      expect(response).to have_http_status(:unauthorized)
    end

    it 'handles STK Push initiation failure' do
      allow(SafaricomApi.client.mpesa.stk_push).to receive(:initiate).and_raise(StandardError.new('API Error'))

      post '/api/v1/payment_methods/stk_push', params: params, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json['error']).to be_present
    end
  end
end
