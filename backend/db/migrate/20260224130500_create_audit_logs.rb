class CreateAuditLogs < ActiveRecord::Migration[7.2]
  def change
    create_table :audit_logs do |t|
      t.references :tenant, null: true, foreign_key: true

      t.string :actor_type
      t.bigint :actor_id

      t.string :auditable_type
      t.bigint :auditable_id

      t.string :action, null: false
      t.string :status, null: false, default: "success"
      t.datetime :occurred_at, null: false

      t.string :request_id, null: false
      t.string :correlation_id
      t.string :http_method
      t.string :path
      t.integer :response_status
      t.string :ip_address
      t.text :user_agent

      t.jsonb :changeset, null: false, default: {}
      t.jsonb :metadata, null: false, default: {}

      t.timestamps
    end

    add_index :audit_logs, [ :tenant_id, :occurred_at ], name: "index_audit_logs_on_tenant_time"
    add_index :audit_logs, [ :actor_type, :actor_id ]
    add_index :audit_logs, [ :auditable_type, :auditable_id ]
    add_index :audit_logs, :request_id
    add_index :audit_logs, :correlation_id
    add_index :audit_logs, [ :action, :occurred_at ]
    add_index :audit_logs, [ :status, :occurred_at ]

    add_check_constraint :audit_logs,
      "status IN ('success', 'failure', 'denied')",
      name: "audit_logs_status_check"
  end
end
