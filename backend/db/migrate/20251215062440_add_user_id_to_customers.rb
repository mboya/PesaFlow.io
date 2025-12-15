class AddUserIdToCustomers < ActiveRecord::Migration[7.2]
  def change
    # Add column and foreign key if they don't exist
    unless column_exists?(:customers, :user_id)
      add_reference :customers, :user, null: false, foreign_key: true
    end
    
    # Remove existing non-unique index if it exists
    # (add_reference creates a non-unique index by default)
    remove_index :customers, :user_id if index_exists?(:customers, :user_id)
    
    # Add unique index (handles case where it might already exist from partial migration)
    begin
      add_index :customers, :user_id, unique: true
    rescue ActiveRecord::StatementInvalid => e
      # Index already exists, which is fine
      raise unless e.message.include?('already exists')
    end
  end
end
