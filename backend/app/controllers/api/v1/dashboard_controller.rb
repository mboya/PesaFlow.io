class Api::V1::DashboardController < Api::V1::ApplicationController
  before_action :authenticate_api_v1_user!
  
  # GET /api/v1/dashboard
  def show
    customer = current_user_customer
    return render json: { error: 'Customer not found' }, status: :not_found unless customer
    
    recent_payments = customer.subscriptions.joins(:payments)
                              .merge(Payment.completed)
                              .order('payments.paid_at DESC')
                              .limit(5)
                              .map { |s| s.payments.completed.order(paid_at: :desc).first }
                              .compact
    
    dashboard_data = {
      customer: JSON.parse(Api::V1::CustomerSerializer.render(customer)),
      active_subscriptions: JSON.parse(Api::V1::SubscriptionSerializer.render(customer.subscriptions.active)),
      total_outstanding: customer.subscriptions.sum(:outstanding_amount),
      recent_payments: recent_payments.any? ? JSON.parse(Api::V1::PaymentSerializer.render(recent_payments)) : [],
      upcoming_billing: JSON.parse(Api::V1::SubscriptionSerializer.render(
        customer.subscriptions.active
                .where('next_billing_date <= ?', 7.days.from_now)
                .order(:next_billing_date)
      ))
    }
    
    render json: dashboard_data
  end
end

