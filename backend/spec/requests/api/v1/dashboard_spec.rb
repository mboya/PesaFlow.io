require 'rails_helper'

RSpec.describe 'Api::V1::Dashboard', type: :request do
  let(:user) { create(:user) }
  let(:customer) { create(:customer, email: user.email) }
  let(:plan) { create(:plan) }
  let(:token) { login_user(user) }
  let(:headers) { auth_headers(token) }

  before do
    customer.update(email: user.email)
  end

  describe 'GET /api/v1/dashboard' do
    let!(:active_subscription) { create(:subscription, customer: customer, plan: plan, status: 'active') }
    let!(:suspended_subscription) { create(:subscription, customer: customer, plan: plan, status: 'suspended') }
    let!(:payment) { create(:payment, subscription: active_subscription, status: 'completed') }

    it 'returns dashboard data for the customer' do
      get '/api/v1/dashboard', headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['customer']).to be_present
      expect(json['active_subscriptions']).to be_an(Array)
      expect(json['total_outstanding']).to be_present
      expect(json['recent_payments']).to be_an(Array)
      expect(json['upcoming_billing']).to be_an(Array)
    end

    it 'includes only active subscriptions' do
      get '/api/v1/dashboard', headers: headers

      json = JSON.parse(response.body)
      active_subscription_ids = json['active_subscriptions'].map { |s| s['id'] }
      expect(active_subscription_ids).to include(active_subscription.id)
      expect(active_subscription_ids).not_to include(suspended_subscription.id)
    end

    it 'requires authentication' do
      get '/api/v1/dashboard'

      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns error if customer not found' do
      user_without_customer = create(:user)
      token = login_user(user_without_customer)
      headers = auth_headers(token)

      get '/api/v1/dashboard', headers: headers

      expect(response).to have_http_status(:not_found)
      json = JSON.parse(response.body)
      expect(json['error']).to include('Customer not found')
    end
  end
end

