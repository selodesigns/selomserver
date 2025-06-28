# SELO Media Server Installation Script for Windows
# This script will set up the SELO Media Server environment

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "Warning: Running as administrator is not recommended. Consider using a non-privileged user." -ForegroundColor Yellow
    $confirmation = Read-Host "Continue anyway? (y/n)"
    if ($confirmation -ne 'y') {
        exit
    }
}

Write-Host "======================================"
Write-Host "    SELO Media Server Installer      "
Write-Host "======================================"

# Check for Node.js
Write-Host "`nChecking for Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "Found Node.js $nodeVersion" -ForegroundColor Green
    
    # Check if Node version is >= 18
    $nodeMajor = $nodeVersion -replace '[^0-9]', '' -replace '(\d+).*', '$1'
    if ([int]$nodeMajor -lt 18) {
        Write-Host "Node.js 18 or later is required. You have $nodeVersion" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Node.js not found. Please install Node.js 18 or later." -ForegroundColor Red
    Write-Host "Visit https://nodejs.org to download and install."
    exit 1
}

# Check for npm
Write-Host "`nChecking for npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm -v
    Write-Host "Found npm $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "npm not found. Please install npm." -ForegroundColor Red
    exit 1
}

# Check for FFmpeg
Write-Host "`nChecking for FFmpeg..." -ForegroundColor Yellow
try {
    $ffmpegVersion = (ffmpeg -version)[0]
    Write-Host "Found $ffmpegVersion" -ForegroundColor Green
} catch {
    Write-Host "FFmpeg not found." -ForegroundColor Red
    
    # Offer to install FFmpeg using chocolatey
    $installFFmpeg = Read-Host "Would you like to install FFmpeg using Chocolatey? (y/n)"
    if ($installFFmpeg -eq "y") {
        # Check if Chocolatey is installed
        try {
            $chocoVersion = choco -v
            Write-Host "Found Chocolatey $chocoVersion" -ForegroundColor Green
        } catch {
            Write-Host "Chocolatey not found. Installing..." -ForegroundColor Yellow
            try {
                Set-ExecutionPolicy Bypass -Scope Process -Force
                [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
                Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
                Write-Host "Chocolatey installed successfully." -ForegroundColor Green
            } catch {
                Write-Host "Failed to install Chocolatey. Please install FFmpeg manually." -ForegroundColor Red
                exit 1
            }
        }
        
        # Install FFmpeg using Chocolatey
        try {
            Write-Host "Installing FFmpeg..." -ForegroundColor Yellow
            choco install ffmpeg -y
            Write-Host "FFmpeg installed successfully." -ForegroundColor Green
        } catch {
            Write-Host "Failed to install FFmpeg. Please install it manually." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Please install FFmpeg manually and run this script again." -ForegroundColor Red
        Write-Host "FFmpeg can be downloaded from https://ffmpeg.org/download.html"
        exit 1
    }
}

# Install dependencies
Write-Host "`nInstalling Node.js dependencies..." -ForegroundColor Yellow
npm install

# Check if server directory exists
if (Test-Path -Path "server") {
    Write-Host "Server directory found, installing dependencies..." -ForegroundColor Green
    Push-Location -Path "server"
    npm install
    Pop-Location
} else {
    Write-Host "Server directory not found at: $(Resolve-Path .)\server" -ForegroundColor Red
    Write-Host "Creating server directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "server" | Out-Null
}

# Create necessary directories
Write-Host "`nCreating necessary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "server\data\media" | Out-Null
New-Item -ItemType Directory -Force -Path "server\data\thumbnails" | Out-Null
New-Item -ItemType Directory -Force -Path "server\data\cache" | Out-Null
New-Item -ItemType Directory -Force -Path "server\logs" | Out-Null

# Run setup script
Write-Host "`nRunning SELO Media Server setup..." -ForegroundColor Yellow
if (Test-Path -Path "scripts\setup.js") {
    node "scripts\setup.js"
} else {
    Write-Host "Setup script not found at: $(Resolve-Path .)\scripts\setup.js" -ForegroundColor Red
    Write-Host "Skipping setup script." -ForegroundColor Yellow
}

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host "SELO Media Server has been successfully installed!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "`nTo start the server:" -ForegroundColor Yellow
Write-Host "  npm start"
Write-Host "`nTo start in development mode:" -ForegroundColor Yellow
Write-Host "  npm run dev"
Write-Host "`nFor more information, see the documentation in the docs/ folder." -ForegroundColor Yellow