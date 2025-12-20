class AddTenantIdToCustomers < ActiveRecord::Migration[7.2]
  def change
    # Allow null initially, will be set from user's tenant
    add_reference :customers, :tenant, null: true, foreign_key: true, index: true
  end
end
