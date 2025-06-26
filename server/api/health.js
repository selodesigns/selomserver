/**
 * SELO Media Server - Health Check API
 * Provides endpoints for monitoring server health and diagnostics
 */

const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { checkFFmpegCapabilities } = require('../utils/ffmpeg-checker');
const { getDBStatus } = require('../utils/database');
const { checkMediaLibraryAccess } = require('../utils/media-library');
const { authMiddleware, adminOnlyMiddleware } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route GET /api/health
 * @desc Basic health check endpoint (publicly accessible)
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    // Basic server status check
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
    
    res.json(status);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({ status: 'error', error: 'Health check failed' });
  }
});

/**
 * @route GET /api/health/detailed
 * @desc Detailed health check with system information
 * @access Authenticated
 */
router.get('/detailed', authMiddleware, async (req, res) => {
  try {
    // System information
    const systemInfo = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuCores: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
      freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
      uptime: Math.round(os.uptime() / 3600) + ' hours',
      serverUptime: Math.round(process.uptime() / 3600) + ' hours'
    };
    
    // Basic service checks
    const dbStatus = await getDBStatus();
    
    // Media library check (basic)
    const mediaLibraryStatus = {
      accessible: fs.existsSync(process.env.MEDIA_LIBRARY_PATH || './data/media'),
      path: process.env.MEDIA_LIBRARY_PATH || './data/media'
    };
    
    // Combine all information
    const health = {
      status: dbStatus.connected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      system: systemInfo,
      services: {
        database: dbStatus,
        mediaLibrary: mediaLibraryStatus
      }
    };
    
    res.json(health);
  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message });
    res.status(500).json({ 
      status: 'error', 
      error: 'Detailed health check failed',
      errorDetail: error.message 
    });
  }
});

/**
 * @route GET /api/health/diagnostics
 * @desc Full system diagnostics (admin only)
 * @access Admin
 */
router.get('/diagnostics', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    // Start diagnostic data collection
    const diagnostics = {
      status: 'processing',
      timestamp: new Date().toISOString(),
      system: {},
      services: {},
      storage: {},
      network: {},
      media: {}
    };
    
    // System information
    diagnostics.system = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuInfo: os.cpus()[0].model,
      cpuCores: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemory: Math.round(os.freemem() / (1024 * 1024)),
      loadAverage: os.loadavg(),
      uptime: Math.round(os.uptime() / 3600),
      serverUptime: Math.round(process.uptime() / 3600),
      hostname: os.hostname(),
      osType: os.type(),
      osRelease: os.release()
    };
    
    // Database diagnostics
    diagnostics.services.database = await getDBStatus(true); // true for detailed check
    
    // Directory checks
    const requiredDirs = [
      process.env.MEDIA_LIBRARY_PATH || './data/media',
      process.env.THUMBNAIL_PATH || './data/thumbnails',
      process.env.CACHE_PATH || './data/cache',
      process.env.LOG_DIR || './logs'
    ];
    
    diagnostics.storage.directories = {};
    for (const dir of requiredDirs) {
      try {
        const exists = fs.existsSync(dir);
        const stats = exists ? fs.statSync(dir) : null;
        const writable = exists ? await checkWritePermission(dir) : false;
        
        diagnostics.storage.directories[dir] = {
          exists,
          writable,
          size: exists ? formatBytes(getFolderSize(dir)) : 'N/A',
          permissions: exists ? stats.mode.toString(8).slice(-3) : 'N/A'
        };
      } catch (error) {
        diagnostics.storage.directories[dir] = {
          exists: false,
          error: error.message
        };
      }
    }
    
    // Disk space
    try {
      if (process.platform === 'win32') {
        // Windows disk space check
        const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
        const lines = stdout.trim().split('\r\r\n').slice(1);
        diagnostics.storage.disks = lines
          .filter(line => line.trim() !== '')
          .map(line => {
            const parts = line.trim().split(/\s+/);
            const caption = parts[0];
            const freeSpace = parseInt(parts[1], 10);
            const size = parseInt(parts[2], 10);
            
            return {
              drive: caption,
              total: formatBytes(size),
              free: formatBytes(freeSpace),
              percentFree: ((freeSpace / size) * 100).toFixed(2) + '%'
            };
          });
      } else {
        // Unix disk space check
        const { stdout } = await execAsync('df -h');
        const lines = stdout.trim().split('\n').slice(1);
        diagnostics.storage.disks = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            filesystem: parts[0],
            total: parts[1],
            used: parts[2],
            available: parts[3],
            percentUsed: parts[4],
            mountedOn: parts[5]
          };
        });
      }
    } catch (error) {
      diagnostics.storage.disks = {
        error: error.message
      };
    }
    
    // FFmpeg capabilities
    try {
      diagnostics.media.ffmpeg = await checkFFmpegCapabilities();
    } catch (error) {
      diagnostics.media.ffmpeg = {
        available: false,
        error: error.message
      };
    }
    
    // Media library scan
    try {
      diagnostics.media.library = await checkMediaLibraryAccess(true); // true for detailed scan
    } catch (error) {
      diagnostics.media.library = {
        accessible: false,
        error: error.message
      };
    }
    
    // Network checks
    try {
      diagnostics.network.interfaces = Object.entries(os.networkInterfaces()).map(([name, interfaces]) => {
        return {
          name,
          interfaces: interfaces.map(iface => ({
            address: iface.address,
            netmask: iface.netmask,
            family: iface.family,
            internal: iface.internal,
            mac: iface.mac
          }))
        };
      });
      
      // Check if server is behind proxy
      const xForwardedFor = req.headers['x-forwarded-for'];
      const xRealIp = req.headers['x-real-ip'];
      
      diagnostics.network.proxy = {
        behindProxy: !!(xForwardedFor || xRealIp),
        clientIp: req.ip,
        xForwardedFor,
        xRealIp
      };
    } catch (error) {
      diagnostics.network.error = error.message;
    }
    
    // Current active streams (if any)
    try {
      const streamManager = req.app.get('streamManager');
      if (streamManager) {
        diagnostics.media.activeStreams = streamManager.getActiveStreams();
      } else {
        diagnostics.media.activeStreams = { error: 'Stream manager not available' };
      }
    } catch (error) {
      diagnostics.media.activeStreams = { error: error.message };
    }
    
    // Update final status
    diagnostics.status = 'ok';
    
    // Log successful diagnostic run
    logger.info('System diagnostics completed successfully');
    
    res.json(diagnostics);
  } catch (error) {
    logger.error('System diagnostics failed', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      status: 'error', 
      error: 'System diagnostics failed',
      errorDetail: error.message 
    });
  }
});

/**
 * Check if a directory is writable
 */
async function checkWritePermission(dir) {
  const testFile = path.join(dir, `.test-write-${Date.now()}.tmp`);
  try {
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the size of a folder in bytes
 */
function getFolderSize(directoryPath) {
  let totalSize = 0;
  try {
    const files = fs.readdirSync(directoryPath);
    
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        totalSize += stats.size;
      } else if (stats.isDirectory()) {
        totalSize += getFolderSize(filePath);
      }
    }
  } catch (error) {
    logger.error(`Error calculating folder size for ${directoryPath}`, { error: error.message });
  }
  
  return totalSize;
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;
