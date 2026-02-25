module Security
  class AuditLogger
    class << self
      def log!(action:, status:, actor: nil, tenant: nil, request: nil, auditable: nil, changeset: {}, metadata: {}, response_status: nil, correlation_id: nil)
        resolved_tenant = tenant || resolve_tenant(actor) || resolve_tenant(auditable) || ActsAsTenant.current_tenant
        normalized_status = normalize_status(status)

        safe_changeset = Security::PiiMasker.mask_hash(changeset || {})
        safe_metadata = Security::PiiMasker.mask_hash((metadata || {}).merge(request_context(request)))

        attributes = {
          tenant: resolved_tenant,
          actor: actor,
          auditable: auditable,
          action: action.to_s,
          status: normalized_status,
          occurred_at: Time.current,
          request_id: request&.request_id || SecureRandom.uuid,
          correlation_id: correlation_id.presence || request&.headers&.[]("X-Correlation-ID"),
          http_method: request&.request_method,
          path: request&.fullpath,
          response_status: response_status || request&.get_header("action_dispatch.status"),
          ip_address: request&.remote_ip,
          user_agent: request&.user_agent,
          changeset: safe_changeset,
          metadata: safe_metadata
        }

        audit_log = with_tenant_scope(resolved_tenant) { AuditLog.create!(attributes) }
        publish_event(audit_log)
        audit_log
      rescue StandardError => e
        Rails.logger.error("Failed to write audit log #{action}: #{Security::PiiMasker.mask_free_text(e.message)}")
        nil
      end

      def log_request!(controller:, action:, status:, actor: nil, auditable: nil, changeset: {}, metadata: {})
        request = controller.request
        resolved_actor = actor || controller.try(:current_user) || controller.try(:current_api_v1_user)
        merged_metadata = {
          controller: controller.class.name,
          action_name: controller.action_name,
          params: filtered_params(request)
        }.merge(metadata || {})

        log!(
          action: action,
          status: status,
          actor: resolved_actor,
          tenant: ActsAsTenant.current_tenant || resolve_tenant(resolved_actor),
          request: request,
          auditable: auditable,
          changeset: changeset,
          metadata: merged_metadata,
          response_status: controller.response&.status
        )
      end

      def status_from_response(status_code)
        code = status_code.to_i
        return "success" if code.positive? && code < 400
        return "denied" if code >= 400 && code < 500

        "failure"
      end

      private

      def filtered_params(request)
        return {} unless request

        raw = request.filtered_parameters.except("controller", "action", "format")
        Security::PiiMasker.mask_hash(raw)
      rescue StandardError
        {}
      end

      def request_context(request)
        return {} unless request

        {
          request_id: request.request_id,
          remote_ip: request.remote_ip,
          user_agent: request.user_agent
        }.compact
      end

      def publish_event(audit_log)
        Events::Publisher.publish(
          event_type: "audit.log.created",
          subject: audit_log,
          actor: audit_log.actor,
          tenant: audit_log.tenant,
          source: self.name,
          correlation_id: audit_log.correlation_id,
          payload: {
            action: audit_log.action,
            status: audit_log.status,
            request_id: audit_log.request_id,
            response_status: audit_log.response_status,
            actor_type: audit_log.actor_type,
            actor_id: audit_log.actor_id,
            auditable_type: audit_log.auditable_type,
            auditable_id: audit_log.auditable_id
          },
          metadata: audit_log.metadata
        )
      end

      def resolve_tenant(record)
        return nil unless record
        return record.tenant if record.respond_to?(:tenant) && record.tenant.present?

        if record.respond_to?(:tenant_id) && record.tenant_id.present?
          ActsAsTenant.without_tenant { Tenant.find_by(id: record.tenant_id) }
        end
      end

      def with_tenant_scope(tenant)
        if tenant.present?
          ActsAsTenant.with_tenant(tenant) { yield }
        else
          ActsAsTenant.without_tenant { yield }
        end
      end

      def normalize_status(status)
        normalized = status.to_s
        return normalized if AuditLog::STATUSES.include?(normalized)

        "failure"
      end
    end
  end
end
