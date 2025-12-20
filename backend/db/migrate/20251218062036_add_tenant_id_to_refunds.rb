class AddTenantIdToRefunds < ActiveRecord::Migration[7.2]
  def change
    # Allow null initially, will be set from subscription's tenant
    add_reference :refunds, :tenant, null: true, foreign_key: true, index: true
  end
end
