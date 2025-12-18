class CreateSubscriptions < ActiveRecord::Migration[7.2]
  def change
    create_table :subscriptions do |t|
      t.references :customer, null: false, foreign_key: true
      t.string :reference_number, null: false # SUB-12345 (uniqueness enforced by index below)
      t.string :standing_order_id # From Ratiba API

      # Status
      t.string :status, default: 'pending' # pending, active, suspended, cancelled, expired
      t.datetime :activated_at
      t.datetime :suspended_at
      t.datetime :cancelled_at

      # Billing
      t.date :current_period_start
      t.date :current_period_end
      t.date :next_billing_date
      t.decimal :outstanding_amount, precision: 10, scale: 2, default: 0

      # Trial
      t.boolean :is_trial, default: false
      t.date :trial_ends_at

      # Payment method preference
      t.string :preferred_payment_method # ratiba, stk_push, c2b

      t.timestamps
    end

    add_index :subscriptions, :reference_number, unique: true
    add_index :subscriptions, :standing_order_id
    add_index :subscriptions, :status
    add_index :subscriptions, :next_billing_date
  end
end
