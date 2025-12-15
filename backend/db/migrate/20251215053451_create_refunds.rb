class CreateRefunds < ActiveRecord::Migration[7.2]
  def change
    create_table :refunds do |t|
      t.references :subscription, null: false, foreign_key: true
      t.references :payment, foreign_key: true
      
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.text :reason
      t.string :status # pending, approved, completed, failed, rejected
      
      # M-Pesa B2C tracking
      t.string :conversation_id
      t.string :originator_conversation_id
      t.string :mpesa_transaction_id
      
      # Approval
      t.references :approved_by, foreign_key: { to_table: :users }
      t.datetime :approved_at
      
      t.datetime :requested_at
      t.datetime :completed_at
      t.text :failure_reason
      
      t.timestamps
    end
  end
end
