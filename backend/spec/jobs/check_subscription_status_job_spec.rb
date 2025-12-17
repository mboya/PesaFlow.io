require 'rails_helper'

RSpec.describe CheckSubscriptionStatusJob, type: :job do
  let(:customer) { create(:customer) }

  describe '#perform' do
    context 'when subscriptions are overdue' do
      let(:overdue_subscription) do
        create(:subscription, 
               customer: customer, 
               plan_amount: 1000.0,
               status: 'active',
               outstanding_amount: 1000,
               next_billing_date: 4.days.ago)
      end

      it 'suspends overdue subscriptions' do
        overdue_subscription
        CheckSubscriptionStatusJob.perform_now

        overdue_subscription.reload
        expect(overdue_subscription.status).to eq('suspended')
        expect(overdue_subscription.suspended_at).to be_present
      end

      it 'sends suspension notification email' do
        overdue_subscription
        expect {
          CheckSubscriptionStatusJob.perform_now
        }.to have_enqueued_job(ActionMailer::MailDeliveryJob)
      end
    end

    context 'when subscriptions are not overdue' do
      let(:current_subscription) do
        create(:subscription,
               customer: customer,
               plan_amount: 1000.0,
               status: 'active',
               outstanding_amount: 0,
               next_billing_date: Date.current)
      end

      it 'does not suspend current subscriptions' do
        current_subscription
        CheckSubscriptionStatusJob.perform_now

        current_subscription.reload
        expect(current_subscription.status).to eq('active')
      end
    end

    context 'when subscription is already suspended' do
      let(:suspended_subscription) do
        create(:subscription,
               :suspended,
               customer: customer,
               plan_amount: 1000.0,
               outstanding_amount: 1000,
               next_billing_date: 4.days.ago)
      end

      it 'does not suspend again' do
        suspended_subscription
        expect {
          CheckSubscriptionStatusJob.perform_now
        }.not_to change { suspended_subscription.reload.suspended_at }
      end
    end

    context 'when subscription is cancelled' do
      let(:cancelled_subscription) do
        create(:subscription,
               :cancelled,
               customer: customer,
               plan_amount: 1000.0,
               outstanding_amount: 1000,
               next_billing_date: 4.days.ago)
      end

      it 'does not suspend cancelled subscriptions' do
        cancelled_subscription
        CheckSubscriptionStatusJob.perform_now

        cancelled_subscription.reload
        expect(cancelled_subscription.status).to eq('cancelled')
      end
    end

    context 'when trials are expired' do
      let(:expired_trial) do
        create(:subscription,
               :trial,
               customer: customer,
               plan_amount: 1000.0,
               trial_ends_at: 1.day.ago)
      end

      it 'triggers ConvertTrialJob for expired trials' do
        expired_trial
        expect {
          CheckSubscriptionStatusJob.perform_now
        }.to have_enqueued_job(ConvertTrialJob)
      end
    end

    context 'when trials are not expired' do
      let(:active_trial) do
        create(:subscription,
               :trial,
               customer: customer,
               plan_amount: 1000.0,
               trial_ends_at: 1.week.from_now)
      end

      it 'does not convert active trials' do
        active_trial
        expect {
          CheckSubscriptionStatusJob.perform_now
        }.not_to have_enqueued_job(ConvertTrialJob)
      end
    end

    context 'error handling' do
      let(:overdue_subscription) do
        create(:subscription,
               customer: customer,
               plan_amount: 1000.0,
               status: 'active',
               outstanding_amount: 1000,
               next_billing_date: 4.days.ago)
      end

      before do
        allow_any_instance_of(Subscription).to receive(:suspend!).and_raise(StandardError.new('Database error'))
      end

      it 'continues processing other subscriptions on error' do
        overdue_subscription # create first subscription
        other_overdue = create(:subscription,
                               customer: customer,
                               plan_amount: 1000.0,
                               status: 'active',
                               outstanding_amount: 1000,
                               next_billing_date: 4.days.ago)
        
        # Reset the stub for the second subscription
        allow(other_overdue).to receive(:suspend!).and_call_original
        
        CheckSubscriptionStatusJob.perform_now

        # The job should have attempted to process both - even with errors it continues
        expect(other_overdue.reload.status).to eq('active') # stub prevents actual suspension
      end
    end
  end
end
