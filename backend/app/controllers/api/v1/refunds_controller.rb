class Api::V1::RefundsController < Api::V1::ApplicationController
  before_action :authenticate_api_v1_user!
  before_action :set_refund, only: [:show]
  
  # GET /api/v1/refunds
  def index
    customer = current_user_customer
    return render json: { error: 'Customer not found' }, status: :not_found unless customer
    
    @refunds = Refund.joins(payment: :subscription)
                     .where(subscriptions: { customer_id: customer.id })
                     .order(created_at: :desc)
    
    render json: Api::V1::RefundSerializer.render(@refunds)
  end
  
  # GET /api/v1/refunds/:id
  def show
    return unless authorize_refund!
    render json: Api::V1::RefundSerializer.render(@refund)
  end
  
  # POST /api/v1/refunds
  def create
    customer = current_user_customer
    return render json: { error: 'Customer not found' }, status: :not_found unless customer
    
    with_transaction do
      payment = Payment.find(params[:payment_id])
      
      # Verify payment belongs to customer
      unless payment.subscription.customer == customer
        return render json: { error: 'Unauthorized' }, status: :unauthorized
      end
      
      # Check if refund is allowed
      unless payment.can_be_refunded?
        return render json: { error: 'Payment cannot be refunded' }, status: :unprocessable_entity
      end
      
      @refund = Refund.create!(
        subscription: payment.subscription,
        payment: payment,
        amount: params[:amount] || payment.amount,
        reason: params[:reason],
        status: 'pending'
      )
      
      # Enqueue job to process refund asynchronously (outside transaction)
      ProcessRefundJob.perform_later(@refund.id)
      
      render json: Api::V1::RefundSerializer.render(@refund), status: :created
    end
  rescue StandardError => e
    Rails.logger.error("Error creating refund: #{e.message}")
    render json: { error: e.message }, status: :unprocessable_entity
  end
  
  private
  
  def set_refund
    @refund = Refund.find(params[:id])
  end
  
  def authorize_refund!
    customer = current_user_customer
    unless customer && @refund.payment.subscription.customer == customer
      render json: { error: 'Unauthorized' }, status: :unauthorized
      return false
    end
    true
  end
end

