class AddTenantIdToWebhookLogs < ActiveRecord::Migration[7.2]
  def change
    # Allow null initially, will be inferred from webhook payload
    add_reference :webhook_logs, :tenant, null: true, foreign_key: true, index: true
  end
end
