#!/usr/bin/env node

/**
 * SELO Media Server Backup Script
 * 
 * This script creates a backup of the SELO Media Server database,
 * configuration files, and optionally thumbnails and metadata.
 * 
 * Usage:
 *   node backup.js [options]
 * 
 * Options:
 *   --output=PATH       Output directory for backups (default: ./backups)
 *   --include-thumbs    Include thumbnails in backup
 *   --include-cache     Include cache files in backup
 *   --compress=TYPE     Compression type (zip, tar.gz, none) (default: zip)
 *   --retention=DAYS    Number of days to keep backups (default: 7)
 */

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');
const readline = require('readline');
const chalk = require('chalk');
const dateFormat = require('dateformat');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

// Configuration
const config = {
  outputDir: args.output || path.join(__dirname, '..', 'backups'),
  includeThumbnails: args['include-thumbs'] === true,
  includeCache: args['include-cache'] === true,
  compressionType: args.compress || 'zip',
  retentionDays: parseInt(args.retention || '7', 10),
  serverDir: path.join(__dirname, '..', 'server'),
  dataDir: path.join(__dirname, '..', 'server', 'data'),
  configFile: path.join(__dirname, '..', 'server', '.env'),
  databaseFile: path.join(__dirname, '..', 'server', 'data', 'media.db')
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask a question and get user input
 */
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Format current date for filename
 */
function getDateString() {
  return dateFormat(new Date(), 'yyyy-mm-dd_HHMMss');
}

/**
 * Create directory if it doesn't exist
 */
function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(chalk.green(`Created directory: ${dir}`));
  }
}

/**
 * Create a zip archive
 */
function createZipBackup(sourceDirs, targetFile) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(targetFile);
    const archive = archiver(config.compressionType === 'tar.gz' ? 'tar' : 'zip', {
      zlib: { level: 9 },
      gzip: config.compressionType === 'tar.gz'
    });
    
    output.on('close', () => {
      console.log(chalk.green(`✓ Backup archive created: ${targetFile}`));
      console.log(chalk.gray(`  Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`));
      resolve();
    });
    
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.log(chalk.yellow(`Warning: ${err.message}`));
      } else {
        reject(err);
      }
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    
    // Add each source directory/file to the archive
    for (const source of sourceDirs) {
      const { path: sourcePath, type, name } = source;
      
      if (!fs.existsSync(sourcePath)) {
        console.log(chalk.yellow(`Warning: ${sourcePath} does not exist, skipping...`));
        continue;
      }
      
      if (type === 'directory') {
        archive.directory(sourcePath, name);
      } else {
        archive.file(sourcePath, { name });
      }
    }
    
    archive.finalize();
  });
}

/**
 * Clean up old backups based on retention policy
 */
function cleanupOldBackups() {
  if (!fs.existsSync(config.outputDir)) return;
  
  const files = fs.readdirSync(config.outputDir)
    .filter(file => file.startsWith('selo-backup-'))
    .filter(file => file.endsWith('.zip') || file.endsWith('.tar.gz'));
  
  if (files.length === 0) return;
  
  console.log(chalk.yellow('\nChecking for old backups to clean up...'));
  
  const now = new Date();
  const retentionMs = config.retentionDays * 24 * 60 * 60 * 1000;
  
  files.forEach(file => {
    const filePath = path.join(config.outputDir, file);
    const stats = fs.statSync(filePath);
    const fileAge = now - stats.mtime;
    
    if (fileAge > retentionMs) {
      fs.unlinkSync(filePath);
      console.log(chalk.gray(`Removed old backup: ${file}`));
    }
  });
}

/**
 * Check if the database is locked
 */
function isDatabaseLocked() {
  try {
    // Try to open the database in read-write mode
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(config.databaseFile, sqlite3.OPEN_READWRITE);
    db.close();
    return false;
  } catch (err) {
    return true;
  }
}

/**
 * Main backup function
 */
