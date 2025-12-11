# PesaFlow.io

A subscription billing platform with Rails backend and Next.js frontend.

## Architecture

- **Backend**: Rails 7.2 API (Ruby 3.2)
- **Frontend**: Next.js 16 (React 19)
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7
- **Background Jobs**: Sidekiq

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Docker BuildKit (enabled by default in Docker Desktop)
- Make (optional, for convenience commands)

**Note**: For faster builds, ensure BuildKit is enabled. See [docker/BUILD_OPTIMIZATION.md](docker/BUILD_OPTIMIZATION.md) for details.

### Using Docker Compose (Recommended)

1. **Start all services:**
   ```bash
   docker-compose up
   ```
   Or use Make:
   ```bash
   make start
   ```

2. **Access the application:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

3. **Stop services:**
   ```bash
   docker-compose down
   ```
   Or:
   ```bash
   make stop
   ```

### Port Configuration

- **Frontend**: Port `3001` (host) → Port `3000` (container)
- **Backend**: Port `3000` (host) → Port `3000` (container)
- **PostgreSQL**: Port `5432`
- **Redis**: Port `6379`

The frontend communicates with the backend API at `http://localhost:3000` (configured via `NEXT_PUBLIC_API_URL`).

### Environment Variables

Create a `.env` file in the project root with:

```env
SAFARICOM_CONSUMER_KEY=your_consumer_key_here
SAFARICOM_CONSUMER_SECRET=your_consumer_secret_here
```

## Development

### Local Development (without Docker)

1. **Backend:**
   ```bash
   cd backend
   bundle install
   rails db:create db:migrate db:seed
   rails s
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Docker Development

The Docker setup uses volume mounts for hot reloading:
- Code changes are reflected immediately
- Gems/node_modules are cached in Docker volumes

### Useful Commands

```bash
# View logs
make logs
# or
docker-compose logs -f

# Restart services
make restart

# Access Rails console
make console-backend

# Access PostgreSQL
make psql

# Access Redis CLI
make redis-cli

# Run tests
make test

# Clean up
make clean
```

## Production

For production builds, use the optimized multi-stage Dockerfiles:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

See [docker/OPTIMIZATION.md](docker/OPTIMIZATION.md) for details on the optimized builds.

## Project Structure

```
.
├── backend/          # Rails API
├── frontend/         # Next.js application
├── docker/           # Dockerfiles and documentation
├── docker-compose.yml
└── Makefile         # Convenience commands
```

## License

See LICENSE file for details.

