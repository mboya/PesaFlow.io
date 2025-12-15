module Billing
  # Service for generating invoices
  class InvoiceGenerator
    def initialize(subscription, payment = nil)
      @subscription = subscription
      @payment = payment
    end

    def generate
      invoice = @subscription.invoices.create!(
        customer: @subscription.customer,
        payment: @payment,
        invoice_number: generate_invoice_number,
        amount: @subscription.plan.amount,
        status: @payment ? 'paid' : 'sent',
        issue_date: Date.current,
        due_date: @subscription.current_period_end,
        paid_at: @payment&.paid_at,
        line_items: build_line_items
      )

      # Send invoice email
      SubscriptionMailer.invoice(@subscription, invoice).deliver_later if @subscription.customer.email.present?

      invoice
    end

    def generate_for_period
      generate
    end

    def generate_upcoming
      # Generate invoice 7 days before due date
      invoice = @subscription.invoices.create!(
        customer: @subscription.customer,
        invoice_number: generate_invoice_number,
        amount: @subscription.plan.amount,
        status: 'sent',
        issue_date: Date.current,
        due_date: @subscription.current_period_end,
        line_items: build_line_items
      )

      SubscriptionMailer.upcoming_invoice(@subscription, invoice).deliver_later if @subscription.customer.email.present?

      invoice
    end

    private

    def generate_invoice_number
      date_prefix = Date.today.strftime('%Y%m')
      sequence = Invoice.where('invoice_number LIKE ?', "INV-#{date_prefix}-%").count + 1
      "INV-#{date_prefix}-#{sequence.to_s.rjust(5, '0')}"
    end

    def build_line_items
      [
        {
          description: @subscription.plan.name,
          quantity: 1,
          unit_price: @subscription.plan.amount,
          amount: @subscription.plan.amount,
          period_start: @subscription.current_period_start,
          period_end: @subscription.current_period_end
        }
      ]
    end
  end
end

