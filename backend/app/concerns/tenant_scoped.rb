# Concern for setting the current tenant based on request headers or subdomain
# Supports both header-based (X-Tenant-Subdomain) and subdomain-based tenant identification
module TenantScoped
  extend ActiveSupport::Concern

  included do
    before_action :set_current_tenant
  end

  private

  def set_current_tenant
    # Check for headers first - they take precedence over user tenant
    # Headers are checked in find_tenant with Priority 1
    header_tenant = nil
    if request.headers["X-Tenant-Subdomain"].present?
      header_tenant = ActsAsTenant.without_tenant do
        Tenant.find_by(subdomain: request.headers["X-Tenant-Subdomain"].downcase.strip)
      end
    elsif request.headers["X-Tenant-ID"].present?
      header_tenant = ActsAsTenant.without_tenant do
        Tenant.find_by(id: request.headers["X-Tenant-ID"])
      end
    end

    # If header tenant is found, use it (overriding any previously set tenant)
    if header_tenant
      if header_tenant.suspended? || header_tenant.cancelled?
        render json: { error: "Tenant account is suspended or cancelled" }, status: :forbidden
        return false
      end
      ActsAsTenant.current_tenant = header_tenant
      return true
    end

    # Skip if tenant is already set (e.g., by set_tenant_from_user) and no headers
    return true if ActsAsTenant.current_tenant.present?

    # Always ensure we have a tenant set, even if it's the default
    # This prevents acts_as_tenant from scoping queries to empty results
    # Use without_tenant when querying Tenant model since Tenant itself is not tenant-scoped
    default_tenant = ActsAsTenant.without_tenant { Tenant.find_by(subdomain: "default") }

    tenant = find_tenant

    if tenant.nil?
      # For API endpoints (except registration), use default tenant as fallback
      # Registration endpoint will handle tenant requirement separately
      # Webhook endpoints will try to infer tenant from payload
      if request.path.start_with?("/api/") && !request.path.include?("signup") && !request.path.include?("registration")
        # Use default tenant as fallback (set_tenant_from_user should have already set it)
        if default_tenant
          ActsAsTenant.current_tenant = default_tenant
          return true
        end

        # Only render error if we truly can't find a tenant
        # This should rarely happen if default tenant exists
        render json: { error: "Tenant not found. Please provide X-Tenant-Subdomain header." }, status: :unauthorized
        return false # Return false to stop further before_action callbacks and action execution
      end

      # For webhooks, allow nil tenant (will be inferred from payload)
      if request.path.start_with?("/webhooks/")
        return true # Allow webhooks to proceed without tenant, they'll infer it
      end

      # For other endpoints, use default tenant
      if default_tenant
        ActsAsTenant.current_tenant = default_tenant
        return true
      end
    elsif tenant.suspended? || tenant.cancelled?
      render json: { error: "Tenant account is suspended or cancelled" }, status: :forbidden
      return false # Return false to stop further before_action callbacks
    end

    ActsAsTenant.current_tenant = tenant if tenant.present?
    true
  end

  def find_tenant
    # Use without_tenant when querying Tenant model since Tenant itself is not tenant-scoped
    # Priority 1: Header-based identification (X-Tenant-Subdomain)
    if request.headers["X-Tenant-Subdomain"].present?
      return ActsAsTenant.without_tenant do
        Tenant.active.find_by(subdomain: request.headers["X-Tenant-Subdomain"].downcase.strip)
      end
    end

    # Priority 2: Header-based identification (X-Tenant-ID)
    if request.headers["X-Tenant-ID"].present?
      return ActsAsTenant.without_tenant do
        Tenant.active.find_by(id: request.headers["X-Tenant-ID"])
      end
    end

    # Priority 3: Subdomain-based identification (for future use)
    if request.subdomain.present? && request.subdomain != "www" && request.subdomain != "api"
      return ActsAsTenant.without_tenant do
        Tenant.active.find_by(subdomain: request.subdomain.downcase.strip)
      end
    end

    # Priority 4: For authenticated users, use their tenant
    # Use current_api_v1_user directly to avoid tenant scoping issues
    if respond_to?(:current_api_v1_user) && current_api_v1_user.present?
      ActsAsTenant.without_tenant do
        user = User.find_by(id: current_api_v1_user.id)
        if user&.tenant.present?
          return user.tenant
        end

        # If user doesn't have a tenant, try to assign default tenant
        if user && user.tenant_id.nil?
          default_tenant = Tenant.find_by(subdomain: "default")
          if default_tenant
            user.update_column(:tenant_id, default_tenant.id)
            user.reload
            return user.tenant
          end
        end
      end
    end

    # Priority 5: For webhooks, try to infer tenant from subscription reference
    if request.path.start_with?("/webhooks/")
      tenant = infer_tenant_from_webhook
      return tenant if tenant.present?
    end

    nil
  end

  def infer_tenant_from_webhook
    # Try to find tenant from webhook payload
    # This is a fallback for webhooks that don't include tenant identification
    payload = request.body.read
    request.body.rewind # Reset body for controller to read again

    return nil if payload.blank?

    begin
      data = JSON.parse(payload)

      # Try to find subscription by reference number
      if data["AccountReference"].present?
        subscription = Subscription.find_by(reference_number: data["AccountReference"])
        return subscription&.tenant
      end

      # Try to find subscription by checkout request ID (STK Push)
      if data.dig("Body", "stkCallback", "CheckoutRequestID").present?
        checkout_id = data.dig("Body", "stkCallback", "CheckoutRequestID")
        billing_attempt = BillingAttempt.find_by(stk_push_checkout_id: checkout_id)
        return billing_attempt&.subscription&.tenant
      end
    rescue JSON::ParserError
      # Invalid JSON, can't infer tenant
    end

    nil
  end
end
