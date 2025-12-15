class Api::V1::RefundsController < Api::V1::ApplicationController
  before_action :authenticate_api_v1_user!
  
  # POST /api/v1/refunds
  def create
    customer = current_user_customer
    return render json: { error: 'Customer not found' }, status: :not_found unless customer
    
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
      payment: payment,
      amount: params[:amount] || payment.amount,
      reason: params[:reason],
      status: 'pending'
    )
    
    # Process refund using RefundService
    Payments::RefundService.new.process(
      subscription: payment.subscription,
      amount: params[:amount] || payment.amount,
      reason: params[:reason],
      initiated_by: 'customer'
    )
    
    render json: Api::V1::RefundSerializer.render(@refund), status: :created
  rescue StandardError => e
    Rails.logger.error("Error creating refund: #{e.message}")
    render json: { error: e.message }, status: :unprocessable_entity
  end
end

