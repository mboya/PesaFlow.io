# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2025_12_15_062440) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "billing_attempts", force: :cascade do |t|
    t.bigint "subscription_id", null: false
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.string "invoice_number"
    t.string "payment_method"
    t.integer "attempt_number", default: 1
    t.datetime "attempted_at"
    t.string "status"
    t.string "failure_reason"
    t.string "stk_push_checkout_id"
    t.string "mpesa_transaction_id"
    t.string "mpesa_receipt_number"
    t.datetime "next_retry_at"
    t.integer "retry_count", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["next_retry_at"], name: "index_billing_attempts_on_next_retry_at"
    t.index ["status"], name: "index_billing_attempts_on_status"
    t.index ["stk_push_checkout_id"], name: "index_billing_attempts_on_stk_push_checkout_id"
    t.index ["subscription_id"], name: "index_billing_attempts_on_subscription_id"
  end

  create_table "customers", force: :cascade do |t|
    t.string "name", null: false
    t.string "email"
    t.string "phone_number"
    t.boolean "standing_order_enabled", default: false
    t.string "preferred_payment_day"
    t.string "status", default: "active"
    t.integer "failed_payment_count", default: 0
    t.datetime "last_payment_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["email"], name: "index_customers_on_email", unique: true
    t.index ["phone_number"], name: "index_customers_on_phone_number", unique: true
    t.index ["user_id"], name: "index_customers_on_user_id", unique: true
  end

  create_table "jwt_denylists", force: :cascade do |t|
    t.string "jti"
    t.datetime "exp"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["jti"], name: "index_jwt_denylists_on_jti"
  end

  create_table "payments", force: :cascade do |t|
    t.bigint "subscription_id", null: false
    t.bigint "billing_attempt_id"
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.string "payment_method"
    t.string "status"
    t.string "mpesa_transaction_id", null: false
    t.string "mpesa_receipt_number"
    t.string "phone_number"
    t.boolean "reconciled", default: false
    t.datetime "reconciled_at"
    t.datetime "paid_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["billing_attempt_id"], name: "index_payments_on_billing_attempt_id"
    t.index ["mpesa_transaction_id"], name: "index_payments_on_mpesa_transaction_id", unique: true
    t.index ["reconciled"], name: "index_payments_on_reconciled"
    t.index ["status"], name: "index_payments_on_status"
    t.index ["subscription_id"], name: "index_payments_on_subscription_id"
  end

  create_table "plans", force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.string "currency", default: "KES"
    t.integer "billing_frequency"
    t.integer "billing_cycle_days"
    t.boolean "has_trial", default: false
    t.integer "trial_days", default: 0
    t.jsonb "features", default: {}
    t.decimal "setup_fee", precision: 10, scale: 2, default: "0.0"
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "refunds", force: :cascade do |t|
    t.bigint "subscription_id", null: false
    t.bigint "payment_id"
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.text "reason"
    t.string "status"
    t.string "conversation_id"
    t.string "originator_conversation_id"
    t.string "mpesa_transaction_id"
    t.bigint "approved_by_id"
    t.datetime "approved_at"
    t.datetime "requested_at"
    t.datetime "completed_at"
    t.text "failure_reason"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["approved_by_id"], name: "index_refunds_on_approved_by_id"
    t.index ["payment_id"], name: "index_refunds_on_payment_id"
    t.index ["subscription_id"], name: "index_refunds_on_subscription_id"
  end

  create_table "subscriptions", force: :cascade do |t|
    t.bigint "customer_id", null: false
    t.bigint "plan_id", null: false
    t.string "reference_number", null: false
    t.string "standing_order_id"
    t.string "status", default: "pending"
    t.datetime "activated_at"
    t.datetime "suspended_at"
    t.datetime "cancelled_at"
    t.date "current_period_start"
    t.date "current_period_end"
    t.date "next_billing_date"
    t.decimal "outstanding_amount", precision: 10, scale: 2, default: "0.0"
    t.boolean "is_trial", default: false
    t.date "trial_ends_at"
    t.string "preferred_payment_method"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["customer_id"], name: "index_subscriptions_on_customer_id"
    t.index ["next_billing_date"], name: "index_subscriptions_on_next_billing_date"
    t.index ["plan_id"], name: "index_subscriptions_on_plan_id"
    t.index ["reference_number"], name: "index_subscriptions_on_reference_number", unique: true
    t.index ["standing_order_id"], name: "index_subscriptions_on_standing_order_id"
    t.index ["status"], name: "index_subscriptions_on_status"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "otp_secret_key"
    t.boolean "otp_enabled", default: false, null: false
    t.text "backup_codes"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "billing_attempts", "subscriptions"
  add_foreign_key "customers", "users"
  add_foreign_key "payments", "billing_attempts"
  add_foreign_key "payments", "subscriptions"
  add_foreign_key "refunds", "payments"
  add_foreign_key "refunds", "subscriptions"
  add_foreign_key "refunds", "users", column: "approved_by_id"
  add_foreign_key "subscriptions", "customers"
  add_foreign_key "subscriptions", "plans"
end
