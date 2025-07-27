# LinkedIn Marketing Agent Startup Script (PowerShell)
Write-Host "🚀 Starting LinkedIn Marketing Agent..." -ForegroundColor Blue

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if Python 3 is installed
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python 3") {
        Write-Success "Python 3 found: $pythonVersion"
    } else {
        Write-Error "Python 3 is not installed or not in PATH. Please install Python 3.8 or higher."
        exit 1
    }
} catch {
    Write-Error "Python 3 is not installed or not in PATH. Please install Python 3.8 or higher."
    exit 1
}

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Status "Creating virtual environment..."
    python -m venv venv
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Virtual environment created successfully"
    } else {
        Write-Error "Failed to create virtual environment"
        exit 1
    }
}

# Activate virtual environment
Write-Status "Activating virtual environment..."
& ".\venv\Scripts\Activate.ps1"

# Upgrade pip
Write-Status "Upgrading pip..."
python -m pip install --upgrade pip

# Install dependencies
Write-Status "Installing dependencies..."
if (Test-Path "requirements.txt") {
    pip install -r requirements.txt
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed successfully"
    } else {
        Write-Error "Failed to install dependencies"
        exit 1
    }
} else {
    Write-Error "requirements.txt not found"
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Warning ".env file not found. Copying from .env.example..."
        Copy-Item ".env.example" ".env"
        Write-Warning "Please edit .env file with your configuration before running the application"
    } else {
        Write-Error ".env file not found and no .env.example available"
        Write-Error "Please create a .env file with your configuration"
        exit 1
    }
}

# Redis not required - using memory storage for rate limiting
Write-Status "Using memory storage for rate limiting (Redis not required)"

# Create upload directories
Write-Status "Creating necessary directories..."
New-Item -ItemType Directory -Force -Path "static\uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "instance" | Out-Null
New-Item -ItemType Directory -Force -Path "logs" | Out-Null

# Set environment variables
$env:FLASK_APP = "app.py"
$env:FLASK_ENV = "development"

# Check if running in development or production mode
if ($args[0] -eq "prod" -or $args[0] -eq "production") {
    Write-Status "Starting in PRODUCTION mode..."
    $env:FLASK_ENV = "production"
    
    # Check if waitress is installed (Windows WSGI server)
    try {
        waitress-serve --help | Out-Null
        Write-Success "Waitress WSGI server found"
    } catch {
        Write-Error "Waitress not found. Installing..."
        pip install waitress
    }
    
    # Start task scheduler in background
    Write-Status "Starting task scheduler..."
    $schedulerJob = Start-Job -ScriptBlock { 
        Set-Location $using:PWD
        & ".\venv\Scripts\Activate.ps1"
        python task_scheduler.py start 
    }
    
    Write-Status "Starting application with Waitress WSGI server..."
    Write-Status "Application will be available at: http://localhost:5000"
    waitress-serve --host=0.0.0.0 --port=5000 app:app
} else {
    Write-Status "Starting in DEVELOPMENT mode..."
    Write-Status "Application will be available at: http://localhost:5000"
    Write-Status "Press Ctrl+C to stop the server"
    Write-Host ""
    
    # Start task scheduler in background
    Write-Status "Starting task scheduler..."
    $schedulerJob = Start-Job -ScriptBlock { 
        Set-Location $using:PWD
        & ".\venv\Scripts\Activate.ps1"
        python task_scheduler.py start 
    }
    
    # Function to cleanup on exit
    function Cleanup {
        Write-Status "Shutting down..."
        if ($schedulerJob) {
            Stop-Job $schedulerJob -ErrorAction SilentlyContinue
            Remove-Job $schedulerJob -ErrorAction SilentlyContinue
            Write-Status "Task scheduler stopped"
        }
    }
    
    # Set trap to cleanup on script exit
    try {
        # Start the Flask development server
        python app.py
    } finally {
        Cleanup
    }
}