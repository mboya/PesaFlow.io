# Require subscription services explicitly to avoid autoloading issues
Dir[Rails.root.join('app/services/subscriptions/*.rb')].each { |f| require f }

class Api::V1::SubscriptionsController < Api::V1::ApplicationController
  before_action :authenticate_api_v1_user!
  before_action :set_subscription, only: [:show, :update, :cancel, :reactivate, :upgrade, :downgrade]
  
  # GET /api/v1/subscriptions
  def index
    @subscriptions = current_user.customer&.subscriptions || Subscription.none
    render json: @subscriptions, each_serializer: Api::V1::SubscriptionSerializer
  end
  
  # GET /api/v1/subscriptions/:id
  def show
    authorize_subscription!
    render json: @subscription, serializer: Api::V1::SubscriptionSerializer
  end
  
  # POST /api/v1/subscriptions
  def create
    result = ::Subscriptions::CreateService.new(
      customer_params: customer_params,
      plan_id: params[:plan_id],
      payment_method: params[:payment_method] || 'ratiba'
    ).call

    if result.success?
      render json: Api::V1::SubscriptionSerializer.render(result.subscription), status: :created
    else
      render json: { errors: result.errors }, status: :unprocessable_entity
    end
  end
  
  # PATCH/PUT /api/v1/subscriptions/:id
  def update
    authorize_subscription!
    
    if @subscription.update(subscription_params)
      render json: Api::V1::SubscriptionSerializer.render(@subscription)
    else
      render json: { errors: @subscription.errors.full_messages }, status: :unprocessable_entity
    end
  end
  
  # POST /api/v1/subscriptions/:id/cancel
  def cancel
    authorize_subscription!
    
    ::Subscriptions::CancelService.new(@subscription).call(
      reason: params[:reason] || 'Customer requested',
      refund_unused: params[:refund_unused] || false
    )
    
    render json: { message: 'Subscription cancelled successfully', subscription: Api::V1::SubscriptionSerializer.render(@subscription.reload) }
  rescue StandardError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end
  
  # POST /api/v1/subscriptions/:id/reactivate
  def reactivate
    authorize_subscription!
    
    if @subscription.status == 'suspended' && @subscription.outstanding_amount.zero?
      @subscription.activate!
      render json: { message: 'Subscription reactivated successfully', subscription: Api::V1::SubscriptionSerializer.render(@subscription) }
    elsif @subscription.outstanding_amount > 0
      render json: { error: 'Please clear outstanding balance before reactivating' }, status: :unprocessable_entity
    else
      render json: { error: 'Subscription cannot be reactivated' }, status: :unprocessable_entity
    end
  end
  
  # POST /api/v1/subscriptions/:id/upgrade
  def upgrade
    authorize_subscription!
    
    new_plan = Plan.find(params[:plan_id])
    ::Subscriptions::UpgradeService.new(@subscription).call(new_plan)
    
    render json: { message: 'Subscription upgraded successfully', subscription: Api::V1::SubscriptionSerializer.render(@subscription.reload) }
  rescue StandardError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end
  
  # POST /api/v1/subscriptions/:id/downgrade
  def downgrade
    authorize_subscription!
    
    new_plan = Plan.find(params[:plan_id])
    ::Subscriptions::DowngradeService.new(@subscription).call(new_plan)
    
    render json: { message: 'Subscription will be downgraded at next billing cycle', subscription: Api::V1::SubscriptionSerializer.render(@subscription.reload) }
  rescue StandardError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end
  
  private
  
  def set_subscription
    @subscription = Subscription.find(params[:id])
  end
  
  def authorize_subscription!
    customer = current_user_customer
    unless customer && @subscription.customer == customer
      render json: { error: 'Unauthorized' }, status: :unauthorized
    end
  end
  
  def subscription_params
    params.require(:subscription).permit(:preferred_payment_method, :is_trial, :trial_ends_at)
  end

  def customer_params
    params.require(:customer).permit(:phone_number, :email, :first_name, :last_name)
  rescue ActionController::ParameterMissing
    # Fallback if customer params not provided
    {
      email: current_user.email,
      phone_number: "254#{SecureRandom.rand(1000000000..9999999999)}",
      first_name: current_user.email.split('@').first,
      last_name: ''
    }
  end
end

