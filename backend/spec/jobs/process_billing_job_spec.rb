require 'rails_helper'

RSpec.describe ProcessBillingJob, type: :job do
  let(:customer) { create(:customer) }
  let(:subscription) do
    create(:subscription, 
           customer: customer, 
           plan_amount: 1000.0,
           status: 'active', 
           next_billing_date: Date.current)
  end

  describe '#perform' do
    context 'when subscriptions are due for billing' do
      it 'creates billing attempts for due subscriptions' do
        subscription # ensure subscription exists
        expect {
          ProcessBillingJob.perform_now
        }.to change(BillingAttempt, :count).by(1)
      end

      it 'creates billing attempt with correct attributes' do
        subscription # ensure subscription exists
        ProcessBillingJob.perform_now

        billing_attempt = BillingAttempt.last
        expect(billing_attempt.subscription).to eq(subscription)
        expect(billing_attempt.amount).to eq(1000.0)
        expect(billing_attempt.payment_method).to eq('ratiba')
        expect(billing_attempt.status).to eq('processing')
      end

      it 'handles subscriptions with different payment methods' do
        subscription # ensure base subscription exists
        stk_subscription = create(:subscription, :with_stk_push, customer: customer, plan_amount: 1000.0, next_billing_date: Date.current)
        
        allow(SafaricomApi.client.mpesa.stk_push).to receive(:initiate).and_return(
          double(checkout_request_id: 'CHECKOUT123')
        )

        expect {
          ProcessBillingJob.perform_now
        }.to change(BillingAttempt, :count).by(2)
      end
    end

    context 'when no subscriptions are due' do
      before do
        subscription.update!(next_billing_date: 1.week.from_now)
      end

      it 'does not create billing attempts' do
        expect {
          ProcessBillingJob.perform_now
        }.not_to change(BillingAttempt, :count)
      end
    end

    context 'when subscription has outstanding amount' do
      before do
        subscription.update!(outstanding_amount: 500)
      end

      it 'skips subscription with outstanding balance' do
        expect {
          ProcessBillingJob.perform_now
        }.not_to change(BillingAttempt, :count)
      end
    end

    context 'when subscription is not active' do
      before do
        subscription.update!(status: 'suspended')
      end

      it 'skips inactive subscriptions' do
        expect {
          ProcessBillingJob.perform_now
        }.not_to change(BillingAttempt, :count)
      end
    end

    context 'error handling' do
      it 'continues processing other subscriptions on error' do
        # Create first subscription that will error
        error_subscription = create(:subscription, customer: customer, plan_amount: 1000.0, next_billing_date: Date.current)
        allow_any_instance_of(Subscription).to receive(:plan_amount).and_call_original
        
        # Create second subscription that should process normally
        other_subscription = create(:subscription, customer: customer, plan_amount: 1000.0, next_billing_date: Date.current)
        
        # Mock the first subscription to raise an error
        allow(error_subscription).to receive(:plan_amount).and_raise(StandardError.new('Database error'))
        
        # The job should still create at least one billing attempt for the other subscription
        expect {
          ProcessBillingJob.perform_now
        }.to change(BillingAttempt, :count).by_at_least(1)
      end
    end
  end
end
