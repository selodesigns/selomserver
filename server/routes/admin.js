const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logger } = require('../utils/Logger');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const { User, Stream } = require('../models');
const directoriesRouter = require('./admin/directories');
const { adminLimiter } = require('../middleware/rateLimiter');

// In-memory storage for transcoding presets until we add them to the database model
let transcodingPresets = [
  {
    id: 'default-preset',
    name: 'Standard (1080p)',
    description: 'Balanced quality and performance',
    isDefault: true,
    video: {
      codec: 'h264',
      resolution: '1080p',
      bitrate: 5000,
      maxBitrate: 8000,
      framerate: 30,
      preset: 'medium'
    },
    audio: {
      codec: 'aac',
      channels: 2,
      bitrate: 192
    }
  },
  {
    id: 'mobile-preset',
    name: 'Mobile (720p)',
    description: 'Optimized for mobile devices',
    isDefault: false,
    video: {
      codec: 'h264',
      resolution: '720p',
      bitrate: 2500,
      maxBitrate: 4000,
      framerate: 30,
      preset: 'fast'
    },
    audio: {
      codec: 'aac',
      channels: 2,
      bitrate: 128
    }
  }
];

// Apply rate limiting and authentication middleware to all admin routes
router.use(adminLimiter);
router.use(authenticateToken, requireAdmin);

// Get server statistics
router.get('/stats', async (req, res) => {
  try {
    // Get real system statistics
    const stats = await getSystemStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system statistics',
      error: error.message
    });
  }
});

/**
 * Get comprehensive system statistics
 */
async function getSystemStats() {
  const stats = {
    cpu: await getCpuUsage(),
    memory: getMemoryStats(),
    disk: await getDiskStats(),
    activeUsers: await getActiveUsersCount(),
    activeStreams: await getActiveStreamsCount(),
    uptime: getUptimeStats(),
    network: getNetworkStats(),
    system: getSystemInfo()
  };
  
  return stats;
}

/**
 * Get CPU usage percentage
 */
function getCpuUsage() {
  return new Promise((resolve) => {
    const startMeasure = cpuAverage();
    
    setTimeout(() => {
      const endMeasure = cpuAverage();
      const idleDifference = endMeasure.idle - startMeasure.idle;
      const totalDifference = endMeasure.total - startMeasure.total;
      const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
      resolve(Math.max(0, Math.min(100, percentageCPU)));
    }, 1000);
  });
}

/**
 * Helper function to calculate CPU average
 */
function cpuAverage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  return {
    idle: totalIdle / cpus.length,
    total: totalTick / cpus.length
  };
}

/**
 * Get memory statistics
 */
function getMemoryStats() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  return {
    total: Math.round(totalMemory / 1024 / 1024), // Convert to MB
    used: Math.round(usedMemory / 1024 / 1024),   // Convert to MB
    free: Math.round(freeMemory / 1024 / 1024),   // Convert to MB
    percentage: Math.round((usedMemory / totalMemory) * 100)
  };
}

/**
 * Get disk statistics for the application directory
 */
async function getDiskStats() {
  try {
    const appDir = path.resolve(__dirname, '..');
    const stats = await fs.stat(appDir);
    
    // For Unix-like systems, try to get disk usage
    if (process.platform !== 'win32') {
      try {
        const { execSync } = require('child_process');
        const output = execSync(`df -BM '${appDir}'`, { encoding: 'utf8' });
        const lines = output.trim().split('\n');
        
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          const totalMB = parseInt(parts[1].replace('M', ''));
          const usedMB = parseInt(parts[2].replace('M', ''));
          const availableMB = parseInt(parts[3].replace('M', ''));
          
          return {
            total: totalMB,
            used: usedMB,
            free: availableMB,
            percentage: Math.round((usedMB / totalMB) * 100)
          };
        }
      } catch (execError) {
        logger.warn('Could not get disk usage via df command:', execError.message);
      }
    }
    
    // Fallback: return basic info
    return {
      total: 1024000, // 1TB default
      used: 256000,   // 256GB default
      free: 768000,   // 768GB default
      percentage: 25,
      note: 'Disk usage detection not available on this platform'
    };
  } catch (error) {
    logger.warn('Error getting disk stats:', error);
    return {
      total: 0,
      used: 0,
      free: 0,
      percentage: 0,
      error: 'Unable to determine disk usage'
    };
  }
}

/**
 * Get count of active users (users with recent activity)
 */
async function getActiveUsersCount() {
  try {
    // Consider users active if they've had activity in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const activeUsers = await User.count({
      where: {
        last_login: {
          [require('sequelize').Op.gte]: twentyFourHoursAgo
        }
      }
    });
    
    return activeUsers;
  } catch (error) {
    logger.warn('Error getting active users count:', error);
    return 0;
  }
}

/**
 * Get count of active streams
 */
async function getActiveStreamsCount() {
  try {
    const activeStreams = await Stream.count({
      where: {
        status: 'active'
      }
    });
    
    return activeStreams;
  } catch (error) {
    logger.warn('Error getting active streams count:', error);
    return 0;
  }
}

/**
 * Get system uptime statistics
 */
function getUptimeStats() {
  const systemUptime = os.uptime(); // System uptime in seconds
  const processUptime = process.uptime(); // Process uptime in seconds
  
  return {
    system: Math.floor(systemUptime),
    process: Math.floor(processUptime),
    systemFormatted: formatUptime(systemUptime),
    processFormatted: formatUptime(processUptime)
  };
}

