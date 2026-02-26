class CreateIdempotencyKeys < ActiveRecord::Migration[7.2]
  def change
    create_table :idempotency_keys do |t|
      t.references :user, null: false, foreign_key: true
      t.string :endpoint, null: false
      t.string :idempotency_key, null: false
      t.text :request_hash, null: false
      t.text :response_body
      t.integer :response_status

      t.timestamps
    end

    add_index :idempotency_keys, %i[user_id endpoint idempotency_key], unique: true, name: "index_idempotency_keys_on_user_endpoint_key"
  end
end

