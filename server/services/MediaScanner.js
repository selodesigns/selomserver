const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');
const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { Library, Media } = require('../models');
const { logger } = require('../utils/Logger');
const webSocketService = require('./WebSocketService');

/**
 * MediaScanner service for scanning libraries, extracting metadata, 
 * generating thumbnails, and watching for file changes
 */
class MediaScanner {
  constructor() {
    this.initialized = false;
    this.watchers = new Map();
    this.supportedVideoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'];
    this.supportedAudioExtensions = ['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a'];
    this.scanningLibraries = new Set();
    this.thumbnailsDir = path.join(__dirname, '../data/thumbnails');
  }

  /**
   * Initialize the media scanner
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      logger.info('Initializing MediaScanner...');
      
      // Ensure thumbnail directory exists
      await fs.ensureDir(this.thumbnailsDir);
      
      // Scan all enabled libraries
      const libraries = await Library.findAll({
        where: { enabled: true }
      });
      
      logger.info(`Found ${libraries.length} enabled libraries to scan`);
      
      for (const library of libraries) {
        await this.scanLibrary(library);
      }

      this.initialized = true;
      logger.info('MediaScanner initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize MediaScanner', error);
      return false;
    }
  }

  /**
   * Scan a specific library
   * @param {Object} library - Library object
   * @returns {Promise<boolean>} Success status
   */
  async scanLibrary(library) {
    try {
      // Check if library is already being scanned
      if (this.scanningLibraries.has(library.id)) {
        logger.info(`Library ${library.name} (${library.id}) is already being scanned, skipping`);
        return false;
      }

      // Set library as scanning
      this.scanningLibraries.add(library.id);
      
      logger.info(`Starting scan for library: ${library.name} (${library.id}) at path: ${library.path}`);
      
      // Check if library path exists
      if (!await fs.pathExists(library.path)) {
        logger.error(`Library path does not exist: ${library.path}`);
        this.scanningLibraries.delete(library.id);
        return false;
      }

      // Get all files in the library directory (recursively)
      const files = await this.getAllMediaFiles(library.path);
      logger.info(`Found ${files.length} media files in library ${library.name}`);
      
      // Emit initial scan progress event
      webSocketService.emitScanProgress(library.id, 0, files.length, 0);
      
      // Process files in batches to avoid memory issues
      const batchSize = 20;
      let processedCount = 0;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await Promise.all(batch.map(file => this.processMediaFile(file, library)));
        
        processedCount += batch.length;
        const progress = Math.round((processedCount / files.length) * 100);
        
        // Emit scan progress event
        webSocketService.emitScanProgress(library.id, progress, files.length, processedCount);
        
        logger.info(`Processed ${Math.min(i + batchSize, files.length)}/${files.length} files in library ${library.name}`);
      }

      // Update last scan time
      await Library.update(
        { last_scan: new Date() },
        { where: { id: library.id } }
      );

      // Setup watcher for this library
      this.setupWatcher(library);
      
      // Remove library from scanning set
      this.scanningLibraries.delete(library.id);
      
      // Emit final scan progress (100%)
      webSocketService.emitScanProgress(library.id, 100, files.length, files.length);
      
      // Emit server announcement for library scan completion
      webSocketService.emitServerAnnouncement(
        `Scan complete: ${library.name} library with ${files.length} files`, 
        'info', 
        false
      );
      
      logger.info(`Completed scan for library: ${library.name}`);
      return true;
    } catch (error) {
      logger.error(`Error scanning library ${library.name}`, error);
      this.scanningLibraries.delete(library.id);
      return false;
    }
  }

  /**
   * Setup a watcher for a library to detect file changes
   * @param {Object} library - Library object
   */
  setupWatcher(library) {
    // Remove existing watcher if any
    if (this.watchers.has(library.id)) {
      this.watchers.get(library.id).close();
      this.watchers.delete(library.id);
    }

    logger.info(`Setting up watcher for library: ${library.name} (${library.id})`);
    
    const watcher = chokidar.watch(library.path, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: true,
      ignored: /(^|[/\\])\../ // Ignore dotfiles
    });
    
    // Handle new and modified files
    watcher.on('add', filePath => this.handleFileChange(filePath, library));
    watcher.on('change', filePath => this.handleFileChange(filePath, library));
    
    // Handle deleted files
    watcher.on('unlink', filePath => this.handleFileDelete(filePath, library));
    
    // Handle watcher errors
    watcher.on('error', error => {
      logger.error(`Watcher error for library ${library.name}`, error);
    });
    
    this.watchers.set(library.id, watcher);
  }

  /**
   * Handle file addition or modification
   * @param {string} filePath - Path to the modified file
   * @param {Object} library - Library object
   */
  async handleFileChange(filePath, library) {
    try {
      logger.info(`File changed: ${filePath} in library ${library.name}`);
      const media = await this.processMediaFile(filePath, library);
      
      if (media) {
        // Check if this was an add or update
        const isNew = media._wasNewRecord;
        
        if (isNew) {
          // Emit media added event
          webSocketService.emitMediaAdded(media);
        } else {
          // Emit media updated event
          webSocketService.emitMediaUpdated(media);
        }
        
        // Send a server announcement for new media
        if (isNew) {
          webSocketService.emitServerAnnouncement(
            `New media added: ${media.title}`,
            'info',
            false
          );
        }
      }
    } catch (error) {
      logger.error(`Error handling file change for ${filePath}`, error);
    }
  }

  /**
   * Handle file deletion
   * @param {string} filePath - Path to the deleted file
   * @param {Object} library - Library object
   */
  async handleFileDelete(filePath, library) {
    try {
      logger.info(`File deleted: ${filePath} in library ${library.name}`);
      
      // Find media in database
      const media = await Media.findOne({
        where: {
          library_id: library.id,
          path: filePath
        }
      });
      
      if (media) {
        // Save media data before deletion for emitting event
        const mediaData = { ...media.get() };
        
        // Delete media from database
        await media.destroy();
        logger.info(`Removed media from database: ${filePath}`);
        
        // Emit media removed event
        webSocketService.emitMediaRemoved(mediaData);
      }
    } catch (error) {
      logger.error(`Error handling file deletion: ${filePath}`, error);
    }
  }

  /**
   * Get all media files in a directory recursively
   * @param {string} dirPath - Directory path
   * @returns {Promise<string[]>} Array of file paths
   */
  async getAllMediaFiles(dirPath) {
    const files = [];
    
    async function walk(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          
          if ([...this.supportedVideoExtensions, ...this.supportedAudioExtensions].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }
    
    await walk.bind(this)(dirPath);
    return files;
  }

  /**
   * Process a single media file
   * @param {string} filePath - Path to the media file
   * @param {Object} library - Library object
   * @returns {Promise<Media|null>} Created/updated Media object or null on failure
   */
  async processMediaFile(filePath, library) {
    try {
      const relativePath = path.relative(library.path, filePath);
      const fileStats = await fs.stat(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      const isVideo = this.supportedVideoExtensions.includes(fileExtension);
      const isAudio = this.supportedAudioExtensions.includes(fileExtension);
      
      if (!isVideo && !isAudio) {
        return null;
      }
      
      // Check if we already have this file in the database
      let media = await Media.findOne({
        where: {
          library_id: library.id,
          relative_path: relativePath
        }
      });

      // If media exists and file hasn't been modified, skip processing
      if (media && new Date(media.file_modified).getTime() >= fileStats.mtime.getTime()) {
        logger.debug(`Skipping unmodified file: ${filePath}`);
        return media;
      }

      // Extract metadata from the media file
      const metadata = await this.extractMetadata(filePath);
      
      if (!metadata) {
        logger.warn(`Failed to extract metadata for ${filePath}`);
        return null;
      }
      
      // Generate thumbnail for video files
      let thumbnailPath = null;
      if (isVideo && metadata.streams.some(s => s.codec_type === 'video')) {
        thumbnailPath = await this.generateThumbnail(filePath, metadata);
      }

      // Determine audio and video codec info
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      
      const mediaData = {
        title: path.basename(filePath, path.extname(filePath)),
        file_path: filePath,
        relative_path: relativePath,
        file_size: fileStats.size,
        duration: metadata.format.duration || 0,
        video_codec: videoStream ? videoStream.codec_name : null,
        audio_codec: audioStream ? audioStream.codec_name : null,
        resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : null,
        thumbnail_path: thumbnailPath,
        library_id: library.id,
        file_modified: fileStats.mtime
      };

      if (media) {
        // Update existing media record
        await media.update(mediaData);
        logger.info(`Updated media record for ${filePath}`);
      } else {
        // Create new media record
        media = await Media.create(mediaData);
        logger.info(`Created new media record for ${filePath}`);
      }
      
      return media;
    } catch (error) {
      logger.error(`Error processing media file: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Extract metadata from a media file using ffprobe
   * @param {string} filePath - Path to the media file
   * @returns {Promise<Object|null>} Metadata object or null on failure
   */
  extractMetadata(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.error(`FFprobe error for ${filePath}:`, err);
          resolve(null);
          return;
        }
        resolve(metadata);
      });
    });
  }

  /**
   * Generate a thumbnail for a video file
   * @param {string} filePath - Path to the video file
   * @param {Object} metadata - Metadata from ffprobe
   * @returns {Promise<string|null>} Path to the thumbnail or null on failure
   */
  async generateThumbnail(filePath, metadata) {
    const fileName = `${path.basename(filePath, path.extname(filePath))}_${uuidv4().slice(0, 8)}`;
    const thumbnailPath = path.join(this.thumbnailsDir, `${fileName}.jpg`);
    
    try {
      // Calculate snapshot time (20% into the video or at 10 seconds, whichever is less)
      const duration = metadata.format.duration || 0;
      let screenshotTime = Math.min(duration * 0.2, 10);
      
      // If video is very short, use the first second
      if (duration < 3) {
        screenshotTime = 0;
      }
      
      return new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .screenshots({
            timestamps: [screenshotTime],
            filename: `${fileName}.jpg`,
            folder: this.thumbnailsDir,
            size: '320x240'
          })
          .on('error', (err) => {
            logger.error(`Error generating thumbnail for ${filePath}:`, err);
            resolve(null);
          })
          .on('end', () => {
            logger.debug(`Generated thumbnail for ${filePath}`);
            resolve(thumbnailPath);
          });
      });
    } catch (error) {
      logger.error(`Error in thumbnail generation for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Add a new library and scan it
   * @param {string} name - Library name
   * @param {string} libraryPath - Library path
   * @param {string} type - Library type (movies, tv, music)
   * @returns {Promise<Library|null>} Created Library object or null on failure
   */
  async addLibrary(name, path, type) {
    try {
      // Validate path exists
      if (!await fs.pathExists(path)) {
        logger.error(`Library path does not exist: ${path}`);
        return null;
      }
      
      // Create library
      const library = await Library.create({
        name,
        path,
        type,
        enabled: true
      });
      
      // Scan the new library
      this.scanLibrary(library);
      
      return library;
    } catch (error) {
      logger.error('Error adding library', error);
      return null;
    }
  }

  /**
   * Stop all directory watchers
   */
  stopWatchers() {
    logger.info('Stopping all media watchers...');
    
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    
    this.watchers.clear();
    logger.info('All media watchers stopped');
  }
}

// Export singleton instance
const mediaScanner = new MediaScanner();
module.exports = mediaScanner;