/**
 * Get network interface statistics
 */
function getNetworkStats() {
  const interfaces = os.networkInterfaces();
  const stats = [];
  
  for (const [name, addresses] of Object.entries(interfaces)) {
    if (addresses) {
      const ipv4 = addresses.find(addr => addr.family === 'IPv4' && !addr.internal);
      if (ipv4) {
        stats.push({
          interface: name,
          address: ipv4.address,
          netmask: ipv4.netmask,
          mac: ipv4.mac
        });
      }
    }
  }
  
  return stats;
}

/**
 * Get basic system information
 */
function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    nodeVersion: process.version,
    cpuCount: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    loadAverage: os.loadavg()
  };
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : '< 1m';
}

// Get activity logs
router.get('/logs', (req, res) => {
  // This would retrieve actual logs from the logger
  // For now, return sample logs
  const sampleLogs = [
    { id: 1, timestamp: new Date().toISOString(), level: 'info', message: 'User logged in', user: 'admin' },
    { id: 2, timestamp: new Date(Date.now() - 120000).toISOString(), level: 'warn', message: 'Failed login attempt', ip: '192.168.1.10' },
    { id: 3, timestamp: new Date(Date.now() - 300000).toISOString(), level: 'error', message: 'Stream transcode failed', media: 'movie1.mp4' }
  ];
  
  res.json(sampleLogs);
});

// Get all transcoding presets
router.get('/transcoding/presets', (req, res) => {
  res.json(transcodingPresets);
});

// Get a specific transcoding preset
router.get('/transcoding/presets/:id', (req, res) => {
  const preset = transcodingPresets.find(p => p.id === req.params.id);
  
  if (!preset) {
    return res.status(404).json({ message: 'Preset not found' });
  }
  
  res.json(preset);
});

// Create a new transcoding preset
router.post('/transcoding/presets', (req, res) => {
  try {
    const preset = {
      ...req.body,
      id: uuidv4()
    };
    
    // If this is set as default, update all others
    if (preset.isDefault) {
      transcodingPresets = transcodingPresets.map(p => ({
        ...p,
        isDefault: false
      }));
    }
    
    transcodingPresets.push(preset);
    logger.info(`Admin ${req.user.username} created new transcoding preset: ${preset.name}`);
    
    res.status(201).json(preset);
  } catch (error) {
    logger.error('Error creating transcoding preset:', error);
    res.status(500).json({ message: 'Failed to create transcoding preset' });
  }
});

// Update a transcoding preset
router.put('/transcoding/presets/:id', (req, res) => {
  try {
    const presetIndex = transcodingPresets.findIndex(p => p.id === req.params.id);
    
    if (presetIndex === -1) {
      return res.status(404).json({ message: 'Preset not found' });
    }
    
    const updatedPreset = {
      ...req.body,
      id: req.params.id
    };
    
    // If this is set as default, update all others
    if (updatedPreset.isDefault) {
      transcodingPresets = transcodingPresets.map(p => ({
        ...p,
        isDefault: p.id === req.params.id ? true : false
      }));
    }
    
    transcodingPresets[presetIndex] = updatedPreset;
    logger.info(`Admin ${req.user.username} updated transcoding preset: ${updatedPreset.name}`);
    
    res.json(updatedPreset);
  } catch (error) {
    logger.error('Error updating transcoding preset:', error);
    res.status(500).json({ message: 'Failed to update transcoding preset' });
  }
});

// Set a preset as the default
router.put('/transcoding/presets/:id/default', (req, res) => {
  try {
    const presetIndex = transcodingPresets.findIndex(p => p.id === req.params.id);
    
    if (presetIndex === -1) {
      return res.status(404).json({ message: 'Preset not found' });
    }
    
    // Update all presets, setting only the target one as default
    transcodingPresets = transcodingPresets.map(p => ({
      ...p,
      isDefault: p.id === req.params.id
    }));
    
    logger.info(`Admin ${req.user.username} set default transcoding preset: ${transcodingPresets[presetIndex].name}`);
    
    res.json(transcodingPresets[presetIndex]);
  } catch (error) {
    logger.error('Error setting default transcoding preset:', error);
    res.status(500).json({ message: 'Failed to set default transcoding preset' });
  }
});

// Delete a transcoding preset
router.delete('/transcoding/presets/:id', (req, res) => {
  try {
    const presetIndex = transcodingPresets.findIndex(p => p.id === req.params.id);
    
    if (presetIndex === -1) {
      return res.status(404).json({ message: 'Preset not found' });
    }
    
    const preset = transcodingPresets[presetIndex];
    
    // Don't allow deleting the default preset
    if (preset.isDefault) {
      return res.status(400).json({ 
        message: 'Cannot delete the default preset. Set another preset as default first.' 
      });
    }
    
    transcodingPresets = transcodingPresets.filter(p => p.id !== req.params.id);
    logger.info(`Admin ${req.user.username} deleted transcoding preset: ${preset.name}`);
    
    res.status(200).json({ message: 'Preset deleted successfully' });
  } catch (error) {
    logger.error('Error deleting transcoding preset:', error);
    res.status(500).json({ message: 'Failed to delete transcoding preset' });
  }
});

// Use the directories router
router.use(directoriesRouter);

module.exports = router;
