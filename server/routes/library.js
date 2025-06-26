const express = require('express');
const router = express.Router();
const { Library, Media } = require('../models');
const { logger } = require('../utils/Logger');
const path = require('path');
const fs = require('fs-extra');

/**
 * GET /api/library/sections
 * List all libraries
 */
router.get('/sections', async (req, res) => {
  try {
    const libraries = await Library.findAll({
      order: [['name', 'ASC']]
    });
    
    // Get media counts for each library
    const librariesWithCounts = await Promise.all(libraries.map(async library => {
      const count = await Media.count({
        where: { library_id: library.id }
      });
      
      return {
        ...library.get({ plain: true }),
        mediaCount: count
      };
    }));
    
    res.json({
      success: true,
      data: librariesWithCounts
    });
  } catch (error) {
    logger.error('Error fetching libraries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch libraries',
      error: error.message
    });
  }
});

/**
 * GET /api/library/sections/:id/all
 * Get library contents
 */
router.get('/sections/:id/all', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find library with the given ID
    const library = await Library.findByPk(id);
    
    if (!library) {
      return res.status(404).json({
        success: false,
        message: `Library with ID ${id} not found`
      });
    }
    
    // Find all media items in the library
    const mediaItems = await Media.findAll({
      where: { library_id: id },
      order: [['title', 'ASC']]
    });
    
    // Process media items to add thumbnail URLs
    const mediaWithUrls = mediaItems.map(item => {
      const itemData = item.get({ plain: true });
      
      // If there's a thumbnail, create a URL to access it
      if (itemData.thumbnail_path) {
        const thumbnailFilename = path.basename(itemData.thumbnail_path);
        itemData.thumbnailUrl = `/api/media/thumbnail/${thumbnailFilename}`;
      }
      
      return itemData;
    });
    
    res.json({
      success: true,
      data: {
        library,
        mediaCount: mediaItems.length,
        media: mediaWithUrls
      }
    });
  } catch (error) {
    logger.error(`Error fetching library ${req.params.id} contents:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch library contents',
      error: error.message
    });
  }
});

/**
 * POST /api/library/sections
 * Add new library
 */
router.post('/sections', async (req, res) => {
  try {
    const { name, path: libraryPath, type } = req.body;
    
    // Validate required fields
    if (!name || !libraryPath || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, path, and type are required'
      });
    }
    
    // Validate library type
    const validTypes = ['movies', 'tv', 'music'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid library type. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    // Check if directory exists
    if (!fs.existsSync(libraryPath)) {
      return res.status(400).json({
        success: false,
        message: `Library path "${libraryPath}" does not exist`
      });
    }
    
    // Check if library with the same name already exists
    const existingLibrary = await Library.findOne({ where: { name } });
    if (existingLibrary) {
      return res.status(409).json({
        success: false,
        message: `Library with name "${name}" already exists`
      });
    }
    
    // Create new library
    const newLibrary = await Library.create({
      name,
      path: libraryPath,
      type,
      enabled: true
    });
    
    // Start scanning the library in the background
    const mediaScanner = require('../services/MediaScanner');
    mediaScanner.scanLibrary(newLibrary).catch(err => {
      logger.error(`Background scan error for new library ${newLibrary.name}:`, err);
    });
    
    res.status(201).json({
      success: true,
      message: 'Library created successfully. Media scanning has been started.',
      data: newLibrary
    });
  } catch (error) {
    logger.error('Error creating library:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create library',
      error: error.message
    });
  }
});

/**
 * GET /api/library/sections/:id/scan
 * Trigger a scan for a specific library
 */
router.get('/sections/:id/scan', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find library with the given ID
    const library = await Library.findByPk(id);
    
    if (!library) {
      return res.status(404).json({
        success: false,
        message: `Library with ID ${id} not found`
      });
    }
    
    // Start the scan in the background
    const mediaScanner = require('../services/MediaScanner');
    mediaScanner.scanLibrary(library).catch(err => {
      logger.error(`Error scanning library ${library.name}:`, err);
    });
    
    res.json({
      success: true,
      message: `Scan started for library: ${library.name}`
    });
  } catch (error) {
    logger.error(`Error triggering scan for library ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger library scan',
      error: error.message
    });
  }
});

/**
 * GET /api/media/thumbnail/:filename
 * Get a media thumbnail
 */
router.get('/media/thumbnail/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const thumbnailPath = path.join(__dirname, '../data/thumbnails', filename);
    
    // Check if thumbnail exists
    if (!fs.existsSync(thumbnailPath)) {
      return res.status(404).json({
        success: false,
        message: 'Thumbnail not found'
      });
    }
    
    // Send the thumbnail file
    res.sendFile(thumbnailPath);
  } catch (error) {
    logger.error(`Error serving thumbnail ${req.params.filename}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve thumbnail',
      error: error.message
    });
  }
});

module.exports = router;
