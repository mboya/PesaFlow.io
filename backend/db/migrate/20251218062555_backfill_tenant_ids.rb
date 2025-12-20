class BackfillTenantIds < ActiveRecord::Migration[7.2]
  def up
    # Create a default tenant if none exists using raw SQL to bypass validations
    # Use ON CONFLICT to handle the case where tenant already exists
    execute(<<-SQL.squish
      INSERT INTO tenants (name, subdomain, status, settings, created_at, updated_at)
      VALUES ('Default Tenant', 'default', 'active', '{}', NOW(), NOW())
      ON CONFLICT (subdomain) DO NOTHING;
    SQL
    )
    
    # Get the tenant id (whether it was just created or already existed)
    result = execute("SELECT id FROM tenants WHERE subdomain = 'default' LIMIT 1")
    default_tenant_id = result.first&.[]('id')

    raise "Failed to create or find default tenant" unless default_tenant_id

    # Backfill tenant_id for users
    User.where(tenant_id: nil).update_all(tenant_id: default_tenant_id)

    # Backfill tenant_id for customers (from their user's tenant)
    Customer.where(tenant_id: nil).find_each do |customer|
      if customer.user&.tenant_id.present?
        customer.update_column(:tenant_id, customer.user.tenant_id)
      else
        customer.update_column(:tenant_id, default_tenant_id)
      end
    end

    # Backfill tenant_id for subscriptions (from their customer's tenant)
    Subscription.where(tenant_id: nil).find_each do |subscription|
      if subscription.customer&.tenant_id.present?
        subscription.update_column(:tenant_id, subscription.customer.tenant_id)
      else
        subscription.update_column(:tenant_id, default_tenant_id)
      end
    end

    # Backfill tenant_id for payments (from their subscription's tenant)
    Payment.where(tenant_id: nil).find_each do |payment|
      if payment.subscription&.tenant_id.present?
        payment.update_column(:tenant_id, payment.subscription.tenant_id)
      else
        payment.update_column(:tenant_id, default_tenant_id)
      end
    end

    # Backfill tenant_id for billing_attempts (from their subscription's tenant)
    BillingAttempt.where(tenant_id: nil).find_each do |billing_attempt|
      if billing_attempt.subscription&.tenant_id.present?
        billing_attempt.update_column(:tenant_id, billing_attempt.subscription.tenant_id)
      else
        billing_attempt.update_column(:tenant_id, default_tenant_id)
      end
    end

    # Backfill tenant_id for refunds (from their subscription's tenant)
    Refund.where(tenant_id: nil).find_each do |refund|
      if refund.subscription&.tenant_id.present?
        refund.update_column(:tenant_id, refund.subscription.tenant_id)
      else
        refund.update_column(:tenant_id, default_tenant_id)
      end
    end

    # Backfill tenant_id for webhook_logs (try to infer from payload)
    WebhookLog.where(tenant_id: nil).find_each do |log|
      tenant = infer_tenant_from_webhook_log(log)
      log.update_column(:tenant_id, tenant&.id || default_tenant_id) if tenant || default_tenant_id
    end
  end

  def down
    # Remove tenant_id values (set to null)
    # Note: This will break the foreign key constraint, so we'll need to handle it carefully
    # In practice, you probably don't want to rollback this migration
    raise ActiveRecord::IrreversibleMigration, "Cannot rollback tenant backfill migration"
  end

  private

  def infer_tenant_from_webhook_log(log)
    return nil unless log.payload.present?

    begin
      data = JSON.parse(log.payload)
      
      # Try to find subscription by reference number
      if data['AccountReference'].present?
        subscription = Subscription.find_by(reference_number: data['AccountReference'])
        return subscription&.tenant
      end

      # Try to find subscription by checkout request ID (STK Push)
      if data.dig('Body', 'stkCallback', 'CheckoutRequestID').present?
        checkout_id = data.dig('Body', 'stkCallback', 'CheckoutRequestID')
        billing_attempt = BillingAttempt.find_by(stk_push_checkout_id: checkout_id)
        return billing_attempt&.subscription&.tenant
      end
    rescue JSON::ParserError
      # Invalid JSON, can't infer tenant
    end

    nil
  end
end
