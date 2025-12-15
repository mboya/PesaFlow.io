require 'rails_helper'

RSpec.describe 'Api::V1::Refunds', type: :request do
  let(:user) { create(:user) }
  let(:customer) { create(:customer, email: user.email) }
  let(:plan) { create(:plan) }
  let(:subscription) { create(:subscription, customer: customer, plan: plan) }
  let(:payment) { create(:payment, subscription: subscription, status: 'completed') }
  let(:token) { login_user(user) }
  let(:headers) { auth_headers(token) }

  before do
    customer.update(email: user.email)
  end

  describe 'POST /api/v1/refunds' do
    let(:refund_params) do
      {
        payment_id: payment.id,
        amount: payment.amount,
        reason: 'Customer requested refund'
      }
    end

    it 'creates a refund request' do
      expect {
        post '/api/v1/refunds', params: refund_params, headers: headers, as: :json
      }.to change(Refund, :count).by(1)

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json['amount']).to eq(payment.amount.to_s)
      expect(json['reason']).to eq('Customer requested refund')
      expect(json['status']).to eq('pending')
    end

    it 'enqueues ProcessRefundJob' do
      expect {
        post '/api/v1/refunds', params: refund_params, headers: headers, as: :json
      }.to have_enqueued_job(ProcessRefundJob)
    end

    it 'requires authentication' do
      post '/api/v1/refunds', params: refund_params, as: :json

      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns error if payment cannot be refunded' do
      payment.update!(status: 'refunded')
      post '/api/v1/refunds', params: refund_params, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json['error']).to include('cannot be refunded')
    end

    it 'returns unauthorized for other customer\'s payment' do
      other_payment = create(:payment, status: 'completed')
      post '/api/v1/refunds', 
           params: { payment_id: other_payment.id, amount: other_payment.amount, reason: 'Test' }, 
           headers: headers, 
           as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end
end

