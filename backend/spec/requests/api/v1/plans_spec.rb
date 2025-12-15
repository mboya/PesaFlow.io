require 'rails_helper'

RSpec.describe 'Api::V1::Plans', type: :request do
  let(:user) { create(:user) }
  let(:token) { login_user(user) }
  let(:headers) { auth_headers(token) }

  describe 'GET /api/v1/plans' do
    let!(:plan1) { create(:plan, amount: 100) }
    let!(:plan2) { create(:plan, amount: 200) }
    let!(:plan3) { create(:plan, amount: 300) }

    it 'returns all plans ordered by amount' do
      get '/api/v1/plans', headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json.length).to eq(3)
      expect(json[0]['amount']).to eq(100)
      expect(json[2]['amount']).to eq(300)
    end

    it 'requires authentication' do
      get '/api/v1/plans'

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'GET /api/v1/plans/:id' do
    let(:plan) { create(:plan) }

    it 'returns the plan details' do
      get "/api/v1/plans/#{plan.id}", headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['id']).to eq(plan.id)
      expect(json['name']).to eq(plan.name)
      expect(json['amount']).to eq(plan.amount.to_s)
    end

    it 'returns 404 for non-existent plan' do
      get '/api/v1/plans/99999', headers: headers

      expect(response).to have_http_status(:not_found)
    end

    it 'requires authentication' do
      get "/api/v1/plans/#{plan.id}"

      expect(response).to have_http_status(:unauthorized)
    end
  end
end

