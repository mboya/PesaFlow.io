# Contributing to PesaFlow.io

Thank you for your interest in contributing to PesaFlow.io! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git
- A code editor (VS Code recommended)

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd PesaFlow.io
   ```

2. **Start the development environment:**
   ```bash
   make setup  # Initial setup (installs dependencies, sets up database)
   make start  # Start all services
   ```

3. **Access the application:**
   - Frontend: http://localhost:3001
   - Backend API: Proxied through frontend at http://localhost:3001/api/proxy

## Development Workflow

### Code Style

- **Backend (Ruby/Rails):**
  - Follow Rails conventions
  - Use double quotes for strings
  - Keep methods focused and small
  - Add comments for complex logic

- **Frontend (TypeScript/React):**
  - Use TypeScript for type safety
  - Follow React best practices
  - Use functional components and hooks
  - Keep components small and focused

### Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Write clean, readable code
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes:**
   ```bash
   make test  # Run all tests
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

5. **Push and create a pull request:**
   ```bash
   git push origin feature/your-feature-name
   ```

## Project Structure

```
.
├── backend/          # Rails API
│   ├── app/
│   │   ├── controllers/  # API controllers
│   │   ├── models/       # ActiveRecord models
│   │   ├── services/     # Business logic
│   │   ├── concerns/     # Shared modules
│   │   └── serializers/ # API response serializers
│   └── spec/         # RSpec tests
├── frontend/         # Next.js application
│   ├── src/
│   │   ├── app/      # Next.js pages and routes
│   │   ├── components/  # React components
│   │   ├── contexts/    # React contexts
│   │   └── lib/        # Utilities and API clients
│   └── test/        # Vitest tests
└── docker/          # Docker configuration
```

## Key Concepts

### Multi-Tenancy

The application uses `acts_as_tenant` for multi-tenancy. Key points:

- All tenant-scoped models include `acts_as_tenant :tenant`
- Tenant is identified via `X-Tenant-Subdomain` or `X-Tenant-ID` headers
- Tenant is automatically set from authenticated user if headers are not provided
- See `SUBDOMAIN_TENANT_GUIDE.md` for more details

### Authentication

- Uses Devise with JWT tokens
- OTP (2FA) support via ROTP
- Tokens are stored in localStorage on the frontend
- See `backend/AUTH_API_README.md` for API details

### API Structure

- All API routes are under `/api/v1/`
- Frontend proxies requests through `/api/proxy`
- Responses follow a consistent format: `{ data: {...} }` or `{ error: "message" }`

## Testing

### Backend Tests (RSpec)

```bash
cd backend
bundle exec rspec
```

### Frontend Tests (Vitest)

```bash
cd frontend
npm run test
```

### Running All Tests

```bash
make test
```

## Common Tasks

### Database Migrations

```bash
# Create migration
docker-compose exec backend rails generate migration MigrationName

# Run migrations
docker-compose exec backend rails db:migrate

# Rollback
docker-compose exec backend rails db:rollback
```

### Rails Console

```bash
make console-backend
```

### View Logs

```bash
make logs
# or
docker-compose logs -f
```

## Code Review Guidelines

When submitting a pull request:

1. **Keep changes focused:** One feature or fix per PR
2. **Write clear commit messages:** Explain what and why
3. **Add tests:** New features should include tests
4. **Update documentation:** If you change behavior, update docs
5. **Follow existing patterns:** Maintain consistency with the codebase

## Questions?

- Check existing documentation in the `README.md` files
- Review similar code in the codebase
- Open an issue for clarification

Thank you for contributing! 🎉
