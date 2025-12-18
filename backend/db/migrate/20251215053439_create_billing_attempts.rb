class CreateBillingAttempts < ActiveRecord::Migration[7.2]
  def change
    create_table :billing_attempts do |t|
      t.references :subscription, null: false, foreign_key: true
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.string :invoice_number

      # Attempt tracking
      t.string :payment_method # ratiba, stk_push, c2b, manual
      t.integer :attempt_number, default: 1
      t.datetime :attempted_at

      # Status
      t.string :status # pending, processing, completed, failed
      t.string :failure_reason

      # M-Pesa tracking
      t.string :stk_push_checkout_id
      t.string :mpesa_transaction_id
      t.string :mpesa_receipt_number

      # Retry tracking
      t.datetime :next_retry_at
      t.integer :retry_count, default: 0

      t.timestamps
    end

    add_index :billing_attempts, :status
    add_index :billing_attempts, :next_retry_at
    add_index :billing_attempts, :stk_push_checkout_id
  end
end
