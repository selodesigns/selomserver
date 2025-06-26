/**
 * SELO Media Server - Startup Validator
 * 
 * This utility runs validation checks during server startup to ensure
 * that all required directories exist with proper permissions, 
 * dependencies are available, and the configuration is valid.
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { checkFFmpegCapabilities } = require('./ffmpeg-checker');
const { getDBStatus } = require('./database');
const { checkMediaLibraryAccess } = require('./media-library');
const logger = require('./logger');

/**
 * Core validation class for SELO Media Server startup checks
 */
class StartupValidator {
  constructor(app) {
    this.app = app;
    this.requiredDirs = [
      { path: process.env.MEDIA_LIBRARY_PATH || path.join(process.cwd(), 'data', 'media'), name: 'Media Library' },
      { path: process.env.THUMBNAIL_PATH || path.join(process.cwd(), 'data', 'thumbnails'), name: 'Thumbnails' },
      { path: process.env.CACHE_PATH || path.join(process.cwd(), 'data', 'cache'), name: 'Cache' },
      { path: process.env.LOG_DIR || path.join(process.cwd(), 'logs'), name: 'Logs' },
      { path: path.join(process.cwd(), 'data', 'preferences'), name: 'Preferences' },
      { path: path.join(process.cwd(), 'data', 'metadata'), name: 'Metadata' }
    ];
    this.results = {
      directories: {},
      database: null,
      ffmpeg: null,
      mediaLibrary: null,
      config: null,
      passed: false,
      criticalErrors: [],
      warnings: []
    };
  }

  /**
   * Run all startup validation checks
   * @returns {Promise<Object>} Validation results
   */
  async validateAll() {
    console.log(chalk.blue('\n===== SELO Media Server Startup Validation ====='));

    try {
      await this.validateDirectories();
      await this.validateDatabase();
      await this.validateFFmpeg();
      await this.validateMediaLibrary();
      await this.validateConfiguration();

      // Determine overall success/failure
      this.results.passed = this.results.criticalErrors.length === 0;
      
      // Summary
      if (this.results.passed) {
        console.log(chalk.green('\n✓ Validation passed successfully!'));
        if (this.results.warnings.length > 0) {
          console.log(chalk.yellow(`  ${this.results.warnings.length} warning(s) found:`));
          this.results.warnings.forEach(warning => {
            console.log(chalk.yellow(`  • ${warning}`));
          });
        }
      } else {
        console.log(chalk.red(`\n✗ Validation failed with ${this.results.criticalErrors.length} critical error(s):`));
        this.results.criticalErrors.forEach(error => {
          console.log(chalk.red(`  • ${error}`));
        });
        console.log(chalk.red('\nPlease fix these issues before starting the server.'));
      }

      logger.info('Startup validation completed', { 
        passed: this.results.passed,
        criticalErrors: this.results.criticalErrors.length,
        warnings: this.results.warnings.length
      });
      
      return this.results;
    } catch (error) {
      console.log(chalk.red(`\n✗ Validation process failed: ${error.message}`));
      logger.error('Startup validation failed unexpectedly', { error: error.message });
      
      this.results.criticalErrors.push(`Unexpected validation error: ${error.message}`);
      this.results.passed = false;
      return this.results;
    }
  }

