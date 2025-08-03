const express = require('express');
const router = express.Router();
const { Library, Media } = require('../models');
const { logger } = require('../utils/Logger');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs-extra');
const { apiLimiter, searchLimiter, uploadLimiter } = require('../middleware/rateLimiter');

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
router.post('/sections', uploadLimiter, async (req, res) => {
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
router.get('/sections/:id/scan', apiLimiter, async (req, res) => {
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
 * GET /api/library/search
 * Search across all media items in all libraries
 * Query parameters:
 *   - q: search query (required)
 *   - limit: number of results to return (default: 50, max: 200)
 *   - offset: number of results to skip (default: 0)
 *   - type: filter by media type (optional)
 *   - library_id: filter by specific library (optional)
 */
router.get('/search', searchLimiter, async (req, res) => {
  try {
    const { q, limit = 50, offset = 0, type, library_id } = req.query;
    
    // Validate search query
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query (q) is required and must be a non-empty string'
      });
    }
    
    // Validate and sanitize pagination parameters
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);
    
    // Build search conditions
    const searchQuery = q.trim();
    const whereConditions = {
      [Op.or]: [
        { title: { [Op.iLike]: `%${searchQuery}%` } },
        { path: { [Op.iLike]: `%${searchQuery}%` } },
        { director: { [Op.iLike]: `%${searchQuery}%` } },
        { actors: { [Op.iLike]: `%${searchQuery}%` } }
      ]
    };
    
    // Add optional filters
    if (type) {
      whereConditions.type = type;
    }
    
    if (library_id) {
      whereConditions.library_id = library_id;
    }
    
    // Execute search with pagination
    const { count, rows: mediaItems } = await Media.findAndCountAll({
      where: whereConditions,
      include: [{
        model: Library,
        as: 'library',
        attributes: ['id', 'name', 'type']
      }],
      order: [['title', 'ASC']],
      limit: limitNum,
      offset: offsetNum
    });
    
    // Process media items to add thumbnail URLs
    const mediaWithUrls = mediaItems.map(item => {
      const itemData = item.get({ plain: true });
      
      // If there's a thumbnail, create a URL to access it
      if (itemData.thumbnail_path) {
        const thumbnailFilename = path.basename(itemData.thumbnail_path);
        itemData.thumbnail_url = `/api/library/media/thumbnail/${thumbnailFilename}`;
      }
      
      return itemData;
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limitNum);
    const currentPage = Math.floor(offsetNum / limitNum) + 1;
    const hasNextPage = offsetNum + limitNum < count;
    const hasPrevPage = offsetNum > 0;
    
    res.json({
      success: true,
      data: {
        query: searchQuery,
        results: mediaWithUrls,
        pagination: {
          total: count,
          limit: limitNum,
          offset: offsetNum,
          page: currentPage,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      }
    });
    
    logger.info(`Search performed: "${searchQuery}" - ${count} results found`);
  } catch (error) {
    logger.error('Error performing search:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform search',
      error: error.message
    });
  }
});

/**
 * GET /api/library/media/:id
 * Get detailed information for a specific media item
 */
router.get('/media/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate media ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Valid media ID is required'
      });
    }
    
    // Find media item with library information
    const mediaItem = await Media.findByPk(id, {
      include: [{
        model: Library,
        as: 'library',
        attributes: ['id', 'name', 'type', 'path']
      }]
    });
    
    if (!mediaItem) {
      return res.status(404).json({
        success: false,
        message: `Media item with ID ${id} not found`
      });
    }
    
    // Process media item to add thumbnail URL
    const itemData = mediaItem.get({ plain: true });
    
    // If there's a thumbnail, create a URL to access it
    if (itemData.thumbnail_path) {
      const thumbnailFilename = path.basename(itemData.thumbnail_path);
      itemData.thumbnail_url = `/api/library/media/thumbnail/${thumbnailFilename}`;
    }
    
    // Add file existence check
    itemData.file_exists = fs.existsSync(itemData.path);
    
    // Add file stats if file exists
    if (itemData.file_exists) {
      try {
        const stats = fs.statSync(itemData.path);
        itemData.file_size = stats.size;
        itemData.file_modified = stats.mtime;
      } catch (statError) {
        logger.warn(`Could not get file stats for ${itemData.path}:`, statError);
      }
    }
    
    res.json({
      success: true,
      data: itemData
    });
    
    logger.debug(`Media detail fetched for ID ${id}: ${itemData.title}`);
  } catch (error) {
    logger.error(`Error fetching media detail for ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch media details',
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
