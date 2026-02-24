class CreateSupportInteractions < ActiveRecord::Migration[7.2]
  def change
    create_table :support_interactions do |t|
      t.references :tenant, null: true, foreign_key: true
      t.references :customer, null: true, foreign_key: true
      t.references :subscription, null: true, foreign_key: true

      t.string :actor_type
      t.bigint :actor_id

      t.string :channel, null: false
      t.string :direction, null: false, default: "outbound"
      t.string :topic, null: false, default: "general"
      t.string :status, null: false, default: "logged"
      t.datetime :occurred_at, null: false

      t.text :message
      t.string :external_id
      t.string :correlation_id
      t.jsonb :metadata, null: false, default: {}

      t.timestamps
    end

    add_index :support_interactions, [ :tenant_id, :occurred_at ], name: "index_support_interactions_on_tenant_time"
    add_index :support_interactions, [ :tenant_id, :channel, :topic ], name: "index_support_interactions_on_tenant_channel_topic"
    add_index :support_interactions, [ :actor_type, :actor_id ]
    add_index :support_interactions, :correlation_id
  end
end
