# SELO Media Server Installation Guide

This document provides detailed installation instructions for SELO Media Server on various platforms.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
  - [Quick Start](#quick-start)
  - [Standard Installation](#standard-installation)
  - [Docker Installation](#docker-installation)
- [Platform-Specific Instructions](#platform-specific-instructions)
  - [Windows](#windows)
  - [macOS](#macos)
  - [Linux](#linux)
  - [Raspberry Pi](#raspberry-pi)
- [Post-Installation](#post-installation)
- [Upgrading](#upgrading)
- [Uninstallation](#uninstallation)

---

## Prerequisites

Before installing SELO Media Server, ensure your system meets these requirements:

### Required Software
- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **FFmpeg** (v4.0 or higher) - Required for transcoding and thumbnail generation

### Hardware Recommendations
- **CPU**: 2+ cores (4+ recommended for transcoding)
- **RAM**: 2GB minimum (4GB+ recommended)
- **Storage**: Sufficient for your media library plus ~10% for thumbnails and cache
- **Network**: Wired connection recommended, especially for 4K streaming

### Supported Operating Systems
- **Windows**: Windows 10, Windows 11, Windows Server 2016+
- **macOS**: macOS 11 (Big Sur) or later
- **Linux**: Ubuntu 20.04+, Debian 10+, Fedora 34+, CentOS 8+
- **Docker**: Any platform supporting Docker 19.03 or later

---

## Installation Methods

### Quick Start

The quickest way to get SELO Media Server running:

```bash
# Clone the repository
git clone https://github.com/yourusername/SELOMServer.git

# Navigate to the project directory
cd SELOMServer

# Run the quick start script
node scripts/quick-start.js
```

The script will guide you through a basic setup process and start the server.

### Standard Installation

For a more customized installation:

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/SELOMServer.git
   cd SELOMServer
   ```

2. Run the appropriate install script
   - Linux/macOS: `./scripts/install.sh`
   - Windows: `.\scripts\install.ps1`

3. Run the setup script
   ```bash
   npm run setup
   ```

4. Start the server
   ```bash
   npm start
   ```

### Docker Installation

For installation with Docker:

1. Pull the image
   ```bash
   docker pull yourusername/selomserver:latest
   ```

2. Create a docker-compose.yml file
   ```yaml
   version: '3'
   services:
     selomserver:
       image: yourusername/selomserver:latest
       container_name: selomserver
       ports:
         - "32400:32400"
       volumes:
         - /path/to/media:/app/data/media
         - /path/to/config:/app/data/config
       restart: unless-stopped
       environment:
         - TZ=Your/Timezone
         - PUID=1000
         - PGID=1000
   ```

3. Start the container
   ```bash
   docker-compose up -d
   ```

---

## Platform-Specific Instructions

### Windows

1. **Install Node.js**
   - Download and install Node.js v18.0.0 or later from [nodejs.org](https://nodejs.org/)
   - Ensure you select the option to install necessary tools and npm

2. **Install FFmpeg**
   - Option 1: Using Chocolatey (recommended)
     ```powershell
     # Install Chocolatey if not already installed
     Set-ExecutionPolicy Bypass -Scope Process -Force
     [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
     iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
     
     # Install FFmpeg
     choco install ffmpeg -y
     ```
   
   - Option 2: Manual installation
     - Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html#build-windows)
     - Extract to a folder (e.g., C:\\FFmpeg)
     - Add the bin folder to your PATH environment variable
       - Open Control Panel > System > Advanced system settings
       - Click Environment Variables
       - Under System variables, find and edit PATH
       - Add `C:\FFmpeg\bin`

3. **Install SELO Media Server**
   - Open PowerShell as Administrator
   - Navigate to where you want to install SELO
   - Run:
     ```powershell
     git clone https://github.com/yourusername/SELOMServer.git
     cd SELOMServer
     .\scripts\install.ps1
     ```

4. **Running as a Service (Optional)**
   - Install nssm (Non-Sucking Service Manager)
     ```powershell
     choco install nssm -y
     ```
   - Create a service
     ```powershell
     nssm install "SELO Media Server" "C:\Program Files\nodejs\node.exe" "index.js"
     nssm set "SELO Media Server" AppDirectory "C:\path\to\SELOMServer\server"
     nssm start "SELO Media Server"
     ```

### macOS

1. **Install Node.js**
   - Using Homebrew (recommended)
     ```bash
     # Install Homebrew if not already installed
     /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
     
     # Install Node.js
     brew install node@18
     ```
   
   - Using the official installer
     - Download and install from [nodejs.org](https://nodejs.org/)

2. **Install FFmpeg**
   ```bash
   brew install ffmpeg
   ```

3. **Install SELO Media Server**
   ```bash
   git clone https://github.com/yourusername/SELOMServer.git
   cd SELOMServer
   chmod +x scripts/install.sh
   ./scripts/install.sh
   ```

4. **Running as a Service (Optional)**
   - Create a Launch Agent
     ```bash
     cat > ~/Library/LaunchAgents/com.selomserver.plist << EOL
     <?xml version="1.0" encoding="UTF-8"?>
     <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
     <plist version="1.0">
     <dict>
       <key>Label</key>
       <string>com.selomserver</string>
       <key>ProgramArguments</key>
       <array>
         <string>/usr/local/bin/node</string>
         <string>$(pwd)/server/index.js</string>
       </array>
       <key>RunAtLoad</key>
       <true/>
       <key>KeepAlive</key>
       <true/>
       <key>WorkingDirectory</key>
       <string>$(pwd)/server</string>
       <key>StandardErrorPath</key>
       <string>$(pwd)/server/logs/error.log</string>
       <key>StandardOutPath</key>
       <string>$(pwd)/server/logs/output.log</string>
     </dict>
     </plist>
     EOL
     
     # Load the service
     launchctl load ~/Library/LaunchAgents/com.selomserver.plist
     ```

### Linux

1. **Install Node.js**
   - Ubuntu/Debian
     ```bash
     # Using NodeSource repository (recommended)
     curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
     sudo apt-get install -y nodejs
     
     # Verify installation
     node --version
     npm --version
     ```
   
   - Fedora/RHEL/CentOS
     ```bash
     # Using NodeSource repository
     curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo -E bash -
     sudo dnf install -y nodejs
     ```

2. **Install FFmpeg**
   - Ubuntu/Debian
     ```bash
     sudo apt update
     sudo apt install -y ffmpeg
     ```
   
   - Fedora
     ```bash
     sudo dnf install -y ffmpeg
     ```
   
   - CentOS/RHEL
     ```bash
     sudo dnf install -y epel-release
     sudo dnf install -y --enablerepo=epel,powertools ffmpeg
     ```

3. **Install SELO Media Server**
   ```bash
   git clone https://github.com/yourusername/SELOMServer.git
   cd SELOMServer
   chmod +x scripts/install.sh
   ./scripts/install.sh
   ```

4. **Running as a Service (Systemd)**
   ```bash
   # Create a service file
   sudo nano /etc/systemd/system/selomserver.service
   ```
   
   Add the following content:
   ```ini
   [Unit]
   Description=SELO Media Server
   After=network.target
   
   [Service]
   User=your_username
   WorkingDirectory=/path/to/SELOMServer/server
   ExecStart=/usr/bin/node index.js
   Restart=on-failure
   RestartSec=10
   StandardOutput=syslog
   StandardError=syslog
   SyslogIdentifier=selomserver
   
   [Install]
   WantedBy=multi-user.target
   ```
   
   Enable and start the service:
   ```bash
   sudo systemctl enable selomserver
   sudo systemctl start selomserver
   ```

### Raspberry Pi

1. **Install Node.js**
   ```bash
   # Update system
   sudo apt update
   sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

2. **Install FFmpeg**
   ```bash
   sudo apt install -y ffmpeg
   ```

3. **Install SELO Media Server**
   - Follow the Linux instructions above
   - Note: Transcoding may be limited on lower-powered Raspberry Pi models

---

## Post-Installation

After installation:

1. Access the web interface at http://localhost:32400
2. Log in with the default credentials (if you used the quick start or standard install script)
   - Username: `admin`
   - Password: `admin`
3. Follow the setup wizard to:
   - Change the default password
   - Configure your media library
   - Set up users and permissions

---

## Upgrading

To upgrade SELO Media Server:

1. Backup your configuration
   ```bash
   cp -r server/.env server/data /safe/backup/location
   ```

2. Pull the latest code
   ```bash
   git pull origin main
   ```

3. Install any new dependencies
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

4. Restart the server
   ```bash
   npm start
   ```

---

## Uninstallation

To completely remove SELO Media Server:

1. Stop the server
   - If running as a service, stop and disable it first
   - For systemd: `sudo systemctl stop selomserver && sudo systemctl disable selomserver`

2. Remove the application files
   ```bash
   # Remove the entire directory
   rm -rf /path/to/SELOMServer
   ```

3. Remove any service files
   - Windows: Use nssm to remove the service
   - macOS: `launchctl unload ~/Library/LaunchAgents/com.selomserver.plist && rm ~/Library/LaunchAgents/com.selomserver.plist`
   - Linux: `sudo rm /etc/systemd/system/selomserver.service && sudo systemctl daemon-reload`

Note: This will not remove your media files if they are stored outside the application directory.
