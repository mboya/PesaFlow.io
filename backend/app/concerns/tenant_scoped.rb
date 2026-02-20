# Concern for setting the current tenant based on request headers or subdomain
# Supports both header-based (X-Tenant-Subdomain) and subdomain-based tenant identification
module TenantScoped
  extend ActiveSupport::Concern

  included do
    before_action :set_current_tenant
  end

  private

  TENANT_SUBDOMAIN_HEADER = "X-Tenant-Subdomain"
  TENANT_ID_HEADER = "X-Tenant-ID"
  DEFAULT_SUBDOMAIN = "default"

  def set_current_tenant
    # Check for headers first - they take precedence over user tenant
    header_tenant = find_tenant_from_headers
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

    # For login/signup endpoints, allow requests to proceed even if tenant header is provided but tenant doesn't exist
    # The user might be logging in before their tenant is fully set up, or creating a new tenant
    is_auth_endpoint = request.path.include?("/login") ||
                       request.path.include?("/google_login") ||
                       request.path.include?("/signup") ||
                       request.path.include?("/registration")
    
    # If a tenant header was provided but tenant doesn't exist, and this is an auth endpoint, allow it
    if is_auth_endpoint && (request.headers[TENANT_SUBDOMAIN_HEADER].present? || request.headers[TENANT_ID_HEADER].present?)
      # Header was provided but tenant not found - allow login/signup to proceed
      # They will handle tenant creation/assignment
      default_tenant = ActsAsTenant.without_tenant { Tenant.find_by(subdomain: DEFAULT_SUBDOMAIN) }
      ActsAsTenant.current_tenant = default_tenant if default_tenant
      return true
    end

    # Always ensure we have a tenant set, even if it's the default
    # This prevents acts_as_tenant from scoping queries to empty results
    default_tenant = ActsAsTenant.without_tenant { Tenant.find_by(subdomain: DEFAULT_SUBDOMAIN) }

    tenant = find_tenant

    if tenant.nil?
      # For API endpoints (except registration and login), use default tenant as fallback
      # Registration and login endpoints will handle tenant requirement separately
      # Webhook endpoints will try to infer tenant from payload
      if request.path.start_with?("/api/") && !request.path.include?("signup") && !request.path.include?("registration") && !request.path.include?("login")
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

  def find_tenant_from_headers
    if request.headers[TENANT_SUBDOMAIN_HEADER].present?
      return ActsAsTenant.without_tenant do
        Tenant.find_by(subdomain: request.headers[TENANT_SUBDOMAIN_HEADER].downcase.strip)
      end
    end

    if request.headers[TENANT_ID_HEADER].present?
      return ActsAsTenant.without_tenant do
        Tenant.find_by(id: request.headers[TENANT_ID_HEADER])
      end
    end

    nil
  end

  def find_tenant
    # Priority 1: Header-based identification
    header_tenant = find_tenant_from_headers
    return header_tenant if header_tenant&.active?

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
          default_tenant = Tenant.find_by(subdomain: DEFAULT_SUBDOMAIN)
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
