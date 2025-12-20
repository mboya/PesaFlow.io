class AddTenantIdToSubscriptions < ActiveRecord::Migration[7.2]
  def change
    # Allow null initially, will be set from customer's tenant
    add_reference :subscriptions, :tenant, null: true, foreign_key: true, index: true
  end
end
