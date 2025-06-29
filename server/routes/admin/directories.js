const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../../utils/Logger');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');

// Endpoint to list directories
router.post('/api/admin/directories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { path: directoryPath } = req.body;

    // Validate path
    if (!directoryPath) {
      return res.status(400).json({ 
        success: false, 
        message: 'Path is required' 
      });
    }

    // Security check - prevent directory traversal attacks
    const normalizedPath = path.normalize(directoryPath).replace(/\\/g, '/');
    if (normalizedPath.includes('..')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid path' 
      });
    }

    logger.debug(`Listing directories in: ${normalizedPath}`);

    try {
      // Get directory listing
      const items = await fs.readdir(normalizedPath);
      
      // Filter to only show directories
      const directories = [];
      
      for (const item of items) {
        try {
          const fullPath = path.join(normalizedPath, item);
          const stats = await fs.stat(fullPath);
          
          if (stats.isDirectory()) {
            directories.push(item);
          }
        } catch (err) {
          // Skip entries we can't access
          logger.debug(`Error accessing entry ${item}: ${err.message}`);
        }
      }
      
      return res.json(directories.sort());
      
    } catch (err) {
      logger.error(`Error listing directories: ${err.message}`);
      return res.status(500).json({ 
        success: false, 
        message: `Error listing directories: ${err.message}` 
      });
    }
  } catch (err) {
    logger.error(`Server error in /directories: ${err.message}`);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
