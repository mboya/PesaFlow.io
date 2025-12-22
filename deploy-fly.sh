#!/bin/bash

# PesaFlow Fly.io Deployment Script
# This script helps deploy both backend and frontend to Fly.io

set -e

echo "🚀 PesaFlow Fly.io Deployment Helper"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo -e "${RED}❌ Fly CLI is not installed.${NC}"
    echo "Install it from: https://fly.io/docs/getting-started/installing-flyctl/"
    exit 1
fi

# Check if logged in
if ! fly auth whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Fly.io${NC}"
    echo "Running: fly auth login"
    fly auth login
fi

echo -e "${GREEN}✓ Fly CLI is ready${NC}"
echo ""

# Function to deploy backend
deploy_backend() {
    echo -e "${YELLOW}📦 Deploying Backend...${NC}"
    cd backend
    
    # Check if app exists
    if ! fly status -a pesaflow-backend &> /dev/null; then
        echo "Creating backend app..."
        fly launch --no-deploy --name pesaflow-backend --region iad
    fi
    
    echo "Deploying backend..."
    fly deploy -a pesaflow-backend
    
    cd ..
    echo -e "${GREEN}✓ Backend deployed${NC}"
    echo ""
}

# Function to deploy frontend
deploy_frontend() {
    echo -e "${YELLOW}📦 Deploying Frontend...${NC}"
    cd frontend
    
    # Get backend URL
    BACKEND_URL=$(fly status -a pesaflow-backend 2>/dev/null | grep "Hostname" | awk '{print $2}' || echo "")
    
    if [ -z "$BACKEND_URL" ]; then
        echo -e "${RED}❌ Could not get backend URL. Please deploy backend first.${NC}"
        exit 1
    fi
    
    BACKEND_URL="https://${BACKEND_URL}"
    echo "Backend URL: $BACKEND_URL"
    
    # Check if app exists
    if ! fly status -a pesaflow-frontend &> /dev/null; then
        echo "Creating frontend app..."
        fly launch --no-deploy --name pesaflow-frontend --region iad
    fi
    
    # Set backend URL
    echo "Setting NEXT_PUBLIC_API_BASE_URL..."
    fly secrets set NEXT_PUBLIC_API_BASE_URL="$BACKEND_URL" -a pesaflow-frontend
    
    echo "Deploying frontend..."
    fly deploy -a pesaflow-frontend
    
    cd ..
    echo -e "${GREEN}✓ Frontend deployed${NC}"
    echo ""
}

# Function to setup database
setup_database() {
    echo -e "${YELLOW}🗄️  Setting up PostgreSQL...${NC}"
    
    # Check if database exists
    if ! fly status -a pesaflow-db &> /dev/null; then
        echo "Creating PostgreSQL database..."
        fly postgres create --name pesaflow-db --region iad --vm-size shared-cpu-1x --volume-size 3
        
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANT: Save the connection string above!${NC}"
        echo "You'll need to set it as DATABASE_URL secret for the backend."
        echo ""
        read -p "Press Enter after you've saved the connection string..."
    else
        echo "Database already exists."
    fi
    
    # Attach database to backend
    echo "Attaching database to backend..."
    fly postgres attach pesaflow-db -a pesaflow-backend || echo "Database may already be attached"
    
    echo -e "${GREEN}✓ Database setup complete${NC}"
    echo ""
}

# Function to run migrations
run_migrations() {
    echo -e "${YELLOW}🔄 Running database migrations...${NC}"
    fly ssh console -a pesaflow-backend -C "cd /rails && bundle exec rails db:migrate"
    echo -e "${GREEN}✓ Migrations complete${NC}"
    echo ""
}

# Main menu
echo "What would you like to do?"
echo "1) Setup database (PostgreSQL)"
echo "2) Deploy backend"
echo "3) Deploy frontend"
echo "4) Deploy both (backend + frontend)"
echo "5) Run database migrations"
echo "6) View app status"
echo "7) View logs"
echo ""
read -p "Enter choice [1-7]: " choice

case $choice in
    1)
        setup_database
        ;;
    2)
        deploy_backend
        ;;
    3)
        deploy_frontend
        ;;
    4)
        setup_database
        deploy_backend
        run_migrations
        deploy_frontend
        echo -e "${GREEN}🎉 Deployment complete!${NC}"
        echo ""
        echo "Backend: https://$(fly status -a pesaflow-backend | grep Hostname | awk '{print $2}')"
        echo "Frontend: https://$(fly status -a pesaflow-frontend | grep Hostname | awk '{print $2}')"
        ;;
    5)
        run_migrations
        ;;
    6)
        echo -e "${YELLOW}Backend Status:${NC}"
        fly status -a pesaflow-backend || echo "Backend not deployed"
        echo ""
        echo -e "${YELLOW}Frontend Status:${NC}"
        fly status -a pesaflow-frontend || echo "Frontend not deployed"
        echo ""
        echo -e "${YELLOW}Database Status:${NC}"
        fly status -a pesaflow-db || echo "Database not created"
        ;;
    7)
        echo "Which logs do you want to view?"
        echo "1) Backend"
        echo "2) Frontend"
        echo "3) Both"
        read -p "Enter choice [1-3]: " log_choice
        case $log_choice in
            1)
                fly logs -a pesaflow-backend
                ;;
            2)
                fly logs -a pesaflow-frontend
                ;;
            3)
                fly logs -a pesaflow-backend &
                fly logs -a pesaflow-frontend &
                wait
                ;;
        esac
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