async function runBackup() {
  try {
    console.log(chalk.blue('======================================'));
    console.log(chalk.blue('    SELO Media Server Backup Tool    '));
    console.log(chalk.blue('======================================'));
    
    // Create output directory
    ensureDirExists(config.outputDir);
    
    // Check if server is running
    let serverRunning = false;
    try {
      const lsofOutput = execSync(`lsof -i :32400 -t`).toString().trim();
      serverRunning = lsofOutput.length > 0;
    } catch (e) {
      // lsof not available or no process found, try another method
      try {
        const psOutput = execSync(`ps aux | grep "node.*server" | grep -v grep`).toString().trim();
        serverRunning = psOutput.length > 0;
      } catch (e2) {
        // Couldn't determine if server is running
      }
    }
    
    // Warn if server is running
    if (serverRunning) {
      console.log(chalk.yellow('\n⚠ Warning: SELO Media Server appears to be running.'));
      console.log(chalk.yellow('  For best results, stop the server before backup.'));
      
      const answer = await question('\nContinue with backup anyway? (y/n): ');
      if (answer.toLowerCase() !== 'y') {
        console.log(chalk.gray('\nBackup cancelled.'));
        rl.close();
        return;
      }
    }
    
    // Check if database is locked
    if (serverRunning && isDatabaseLocked()) {
      console.log(chalk.red('\n✗ Error: Database is locked by the running server.'));
      console.log(chalk.red('  Please stop the server before creating a backup.'));
      rl.close();
      return;
    }
    
    console.log(chalk.yellow('\nPreparing backup...'));
    
    // Define backup sources
    const backupSources = [
      { path: config.configFile, type: 'file', name: '.env' },
      { path: config.databaseFile, type: 'file', name: 'data/media.db' }
    ];
    
    // Add user preferences directory
    if (fs.existsSync(path.join(config.dataDir, 'preferences'))) {
      backupSources.push({ 
        path: path.join(config.dataDir, 'preferences'), 
        type: 'directory', 
        name: 'data/preferences' 
      });
    }
    
    // Add metadata if exists
    if (fs.existsSync(path.join(config.dataDir, 'metadata'))) {
      backupSources.push({ 
        path: path.join(config.dataDir, 'metadata'), 
        type: 'directory', 
        name: 'data/metadata' 
      });
    }
    
    // Add thumbnails if requested
    if (config.includeThumbnails && fs.existsSync(path.join(config.dataDir, 'thumbnails'))) {
      backupSources.push({ 
        path: path.join(config.dataDir, 'thumbnails'), 
        type: 'directory', 
        name: 'data/thumbnails' 
      });
    }
    
    // Add cache if requested
    if (config.includeCache && fs.existsSync(path.join(config.dataDir, 'cache'))) {
      backupSources.push({ 
        path: path.join(config.dataDir, 'cache'), 
        type: 'directory', 
        name: 'data/cache' 
      });
    }
    
    console.log(chalk.yellow(`\nBackup will include:`));
    backupSources.forEach(source => {
      console.log(chalk.gray(`- ${source.path} (as ${source.name})`));
    });
    
    // Create filename
    const backupExt = config.compressionType === 'tar.gz' ? '.tar.gz' : '.zip';
    const backupFilename = `selo-backup-${getDateString()}${backupExt}`;
    const backupPath = path.join(config.outputDir, backupFilename);
    
    console.log(chalk.yellow(`\nCreating backup archive: ${backupFilename}`));
    
    // Create the backup
    await createZipBackup(backupSources, backupPath);
    
    // Clean up old backups
    if (config.retentionDays > 0) {
      cleanupOldBackups();
    }
    
    console.log(chalk.green('\n✓ Backup completed successfully!'));
    console.log(chalk.gray(`  Location: ${backupPath}`));
  } catch (err) {
    console.log(chalk.red(`\n✗ Error during backup: ${err.message}`));
    
    if (err.stack) {
      console.log(chalk.gray(`\nStack trace:`));
      console.log(chalk.gray(err.stack));
    }
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the backup
runBackup();
