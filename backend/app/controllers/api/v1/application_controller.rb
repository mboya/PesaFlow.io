module Api
  module V1
    class ApplicationController < ::ApplicationController
      include Transactional

      # Skip the parent's set_current_tenant and run our own version
      skip_before_action :set_current_tenant

      before_action :authenticate_api_v1_user!
      # Set tenant from headers first (if provided), then fall back to user's tenant
      # Headers take precedence for cross-tenant operations
      before_action :set_current_tenant
      before_action :set_tenant_from_user

      protected

      def current_user
        current_api_v1_user
      end

      # Find customer associated with current user (by user_id or email)
      def current_user_customer
        @current_user_customer ||= Customer.find_by(user_id: current_user.id) ||
                                   Customer.find_by(email: current_user.email)
      end

      # Set tenant from authenticated user (if no header provided)
      # This runs after set_current_tenant, so if headers set a tenant, we keep it
      # If no tenant is set, we use the user's tenant
      def set_tenant_from_user
        # Don't override if tenant was already set by headers
        return true if ActsAsTenant.current_tenant.present?

        # Temporarily disable tenant scoping to find user
        ActsAsTenant.without_tenant do
          user = User.find_by(id: current_api_v1_user&.id)
          return true unless user.present?

          # If user doesn't have a tenant, assign default tenant
          if user.tenant_id.nil?
            default_tenant = ActsAsTenant.without_tenant { Tenant.find_by(subdomain: "default") }
            if default_tenant
              user.update_column(:tenant_id, default_tenant.id)
              user.reload
            end
          end

          # Set current tenant for subsequent queries (only if not set by headers)
          ActsAsTenant.current_tenant = user.tenant if user.tenant.present?
        end
        true # Return true to continue with action
      end
    end
  end
end
