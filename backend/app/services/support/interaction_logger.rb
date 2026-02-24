module Support
  class InteractionLogger
    class << self
      def log(channel:, topic:, message:, customer: nil, subscription: nil, actor: nil, tenant: nil, direction: "outbound", status: "logged", occurred_at: Time.current, metadata: {}, correlation_id: nil, external_id: nil)
        resolved_tenant = resolve_tenant(tenant, customer, subscription, actor)

        attributes = {
          tenant: resolved_tenant,
          customer: customer,
          subscription: subscription,
          actor: actor,
          channel: channel,
          topic: topic,
          direction: direction,
          status: status,
          occurred_at: occurred_at || Time.current,
          message: message.to_s,
          correlation_id: correlation_id,
          external_id: external_id,
          metadata: metadata || {}
        }

        interaction = with_tenant_scope(resolved_tenant) do
          SupportInteraction.create!(attributes)
        end

        Events::Publisher.publish(
          event_type: "support.interaction.logged",
          subject: interaction,
          actor: actor,
          tenant: resolved_tenant,
          source: "Support::InteractionLogger",
          correlation_id: correlation_id,
          payload: {
            channel: interaction.channel,
            topic: interaction.topic,
            direction: interaction.direction,
            status: interaction.status,
            customer_id: interaction.customer_id,
            subscription_id: interaction.subscription_id
          }
        )

        interaction
      rescue StandardError => e
        Rails.logger.error("Failed to log support interaction: #{e.message}")
        nil
      end

      private

      def resolve_tenant(tenant, customer, subscription, actor)
        return tenant if tenant.present?
        return customer.tenant if customer&.respond_to?(:tenant) && customer.tenant.present?
        return subscription.tenant if subscription&.respond_to?(:tenant) && subscription.tenant.present?
        return actor.tenant if actor&.respond_to?(:tenant) && actor.tenant.present?
        return ActsAsTenant.current_tenant if ActsAsTenant.current_tenant.present?

        nil
      end

      def with_tenant_scope(tenant)
        if tenant.present?
          ActsAsTenant.with_tenant(tenant) { yield }
        else
          ActsAsTenant.without_tenant { yield }
        end
      end
    end
  end
end
