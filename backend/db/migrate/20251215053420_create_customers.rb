class CreateCustomers < ActiveRecord::Migration[7.2]
  def change
    create_table :customers do |t|
      t.string :name, null: false
      t.string :email
      t.string :phone_number # 254708374149 format (nullable - can be added later)

      # Payment profile
      t.boolean :standing_order_enabled, default: false
      t.string :preferred_payment_day # 1-28 for monthly billing

      # Status
      t.string :status, default: 'active' # active, suspended, churned
      t.integer :failed_payment_count, default: 0
      t.datetime :last_payment_at

      t.timestamps
    end

    # Unique indexes - PostgreSQL allows multiple NULLs in unique indexes
    add_index :customers, :phone_number, unique: true
    add_index :customers, :email, unique: true
  end
end
