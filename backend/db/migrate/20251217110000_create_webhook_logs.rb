class CreateWebhookLogs < ActiveRecord::Migration[7.2]
  def change
    create_table :webhook_logs do |t|
      t.string :source, null: false          # stk_push, ratiba, c2b, b2c
      t.string :event_type                   # result code or event type
      t.text :payload                        # JSON payload
      t.text :headers                        # JSON headers
      t.string :status, default: 'received'  # received, processed, failed
      t.string :error_message

      t.timestamps
    end

    add_index :webhook_logs, :source
    add_index :webhook_logs, :status
    add_index :webhook_logs, :created_at
  end
end
