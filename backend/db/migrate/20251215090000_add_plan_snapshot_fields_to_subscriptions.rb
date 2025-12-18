class AddPlanSnapshotFieldsToSubscriptions < ActiveRecord::Migration[7.2]
  def change
    # Make plan optional
    change_column_null :subscriptions, :plan_id, true

    # Snapshot of plan data at the time of subscription creation/upgrade
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


