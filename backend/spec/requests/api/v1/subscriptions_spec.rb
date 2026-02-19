require 'rails_helper'

RSpec.describe 'Api::V1::Subscriptions', type: :request do
  let(:user) { create(:user) }
  let(:customer) { create(:customer, user: user, email: user.email) }
  let(:token) { login_user(user) }
  let(:headers) { auth_headers(token) }

  before do
    # Ensure customer exists for the user
    customer
  end

  describe 'GET /api/v1/subscriptions' do
    # Create subscriptions once for this describe block
    before do
      create(:subscription, customer: customer)
      create(:subscription, customer: customer)
      # Create other user's subscription
      other_user = create(:user)
      other_customer = create(:customer, user: other_user)
      create(:subscription, customer: other_customer)
    end

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
    let(:subscription) { create(:subscription, customer: customer) }

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
      other_user = create(:user)
      other_customer = create(:customer, user: other_user)
      other_subscription = create(:subscription, customer: other_customer)
      get "/api/v1/subscriptions/#{other_subscription.id}", headers: headers

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'POST /api/v1/subscriptions' do
    let(:subscription_params) do
      {
        subscription: {
          name: 'Test Subscription',
          description: 'A test subscription',
          amount: 1000,
          currency: 'KES',
          billing_cycle_days: 30
        },
        payment_method: 'stk_push'
      }
    end

    # Mock STK Push API once for all examples in this block
    before do
      allow(SafaricomApi.client.mpesa.stk_push).to receive(:initiate).and_return(
        double(checkout_request_id: 'CHECKOUT123', success?: true)
      )
    end

    it 'creates a new subscription' do
      expect {
        post '/api/v1/subscriptions', params: subscription_params, headers: headers, as: :json
      }.to change(Subscription, :count).by(1)

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json['name']).to eq('Test Subscription')
      expect(json['amount'].to_f).to eq(1000.0)
    end

    it 'requires authentication' do
      post '/api/v1/subscriptions', params: subscription_params, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'PATCH /api/v1/subscriptions/:id' do
    let(:subscription) { create(:subscription, customer: customer) }
    let(:update_params) do
      {
        subscription: {
          preferred_payment_method: 'stk_push'
        }
      }
    end

    it 'updates the subscription' do
      patch "/api/v1/subscriptions/#{subscription.id}", params: update_params, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['preferred_payment_method']).to eq('stk_push')
    end

    it 'requires authentication' do
      patch "/api/v1/subscriptions/#{subscription.id}", params: update_params, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'POST /api/v1/subscriptions/:id/cancel' do
    let(:subscription) { create(:subscription, customer: customer, status: 'active') }

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
    context 'when suspended' do
      let(:subscription) { create(:subscription, customer: customer, status: 'suspended', outstanding_amount: 0, suspended_at: 1.day.ago) }

      it 'reactivates a suspended subscription' do
        post "/api/v1/subscriptions/#{subscription.id}/reactivate", headers: headers

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['message']).to include('reactivated')

        subscription.reload
        expect(subscription.status).to eq('active')
        expect(subscription.suspended_at).to be_nil
      end
    end

    context 'when cancelled' do
      let(:subscription) { create(:subscription, customer: customer, status: 'cancelled', outstanding_amount: 0, cancelled_at: 1.day.ago) }

      it 'reactivates a cancelled subscription' do
        post "/api/v1/subscriptions/#{subscription.id}/reactivate", headers: headers

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['message']).to include('reactivated')

        subscription.reload
        expect(subscription.status).to eq('active')
        expect(subscription.cancelled_at).to be_nil
      end
    end

    it 'fails if subscription has outstanding balance' do
      subscription = create(:subscription, customer: customer, status: 'cancelled', outstanding_amount: 100)
      post "/api/v1/subscriptions/#{subscription.id}/reactivate", headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json['error']).to include('outstanding balance')
    end
  end
end
