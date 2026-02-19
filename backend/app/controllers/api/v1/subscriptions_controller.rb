# Require subscription services explicitly to avoid autoloading issues
Dir[Rails.root.join("app/services/subscriptions/*.rb")].each { |f| require f }

class Api::V1::SubscriptionsController < Api::V1::ApplicationController
  before_action :authenticate_api_v1_user!
  before_action :set_subscription, only: [ :show, :update, :cancel, :reactivate ]

  # GET /api/v1/subscriptions
  def index
    @subscriptions = current_user.customer&.subscriptions&.includes(:customer) || Subscription.none
    render json: @subscriptions, each_serializer: Api::V1::SubscriptionSerializer
  end

  # GET /api/v1/subscriptions/:id
  def show
    return unless authorize_subscription!
    render json: @subscription, serializer: Api::V1::SubscriptionSerializer
  end

  # POST /api/v1/subscriptions
  def create
    result = ::Subscriptions::CreateService.new(
      user: current_user,
      customer_params: customer_params,
      subscription_params: create_subscription_params,
      payment_method: params[:payment_method] || create_subscription_params[:preferred_payment_method] || "ratiba"
    ).call

    if result.success?
      render json: Api::V1::SubscriptionSerializer.render(result.subscription), status: :created
    else
      render json: { errors: result.errors }, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /api/v1/subscriptions/:id
  def update
    return unless authorize_subscription!

    with_transaction do
      if @subscription.update(subscription_params)
        render json: Api::V1::SubscriptionSerializer.render(@subscription)
      else
        render json: { errors: @subscription.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end

  # POST /api/v1/subscriptions/:id/cancel
  def cancel
    return unless authorize_subscription!

    ::Subscriptions::CancelService.new(@subscription).call(
      reason: params[:reason] || "Customer requested",
      refund_unused: params[:refund_unused] || false
    )

    render json: { message: "Subscription cancelled successfully", subscription: Api::V1::SubscriptionSerializer.render(@subscription.reload) }
  rescue StandardError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  # POST /api/v1/subscriptions/:id/reactivate
  def reactivate
    return unless authorize_subscription!

    with_transaction do
      if @subscription.outstanding_amount.to_d > 0
        render json: { error: "Please clear outstanding balance before reactivating" }, status: :unprocessable_entity
      elsif %w[suspended cancelled expired].include?(@subscription.status)
        @subscription.reactivate!
        render json: { message: "Subscription reactivated successfully", subscription: Api::V1::SubscriptionSerializer.render(@subscription) }
      else
        render json: { error: "Only suspended, cancelled, or expired subscriptions can be reactivated" }, status: :unprocessable_entity
      end
    end
  end

  private

  def set_subscription
    # Use find_by with includes - eager loading only happens if record exists
    @subscription = Subscription.includes(:customer).find_by(id: params[:id])
    raise ActiveRecord::RecordNotFound, "Subscription not found" unless @subscription
  end

  def authorize_subscription!
    customer = current_user_customer
    unless customer && @subscription.customer == customer
      render json: { error: "Unauthorized" }, status: :unauthorized
      return false
    end
    true
  end

  def subscription_params
    params.require(:subscription).permit(:preferred_payment_method, :is_trial, :trial_ends_at)
  end

  # Strong params for creation (commercial fields)
  def create_subscription_params
    params.require(:subscription).permit(
      :name,
      :description,
      :amount,
      :currency,
      :billing_cycle_days,
      :trial_days,
      :has_trial,
      :preferred_payment_method
    )
  end

  def customer_params
    customer_data = params[:customer] ? params.require(:customer).permit(:phone_number, :email, :first_name, :last_name) : {}

    # Merge with defaults from current user
    {
      email: customer_data[:email].presence || current_user.email,
      phone_number: customer_data[:phone_number].presence || current_user.customer&.phone_number,
      first_name: customer_data[:first_name].presence || current_user.email.split("@").first,
      last_name: customer_data[:last_name].presence || ""
    }
  end
end
