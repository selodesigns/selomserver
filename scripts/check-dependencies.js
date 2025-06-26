#!/usr/bin/env node

/**
 * SELO Media Server Dependency Checker
 * This script verifies that all required dependencies are installed and configured correctly
 */

const { execSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const semver = require('semver');

// Define required versions
const REQUIRED_NODE_VERSION = '18.0.0';
const RECOMMENDED_NODE_VERSION = '20.0.0';

console.log(chalk.blue('======================================'));
console.log(chalk.blue('    SELO Media Server Dependency Check   '));
console.log(chalk.blue('======================================'));

let hasErrors = false;
let hasWarnings = false;

/**
 * Check if a command exists by running it
 * @param {string} command - Command to check
 * @returns {boolean} - Whether the command exists
 */
function commandExists(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get version for a command
 * @param {string} command - Command to get version for
 * @param {string} args - Arguments to pass to command
 * @returns {string} - Version string
 */
function getVersion(command, args = '--version') {
  try {
    return execSync(`${command} ${args}`, { encoding: 'utf8' }).toString().trim();
  } catch (e) {
    return null;
  }
}

/**
 * Check Node.js version
 */
function checkNodeVersion() {
  console.log(chalk.yellow('\nChecking Node.js version...'));
  const nodeVersion = process.version;
  
  if (!semver.gte(nodeVersion, REQUIRED_NODE_VERSION)) {
    console.log(chalk.red(`✗ Node.js ${REQUIRED_NODE_VERSION} or later is required. You have ${nodeVersion}`));
    console.log(chalk.gray(`  Please update Node.js: https://nodejs.org/`));
    hasErrors = true;
  } else if (!semver.gte(nodeVersion, RECOMMENDED_NODE_VERSION)) {
    console.log(chalk.yellow(`⚠ Node.js ${nodeVersion} is supported, but ${RECOMMENDED_NODE_VERSION} or later is recommended.`));
    hasWarnings = true;
  } else {
    console.log(chalk.green(`✓ Node.js ${nodeVersion}`));
  }
}

/**
 * Check npm version
 */
function checkNpmVersion() {
  console.log(chalk.yellow('\nChecking npm version...'));
  const npmVersion = getVersion('npm');
  
  if (!npmVersion) {
    console.log(chalk.red('✗ npm is not installed or not in PATH'));
    hasErrors = true;
  } else {
    console.log(chalk.green(`✓ npm ${npmVersion}`));
  }
}

/**
 * Check FFmpeg installation
 */
function checkFFmpeg() {
  console.log(chalk.yellow('\nChecking FFmpeg installation...'));
  
  if (!commandExists('ffmpeg')) {
    console.log(chalk.red('✗ FFmpeg is not installed or not in PATH'));
    console.log(chalk.gray('  FFmpeg is required for media transcoding and thumbnail generation.'));
    
    if (process.platform === 'win32') {
      console.log(chalk.gray('  For Windows, download from: https://ffmpeg.org/download.html#build-windows'));
      console.log(chalk.gray('  Or install with Chocolatey: choco install ffmpeg -y'));
    } else if (process.platform === 'darwin') {
      console.log(chalk.gray('  For macOS, install with Homebrew: brew install ffmpeg'));
    } else {
      console.log(chalk.gray('  For Linux, install using your package manager, e.g.:'));
      console.log(chalk.gray('    Ubuntu/Debian: sudo apt-get install ffmpeg'));
      console.log(chalk.gray('    Fedora/CentOS: sudo dnf install ffmpeg'));
    }
    
    hasErrors = true;
  } else {
    const ffmpegVersion = getVersion('ffmpeg', '-version').split('\n')[0];
    console.log(chalk.green(`✓ ${ffmpegVersion}`));
  }
}

/**
 * Check directory permissions
 */
function checkDirectories() {
  console.log(chalk.yellow('\nChecking directory permissions...'));
  
  const requiredDirs = [
    { path: path.join(__dirname, '..', 'server', 'data'), name: 'Data directory' },
    { path: path.join(__dirname, '..', 'server', 'logs'), name: 'Logs directory' }
  ];
  
  for (const dir of requiredDirs) {
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir.path)) {
      try {
        fs.mkdirSync(dir.path, { recursive: true });
        console.log(chalk.green(`✓ Created: ${dir.name} (${dir.path})`));
      } catch (err) {
        console.log(chalk.red(`✗ Failed to create: ${dir.name} (${dir.path})`));
        console.log(chalk.gray(`  Error: ${err.message}`));
        hasErrors = true;
        continue;
      }
    }
    
    // Check write permissions
    try {
      const testFile = path.join(dir.path, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(chalk.green(`✓ ${dir.name} is writable`));
    } catch (err) {
      console.log(chalk.red(`✗ ${dir.name} is not writable`));
      console.log(chalk.gray(`  Error: ${err.message}`));
      hasErrors = true;
    }
  }
}

/**
 * Check environment configuration
 */
function checkEnvironmentConfig() {
  console.log(chalk.yellow('\nChecking environment configuration...'));
  
  const envPath = path.join(__dirname, '..', 'server', '.env');
  if (!fs.existsSync(envPath)) {
    console.log(chalk.yellow('⚠ .env file not found'));
    console.log(chalk.gray('  Run the setup script to create a configuration file:'));
    console.log(chalk.gray('  npm run setup'));
    hasWarnings = true;
  } else {
    console.log(chalk.green('✓ Environment configuration file exists'));
  }
}

/**
 * Main function
 */
function main() {
  try {
    checkNodeVersion();
    checkNpmVersion();
    checkFFmpeg();
    checkDirectories();
    checkEnvironmentConfig();
    
    console.log('\n');
    
    if (hasErrors) {
      console.log(chalk.red('✗ Dependency check failed. Please fix the issues above before running SELO Media Server.'));
      process.exit(1);
    } else if (hasWarnings) {
      console.log(chalk.yellow('⚠ Dependency check completed with warnings.'));
    } else {
      console.log(chalk.green('✓ All dependencies are installed and configured correctly.'));
    }
  } catch (err) {
    console.log(chalk.red(`An error occurred during dependency check: ${err.message}`));
    process.exit(1);
  }
}

main();
