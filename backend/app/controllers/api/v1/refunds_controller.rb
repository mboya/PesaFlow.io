class Api::V1::RefundsController < Api::V1::ApplicationController
  before_action :authenticate_api_v1_user!
  before_action :set_refund, only: [ :show ]

  # GET /api/v1/refunds
  def index
    customer = require_customer!
    return unless customer

    @refunds = Refund.joins(payment: :subscription)
                     .where(subscriptions: { customer_id: customer.id })
                     .order(created_at: :desc)

    render_enveloped(
      resource: Api::V1::RefundSerializer.render_as_hash(@refunds),
      status_code: 200,
      message: "Refunds retrieved successfully"
    )
  end

  # GET /api/v1/refunds/:id
  def show
    return unless authorize_refund!

    render_enveloped(
      resource: Api::V1::RefundSerializer.render_as_hash(@refund),
      status_code: 200,
      message: "Refund retrieved successfully"
    )
  end

  # POST /api/v1/refunds
  def create
    customer = require_customer!
    return unless customer

    perform_idempotent(endpoint: "refunds#create") do
      with_transaction do
        payment = Payment.find(params[:payment_id])

        # Verify payment belongs to customer
        unless payment.subscription.customer == customer
          render_enveloped_error(
            status_code: 403,
            message: "Forbidden",
            error_code: "forbidden",
            http_status: :forbidden
          )
          return
        end

        # Check if refund is allowed
        unless payment.can_be_refunded?
          render_enveloped(
            resource: { errors: [ "Payment cannot be refunded" ] },
            status_code: 422,
            message: "Refund not allowed",
            error_code: "refund_not_allowed",
            http_status: :unprocessable_entity
          )
          return
        end

        @refund = Refund.create!(
          subscription: payment.subscription,
          payment: payment,
          amount: params[:amount] || payment.amount,
          reason: params[:reason],
          status: "pending"
        )

        # Enqueue job to process refund asynchronously (outside transaction)
        ProcessRefundJob.perform_later(@refund.id)

        render_enveloped(
          resource: Api::V1::RefundSerializer.render_as_hash(@refund),
          status_code: 201,
          message: "Refund created successfully",
          http_status: :created
        )
      end
    end
  rescue StandardError => e
    Rails.logger.error("Error creating refund: #{e.message}")
    render_enveloped(
      resource: { errors: [ e.message ] },
      status_code: 422,
      message: "Refund could not be created",
      error_code: "refund_error",
      http_status: :unprocessable_entity
    )
  end

  private

  def set_refund
    @refund = Refund.find(params[:id])
  end

  def authorize_refund!
    customer = current_user_customer
    unless customer && @refund.payment.subscription.customer == customer
      render_enveloped_error(
        status_code: 403,
        message: "Forbidden",
        error_code: "forbidden",
        http_status: :forbidden
      )
      return false
    end
    true
  end
end
