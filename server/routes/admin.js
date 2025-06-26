const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { logger } = require('../utils/Logger');

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

// Temporarily comment out authentication for testing purposes
// TODO: Uncomment this when authentication system is fully integrated
// router.use(isAuthenticated, isAdmin);

// Get server statistics
router.get('/stats', (req, res) => {
  // In a real implementation, this would pull system resource info
  const stats = {
    cpu: Math.floor(Math.random() * 100),
    memory: {
      total: 16384,
      used: Math.floor(Math.random() * 8192)
    },
    disk: {
      total: 1024000,
      used: Math.floor(Math.random() * 512000)
    },
    activeUsers: Math.floor(Math.random() * 20),
    activeStreams: Math.floor(Math.random() * 5)
  };
  
  res.json(stats);
});

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

module.exports = router;
