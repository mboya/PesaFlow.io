class AddOtpFieldsToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :otp_secret_key, :string
    add_column :users, :otp_enabled, :boolean, default: false, null: false
    add_column :users, :backup_codes, :text
  end
end
