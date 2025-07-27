#!/bin/bash

# LinkedIn Marketing Agent Startup Script
echo "🚀 Starting LinkedIn Marketing Agent..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

print_success "Python 3 found: $(python3 --version)"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_status "Creating virtual environment..."
    python3 -m venv venv
    if [ $? -eq 0 ]; then
        print_success "Virtual environment created successfully"
    else
        print_error "Failed to create virtual environment"
        exit 1
    fi
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
print_status "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
print_status "Installing dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_error "requirements.txt not found"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        print_warning ".env file not found. Copying from .env.example..."
        cp .env.example .env
        print_warning "Please edit .env file with your configuration before running the application"
    else
        print_error ".env file not found and no .env.example available"
        print_error "Please create a .env file with your configuration"
        exit 1
    fi
fi

# Redis not required - using memory storage for rate limiting
print_status "Using memory storage for rate limiting (Redis not required)"

# Create upload directories
print_status "Creating necessary directories..."
mkdir -p static/uploads
mkdir -p instance
mkdir -p logs

# Set environment variables
export FLASK_APP=app.py
export FLASK_ENV=development

# Check if running in development or production mode
if [ "$1" = "prod" ] || [ "$1" = "production" ]; then
    print_status "Starting in PRODUCTION mode..."
    export FLASK_ENV=production
    
    # Check if gunicorn is installed
    if ! command -v gunicorn &> /dev/null; then
        print_error "Gunicorn not found. Installing..."
        pip install gunicorn
    fi
    
    # Start task scheduler in background
    print_status "Starting task scheduler..."
    python task_scheduler.py start &
    SCHEDULER_PID=$!
    
    print_status "Starting application with Gunicorn..."
    gunicorn -w 4 -b 0.0.0.0:5000 --timeout 120 --keep-alive 2 app:app
else
    print_status "Starting in DEVELOPMENT mode..."
    print_status "Application will be available at: http://localhost:5000"
    print_status "Press Ctrl+C to stop the server"
    echo ""
    
    # Start task scheduler in background
    print_status "Starting task scheduler..."
    python task_scheduler.py start &
    SCHEDULER_PID=$!
    
    # Function to cleanup on exit
    cleanup() {
        print_status "Shutting down..."
        if [ ! -z "$SCHEDULER_PID" ]; then
            kill $SCHEDULER_PID 2>/dev/null
            print_status "Task scheduler stopped"
        fi
        exit 0
    }
    
    # Set trap to cleanup on script exit
    trap cleanup INT TERM
    
    # Start the Flask development server
    python app.py
fi