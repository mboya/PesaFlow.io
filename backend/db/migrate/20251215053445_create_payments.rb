class CreatePayments < ActiveRecord::Migration[7.2]
  def change
    create_table :payments do |t|
      t.references :subscription, null: false, foreign_key: true
      t.references :billing_attempt, foreign_key: true
      
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.string :payment_method # ratiba, stk_push, c2b
      t.string :status # completed, refunded, disputed
      
      # M-Pesa details
      t.string :mpesa_transaction_id, null: false
      t.string :mpesa_receipt_number
      t.string :phone_number
      
      # Reconciliation
      t.boolean :reconciled, default: false
      t.datetime :reconciled_at
      
      t.datetime :paid_at
      t.timestamps
    end
    
    add_index :payments, :mpesa_transaction_id, unique: true
    add_index :payments, :status
    add_index :payments, :reconciled
  end
end
