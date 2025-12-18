class Api::V1::InvoicesController < Api::V1::ApplicationController
  before_action :authenticate_api_v1_user!
  before_action :set_invoice, only: [:show]
  
  # GET /api/v1/invoices
  def index
    customer = current_user_customer
    return render json: { error: 'Customer not found' }, status: :not_found unless customer
    
    # Invoices are represented by billing attempts with invoice numbers
    # Eager load associations to avoid N+1 queries
    @invoices = BillingAttempt.includes(subscription: :customer)
                              .joins(:subscription)
                              .where(subscriptions: { customer_id: customer.id })
                              .where.not(invoice_number: nil)
                              .order(attempted_at: :desc)
    
    render json: Api::V1::BillingAttemptSerializer.render(@invoices)
  end
  
  # GET /api/v1/invoices/:id
  def show
    return unless authorize_invoice!
    render json: Api::V1::BillingAttemptSerializer.render(@invoice)
  end
  
  private
  
  def set_invoice
    # Support lookup by either ID or invoice_number
    # Use a single query with OR condition - eager loading only happens if record exists
    base_relation = BillingAttempt.includes(subscription: :customer)
    @invoice = base_relation.where(id: params[:id])
                           .or(base_relation.where(invoice_number: params[:id]))
                           .first
    
    raise ActiveRecord::RecordNotFound, "Invoice not found" unless @invoice
  end
  
  def authorize_invoice!
    customer = current_user_customer
    unless customer && @invoice.subscription.customer == customer
      render json: { error: 'Unauthorized' }, status: :unauthorized
      return false
    end
    true
  end
end

