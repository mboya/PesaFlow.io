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
   - System Status: http://localhost:3001/system-status (view health status of both services)
   - Backend API: Proxied through frontend at http://localhost:3001/api/proxy
   - Backend WebSocket: Proxied through frontend at ws://localhost:3001/api/proxy/ws
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379
   
   **Note**: The backend is not directly accessible from the host. All requests must go through the frontend proxy.

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
- **Backend**: Not exposed to host (completely private, accessible only via frontend proxy)
- **PostgreSQL**: Port `5432`
- **Redis**: Port `6379`

### Network Architecture

The backend services (backend, sidekiq, postgres, redis) run on a **private Docker network** (`backend_network`) and are **completely inaccessible** from the host machine. This provides maximum security by isolating backend services.

- **HTTP API**: All HTTP API requests are proxied through the Next.js frontend at `/api/proxy/*`. The browser makes requests to the frontend, which forwards them to the backend over the private network.
- **WebSocket**: WebSocket connections (ActionCable) are proxied through the Next.js custom server at `/api/proxy/ws`. The frontend server handles WebSocket upgrades and forwards them to the backend over the private network.

**Security**: The backend is completely isolated - no ports are exposed to the host. All communication (HTTP and WebSocket) must go through the frontend proxy, ensuring the backend cannot be accessed directly from the browser or host machine.

The frontend communicates with the backend API through the proxy at `http://localhost:3001/api/proxy` (configured via `NEXT_PUBLIC_API_URL`).

### Auth Feature Flags

- `NEXT_PUBLIC_ENABLE_PASSWORD_AUTH=true` (default): shows email/password login and signup forms.
- `NEXT_PUBLIC_ENABLE_PASSWORD_AUTH=false`: hides email/password login and signup forms; users can sign in with Google only (if configured).
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>`: enables the Google sign-in button on `/login`.
- `NEXT_PUBLIC_ENABLE_PASSWORD_AUTH` is also read at runtime via `/api/feature-flags`, so Render env updates apply after service restart/redeploy.

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
