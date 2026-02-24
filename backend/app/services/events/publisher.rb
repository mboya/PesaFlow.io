require "json"

module Events
  class Publisher
    class << self
      def publish(event_type:, subject: nil, actor: nil, tenant: nil, source: nil, payload: {}, metadata: {}, occurred_at: Time.current, correlation_id: nil, causation_id: nil, idempotency_key: nil)
        resolved_tenant = tenant || resolve_tenant(subject) || resolve_tenant(actor) || ActsAsTenant.current_tenant

        attributes = {
          event_type: event_type,
          source: source,
          occurred_at: occurred_at || Time.current,
          actor: actor,
          subject: subject,
          correlation_id: correlation_id,
          causation_id: causation_id,
          idempotency_key: idempotency_key,
          payload: sanitize_hash(payload),
          metadata: sanitize_hash(metadata)
        }

        if resolved_tenant.present?
          ActsAsTenant.with_tenant(resolved_tenant) do
            DomainEvent.create!(attributes.merge(tenant: resolved_tenant))
          end
        else
          ActsAsTenant.without_tenant do
            DomainEvent.create!(attributes)
          end
        end
      rescue StandardError => e
        Rails.logger.error("Failed to publish domain event #{event_type}: #{e.message}")
        Rails.logger.error(e.backtrace.first(5).join("\n"))
        nil
      end

      private

      def resolve_tenant(record)
        return nil unless record
        return record.tenant if record.respond_to?(:tenant) && record.tenant.present?

        if record.respond_to?(:tenant_id) && record.tenant_id.present?
          ActsAsTenant.without_tenant { Tenant.find_by(id: record.tenant_id) }
        end
      end

      def sanitize_hash(value)
        raw_hash = normalize_hash(value)
        JSON.parse(JSON.generate(raw_hash))
      rescue StandardError
        raw_hash.to_h.transform_values { |v| v.is_a?(String) ? v : v.to_s }
      end

      def normalize_hash(value)
        return {} if value.nil?

        if defined?(ActionController::Parameters) && value.is_a?(ActionController::Parameters)
          return value.to_unsafe_h
        end

        return value if value.is_a?(Hash)

        { value: value }
      end
    end
  end
end
