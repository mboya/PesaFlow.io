# Plan Model Cleanup Summary

This document summarizes the removal of the Plan model and all Plan-related code from the codebase.

## Database Changes

### Migration Created
- `20251218040401_remove_plan_references.rb`
  - Drops `plans` table
  - Removes `plan_id` foreign key from `subscriptions`
  - Removes plan snapshot fields from `subscriptions`:
    - `plan_name`
    - `plan_amount`
    - `plan_currency`
    - `plan_billing_frequency`
    - `plan_billing_cycle_days`
    - `plan_trial_days`
    - `plan_has_trial`
    - `plan_features`
  - Removes indexes on `plan_id` and `plan_name`

### To Run Migration
```bash
docker-compose up -d
docker exec <backend-container> bundle exec rails db:migrate
# Or if you need to reset:
docker exec <backend-container> bundle exec rails db:reset
```

## Files Deleted

### Backend
- `app/models/plan.rb`
- `app/controllers/api/v1/plans_controller.rb`
- `app/serializers/api/v1/plan_serializer.rb`
- `app/services/subscriptions/upgrade_service.rb`
- `app/services/subscriptions/downgrade_service.rb`
- `spec/factories/plans.rb`
- `spec/requests/api/v1/plans_spec.rb`

## Files Modified

### Backend Models
- `app/models/subscription.rb`
  - Removed `belongs_to :plan`
  - Updated helper methods (`plan_name`, `plan_amount`, etc.) to return direct fields
  - Updated `calculate_period_end` and `extend_period!` to use `billing_cycle_days` instead of `plan_billing_cycle_days`

### Backend Controllers
- `app/controllers/api/v1/subscriptions_controller.rb`
  - Removed `upgrade` and `downgrade` actions
  - Removed from `before_action :set_subscription` list

### Backend Routes
- `config/routes.rb`
  - Removed `resources :plans`
  - Removed `post :upgrade` and `post :downgrade` from subscriptions

### Backend Services
- `app/services/subscriptions/create_service.rb`
  - Removed plan snapshot fields from subscription creation
  - Removed unused `calculate_period_end` and `calculate_next_billing_date` methods

- `app/services/notification_service.rb`
  - Removed `send_upgrade_confirmation` method
  - Removed `send_downgrade_confirmation` method

### Backend Seeds
- `db/seeds.rb`
  - Removed all Plan seed data
  - Now just a placeholder message

### Backend Specs
- `spec/requests/api/v1/subscriptions_spec.rb`
  - Removed upgrade and downgrade test sections

- `spec/factories/subscriptions.rb`
  - Removed `plan` association
  - Removed plan snapshot fields
  - Removed `:with_plan` trait
  - Updated to use direct fields (`name`, `amount`, etc.)

### Frontend
- `frontend/src/lib/api.ts`
  - Removed `upgrade` and `downgrade` methods from subscriptionsApi

- `frontend/src/lib/types.ts`
  - Updated comment for `plan_id` to indicate it's deprecated

## Backward Compatibility

The `Subscription` model still has helper methods (`plan_name`, `plan_amount`, etc.) that return the direct field values. This ensures existing code that uses these methods continues to work without modification.

The serializer still exposes `plan_*` fields for backward compatibility, but they now return values from direct fields via the helper methods.

## Next Steps

1. **Run the migration** to remove Plan-related database structures
2. **Test the application** to ensure everything works
3. **Optional**: Remove `plan_*` fields from serializer if you want a complete cleanup
4. **Optional**: Update all code to use direct fields (`name`, `amount`) instead of helper methods (`plan_name`, `plan_amount`)

## Notes

- Subscriptions are now completely self-contained with `name`, `amount`, `currency`, `billing_cycle_days`, etc.
- No upgrade/downgrade functionality - users create new subscriptions with different amounts
- All existing subscriptions will continue to work via helper methods

