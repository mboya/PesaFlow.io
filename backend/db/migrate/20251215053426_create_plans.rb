class CreatePlans < ActiveRecord::Migration[7.2]
  def change
    create_table :plans do |t|
      t.string :name, null: false
      t.text :description
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.string :currency, default: 'KES'
      t.integer :billing_frequency # 3 = monthly (maps to Ratiba frequency)
      t.integer :billing_cycle_days # 30 for monthly
      
      # Trial settings
      t.boolean :has_trial, default: false
      t.integer :trial_days, default: 0
      
      # Features
      t.jsonb :features, default: {}
      
      # Setup fee
      t.decimal :setup_fee, precision: 10, scale: 2, default: 0
      
      t.boolean :active, default: true
      t.timestamps
    end
  end
end
