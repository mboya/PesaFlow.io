require 'rails_helper'

RSpec.describe 'Api::V1::Subscriptions', type: :request do
  let(:user) { create(:user) }
  let(:customer) { create(:customer, email: user.email) }
  let(:plan) { create(:plan) }
  let(:token) { login_user(user) }
  let(:headers) { auth_headers(token) }

  before do
    # Associate customer with user via email (controllers find customer by email)
    customer.update(email: user.email)
  end

  describe 'GET /api/v1/subscriptions' do
    let!(:subscription1) { create(:subscription, customer: customer, plan: plan) }
    let!(:subscription2) { create(:subscription, customer: customer, plan: plan) }
    let!(:other_subscription) { create(:subscription) }

    it 'returns all subscriptions for the current user' do
      get '/api/v1/subscriptions', headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json.length).to eq(2)
    end

    it 'requires authentication' do
      get '/api/v1/subscriptions'

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'GET /api/v1/subscriptions/:id' do
    let(:subscription) { create(:subscription, customer: customer, plan: plan) }

    it 'returns the subscription details' do
      get "/api/v1/subscriptions/#{subscription.id}", headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['id']).to eq(subscription.id)
      expect(json['reference_number']).to eq(subscription.reference_number)
    end

    it 'returns 404 for non-existent subscription' do
      get '/api/v1/subscriptions/99999', headers: headers

      expect(response).to have_http_status(:not_found)
    end

    it 'returns unauthorized for other user\'s subscription' do
      other_subscription = create(:subscription)
      get "/api/v1/subscriptions/#{other_subscription.id}", headers: headers

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'POST /api/v1/subscriptions' do
    let(:subscription_params) do
      {
        subscription: {
          preferred_payment_method: 'stk_push',
          is_trial: false
        },
        plan_id: plan.id
      }
    end

    it 'creates a new subscription' do
      expect {
        post '/api/v1/subscriptions', params: subscription_params, headers: headers, as: :json
      }.to change(Subscription, :count).by(1)

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json['plan_id']).to eq(plan.id)
    end

    it 'requires authentication' do
      post '/api/v1/subscriptions', params: subscription_params, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'PATCH /api/v1/subscriptions/:id' do
    let(:subscription) { create(:subscription, customer: customer, plan: plan) }
    let(:update_params) do
      {
        subscription: {
          preferred_payment_method: 'ratiba'
        }
      }
    end

    it 'updates the subscription' do
      patch "/api/v1/subscriptions/#{subscription.id}", params: update_params, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['preferred_payment_method']).to eq('ratiba')
    end

    it 'requires authentication' do
      patch "/api/v1/subscriptions/#{subscription.id}", params: update_params, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'POST /api/v1/subscriptions/:id/cancel' do
    let(:subscription) { create(:subscription, customer: customer, plan: plan, status: 'active') }

    it 'cancels the subscription' do
      post "/api/v1/subscriptions/#{subscription.id}/cancel", headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['message']).to include('cancelled')
      expect(subscription.reload.status).to eq('cancelled')
    end

    it 'requires authentication' do
      post "/api/v1/subscriptions/#{subscription.id}/cancel"

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'POST /api/v1/subscriptions/:id/reactivate' do
    let(:subscription) { create(:subscription, customer: customer, plan: plan, status: 'suspended', outstanding_amount: 0) }

    it 'reactivates a suspended subscription' do
      post "/api/v1/subscriptions/#{subscription.id}/reactivate", headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['message']).to include('reactivated')
      expect(subscription.reload.status).to eq('active')
    end

    it 'fails if subscription has outstanding balance' do
      subscription.update!(outstanding_amount: 100)
      post "/api/v1/subscriptions/#{subscription.id}/reactivate", headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json['error']).to include('outstanding balance')
    end
  end

  describe 'POST /api/v1/subscriptions/:id/upgrade' do
    let(:subscription) { create(:subscription, customer: customer, plan: plan) }
    let(:new_plan) { create(:plan, amount: plan.amount + 100) }

    it 'upgrades the subscription to a higher plan' do
      post "/api/v1/subscriptions/#{subscription.id}/upgrade", 
           params: { new_plan_id: new_plan.id }, 
           headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['message']).to include('upgraded')
      expect(subscription.reload.plan_id).to eq(new_plan.id)
    end

    it 'fails if new plan amount is not higher' do
      lower_plan = create(:plan, amount: plan.amount - 100)
      post "/api/v1/subscriptions/#{subscription.id}/upgrade", 
           params: { new_plan_id: lower_plan.id }, 
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'POST /api/v1/subscriptions/:id/downgrade' do
    let(:subscription) { create(:subscription, customer: customer, plan: plan) }
    let(:new_plan) { create(:plan, amount: plan.amount - 100) }

    it 'downgrades the subscription to a lower plan' do
      post "/api/v1/subscriptions/#{subscription.id}/downgrade", 
           params: { new_plan_id: new_plan.id }, 
           headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['message']).to include('downgraded')
      expect(subscription.reload.plan_id).to eq(new_plan.id)
    end

    it 'fails if new plan amount is not lower' do
      higher_plan = create(:plan, amount: plan.amount + 100)
      post "/api/v1/subscriptions/#{subscription.id}/downgrade", 
           params: { new_plan_id: higher_plan.id }, 
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end

