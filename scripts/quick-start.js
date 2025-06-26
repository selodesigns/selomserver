#!/usr/bin/env node

/**
 * SELO Media Server Quick Start
 * This script provides a one-command setup for SELO Media Server
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const os = require('os');
const chalk = require('chalk');

// Constants
const ROOT_DIR = path.join(__dirname, '..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const DATA_DIR = path.join(SERVER_DIR, 'data');
const DEFAULT_PORT = 32400;
const DEFAULT_MEDIA_PATH = path.join(os.homedir(), 'Videos');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask a question and get user input
 */
function question(query, defaultAnswer) {
  return new Promise((resolve) => {
    const defaultText = defaultAnswer ? ` [${defaultAnswer}]` : '';
    rl.question(`${query}${defaultText}: `, (answer) => {
      resolve(answer.trim() || defaultAnswer);
    });
  });
}

/**
 * Create directory if it doesn't exist
 */
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(chalk.green(`✓ Created directory: ${dir}`));
      return true;
    } catch (err) {
      console.log(chalk.red(`✗ Failed to create directory ${dir}: ${err.message}`));
      return false;
    }
  }
  return true;
}

/**
 * Check if a dependency is installed
 */
function checkDependency(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Run a command with real-time output
 */
function runCommand(command, args, cwd = ROOT_DIR) {
  return new Promise((resolve, reject) => {
    console.log(chalk.yellow(`Running: ${command} ${args.join(' ')}`));
    
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${command}" exited with code ${code}`));
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Create a basic configuration
 */
async function createBasicConfig() {
  const serverPort = await question('Server port', DEFAULT_PORT);
  const mediaPath = await question('Path to your media library', DEFAULT_MEDIA_PATH);
  const serverName = await question('Server name', 'SELO Media Server');
  
  // Create a basic configuration file
  const envPath = path.join(SERVER_DIR, '.env');
  const envContent = `
PORT=${serverPort}
SERVER_NAME=${serverName}
MEDIA_LIBRARY_PATH=${mediaPath}
LOG_LEVEL=info
ENABLE_TRANSCODING=true
JWT_SECRET=${Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)}
`;

  fs.writeFileSync(envPath, envContent.trim());
  console.log(chalk.green('✓ Created basic configuration'));
  
  return { serverPort, mediaPath, serverName };
}

/**
 * Quick start installation
 */
async function quickStart() {
  try {
    console.log(chalk.blue('======================================'));
    console.log(chalk.blue('    SELO Media Server Quick Start    '));
    console.log(chalk.blue('======================================'));
    console.log(chalk.gray('This script will quickly set up SELO Media Server with minimal configuration.'));
    
    // Check for Node.js and npm
    console.log(chalk.yellow('\nChecking dependencies...'));
    if (!checkDependency('node')) {
      console.log(chalk.red('✗ Node.js not found. Please install Node.js 18 or later.'));
      return false;
    }
    
    if (!checkDependency('npm')) {
      console.log(chalk.red('✗ npm not found. Please install npm.'));
      return false;
    }
    
    // Display FFmpeg warning if not found
    if (!checkDependency('ffmpeg')) {
      console.log(chalk.yellow('⚠ FFmpeg not found. Some media functions may not work.'));
      console.log(chalk.gray('  Install FFmpeg for full functionality.'));
    }
    
    // Create required directories
    console.log(chalk.yellow('\nSetting up directories...'));
    ensureDirectoryExists(path.join(DATA_DIR, 'media'));
    ensureDirectoryExists(path.join(DATA_DIR, 'thumbnails'));
    ensureDirectoryExists(path.join(DATA_DIR, 'cache'));
    ensureDirectoryExists(path.join(SERVER_DIR, 'logs'));
    
    // Install dependencies
    console.log(chalk.yellow('\nInstalling dependencies...'));
    try {
      await runCommand('npm', ['install'], ROOT_DIR);
      await runCommand('npm', ['install'], SERVER_DIR);
    } catch (err) {
      console.log(chalk.red(`✗ Failed to install dependencies: ${err.message}`));
      return false;
    }
    
    // Create basic configuration
    console.log(chalk.yellow('\nCreating basic configuration...'));
    const config = await createBasicConfig();
    
    console.log(chalk.green('\n✓ SELO Media Server has been set up successfully!'));
    
    // Ask if user wants to start the server immediately
    const startNow = await question('Do you want to start the server now? (y/n)', 'y');
    if (startNow.toLowerCase() === 'y') {
      console.log(chalk.yellow('\nStarting SELO Media Server...'));
      console.log(chalk.gray(`Server will be available at http://localhost:${config.serverPort}`));
      await runCommand('npm', ['start']);
    } else {
      console.log(chalk.yellow('\nTo start the server, run:'));
      console.log(chalk.gray('  npm start'));
    }
    
    return true;
  } catch (err) {
    console.log(chalk.red(`An error occurred during quick start: ${err.message}`));
    return false;
  } finally {
    rl.close();
  }
}

quickStart().then((success) => {
  if (!success) {
    console.log(chalk.red('\nQuick start failed. Please see errors above.'));
    process.exit(1);
  }
});
