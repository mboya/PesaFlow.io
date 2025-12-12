# RSpec Test Suite

This directory contains the RSpec test suite for the backend application.

## Structure

```
spec/
├── models/          # Model specs
├── controllers/     # Controller specs
├── requests/        # Request/integration specs
├── jobs/            # Background job specs
├── services/        # Service object specs (if using)
├── support/         # Support files and helpers
│   ├── factory_bot.rb
│   ├── shoulda_matchers.rb
│   └── simplecov.rb
├── fixtures/        # Test fixtures
├── rails_helper.rb  # Rails-specific RSpec configuration
└── spec_helper.rb   # General RSpec configuration
```

## Running Tests

### Run all tests
```bash
bundle exec rspec
```

### Run specific file
```bash
bundle exec rspec spec/models/user_spec.rb
```

### Run with coverage
```bash
COVERAGE=true bundle exec rspec
```

### Run specific test
```bash
bundle exec rspec spec/models/user_spec.rb:10
```

### Run tests in Docker
```bash
docker-compose exec backend bundle exec rspec
```

## Writing Tests

### Model Spec Example
```ruby
require 'rails_helper'

RSpec.describe User, type: :model do
  describe 'validations' do
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email) }
  end

  describe 'associations' do
    it { should have_many(:subscriptions) }
  end
end
```

### Request Spec Example
```ruby
require 'rails_helper'

RSpec.describe 'Users API', type: :request do
  describe 'GET /api/v1/users' do
    it 'returns a list of users' do
      get '/api/v1/users'
      expect(response).to have_http_status(:success)
    end
  end
end
```

## Helpers

- **FactoryBot**: Use `create(:user)` or `build(:user)` to create test data
- **Shoulda Matchers**: Use `should validate_presence_of(:attribute)` for validations
- **Faker**: Use `Faker::Internet.email` for generating test data

## Coverage

To generate a coverage report, run:
```bash
COVERAGE=true bundle exec rspec
```

Coverage reports will be generated in `coverage/` directory.

