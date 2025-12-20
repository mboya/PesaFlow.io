class FixTenantScopedUniqueIndexes < ActiveRecord::Migration[7.2]
  def up
    # Fix customer email and phone_number indexes to be tenant-scoped
    # Remove old unique indexes
    remove_index :customers, :email, if_exists: true
    remove_index :customers, :phone_number, if_exists: true
    
    # Add composite unique indexes with tenant_id
    # PostgreSQL allows NULLs in unique indexes, so these will work for nullable fields
    add_index :customers, [:tenant_id, :email], unique: true, where: "email IS NOT NULL", name: "index_customers_on_tenant_id_and_email"
    add_index :customers, [:tenant_id, :phone_number], unique: true, where: "phone_number IS NOT NULL", name: "index_customers_on_tenant_id_and_phone_number"
    
    # Fix subscription reference_number index to be tenant-scoped
    remove_index :subscriptions, :reference_number, if_exists: true
    add_index :subscriptions, [:tenant_id, :reference_number], unique: true, name: "index_subscriptions_on_tenant_id_and_reference_number"
    
    # Fix payment mpesa_transaction_id index to be tenant-scoped
    remove_index :payments, :mpesa_transaction_id, if_exists: true
    add_index :payments, [:tenant_id, :mpesa_transaction_id], unique: true, name: "index_payments_on_tenant_id_and_mpesa_transaction_id"
    
    # Fix user email index to be tenant-scoped (already has tenant_id)
    remove_index :users, :email, if_exists: true
    add_index :users, [:tenant_id, :email], unique: true, name: "index_users_on_tenant_id_and_email"
  end

  def down
    # Revert to non-tenant-scoped indexes
    remove_index :customers, [:tenant_id, :email], if_exists: true
    remove_index :customers, [:tenant_id, :phone_number], if_exists: true
    add_index :customers, :email, unique: true, if_not_exists: true
    add_index :customers, :phone_number, unique: true, if_not_exists: true
    
    remove_index :subscriptions, [:tenant_id, :reference_number], if_exists: true
    add_index :subscriptions, :reference_number, unique: true, if_not_exists: true
    
    remove_index :payments, [:tenant_id, :mpesa_transaction_id], if_exists: true
    add_index :payments, :mpesa_transaction_id, unique: true, if_not_exists: true
    
    remove_index :users, [:tenant_id, :email], if_exists: true
    add_index :users, :email, unique: true, if_not_exists: true
  end
end