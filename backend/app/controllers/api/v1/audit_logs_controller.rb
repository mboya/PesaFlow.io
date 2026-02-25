module Api
  module V1
    class AuditLogsController < ApplicationController
      before_action :authenticate_api_v1_user!

      # GET /api/v1/audit_logs
      def index
        return unless authorize_permission!(:read_audit_logs)

        logs = audit_logs_scope.limit(limit_param).recent
        render json: { data: logs.map { |log| serialize_audit_log(log) } }, status: :ok
      end

      private

      def audit_logs_scope
        if can?(:manage_tenants)
          AuditLog.unscoped
        else
          AuditLog.where(tenant_id: current_user.tenant_id)
        end
      end

      def limit_param
        requested = params.fetch(:limit, 100).to_i
        requested = 100 if requested <= 0
        [ requested, 500 ].min
      end

      def serialize_audit_log(log)
        {
          id: log.id,
          action: log.action,
          status: log.status,
          occurred_at: log.occurred_at&.iso8601,
          request_id: log.request_id,
          correlation_id: log.correlation_id,
          http_method: log.http_method,
          path: log.path,
          response_status: log.response_status,
          actor_type: log.actor_type,
          actor_id: log.actor_id,
          auditable_type: log.auditable_type,
          auditable_id: log.auditable_id,
          tenant_id: log.tenant_id,
          changeset: log.changeset,
          metadata: log.metadata
        }
      end
    end
  end
end
