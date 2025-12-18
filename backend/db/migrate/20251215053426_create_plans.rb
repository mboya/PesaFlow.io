class CreatePlans < ActiveRecord::Migration[7.2]
  def up
    # Plans table removed - subscriptions are self-contained
    # This migration is now a no-op for fresh installs
  end

  def down
    # No-op - plans table should not exist
  end
end