  /**
   * Validate required directories exist with proper permissions
   * @returns {Promise<void>}
   */
  async validateDirectories() {
    console.log(chalk.cyan('\n[1/5] Checking required directories...'));
    
    for (const dir of this.requiredDirs) {
      const dirExists = await fs.pathExists(dir.path);
      
      if (!dirExists) {
        console.log(chalk.yellow(`  • Creating missing ${dir.name} directory: ${dir.path}`));
        try {
          await fs.ensureDir(dir.path);
          console.log(chalk.green(`    ✓ Created successfully`));
          
          this.results.directories[dir.name] = {
            path: dir.path,
            exists: true,
            created: true,
            writable: true,
            readable: true
          };
        } catch (error) {
          console.log(chalk.red(`    ✗ Failed to create directory: ${error.message}`));
          this.results.directories[dir.name] = {
            path: dir.path,
            exists: false,
            error: error.message
          };
          
          if (dir.name === 'Media Library' || dir.name === 'Thumbnails' || dir.name === 'Logs') {
            this.results.criticalErrors.push(`Could not create required ${dir.name} directory: ${error.message}`);
          } else {
            this.results.warnings.push(`Could not create ${dir.name} directory: ${error.message}`);
          }
          continue;
        }
      } else {
        console.log(chalk.cyan(`  • Checking ${dir.name} directory: ${dir.path}`));
        this.results.directories[dir.name] = {
          path: dir.path,
          exists: true,
          created: false
        };
      }
      
      // Check read permissions
      try {
        await fs.access(dir.path, fs.constants.R_OK);
        this.results.directories[dir.name].readable = true;
      } catch (error) {
        console.log(chalk.red(`    ✗ Directory is not readable: ${error.message}`));
        this.results.directories[dir.name].readable = false;
        this.results.criticalErrors.push(`${dir.name} directory is not readable: ${error.message}`);
        continue;
      }
      
      // Check write permissions
      try {
        await fs.access(dir.path, fs.constants.W_OK);
        this.results.directories[dir.name].writable = true;
        console.log(chalk.green(`    ✓ Directory exists and is readable/writable`));
      } catch (error) {
        console.log(chalk.yellow(`    ⚠ Directory is read-only: ${error.message}`));
        this.results.directories[dir.name].writable = false;
        
        if (dir.name === 'Media Library') {
          this.results.warnings.push(`Media Library is read-only. This will disable editing/organizing features.`);
        } else if (dir.name === 'Thumbnails' || dir.name === 'Cache' || dir.name === 'Logs') {
          this.results.criticalErrors.push(`${dir.name} directory must be writable: ${error.message}`);
        } else {
          this.results.warnings.push(`${dir.name} directory is read-only: ${error.message}`);
        }
      }
    }
  }

  /**
   * Validate database connectivity and migration status
   * @returns {Promise<void>}
   */
  async validateDatabase() {
    console.log(chalk.cyan('\n[2/5] Checking database connectivity...'));
    
    try {
      const dbStatus = await getDBStatus(true);
      this.results.database = dbStatus;
      
      if (dbStatus.connected) {
        console.log(chalk.green(`  ✓ Successfully connected to ${dbStatus.type} database`));
        if (dbStatus.schemaVersion !== undefined) {
          console.log(chalk.cyan(`    • Schema version: ${dbStatus.schemaVersion}`));
        }
      } else {
        console.log(chalk.red(`  ✗ Failed to connect to database: ${dbStatus.error}`));
        this.results.criticalErrors.push(`Database connection failed: ${dbStatus.error}`);
      }
    } catch (error) {
      console.log(chalk.red(`  ✗ Database check failed: ${error.message}`));
      this.results.database = { error: error.message };
      this.results.criticalErrors.push(`Database check failed: ${error.message}`);
    }
  }

  /**
   * Validate FFmpeg is available and working
   * @returns {Promise<void>}
   */
  async validateFFmpeg() {
    console.log(chalk.cyan('\n[3/5] Checking FFmpeg installation...'));
    
    try {
      const ffmpegStatus = await checkFFmpegCapabilities();
      this.results.ffmpeg = ffmpegStatus;
      
      if (ffmpegStatus.available) {
        console.log(chalk.green(`  ✓ FFmpeg ${ffmpegStatus.ffmpegVersion} is installed and working`));
        
        // If detailed info is available, check hardware acceleration
        if (ffmpegStatus.hardwareAcceleration) {
          const hwAccel = Object.entries(ffmpegStatus.hardwareAcceleration)
            .filter(([_, supported]) => supported)
            .map(([type]) => type);
            
          if (hwAccel.length > 0) {
            console.log(chalk.green(`    • Hardware acceleration available: ${hwAccel.join(', ')}`));
          } else {
            console.log(chalk.yellow(`    • No hardware acceleration detected. Transcoding will use CPU only.`));
            this.results.warnings.push('No hardware acceleration detected for FFmpeg. Transcoding will be CPU intensive.');
          }
        }
      } else {
        console.log(chalk.red(`  ✗ FFmpeg check failed: ${ffmpegStatus.error}`));
        this.results.criticalErrors.push(`FFmpeg is not available: ${ffmpegStatus.error}`);
      }
    } catch (error) {
      console.log(chalk.red(`  ✗ FFmpeg validation failed: ${error.message}`));
      this.results.ffmpeg = { error: error.message };
      this.results.criticalErrors.push(`FFmpeg validation failed: ${error.message}`);
    }
  }

