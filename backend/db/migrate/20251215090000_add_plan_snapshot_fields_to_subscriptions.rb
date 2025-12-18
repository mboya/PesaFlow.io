class AddPlanSnapshotFieldsToSubscriptions < ActiveRecord::Migration[7.2]
  def up
    # Remove plan snapshot fields if they exist (for cleanup)
    if column_exists?(:subscriptions, :plan_name)
      remove_column :subscriptions, :plan_name, :string
    end
    if column_exists?(:subscriptions, :plan_amount)
      remove_column :subscriptions, :plan_amount, :decimal
    end
    if column_exists?(:subscriptions, :plan_currency)
      remove_column :subscriptions, :plan_currency, :string
    end
    if column_exists?(:subscriptions, :plan_billing_frequency)
      remove_column :subscriptions, :plan_billing_frequency, :integer
    end
    if column_exists?(:subscriptions, :plan_billing_cycle_days)
      remove_column :subscriptions, :plan_billing_cycle_days, :integer
    end
    if column_exists?(:subscriptions, :plan_trial_days)
      remove_column :subscriptions, :plan_trial_days, :integer
    end
    if column_exists?(:subscriptions, :plan_has_trial)
      remove_column :subscriptions, :plan_has_trial, :boolean
    end
    if column_exists?(:subscriptions, :plan_features)
      remove_column :subscriptions, :plan_features, :jsonb
    end

    # Remove plan_id if it exists
    if column_exists?(:subscriptions, :plan_id)
      remove_index :subscriptions, :plan_id if index_exists?(:subscriptions, :plan_id)
      remove_column :subscriptions, :plan_id, :bigint
    end

    # Remove plan_name index if it exists
    remove_index :subscriptions, :plan_name if index_exists?(:subscriptions, :plan_name)

    # Drop plans table if it exists
    drop_table :plans if table_exists?(:plans)
  end

  def down
    # Recreate plans table (for rollback if needed)
    unless table_exists?(:plans)
      create_table :plans do |t|
        t.string :name, null: false
        t.text :description
        t.decimal :amount, precision: 10, scale: 2, null: false
        t.string :currency, default: 'KES'
        t.integer :billing_frequency
        t.integer :billing_cycle_days
        t.boolean :has_trial, default: false
        t.integer :trial_days, default: 0
        t.jsonb :features, default: {}
        t.decimal :setup_fee, precision: 10, scale: 2, default: 0
        t.boolean :active, default: true
        t.timestamps
      end
    end

    # Re-add plan_id and snapshot fields (for rollback)
    unless column_exists?(:subscriptions, :plan_id)
      add_column :subscriptions, :plan_id, :bigint
      add_index :subscriptions, :plan_id
    end

    unless column_exists?(:subscriptions, :plan_name)
      add_column :subscriptions, :plan_name, :string
      add_column :subscriptions, :plan_amount, :decimal, precision: 10, scale: 2
      add_column :subscriptions, :plan_currency, :string, limit: 3
      add_column :subscriptions, :plan_billing_frequency, :integer
      add_column :subscriptions, :plan_billing_cycle_days, :integer
      add_column :subscriptions, :plan_trial_days, :integer
      add_column :subscriptions, :plan_has_trial, :boolean
      add_column :subscriptions, :plan_features, :jsonb, default: {}, null: false
      add_index :subscriptions, :plan_name
    end
  end
end
