#!/bin/bash

# SELO Media Server Installation Script for Linux/macOS
# This script will set up the SELO Media Server environment

set -e

# Check if running as root and warn if so
if [ "$EUID" -eq 0 ]; then
  echo -e "\e[33mWarning: Running as root is not recommended. Consider using a non-privileged user.\e[0m"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}    SELO Media Server Installer      ${NC}"
echo -e "${BLUE}======================================${NC}"

# Check for Node.js
echo -e "\n${YELLOW}Checking for Node.js...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js not found. Please install Node.js 18 or later.${NC}"
  echo "Visit https://nodejs.org to download and install."
  exit 1
else
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}Found Node.js $NODE_VERSION${NC}"
  
  # Check if Node version is >= 18
  NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/[^0-9]*//g')
  if [ "$NODE_MAJOR" -lt "18" ]; then
    echo -e "${RED}Node.js 18 or later is required. You have $NODE_VERSION${NC}"
    exit 1
  fi
fi

# Check for npm
echo -e "\n${YELLOW}Checking for npm...${NC}"
if ! command -v npm &> /dev/null; then
  echo -e "${RED}npm not found. Please install npm.${NC}"
  exit 1
else
  NPM_VERSION=$(npm -v)
  echo -e "${GREEN}Found npm $NPM_VERSION${NC}"
fi

# Check for FFmpeg
echo -e "\n${YELLOW}Checking for FFmpeg...${NC}"
if ! command -v ffmpeg &> /dev/null; then
  echo -e "${RED}FFmpeg not found.${NC}"
  
  # Offer to install FFmpeg based on platform
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v apt-get &> /dev/null; then
      echo "Attempting to install FFmpeg using apt..."
      sudo apt-get update
      sudo apt-get install -y ffmpeg
    elif command -v yum &> /dev/null; then
      echo "Attempting to install FFmpeg using yum..."
      sudo yum install -y ffmpeg
    elif command -v dnf &> /dev/null; then
      echo "Attempting to install FFmpeg using dnf..."
      sudo dnf install -y ffmpeg
    else
      echo -e "${RED}Automatic FFmpeg installation not supported for your distribution.${NC}"
      echo "Please install FFmpeg manually and run this script again."
      exit 1
    fi
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew &> /dev/null; then
      echo "Attempting to install FFmpeg using Homebrew..."
      brew install ffmpeg
    else
      echo -e "${RED}Homebrew not found. Cannot automatically install FFmpeg.${NC}"
      echo "Please install Homebrew (https://brew.sh/) first, or install FFmpeg manually."
      exit 1
    fi
  else
    echo -e "${RED}Please install FFmpeg manually for your platform.${NC}"
    exit 1
  fi
else
  FFMPEG_VERSION=$(ffmpeg -version | head -n1)
  echo -e "${GREEN}Found $FFMPEG_VERSION${NC}"
fi

# Install dependencies
echo -e "\n${YELLOW}Installing Node.js dependencies...${NC}"
npm install
cd server && npm install && cd ..

# Create necessary directories
echo -e "\n${YELLOW}Creating necessary directories...${NC}"
mkdir -p server/data/media
mkdir -p server/data/thumbnails
mkdir -p server/data/cache
mkdir -p server/logs

# Run setup script
echo -e "\n${YELLOW}Running SELO Media Server setup...${NC}"
node scripts/setup.js

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}SELO Media Server has been successfully installed!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "\n${YELLOW}To start the server:${NC}"
echo -e "  npm start"
echo -e "\n${YELLOW}To start in development mode:${NC}"
echo -e "  npm run dev"
echo -e "\n${YELLOW}For more information, see the documentation in the docs/ folder.${NC}"
