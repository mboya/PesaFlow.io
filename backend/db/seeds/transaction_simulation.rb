# frozen_string_literal: true

require "zlib"

module Seeds
  class TransactionSimulation
    DEFAULT_MONTHS = 2
    MAX_MONTHS = 12

    SUBSCRIPTION_BLUEPRINTS = [
      {
        key: "core-monthly",
        name: "PesaFlow Core",
        description: "Core recurring payment automation",
        amount: 2499.0,
        billing_cycle_days: 30,
        preferred_payment_method: "ratiba",
        status: "active",
        billing_offset_days: 2
      },
      {
        key: "growth-biweekly",
        name: "Growth Toolkit",
        description: "Bi-weekly engagement and collections",
        amount: 1499.0,
        billing_cycle_days: 14,
        preferred_payment_method: "stk_push",
        status: "active",
        billing_offset_days: 5
      },
      {
        key: "merchant-monthly",
        name: "Merchant Ops",
        description: "Operations and reconciliation workflows",
        amount: 3299.0,
        billing_cycle_days: 30,
        preferred_payment_method: "c2b",
        status: "suspended",
        billing_offset_days: 1
      },
      {
        key: "starter-weekly",
        name: "Starter Weekly",
        description: "Entry plan for lightweight recurring billing",
        amount: 799.0,
        billing_cycle_days: 7,
        preferred_payment_method: "stk_push",
        status: "cancelled",
        billing_offset_days: 0
      }
    ].freeze

    def self.run_from_env
      target_user = resolve_target_user(
        email: ENV["SIM_TX_USER_EMAIL"],
        id: ENV["SIM_TX_USER_ID"]
      )

      unless target_user
        puts "WARNING: No user found for transaction simulation."
        puts "  Use SIM_TX_USER_EMAIL or SIM_TX_USER_ID with an existing user."
        return nil
      end

      months = ENV.fetch("SIM_TX_MONTHS", DEFAULT_MONTHS).to_i
      new(user: target_user, months: months).run
    end

    def initialize(user:, months: DEFAULT_MONTHS)
      @user = user
      @months = [ [ months.to_i, 1 ].max, MAX_MONTHS ].min
      @counts = Hash.new(0)
    end

    def run
      ensure_user_tenant!
      tenant = @user.tenant

      raise "Target user must have a tenant before simulation seeding" unless tenant

      start_date = @months.months.ago.to_date.beginning_of_month
      end_date = Date.current

      ActsAsTenant.with_tenant(tenant) do
        customer = find_or_create_customer!
        subscriptions = seed_subscriptions_for(customer: customer)

        subscriptions.each_with_index do |subscription, subscription_index|
          seed_subscription_history(
            subscription: subscription,
            subscription_index: subscription_index,
            start_date: start_date,
            end_date: end_date
          )
        end

        refresh_rollups!(customer: customer)
      end

      print_summary(start_date: start_date, end_date: end_date)
      {
        user: @user,
        months: @months,
        counts: @counts.dup
      }
    end

    private

    def self.resolve_target_user(email:, id:)
      ActsAsTenant.without_tenant do
        if email.present?
          User.find_by(email: email.strip.downcase)
        elsif id.present?
          User.find_by(id: id.to_i)
        else
          User.order(:id).first
        end
      end
    end

    def ensure_user_tenant!
      return if @user.tenant_id.present?

      ActsAsTenant.without_tenant do
        default_tenant = Tenant.find_or_create_by!(subdomain: "default") do |tenant|
          tenant.name = "Default Tenant"
          tenant.status = "active"
          tenant.settings = {}
        end
        @user.update_column(:tenant_id, default_tenant.id)
      end

      @user.reload
    end

    def find_or_create_customer!
      customer = Customer.find_or_initialize_by(user_id: @user.id)

      default_phone = "2547#{format('%08d', @user.id.to_i % 100_000_000)}"
      default_name = @user.email.to_s.split("@").first.to_s.tr("._", " ").split.map(&:capitalize).join(" ")

      update_record!(
        customer,
        name: customer.name.presence || default_name.presence || "Demo Customer",
        email: customer.email.presence || @user.email,
        phone_number: customer.phone_number.presence || default_phone,
        status: "active",
        preferred_payment_day: customer.preferred_payment_day.presence || "10"
      )

      customer
    end

    def seed_subscriptions_for(customer:)
      SUBSCRIPTION_BLUEPRINTS.map.with_index do |blueprint, index|
        reference_number = "SEED-SUB-#{@user.id}-#{blueprint[:key].gsub(/[^a-z0-9]/i, "").upcase}"
        subscription = customer.subscriptions.find_or_initialize_by(reference_number: reference_number)

        period_start, period_end, next_billing = period_dates_for(blueprint: blueprint)

        update_record!(
          subscription,
          name: blueprint[:name],
          description: blueprint[:description],
          amount: blueprint[:amount],
          currency: "KES",
          billing_cycle_days: blueprint[:billing_cycle_days],
          billing_frequency: frequency_for_days(blueprint[:billing_cycle_days]),
          preferred_payment_method: blueprint[:preferred_payment_method],
          standing_order_id: (blueprint[:preferred_payment_method] == "ratiba" ? "SEED-SO-#{@user.id}-#{index + 1}" : nil),
          status: blueprint[:status],
          current_period_start: period_start,
          current_period_end: period_end,
          next_billing_date: next_billing,
          outstanding_amount: (blueprint[:status] == "suspended" ? blueprint[:amount] : 0),
          activated_at: active_timestamp_for(blueprint[:status]),
          suspended_at: suspended_timestamp_for(blueprint[:status]),
          cancelled_at: cancelled_timestamp_for(blueprint[:status]),
          has_trial: false,
          is_trial: false,
          trial_days: 0,
          trial_ends_at: nil
        )

        @counts[:subscriptions] += 1 if subscription.previous_changes.key?("id")
        subscription
      end
    end

    def seed_subscription_history(subscription:, subscription_index:, start_date:, end_date:)
      billing_date = start_date
      cycle_days = [ subscription.billing_cycle_days.to_i, 1 ].max
      cutoff_date = cutoff_date_for(subscription: subscription, end_date: end_date)

      cycle_index = 0
      while billing_date <= cutoff_date
        attempted_at = billing_date.in_time_zone.change(hour: 9 + (subscription_index % 5), min: 30)
        outcome = billing_outcome_for(
          subscription: subscription,
          subscription_index: subscription_index,
          cycle_index: cycle_index,
          billing_date: billing_date
        )

        invoice_number = invoice_number_for(subscription: subscription, billing_date: billing_date, cycle_index: cycle_index)
        billing_attempt = subscription.billing_attempts.find_or_initialize_by(invoice_number: invoice_number)

        checkout_id = if subscription.preferred_payment_method == "stk_push"
                        "SEED-CHK-#{subscription.id}-#{billing_date.strftime('%Y%m%d')}"
        end

        update_record!(
          billing_attempt,
          amount: subscription.amount,
          payment_method: subscription.preferred_payment_method,
          attempt_number: 1,
          attempted_at: attempted_at,
          status: (outcome == :failed ? "failed" : "completed"),
          failure_reason: (outcome == :failed ? "Insufficient funds on debit attempt" : nil),
          retry_count: (outcome == :failed ? 1 : 0),
          next_retry_at: (outcome == :failed ? attempted_at + 1.day : nil),
          stk_push_checkout_id: checkout_id,
          mpesa_transaction_id: (outcome == :failed ? nil : payment_transaction_id_for(subscription: subscription, billing_date: billing_date, cycle_index: cycle_index)),
          mpesa_receipt_number: (outcome == :failed ? nil : receipt_number_for(subscription: subscription, billing_date: billing_date, cycle_index: cycle_index))
        )

        @counts[:billing_attempts] += 1 if billing_attempt.previous_changes.key?("id")
        create_or_update_payment_and_refund!(
          subscription: subscription,
          billing_attempt: billing_attempt,
          outcome: outcome,
          attempted_at: attempted_at,
          billing_date: billing_date,
          cycle_index: cycle_index
        )

        cycle_index += 1
        billing_date += cycle_days.days
      end

      add_upcoming_attempt!(subscription: subscription, end_date: end_date)
    end

    def create_or_update_payment_and_refund!(subscription:, billing_attempt:, outcome:, attempted_at:, billing_date:, cycle_index:)
      return if outcome == :failed

      payment_status = case outcome
      when :refunded
                         "refunded"
      when :disputed
                         "disputed"
      else
                         "completed"
      end

      transaction_id = payment_transaction_id_for(subscription: subscription, billing_date: billing_date, cycle_index: cycle_index)
      payment = subscription.payments.find_or_initialize_by(mpesa_transaction_id: transaction_id)

      update_record!(
        payment,
        billing_attempt: billing_attempt,
        amount: subscription.amount,
        payment_method: subscription.preferred_payment_method,
        status: payment_status,
        mpesa_receipt_number: receipt_number_for(subscription: subscription, billing_date: billing_date, cycle_index: cycle_index),
        phone_number: subscription.customer.phone_number,
        paid_at: attempted_at + 7.minutes,
        reconciled: payment_status != "disputed",
        reconciled_at: (payment_status != "disputed" ? attempted_at + 1.day : nil)
      )

      @counts[:payments] += 1 if payment.previous_changes.key?("id")
      return unless %i[refunded disputed].include?(outcome)

      create_or_update_refund!(
        subscription: subscription,
        payment: payment,
        outcome: outcome,
        attempted_at: attempted_at,
        billing_date: billing_date,
        cycle_index: cycle_index
      )
    end

    def create_or_update_refund!(subscription:, payment:, outcome:, attempted_at:, billing_date:, cycle_index:)
      reason = "Seeded #{outcome} flow #{billing_date.strftime('%Y-%m-%d')} ##{cycle_index + 1}"
      refund = subscription.refunds.find_or_initialize_by(payment_id: payment.id, reason: reason)

      refund_status = refund_status_for(outcome: outcome, cycle_index: cycle_index)
      requested_at = attempted_at + 1.day

      completed = refund_status == "completed"
      approved = %w[approved completed].include?(refund_status)
      failed = %w[failed rejected].include?(refund_status)

      update_record!(
        refund,
        amount: [ (payment.amount.to_d * BigDecimal("0.35")).round(2), BigDecimal("100.00") ].max,
        status: refund_status,
        requested_at: requested_at,
        approved_by: (approved ? @user : nil),
        approved_at: (approved ? requested_at + 2.hours : nil),
        completed_at: (completed ? requested_at + 6.hours : nil),
        failure_reason: (failed ? "Provider rejected reversal request" : nil),
        mpesa_transaction_id: (completed ? "SEED-RFD-#{payment.mpesa_transaction_id}" : nil),
        conversation_id: (completed ? "CONV-#{payment.mpesa_transaction_id}" : nil),
        originator_conversation_id: (completed ? "ORIG-#{payment.mpesa_transaction_id}" : nil)
      )

      @counts[:refunds] += 1 if refund.previous_changes.key?("id")
    end

    def add_upcoming_attempt!(subscription:, end_date:)
      return unless %w[active suspended].include?(subscription.status)

      next_date = subscription.next_billing_date || (end_date + subscription.billing_cycle_days.days)
      next_date = [ next_date, Date.current + 1.day ].max

      status = subscription.status == "suspended" ? "processing" : "pending"
      invoice_number = "SEED-UPCOMING-#{subscription.id}-#{next_date.strftime('%Y%m%d')}"
      billing_attempt = subscription.billing_attempts.find_or_initialize_by(invoice_number: invoice_number)

      update_record!(
        billing_attempt,
        amount: subscription.amount,
        payment_method: subscription.preferred_payment_method,
        attempt_number: 1,
        attempted_at: next_date.in_time_zone.change(hour: 8, min: 15),
        status: status,
        retry_count: 0,
        next_retry_at: nil,
        failure_reason: nil,
        stk_push_checkout_id: (subscription.preferred_payment_method == "stk_push" ? "SEED-FUTURE-CHK-#{subscription.id}" : nil),
        mpesa_transaction_id: nil,
        mpesa_receipt_number: nil
      )

      @counts[:billing_attempts] += 1 if billing_attempt.previous_changes.key?("id")
    end

    def refresh_rollups!(customer:)
      max_paid_at = customer.subscriptions.joins(:payments)
                          .where(payments: { status: "completed" })
                          .maximum("payments.paid_at")

      failed_payments = customer.subscriptions.joins(:billing_attempts)
                              .where(billing_attempts: { status: "failed" })
                              .where("billing_attempts.attempted_at >= ?", 30.days.ago)
                              .count

      customer.update!(
        last_payment_at: max_paid_at,
        failed_payment_count: failed_payments
      )

      customer.subscriptions.find_each do |subscription|
        next if subscription.status == "cancelled"

        recent_attempt = subscription.billing_attempts
                                     .where(status: %w[completed failed])
                                     .where.not(attempted_at: nil)
                                     .where("attempted_at <= ?", Time.current)
                                     .order(attempted_at: :desc)
                                     .first
        recent_completed_payment = subscription.payments.completed.order(paid_at: :desc).first

        outstanding_amount = if subscription.status == "suspended"
                               subscription.amount
        elsif recent_attempt&.status == "failed" && (recent_completed_payment.nil? || recent_attempt.attempted_at > recent_completed_payment.paid_at)
                               subscription.amount
        else
                               0
        end

        cycle_days = [ subscription.billing_cycle_days.to_i, 1 ].max
        next_billing_date = if recent_attempt
                              recent_attempt.attempted_at.to_date + cycle_days.days
        else
                              Date.current + cycle_days.days
        end

        period_start = next_billing_date - cycle_days.days
        period_end = period_start + cycle_days.days

        subscription.update!(
          outstanding_amount: outstanding_amount,
          current_period_start: period_start,
          current_period_end: period_end,
          next_billing_date: next_billing_date
        )
      end
    end

    def update_record!(record, attrs)
      record.assign_attributes(attrs)
      record.save! if record.new_record? || record.changed?
    end

    def billing_outcome_for(subscription:, subscription_index:, cycle_index:, billing_date:)
      # Keep suspended subscriptions mostly in a failed state.
      if subscription.status == "suspended"
        return :failed if cycle_index % 3 != 0
        return :disputed if cycle_index % 5 == 0
        return :completed
      end

      score = Zlib.crc32("#{subscription.reference_number}:#{subscription_index}:#{cycle_index}:#{billing_date}") % 100
      case score
      when 0..11 then :failed
      when 12..19 then :refunded
      when 20..24 then :disputed
      else
        :completed
      end
    end

    def refund_status_for(outcome:, cycle_index:)
      return "failed" if outcome == :disputed && cycle_index.even?
      return "rejected" if outcome == :disputed

      case cycle_index % 3
      when 0 then "completed"
      when 1 then "approved"
      else
        "pending"
      end
    end

    def cutoff_date_for(subscription:, end_date:)
      return end_date unless subscription.cancelled_at.present?

      [ subscription.cancelled_at.to_date, end_date ].min
    end

    def frequency_for_days(days)
      case days.to_i
      when 1 then 1
      when 7 then 2
      when 30 then 3
      when 365 then 4
      else
        3
      end
    end

    def period_dates_for(blueprint:)
      cycle_days = [ blueprint[:billing_cycle_days].to_i, 1 ].max
      current_period_start = Date.current - cycle_days.days + blueprint.fetch(:billing_offset_days, 0).days
      current_period_end = current_period_start + cycle_days.days
      next_billing_date = current_period_end + blueprint.fetch(:billing_offset_days, 0).days

      if blueprint[:status] == "cancelled"
        current_period_end = 18.days.ago.to_date
        current_period_start = current_period_end - cycle_days.days
        next_billing_date = nil
      end

      [ current_period_start, current_period_end, next_billing_date ]
    end

    def active_timestamp_for(status)
      return nil unless %w[active suspended cancelled].include?(status)

      3.months.ago
    end

    def suspended_timestamp_for(status)
      status == "suspended" ? 2.weeks.ago : nil
    end

    def cancelled_timestamp_for(status)
      status == "cancelled" ? 18.days.ago : nil
    end

    def invoice_number_for(subscription:, billing_date:, cycle_index:)
      "SEED-INV-#{subscription.id}-#{billing_date.strftime('%Y%m%d')}-#{format('%02d', cycle_index + 1)}"
    end

    def payment_transaction_id_for(subscription:, billing_date:, cycle_index:)
      "SEED-TX-#{subscription.id}-#{billing_date.strftime('%y%m%d')}-#{format('%02d', cycle_index + 1)}"
    end

    def receipt_number_for(subscription:, billing_date:, cycle_index:)
      "SEED-RCPT-#{subscription.id}-#{billing_date.strftime('%m%d')}-#{format('%02d', cycle_index + 1)}"
    end

    def print_summary(start_date:, end_date:)
      puts "Transaction simulation complete for #{@user.email}"
      puts "  Tenant: #{@user.tenant&.subdomain || 'none'}"
      puts "  Window: #{start_date} to #{end_date}"
      puts "  Subscriptions created: #{@counts[:subscriptions]}"
      puts "  Billing attempts created: #{@counts[:billing_attempts]}"
      puts "  Payments created: #{@counts[:payments]}"
      puts "  Refunds created: #{@counts[:refunds]}"
    end
  end
end
