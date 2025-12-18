module Billing
  # Service for generating invoice-related operations
  # Note: Invoices are represented by BillingAttempt records with invoice_number
  class InvoiceGenerator
    def initialize(subscription, payment = nil)
      @subscription = subscription
      @payment = payment
    end

    def generate
      # Find or create a billing attempt to serve as the invoice
      billing_attempt = find_or_create_billing_attempt
      
      # Update with payment info if provided
      if @payment
        billing_attempt.update!(
          status: 'completed',
          mpesa_receipt_number: @payment.mpesa_receipt_number,
          mpesa_transaction_id: @payment.mpesa_transaction_id
        )
      end

      # Send invoice email
      if @subscription.customer.email.present?
        SubscriptionMailer.invoice(@subscription, billing_attempt).deliver_later
      end

      billing_attempt
    end

    def generate_for_period
      generate
    end

    def generate_upcoming
      # Generate invoice 7 days before due date
      billing_attempt = find_or_create_billing_attempt(status: 'pending')

      if @subscription.customer.email.present?
        SubscriptionMailer.upcoming_invoice(@subscription, billing_attempt).deliver_later
      end

      billing_attempt
    end

    private

    def find_or_create_billing_attempt(status: nil)
      # Try to find existing billing attempt for this payment
      if @payment&.billing_attempt.present?
        return @payment.billing_attempt
      end
      
      # Try to find a recent billing attempt for this subscription
      recent_attempt = @subscription.billing_attempts
                                    .where('created_at > ?', 1.hour.ago)
                                    .order(created_at: :desc)
                                    .first
      
      return recent_attempt if recent_attempt
      
      # Create new billing attempt as invoice
      @subscription.billing_attempts.create!(
        invoice_number: generate_invoice_number,
        amount: @subscription.plan_amount,
        payment_method: @payment&.payment_method || @subscription.preferred_payment_method || 'stk_push',
        status: status || (@payment ? 'completed' : 'pending'),
        attempted_at: Time.current,
        attempt_number: 1
      )
    end

    def generate_invoice_number
      date_prefix = Date.today.strftime('%Y%m')
      sequence = BillingAttempt.where('invoice_number LIKE ?', "INV-#{date_prefix}-%").count + 1
      "INV-#{date_prefix}-#{sequence.to_s.rjust(5, '0')}"
    end

    def build_line_items
      [
        {
          description: @subscription.plan_name,
          quantity: 1,
          unit_price: @subscription.plan_amount,
          amount: @subscription.plan_amount,
          period_start: @subscription.current_period_start,
          period_end: @subscription.current_period_end
        }
      ]
    end
  end
end
