class AddTenantIdToUsers < ActiveRecord::Migration[7.2]
  def change
    # Allow null initially for existing users, then migrate data
    add_reference :users, :tenant, null: true, foreign_key: true, index: true
  end
end
