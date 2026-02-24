class CreateDomainEventsAndNotificationDeliveries < ActiveRecord::Migration[7.2]
  def change
    create_table :domain_events do |t|
      t.references :tenant, null: true, foreign_key: true
      t.string :event_type, null: false
      t.string :source
      t.datetime :occurred_at, null: false

      t.string :actor_type
      t.bigint :actor_id

      t.string :subject_type
      t.bigint :subject_id

      t.string :correlation_id
      t.string :causation_id
      t.string :idempotency_key

      t.jsonb :payload, null: false, default: {}
      t.jsonb :metadata, null: false, default: {}

      t.timestamps
    end

    add_index :domain_events, [ :tenant_id, :event_type, :occurred_at ], name: "index_domain_events_on_tenant_event_time"
    add_index :domain_events, [ :subject_type, :subject_id ]
    add_index :domain_events, :correlation_id
    add_index :domain_events, :causation_id
    add_index :domain_events, :occurred_at
    add_index :domain_events, [ :tenant_id, :idempotency_key ], unique: true, where: "idempotency_key IS NOT NULL", name: "index_domain_events_on_tenant_and_idempotency_key"

    create_table :notification_deliveries do |t|
      t.references :tenant, null: true, foreign_key: true
      t.string :channel, null: false
      t.string :status, null: false, default: "queued"
      t.string :template
      t.string :provider
      t.string :recipient, null: false
      t.string :subject
      t.text :message
      t.string :provider_message_id

      t.string :context_type
      t.bigint :context_id
      t.string :correlation_id

      t.datetime :delivered_at
      t.datetime :failed_at
      t.text :error_message
      t.jsonb :metadata, null: false, default: {}

      t.timestamps
    end

    add_index :notification_deliveries, [ :tenant_id, :channel, :status ], name: "index_notification_deliveries_on_tenant_channel_status"
    add_index :notification_deliveries, [ :context_type, :context_id ]
    add_index :notification_deliveries, :correlation_id
    add_index :notification_deliveries, :delivered_at
    add_index :notification_deliveries, [ :tenant_id, :provider_message_id ], unique: true, where: "provider_message_id IS NOT NULL", name: "index_notification_deliveries_on_tenant_provider_message_id"
  end
end
