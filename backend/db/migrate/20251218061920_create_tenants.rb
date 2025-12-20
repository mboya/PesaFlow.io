class CreateTenants < ActiveRecord::Migration[7.2]
  def change
    create_table :tenants do |t|
      t.string :name, null: false
      t.string :subdomain, null: false
      t.string :status, default: 'active' # active, suspended, cancelled
      t.string :domain # Optional custom domain
      t.jsonb :settings, default: {} # Store tenant-specific settings

      t.timestamps
    end

    add_index :tenants, :subdomain, unique: true
    add_index :tenants, :domain, unique: true
    add_index :tenants, :status
  end
end