  /**
   * Validate media library accessibility and structure
   * @returns {Promise<void>}
   */
  async validateMediaLibrary() {
    console.log(chalk.cyan('\n[4/5] Checking media library...'));
    
    try {
      const mediaStatus = await checkMediaLibraryAccess();
      this.results.mediaLibrary = mediaStatus;
      
      if (mediaStatus.accessible) {
        console.log(chalk.green(`  ✓ Media library at ${mediaStatus.path} is accessible`));
        
        if (mediaStatus.isEmpty) {
          console.log(chalk.yellow(`    • Media library appears to be empty. Add media files to begin.`));
          this.results.warnings.push('Media library is empty. Add media files to fully use the server.');
        }
        
        if (mediaStatus.readable && !mediaStatus.writable) {
          console.log(chalk.yellow(`    • Media library is read-only. Editing/organizing features will be disabled.`));
          this.results.warnings.push('Media library is read-only. Some features will be limited.');
        }
      } else {
        console.log(chalk.red(`  ✗ Media library is not accessible: ${mediaStatus.error}`));
        this.results.criticalErrors.push(`Media library access failed: ${mediaStatus.error}`);
      }
    } catch (error) {
      console.log(chalk.red(`  ✗ Media library validation failed: ${error.message}`));
      this.results.mediaLibrary = { error: error.message };
      this.results.criticalErrors.push(`Media library validation failed: ${error.message}`);
    }
  }

  /**
   * Validate configuration settings
   * @returns {Promise<void>}
   */
  async validateConfiguration() {
    console.log(chalk.cyan('\n[5/5] Checking configuration...'));
    
    try {
      const config = {
        jwtSecret: !!process.env.JWT_SECRET,
        port: process.env.PORT || 32400,
        host: process.env.HOST || '0.0.0.0',
        environment: process.env.NODE_ENV || 'production',
        mediaLibraryPath: process.env.MEDIA_LIBRARY_PATH,
        thumbnailPath: process.env.THUMBNAIL_PATH,
        cachePath: process.env.CACHE_PATH,
        logDir: process.env.LOG_DIR,
        logLevel: process.env.LOG_LEVEL || 'info',
        enableTranscoding: process.env.ENABLE_TRANSCODING !== 'false',
        enableHls: process.env.ENABLE_HLS !== 'false',
        enableHttps: process.env.ENABLE_HTTPS === 'true'
      };
      
      this.results.config = config;
      
      // Check for critical configuration issues
      const criticalIssues = [];
      
      // JWT Secret should be set
      if (!config.jwtSecret) {
        console.log(chalk.red(`  ✗ JWT_SECRET is not set. Authentication will be insecure.`));
        criticalIssues.push('JWT_SECRET environment variable is not set');
        this.results.criticalErrors.push('JWT_SECRET environment variable is not set. Set a secure random string.');
      } else {
        console.log(chalk.green(`  ✓ JWT_SECRET is configured`));
      }
      
      // If HTTPS is enabled, check for certificates
      if (config.enableHttps) {
        const sslKey = process.env.SSL_KEY;
        const sslCert = process.env.SSL_CERT;
        
        if (!sslKey || !sslCert) {
          console.log(chalk.red(`  ✗ HTTPS is enabled but SSL certificate paths are not configured correctly`));
          criticalIssues.push('HTTPS enabled but certificates not configured');
          this.results.criticalErrors.push('HTTPS is enabled but SSL_KEY or SSL_CERT is missing');
        } else {
          const keyExists = await fs.pathExists(sslKey);
          const certExists = await fs.pathExists(sslCert);
          
          if (!keyExists || !certExists) {
            console.log(chalk.red(`  ✗ SSL certificate files not found at configured paths`));
            criticalIssues.push('SSL certificate files not found');
            this.results.criticalErrors.push('SSL certificate files not found at configured paths');
          } else {
            console.log(chalk.green(`  ✓ SSL certificates found`));
          }
        }
      }
      
      // General configuration summary
      console.log(chalk.cyan(`  • Server will run at ${config.host}:${config.port} in ${config.environment} mode`));
      console.log(chalk.cyan(`  • Transcoding: ${config.enableTranscoding ? 'Enabled' : 'Disabled'}`));
      console.log(chalk.cyan(`  • HLS Streaming: ${config.enableHls ? 'Enabled' : 'Disabled'}`));
      console.log(chalk.cyan(`  • HTTPS: ${config.enableHttps ? 'Enabled' : 'Disabled'}`));
      
      if (criticalIssues.length === 0) {
        console.log(chalk.green(`  ✓ Configuration validation passed`));
      }
    } catch (error) {
      console.log(chalk.red(`  ✗ Configuration validation failed: ${error.message}`));
      this.results.config = { error: error.message };
      this.results.criticalErrors.push(`Configuration validation failed: ${error.message}`);
    }
  }
}

module.exports = StartupValidator;
