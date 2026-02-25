class AddRoleToUsers < ActiveRecord::Migration[7.2]
  def up
    add_column :users, :role, :string, null: false, default: "member"
    add_index :users, :role

    execute <<~SQL.squish
      UPDATE users
      SET role = 'admin'
      WHERE admin = TRUE
    SQL
  end

  def down
    remove_index :users, :role
    remove_column :users, :role
  end
end
