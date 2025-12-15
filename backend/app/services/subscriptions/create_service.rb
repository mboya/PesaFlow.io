module Subscriptions
  # Service for creating new subscriptions
  class CreateService
    attr_reader :subscription, :errors

    def initialize(customer_params:, plan_id:, payment_method: 'ratiba')
      @customer_params = customer_params
      @plan_id = plan_id
      @payment_method = payment_method
      @errors = []
    end

    def call
      ActiveRecord::Base.transaction do
        # Find or create customer
        @customer = find_or_create_customer

        # Find plan
        @plan = Plan.find(@plan_id)

        # Create subscription
        @subscription = @customer.subscriptions.create!(
          plan: @plan,
          status: @plan.trial_days > 0 ? 'trial' : 'pending',
          is_trial: @plan.trial_days > 0,
          trial_ends_at: @plan.trial_days > 0 ? @plan.trial_days.days.from_now : nil,
          preferred_payment_method: @payment_method,
          current_period_start: Date.current,
          current_period_end: calculate_period_end,
          next_billing_date: calculate_next_billing_date
        )

        # Process setup fee if exists
        process_setup_fee if @plan.setup_fee.to_f > 0

        # Setup payment method
        setup_payment_method

        # Send confirmation
        ::NotificationService.send_subscription_confirmation(@subscription)

        self
      end
    rescue StandardError => e
      @errors << e.message
      Rails.logger.error("Error creating subscription: #{e.message}")
      self
    end

    def success?
      @errors.empty?
    end

    private

    def find_or_create_customer
      customer = Customer.find_by(email: @customer_params[:email]) ||
                 Customer.find_by(phone_number: @customer_params[:phone_number])

      unless customer
        customer = Customer.create!(
          name: "#{@customer_params[:first_name]} #{@customer_params[:last_name]}".strip,
          email: @customer_params[:email],
          phone_number: @customer_params[:phone_number],
          status: 'active'
        )
      end

      customer
    end

    def process_setup_fee
      ::Payments::StkPushService.new(@subscription).initiate(
        payment_type: 'setup_fee',
        amount: @plan.setup_fee,
        description: "Setup fee for #{@plan.name}"
      )
    end

    def setup_payment_method
      case @payment_method
      when 'ratiba'
        ::Payments::StandingOrderService.new(@subscription).create
      when 'stk_push'
        # STK Push will be initiated on first billing
        @subscription.update!(preferred_payment_method: 'stk_push')
      when 'c2b'
        # C2B is customer-initiated
        @subscription.update!(preferred_payment_method: 'c2b')
      end
    end

    def calculate_period_end
      return nil unless @plan.billing_cycle_days
      Date.current + @plan.billing_cycle_days.days
    end

    def calculate_next_billing_date
      return nil unless @plan.billing_cycle_days
      Date.current + @plan.billing_cycle_days.days
    end
  end
end

