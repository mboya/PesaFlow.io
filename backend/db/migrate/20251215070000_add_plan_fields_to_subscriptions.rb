class AddPlanFieldsToSubscriptions < ActiveRecord::Migration[7.2]
  def change
    change_table :subscriptions, bulk: true do |t|
      # Core commercial fields moved from Plan onto Subscription
      t.string  :name
      t.text    :description
      t.decimal :amount, precision: 10, scale: 2, default: 0, null: false
      t.string  :currency, default: "KES", null: false

      # Basic billing cadence (optional, but used when present)
      t.integer :billing_frequency # 1 = daily, 2 = weekly, 3 = monthly, 4 = yearly
      t.integer :billing_cycle_days

      # Trial configuration (optional)
      t.boolean :has_trial, default: false, null: false
      t.integer :trial_days, default: 0, null: false
    end

    # Plan becomes optional. New subscriptions do not need a plan.
    change_column_null :subscriptions, :plan_id, true
  end
end


