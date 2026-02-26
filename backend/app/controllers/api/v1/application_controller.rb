module Api
  module V1
    class ApplicationController < ::ApplicationController
      include Transactional
      include RoleAuthorization
      include IdempotentRequest

      # Skip the parent's set_current_tenant and run our own version
      skip_before_action :set_current_tenant

      before_action :authenticate_api_v1_user!
      # Set tenant from headers first (if provided), then fall back to user's tenant
      # Headers take precedence for cross-tenant operations
      before_action :set_current_tenant
      before_action :set_tenant_from_user
      around_action :audit_api_request

      protected

      def current_user
        current_api_v1_user
      end

      # Find customer associated with current user (by user_id or email)
      def current_user_customer
        @current_user_customer ||= Customer.find_by(user_id: current_user.id) ||
                                   Customer.find_by(email: current_user.email)
      end

      # Helper method to require customer or return error response
      # Returns customer if found, nil if not found (caller should handle nil)
      def require_customer!
        customer = current_user_customer
        unless customer
          render_enveloped_error(
            status_code: 404,
            message: "Customer not found",
            error_code: "customer_not_found",
            http_status: :not_found
          )
          return nil
        end
        customer
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
            default_tenant = ActsAsTenant.without_tenant { Tenant.find_by(subdomain: TenantScoped::DEFAULT_SUBDOMAIN) }
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

      def audit_action!(action:, status: nil, auditable: nil, changeset: {}, metadata: {})
        Security::AuditLogger.log_request!(
          controller: self,
          action: action,
          status: status || Security::AuditLogger.status_from_response(response&.status),
          actor: audit_actor,
          auditable: auditable,
          changeset: changeset,
          metadata: metadata
        )
      end

      private

      def audit_api_request
        started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        yield
      ensure
        duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000).round(1)
        actor = audit_actor

        audit_action!(
          action: "api.#{controller_name}.#{action_name}",
          metadata: {
            response_status: response&.status,
            duration_ms: duration_ms,
            actor_role: actor&.role,
            current_tenant_id: ActsAsTenant.current_tenant&.id
          }
        )
      end

      def audit_actor
        current_api_v1_user
      rescue StandardError
        nil
      end

      def render_enveloped(resource: nil, status_code: 200, message: nil, error_code: nil, meta: nil, http_status: nil)
        http_status ||= status_code

        body = {
          status: {
            code: status_code,
            message: message || default_http_status_message(http_status),
            error_code: error_code
          },
          data: resource,
          meta: meta
        }.compact

        render json: body, status: http_status
      end

      def render_enveloped_error(status_code:, message:, error_code: nil, meta: nil, http_status: nil)
        render_enveloped(
          resource: nil,
          status_code: status_code,
          message: message,
          error_code: error_code,
          meta: meta,
          http_status: http_status
        )
      end

      def default_http_status_message(http_status)
        code =
          case http_status
          when Symbol, String
            Rack::Utils.status_code(http_status)
          else
            http_status.to_i
          end

        Rack::Utils::HTTP_STATUS_CODES[code] || "HTTP #{code}"
      end
    end
  end
end
