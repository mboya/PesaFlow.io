#!/bin/bash

# PesaFlow Fly.io Deployment Script
# This script deploys both backend and frontend to Fly.io together

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

# Parse command line arguments
DEPLOY_ALL=false
SETUP_DB=false
SKIP_MIGRATIONS=false
INTERACTIVE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --all|-a)
            DEPLOY_ALL=true
            shift
            ;;
        --setup-db|-d)
            SETUP_DB=true
            shift
            ;;
        --skip-migrations|-s)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --interactive|-i)
            INTERACTIVE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --all, -a              Deploy both backend and frontend (default)"
            echo "  --setup-db, -d         Setup PostgreSQL database first"
            echo "  --skip-migrations, -s  Skip running database migrations"
            echo "  --interactive, -i      Show interactive menu"
            echo "  --help, -h             Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Deploy both apps (default)"
            echo "  $0 --setup-db         # Setup DB and deploy both"
            echo "  $0 --interactive      # Show menu for manual selection"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Default to deploying all if no specific action requested
if [ "$INTERACTIVE" = false ] && [ "$DEPLOY_ALL" = false ]; then
    DEPLOY_ALL=true
fi

echo -e "${BLUE}🚀 PesaFlow Fly.io Deployment${NC}"
echo "======================================"
echo ""

# Function to deploy backend
deploy_backend() {
    echo -e "${YELLOW}📦 Deploying Backend...${NC}"
    cd backend
    
    # Check if app exists
    if ! fly status -a pesaflow-backend &> /dev/null; then
        echo "Creating backend app..."
        fly launch --no-deploy --name pesaflow-backend --region iad --copy-config || true
        
        # Set secrets if not already set
        if [ -z "$(fly secrets list -a pesaflow-backend 2>/dev/null | grep RAILS_MASTER_KEY)" ]; then
            echo -e "${YELLOW}⚠️  Setting up backend secrets...${NC}"
            
            if [ -f "config/master.key" ]; then
                MASTER_KEY=$(cat config/master.key)
                fly secrets set RAILS_MASTER_KEY="$MASTER_KEY" -a pesaflow-backend
                
                # Generate secret key base
                if command -v bundle &> /dev/null; then
                    SECRET_KEY=$(bundle exec rails secret 2>/dev/null || echo "")
                    if [ -n "$SECRET_KEY" ]; then
                        fly secrets set SECRET_KEY_BASE="$SECRET_KEY" -a pesaflow-backend
                    fi
                else
                    echo -e "${YELLOW}⚠️  Could not generate SECRET_KEY_BASE. Set it manually:${NC}"
                    echo "fly secrets set SECRET_KEY_BASE='...' -a pesaflow-backend"
                fi
                echo -e "${GREEN}✓ Secrets set${NC}"
            else
                echo -e "${YELLOW}⚠️  config/master.key not found. Set secrets manually:${NC}"
                echo "fly secrets set RAILS_MASTER_KEY='...' SECRET_KEY_BASE='...' -a pesaflow-backend"
            fi
        fi
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
    FRONTEND_URL="https://pesaflow-frontend.fly.dev"
    echo "Backend URL: $BACKEND_URL"
    echo "Frontend URL: $FRONTEND_URL"
    
    # Check if app exists
    if ! fly status -a pesaflow-frontend &> /dev/null; then
        echo "Creating frontend app..."
        fly launch --no-deploy --name pesaflow-frontend --region iad --copy-config
    fi
    
    # Set backend URL for frontend
    echo "Setting NEXT_PUBLIC_API_BASE_URL for frontend..."
    fly secrets set NEXT_PUBLIC_API_BASE_URL="$BACKEND_URL" -a pesaflow-frontend
    
    # Update backend CORS to allow frontend
    echo "Updating backend CORS to allow frontend..."
    CURRENT_ORIGINS=$(fly secrets list -a pesaflow-backend 2>/dev/null | grep ALLOWED_ORIGINS | awk '{print $2}' || echo "")
    if [ -n "$CURRENT_ORIGINS" ]; then
        NEW_ORIGINS="${CURRENT_ORIGINS},${FRONTEND_URL}"
    else
        NEW_ORIGINS="${FRONTEND_URL},localhost:3001"
    fi
    fly secrets set ALLOWED_ORIGINS="$NEW_ORIGINS" -a pesaflow-backend
    
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
        echo -e "${YELLOW}⚠️  IMPORTANT: Database connection string will be automatically attached.${NC}"
        echo ""
        
        # Wait a moment for database to be ready
        sleep 3
    else
        echo "Database already exists."
    fi
    
    # Attach database to backend (this sets DATABASE_URL automatically)
    echo "Attaching database to backend..."
    fly postgres attach pesaflow-db -a pesaflow-backend 2>/dev/null || echo "Database may already be attached"
    
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

# Main deployment function
deploy_all() {
    echo -e "${BLUE}Starting full deployment...${NC}"
    echo ""
    
    # Setup database if requested
    if [ "$SETUP_DB" = true ]; then
        setup_database
    fi
    
    # Deploy backend
    deploy_backend
    
    # Run migrations unless skipped
    if [ "$SKIP_MIGRATIONS" = false ]; then
        run_migrations
    fi
    
    # Deploy frontend
    deploy_frontend
    
    # Show final status
    echo ""
    echo -e "${GREEN}🎉 Deployment complete!${NC}"
    echo ""
    echo -e "${BLUE}Your applications:${NC}"
    BACKEND_HOST=$(fly status -a pesaflow-backend 2>/dev/null | grep Hostname | awk '{print $2}' || echo "not deployed")
    FRONTEND_HOST=$(fly status -a pesaflow-frontend 2>/dev/null | grep Hostname | awk '{print $2}' || echo "not deployed")
    
    if [ "$BACKEND_HOST" != "not deployed" ]; then
        echo -e "  Backend:  ${GREEN}https://${BACKEND_HOST}${NC}"
    fi
    if [ "$FRONTEND_HOST" != "not deployed" ]; then
        echo -e "  Frontend: ${GREEN}https://${FRONTEND_HOST}${NC}"
    fi
    echo ""
}

# Interactive menu
show_menu() {
    echo "What would you like to do?"
    echo "1) Deploy both (backend + frontend) - Recommended"
    echo "2) Setup database (PostgreSQL)"
    echo "3) Deploy backend only"
    echo "4) Deploy frontend only"
    echo "5) Run database migrations"
    echo "6) View app status"
    echo "7) View logs"
    echo ""
    read -p "Enter choice [1-7]: " choice

    case $choice in
        1)
            SETUP_DB=true
            deploy_all
            ;;
        2)
            setup_database
            ;;
        3)
            deploy_backend
            ;;
        4)
            deploy_frontend
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
}

# Execute based on mode
if [ "$INTERACTIVE" = true ]; then
    show_menu
elif [ "$DEPLOY_ALL" = true ]; then
    deploy_all
else
    show_menu
fi
