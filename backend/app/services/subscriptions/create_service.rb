module Subscriptions
  # Service for creating new subscriptions
  class CreateService
    attr_reader :subscription, :errors

    # subscription_params is expected to include:
    # :name, :description, :amount, :currency, :billing_cycle_days, :trial_days, :has_trial
    def initialize(user:, customer_params:, subscription_params:, payment_method: 'ratiba')
      @user                = user
      @customer_params     = customer_params
      @subscription_params = subscription_params || {}
      @payment_method      = payment_method
      @errors              = []
    end

    def call
      ActiveRecord::Base.transaction do
        # Find or create customer
        @customer = find_or_create_customer

        # Derive commercial attributes from params
        name         = @subscription_params[:name].to_s.strip
        description  = @subscription_params[:description]
        amount       = BigDecimal(@subscription_params[:amount].to_s.presence || '0')
        currency     = (@subscription_params[:currency].presence || 'KES')
        billing_days = (@subscription_params[:billing_cycle_days].presence || 30).to_i
        trial_days   = (@subscription_params[:trial_days].presence || 0).to_i
        has_trial    = ActiveModel::Type::Boolean.new.cast(@subscription_params[:has_trial]) || trial_days.positive?

        current_start = Date.current
        current_end   = billing_days.positive? ? current_start + billing_days.days : nil
        next_billing  = current_end

        # For trial subscriptions, outstanding is 0 until trial ends
        # For ratiba (standing orders), Safaricom handles the debit so outstanding starts at 0
        # For stk_push and c2b, customer needs to pay first, so outstanding = amount
        initial_outstanding = if has_trial
                                0
                              elsif @payment_method == 'ratiba'
                                0 # Will be set if payment fails
                              else
                                amount # STK Push / C2B - customer owes until first payment
                              end

        # Create subscription (no hard Plan dependency)
        @subscription = @customer.subscriptions.create!(
          # core commercial fields
          name: name,
          description: description,
          amount: amount,
          currency: currency,
          billing_cycle_days: billing_days,

          # status / trial
          status: has_trial ? 'trial' : 'pending',
          is_trial: has_trial,
          trial_days: trial_days,
          trial_ends_at: has_trial ? (current_start + trial_days.days) : nil,

          # outstanding amount
          outstanding_amount: initial_outstanding,

          preferred_payment_method: @payment_method,
          current_period_start: current_start,
          current_period_end: current_end,
          next_billing_date: next_billing,

          # snapshot fields used by existing code paths
          plan_name: name,
          plan_amount: amount,
          plan_currency: currency,
          plan_billing_cycle_days: billing_days,
          plan_trial_days: trial_days,
          plan_has_trial: has_trial,
          plan_features: @subscription_params[:features] || {}
        )

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
      # First try to find by user_id (most reliable)
      customer = Customer.find_by(user_id: @user.id) ||
                 Customer.find_by(email: @customer_params[:email]) ||
                 (@customer_params[:phone_number].present? ? Customer.find_by(phone_number: @customer_params[:phone_number]) : nil)

      if customer
        # Update phone number if provided and different
        if @customer_params[:phone_number].present? && customer.phone_number != @customer_params[:phone_number]
          customer.update!(phone_number: @customer_params[:phone_number])
        end
        # Ensure user is linked
        customer.update!(user_id: @user.id) if customer.user_id.nil?
      else
        name = "#{@customer_params[:first_name]} #{@customer_params[:last_name]}".strip
        name = @user.email.split('@').first if name.blank?
        
        customer = Customer.create!(
          user: @user,
          name: name,
          email: @customer_params[:email] || @user.email,
          phone_number: @customer_params[:phone_number],
          status: 'active'
        )
      end

      customer
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

