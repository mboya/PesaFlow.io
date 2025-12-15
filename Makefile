# Makefile
.PHONY: help setup start stop test clean

help:
	@echo "Available commands:"
	@echo "  make setup    - Initial setup"
	@echo "  make start    - Start all services"
	@echo "  make stop     - Stop all services"
	@echo "  make test     - Run all tests"
	@echo "  make clean    - Clean up"

setup:
	@echo "Setting up monorepo..."
	npm install
	cd backend && bundle install
	cd frontend && npm install
	@echo "Starting Docker services..."
	docker-compose up -d postgres redis
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	@echo "Running database migrations..."
	docker-compose exec -T backend bundle exec rails db:create db:migrate db:seed || \
		docker-compose run --rm backend bundle exec rails db:create db:migrate db:seed
	@echo "Setup complete!"

start:
	docker-compose up -d

stop:
	docker-compose down

logs:
	docker-compose logs -f

restart:
	docker-compose restart

test:
	cd backend && bundle exec rspec
	cd frontend && npm run test

clean:
	docker-compose down -v
	rm -rf backend/tmp backend/log
	rm -rf frontend/.next

db-reset:
	docker-compose exec backend bundle exec rails db:drop db:create db:migrate db:seed || \
		docker-compose run --rm backend bundle exec rails db:drop db:create db:migrate db:seed

console-backend:
	docker-compose exec backend rails console

console-frontend:
	docker-compose exec frontend sh

psql:
	docker-compose exec postgres psql -U postgres -d subscription_billing_development

redis-cli:
	docker-compose exec redis redis-cli