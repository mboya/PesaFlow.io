# Fly.io Deployment Guide for PesaFlow

This guide will help you deploy PesaFlow to Fly.io. The application consists of:
- **Backend**: Rails API (Ruby 3.3.7)
- **Frontend**: Next.js 16 (Node.js 20)
- **Database**: PostgreSQL (Fly Postgres)

## Prerequisites

1. Install [Fly CLI](https://fly.io/docs/getting-started/installing-flyctl/)
2. Sign up for a [Fly.io account](https://fly.io/app/sign-up)
3. Login: `fly auth login`

## Step 1: Create PostgreSQL Database

```bash
# Create a Postgres database
fly postgres create --name pesaflow-db --region iad --vm-size shared-cpu-1x --volume-size 3

# Note the connection string from the output, or get it later with:
fly postgres connect -a pesaflow-db
```

**Important**: Save the connection string - you'll need it for the backend app.

## Step 2: Deploy Backend

```bash
cd backend

# Initialize Fly app (if not already done)
fly launch --no-deploy

# Or if you want to use the existing fly.toml:
# Update the app name in fly.toml if needed

# Get your frontend URL (you'll need this for CORS)
FRONTEND_URL="https://pesaflow-frontend.fly.dev"  # Update after frontend is deployed

# Set secrets/environment variables
fly secrets set \
  RAILS_MASTER_KEY="your-master-key-here" \
  SECRET_KEY_BASE="your-secret-key-base-here" \
  DATABASE_URL="postgres://..." \
  ALLOWED_ORIGINS="${FRONTEND_URL},localhost:3001" \
  -a pesaflow-backend

# Optional: Set additional environment variables
fly secrets set \
  REDIS_URL="redis://..." \
  -a pesaflow-backend

# Deploy
fly deploy -a pesaflow-backend
```

### Getting Rails Master Key

If you don't have `RAILS_MASTER_KEY`, you can generate a new one:

```bash
cd backend
# Generate new credentials
EDITOR="code --wait" rails credentials:edit

# Extract the master key (it's in config/master.key)
cat config/master.key
```

### Generating Secret Key Base

```bash
cd backend
rails secret
```

## Step 3: Deploy Frontend

```bash
cd frontend

# Initialize Fly app (if not already done)
fly launch --no-deploy

# Or if you want to use the existing fly.toml:
# Update the app name in fly.toml if needed

# Get your backend URL
BACKEND_URL=$(fly status -a pesaflow-backend | grep "Hostname" | awk '{print $2}')

# Set environment variables
fly secrets set \
  NEXT_PUBLIC_API_BASE_URL="https://${BACKEND_URL}" \
  -a pesaflow-frontend

# Deploy
fly deploy -a pesaflow-frontend
```

## Step 4: Run Database Migrations

After deploying the backend:

```bash
# Run migrations
fly ssh console -a pesaflow-backend
# Inside the console (WORKDIR is already /rails):
bundle exec rails db:migrate

# Optional: Seed initial data (if needed)
bundle exec rails db:seed
```

Or use Fly's remote exec:

```bash
fly ssh console -a pesaflow-backend -C "bundle exec rails db:migrate"
```

## Step 5: Verify Deployment

1. **Backend Health Check**:
   ```bash
   curl https://pesaflow-backend.fly.dev/up
   ```

2. **Frontend Health Check**:
   ```bash
   curl https://pesaflow-frontend.fly.dev/api/health
   ```

3. **Access the application**:
   - Frontend: `https://pesaflow-frontend.fly.dev`
   - Backend API: `https://pesaflow-backend.fly.dev`

## Environment Variables Reference

### Backend Required Variables

- `RAILS_MASTER_KEY`: Rails master key for encrypted credentials
- `SECRET_KEY_BASE`: Secret key base for session encryption
- `DATABASE_URL`: PostgreSQL connection string (from Fly Postgres)
- `RAILS_ENV`: Set to `production` (already in fly.toml)
- `PORT`: Set to `3000` (already in fly.toml)

### Backend Optional Variables

- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (e.g., `https://pesaflow-frontend.fly.dev,localhost:3001`)
- `REDIS_URL`: Redis connection string (for Sidekiq)
- `RAILS_MAX_THREADS`: Number of threads (default: 3)
- `SMTP_*`: Email configuration (if using ActionMailer)

### Frontend Required Variables

- `NEXT_PUBLIC_API_BASE_URL`: Backend API URL (e.g., `https://pesaflow-backend.fly.dev`)
- `NODE_ENV`: Set to `production` (already in fly.toml)
- `PORT`: Set to `3000` (already in fly.toml)

## Scaling

### Scale Backend

```bash
# Scale to 2 instances
fly scale count 2 -a pesaflow-backend

# Scale memory
fly scale memory 1024 -a pesaflow-backend
```

### Scale Frontend

```bash
# Scale to 2 instances
fly scale count 2 -a pesaflow-frontend
```

## Monitoring

```bash
# View logs
fly logs -a pesaflow-backend
fly logs -a pesaflow-frontend

# View status
fly status -a pesaflow-backend
fly status -a pesaflow-frontend

# SSH into instance
fly ssh console -a pesaflow-backend
```

## Updating Secrets

```bash
# Update a secret
fly secrets set NEW_VAR="value" -a pesaflow-backend

# Remove a secret
fly secrets unset OLD_VAR -a pesaflow-backend

# List all secrets
fly secrets list -a pesaflow-backend
```

## Troubleshooting

### Backend Issues

1. **Database connection errors**:
   - Verify `DATABASE_URL` is set correctly
   - Check Fly Postgres is running: `fly status -a pesaflow-db`
   - Ensure database exists and migrations have run

2. **Port binding errors**:
   - Ensure `PORT` environment variable is set to `3000`
   - Check `config/puma.rb` uses `ENV.fetch("PORT", 3000)`

3. **Memory issues**:
   - Increase memory: `fly scale memory 1024 -a pesaflow-backend`
   - Check logs: `fly logs -a pesaflow-backend`

### Frontend Issues

1. **API connection errors**:
   - Verify `NEXT_PUBLIC_API_BASE_URL` points to backend URL
   - Check CORS settings in backend
   - Ensure backend is accessible

2. **Build failures**:
   - Check Node.js version matches Dockerfile (20)
   - Verify all dependencies are in `package.json`
   - Check build logs: `fly logs -a pesaflow-frontend`

## Free Tier Limits

Fly.io free tier includes:
- **3 shared-cpu-1x VMs** (256MB RAM each)
- **3GB persistent volume** (for Postgres)
- **160GB outbound data transfer** per month

**Note**: The free tier is generous but:
- Apps may sleep after inactivity (auto_start_machines handles this)
- Consider upgrading for production workloads

## Custom Domains

To add a custom domain:

```bash
# Add domain to backend
fly certs add yourdomain.com -a pesaflow-backend

# Add domain to frontend
fly certs add app.yourdomain.com -a pesaflow-frontend
```

## Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Rails on Fly.io](https://fly.io/docs/rails/)
- [Next.js on Fly.io](https://fly.io/docs/languages-and-frameworks/nextjs/)
- [Fly Postgres](https://fly.io/docs/postgres/)
