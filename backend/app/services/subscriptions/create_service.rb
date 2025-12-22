module Subscriptions
  # Service for creating new subscriptions
  # All operations are transactional - if any step fails, everything rolls back
  class CreateService
    attr_reader :subscription, :errors

    # subscription_params is expected to include:
    # :name, :description, :amount, :currency, :billing_cycle_days, :trial_days, :has_trial
    def initialize(user:, customer_params:, subscription_params:, payment_method: "ratiba")
      @user                = user
      @customer_params     = customer_params
      @subscription_params = subscription_params || {}
      @payment_method      = payment_method
      @errors              = []
    end

    def call
      # Pre-transaction: Validate everything that doesn't require database
      validate_subscription_params!

      ActiveRecord::Base.transaction do
        # Step 1: Find or create customer
        @customer = find_or_create_customer

        # Step 2: Create subscription record
        @subscription = create_subscription_record

        # Step 3: Setup payment method (external API call - must succeed or rollback)
        # This is the critical step - if it fails, entire transaction rolls back
        setup_payment_method!

        # Step 4: Reload to get latest state (in case Ratiba updated status)
        @subscription.reload

        # Step 5: Final validation - ensure subscription is in valid state
        validate_subscription_state!

        # Step 6: Send confirmation (non-blocking - enqueued, won't cause rollback)
        enqueue_confirmation_notification

        self
      end
    rescue StandardError => e
      @errors << e.message
      Rails.logger.error("Error creating subscription: #{e.message}")
      Rails.logger.error(e.backtrace.first(10).join("\n"))
      self
    end

    def success?
      @errors.empty? && @subscription.present?
    end

    private

    def find_or_create_customer
      # Ensure user has a tenant before creating customer (to avoid tenant scoping issues)
      ActsAsTenant.without_tenant do
        if @user.tenant_id.nil?
          default_tenant = Tenant.find_by(subdomain: "default")
          if default_tenant
            @user.update_column(:tenant_id, default_tenant.id)
            @user.reload
          end
        end
      end

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
        name = @user.email.split("@").first if name.blank?

        customer = Customer.create!(
          user: @user,
          name: name,
          email: @customer_params[:email] || @user.email,
          phone_number: @customer_params[:phone_number],
          status: "active"
        )
      end

      customer
    end

    def validate_subscription_params!
      name = @subscription_params[:name].to_s.strip
      amount = BigDecimal(@subscription_params[:amount].to_s.presence || "0")

      raise ArgumentError, "Subscription name is required" if name.blank?
      raise ArgumentError, "Subscription amount must be greater than 0" if amount <= 0

      # Validate phone number for Ratiba (check both params and existing customer)
      if @payment_method == "ratiba"
        phone = @customer_params[:phone_number]
        # If no phone in params, check if customer exists and has phone
        if phone.blank?
          existing_customer = Customer.find_by(user_id: @user.id) ||
                             Customer.find_by(email: @customer_params[:email])
          phone = existing_customer&.phone_number
        end
        raise ArgumentError, "Phone number is required for Ratiba standing orders" if phone.blank?
      end
    end

    def validate_subscription_state!
      # Ensure subscription is in a valid state after all operations
      if @subscription.nil?
        raise "Subscription was not created"
      end

      # For Ratiba, ensure standing_order_id is set
      if @payment_method == "ratiba" && @subscription.standing_order_id.blank?
        raise "Ratiba standing order was not created - standing_order_id is missing"
      end

      # Ensure customer is linked
      if @subscription.customer.nil?
        raise "Subscription customer association is missing"
      end
    end

    def create_subscription_record
      name         = @subscription_params[:name].to_s.strip
      description  = @subscription_params[:description]
      amount       = BigDecimal(@subscription_params[:amount].to_s.presence || "0")
      currency     = (@subscription_params[:currency].presence || "KES")
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
      elsif @payment_method == "ratiba"
                              0 # Will be set if payment fails
      else
                              amount # STK Push / C2B - customer owes until first payment
      end

      @customer.subscriptions.create!(
        # core commercial fields
        name: name,
        description: description,
        amount: amount,
        currency: currency,
        billing_cycle_days: billing_days,

        # status / trial
        status: has_trial ? "trial" : "pending",
        is_trial: has_trial,
        trial_days: trial_days,
        trial_ends_at: has_trial ? (current_start + trial_days.days) : nil,

        # outstanding amount
        outstanding_amount: initial_outstanding,

        # Payment method - always set during creation
        preferred_payment_method: @payment_method,
        current_period_start: current_start,
        current_period_end: current_end,
        next_billing_date: next_billing
      )
    end

    def setup_payment_method!
      case @payment_method
      when "ratiba"
        # Ratiba setup is REQUIRED - if it fails, the entire transaction rolls back
        # This ensures we don't have subscriptions without standing orders
        # Note: External API calls can't be rolled back, so we do this last in the transaction
        # If Ratiba succeeds but we fail after, the transaction will rollback the DB,
        # but the standing order will remain (edge case that should be rare)
        standing_order_service = ::Payments::StandingOrderService.new(@subscription)
        response = standing_order_service.create

        unless response.success?
          error_msg = response.error_message || "Ratiba standing order creation failed"
          raise "Failed to create Ratiba standing order: #{error_msg}"
        end

        # Verify standing_order_id was set
        @subscription.reload
        standing_order_id = @subscription.standing_order_id

        if standing_order_id.blank?
          raise "Ratiba standing order created but standing_order_id not set"
        end

        Rails.logger.info("Ratiba standing order created successfully: #{standing_order_id}")

      when "stk_push"
        # STK Push will be initiated on first billing or manually
        # No external API call needed at creation time
        Rails.logger.info("STK Push subscription created - payment will be initiated on first billing")

      when "c2b"
        # C2B is customer-initiated (customer pays via Paybill)
        # No external API call needed at creation time
        Rails.logger.info("C2B subscription created - customer will pay via Paybill")

      else
        raise ArgumentError, "Invalid payment method: #{@payment_method}"
      end
    end

    def enqueue_confirmation_notification
      # Enqueue notification outside transaction to avoid blocking
      # If notification fails, subscription is still created
      ::NotificationService.send_subscription_confirmation(@subscription)
    rescue StandardError => e
      # Log but don't fail - notification is non-critical
      Rails.logger.warn("Failed to send subscription confirmation: #{e.message}")
    end
  end
end
