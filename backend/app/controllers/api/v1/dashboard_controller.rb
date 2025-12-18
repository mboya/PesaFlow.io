class Api::V1::DashboardController < Api::V1::ApplicationController
  before_action :authenticate_api_v1_user!

  # GET /api/v1/dashboard
  def show
    customer = current_user_customer
    return render json: { error: "Customer not found" }, status: :not_found unless customer

    # Eager load associations to avoid N+1 queries
    subscriptions = customer.subscriptions.includes(:customer, :payments)

    # Get recent payments with eager loading
    recent_payments = Payment.includes(:subscription)
                              .where(subscription_id: subscriptions.select(:id))
                              .where(status: "completed")
                              .order(paid_at: :desc)
                              .limit(5)

    # Only include outstanding from non-cancelled subscriptions
    total_outstanding = subscriptions
                        .where.not(status: "cancelled")
                        .sum(:outstanding_amount)

    # Get active subscriptions with eager loading
    active_subscriptions = subscriptions.active.includes(:customer)

    # Get upcoming billing with eager loading
    upcoming_billing = subscriptions.active
                                    .includes(:customer)
                                    .where("next_billing_date <= ?", 7.days.from_now)
                                    .order(:next_billing_date)

    dashboard_data = {
      customer: JSON.parse(Api::V1::CustomerSerializer.render(customer)),
      active_subscriptions: JSON.parse(Api::V1::SubscriptionSerializer.render(active_subscriptions)),
      total_outstanding: total_outstanding,
      recent_payments: recent_payments.any? ? JSON.parse(Api::V1::PaymentSerializer.render(recent_payments)) : [],
      upcoming_billing: JSON.parse(Api::V1::SubscriptionSerializer.render(upcoming_billing))
    }

    render json: dashboard_data
  end
end
