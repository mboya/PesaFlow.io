module Api
  module V1
    module RoleAuthorization
      extend ActiveSupport::Concern

      PERMISSIONS = {
        view_all_tenants: %w[admin owner].freeze,
        manage_tenants: %w[admin owner].freeze,
        read_audit_logs: %w[support admin owner].freeze
      }.freeze

      protected

      def can?(permission)
        allowed_roles_for(permission).include?(current_user_role)
      end

      def authorize_permission!(permission, auditable: nil, metadata: {})
        return true if can?(permission)

        Security::AuditLogger.log_request!(
          controller: self,
          action: "authorization.denied",
          status: "denied",
          actor: current_user,
          auditable: auditable,
          metadata: metadata.merge(
            permission: permission.to_s,
            required_roles: allowed_roles_for(permission),
            user_role: current_user_role
          )
        )

        render json: { error: "Forbidden" }, status: :forbidden
        false
      end

      def authorize_tenant_access!(tenant, allow_cross_tenant_permission: :manage_tenants)
        return true if tenant.present? && current_user&.tenant_id == tenant.id
        return true if allow_cross_tenant_permission && can?(allow_cross_tenant_permission)

        Security::AuditLogger.log_request!(
          controller: self,
          action: "authorization.denied",
          status: "denied",
          actor: current_user,
          auditable: tenant,
          metadata: {
            target_tenant_id: tenant&.id,
            current_tenant_id: current_user&.tenant_id,
            required_permission: allow_cross_tenant_permission
          }
        )

        render json: { error: "Unauthorized" }, status: :unauthorized
        false
      end

      private

      def current_user_role
        current_user&.role.to_s.presence || "anonymous"
      end

      def allowed_roles_for(permission)
        PERMISSIONS.fetch(permission.to_sym) { [] }
      end
    end
  end
end
