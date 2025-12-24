# Quick Start: Deploy to Fly.io

## Prerequisites

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login
```

## One-Command Deployment

```bash
# Deploy everything (database + backend + frontend) in one command
./deploy.sh

# Or use the interactive script
./deploy-fly.sh
# Choose option 1 to deploy both
```

## Manual Deployment Steps

### 1. Create Database

```bash
fly postgres create --name pesaflow-db --region iad --vm-size shared-cpu-1x --volume-size 3
```

**Save the connection string!**

### 2. Deploy Backend

```bash
cd backend

# Create app (first time only)
fly launch --no-deploy --name pesaflow-backend --region iad

# Set secrets
fly secrets set \
  RAILS_MASTER_KEY="$(cat config/master.key)" \
  SECRET_KEY_BASE="$(bundle exec rails secret)" \
  DATABASE_URL="postgres://..." \
  -a pesaflow-backend

# Deploy
fly deploy -a pesaflow-backend
```

### 3. Run Migrations

```bash
fly ssh console -a pesaflow-backend -C "bundle exec rails db:migrate"
```

### 4. Deploy Frontend

```bash
cd frontend

# Get backend URL
BACKEND_URL=$(fly status -a pesaflow-backend | grep Hostname | awk '{print $2}')

# Create app (first time only)
fly launch --no-deploy --name pesaflow-frontend --region iad

# Set backend URL
fly secrets set NEXT_PUBLIC_API_BASE_URL="https://${BACKEND_URL}" -a pesaflow-frontend

# Update backend CORS to allow frontend
fly secrets set ALLOWED_ORIGINS="https://pesaflow-frontend.fly.dev" -a pesaflow-backend

# Deploy
fly deploy -a pesaflow-frontend
```

## Your Apps

- **Backend**: `https://pesaflow-backend.fly.dev`
- **Frontend**: `https://pesaflow-frontend.fly.dev`
- **Database**: `pesaflow-db` (internal)

## Useful Commands

```bash
# View logs
fly logs -a pesaflow-backend
fly logs -a pesaflow-frontend

# SSH into app
fly ssh console -a pesaflow-backend

# Scale apps
fly scale count 2 -a pesaflow-backend

# View status
fly status -a pesaflow-backend
```

## Troubleshooting

**Backend won't start?**
- Check secrets are set: `fly secrets list -a pesaflow-backend`
- Check logs: `fly logs -a pesaflow-backend`
- Verify DATABASE_URL is correct

**Frontend can't connect to backend?**
- Check NEXT_PUBLIC_API_BASE_URL: `fly secrets list -a pesaflow-frontend`
- Check backend CORS: `fly secrets list -a pesaflow-backend` (ALLOWED_ORIGINS)
- Verify backend is running: `fly status -a pesaflow-backend`

**Database connection errors?**
- Verify database is running: `fly status -a pesaflow-db`
- Check DATABASE_URL secret matches the connection string
- Ensure migrations have run
