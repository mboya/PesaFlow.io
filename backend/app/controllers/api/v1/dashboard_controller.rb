class Api::V1::DashboardController < Api::V1::ApplicationController
  before_action :authenticate_api_v1_user!

  # GET /api/v1/dashboard
  def show
    customer = require_customer!
    return unless customer

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

    # Analytics data
    analytics = calculate_analytics(subscriptions)

    dashboard_data = {
      customer: JSON.parse(Api::V1::CustomerSerializer.render(customer)),
      active_subscriptions: JSON.parse(Api::V1::SubscriptionSerializer.render(active_subscriptions)),
      total_outstanding: total_outstanding,
      recent_payments: recent_payments.any? ? JSON.parse(Api::V1::PaymentSerializer.render(recent_payments)) : [],
      upcoming_billing: JSON.parse(Api::V1::SubscriptionSerializer.render(upcoming_billing)),
      analytics: analytics
    }

    render json: dashboard_data
  end

  private

  def calculate_analytics(subscriptions)
    subscription_ids = subscriptions.pluck(:id)

    # Revenue trends - last 30 days daily revenue
    revenue_data = Payment.where(subscription_id: subscription_ids)
                          .where(status: "completed")
                          .where("paid_at >= ?", 30.days.ago.beginning_of_day)
                          .group("paid_at::date")
                          .sum(:amount)
    
    # Fill in missing dates with 0
    revenue_trends = (30.days.ago.to_date..Date.current).map do |date|
      revenue = revenue_data[date] || 0.0
      { date: date.strftime("%Y-%m-%d"), revenue: revenue.to_f }
    end

    # Payment success rate
    all_payments = Payment.where(subscription_id: subscription_ids)
                          .where("created_at >= ?", 30.days.ago)
    payment_stats = all_payments.group(:status).count
    total_payments = all_payments.count.to_f
    completed_payments = payment_stats["completed"] || 0
    success_rate = total_payments > 0 ? (completed_payments / total_payments * 100).round(1) : 0.0

    # Subscription growth - new subscriptions over last 30 days
    growth_data = subscriptions.where("created_at >= ?", 30.days.ago.beginning_of_day)
                               .group("created_at::date")
                               .count
    
    subscription_growth = (30.days.ago.to_date..Date.current).map do |date|
      count = growth_data[date] || 0
      { date: date.strftime("%Y-%m-%d"), count: count }
    end

    # Monthly Recurring Revenue (MRR) - sum of active subscription amounts
    mrr = subscriptions.active.sum(:amount).to_f

    # Total revenue (all time)
    total_revenue = Payment.where(subscription_id: subscription_ids)
                           .where(status: "completed")
                           .sum(:amount)
                           .to_f

    {
      revenue_trends: revenue_trends,
      payment_success_rate: success_rate,
      payment_stats: {
        completed: completed_payments,
        total: total_payments.to_i,
        refunded: (payment_stats["refunded"] || 0),
        disputed: (payment_stats["disputed"] || 0)
      },
      subscription_growth: subscription_growth,
      mrr: mrr,
      total_revenue: total_revenue
    }
  end
end
