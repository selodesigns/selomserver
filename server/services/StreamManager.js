/**
 * StreamManager.js
 * 
 * Manages video streaming using FFmpeg for HLS transcoding
 * - Creates HLS playlists and segments
 * - Tracks viewers per stream
 * - Automatically stops streams when no viewers remain
 * - Adjusts transcoding settings based on client capabilities
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
// Import models from the models index to get the initialized Sequelize models
const { Media, Stream, User } = require('../models');
const { logger } = require('../utils/Logger');
const webSocketService = require('./WebSocketService');

class StreamManager {
  constructor() {
    this.activeStreams = new Map(); // Map of active stream processes
    this.viewerCounts = new Map(); // Track viewer count per stream
    this.streamData = new Map(); // Store stream metadata
    this.streamDir = path.join(__dirname, '../data/streams');
    
    // Ensure stream directory exists
    if (!fs.existsSync(this.streamDir)) {
      fs.mkdirSync(this.streamDir, { recursive: true });
    }
    
    // Clean up any leftover stream directories from previous sessions
    this.cleanupOldStreams();
    
    logger.info('StreamManager initialized');
  }
  
  /**
   * Start a new stream for the specified media
   * @param {number} mediaId - The ID of the media to stream
   * @param {number} userId - The ID of the user requesting the stream
   * @param {Object} clientCapabilities - Client device capabilities (resolution, codec support)
   * @returns {Promise<Object>} - Stream information including ID and playlist URL
   */
  async startStream(mediaId, userId, clientCapabilities = {}) {
    try {
      // Find the media in the database
      const media = await Media.findByPk(mediaId);
      if (!media) {
        throw new Error(`Media with ID ${mediaId} not found`);
      }
      
      // Find the user (optional - could be used for authorization)
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      // Generate a unique stream ID and create a directory for this stream
      const streamId = uuidv4();
      const streamOutputPath = path.join(this.streamDir, streamId);
      
      if (!fs.existsSync(streamOutputPath)) {
        fs.mkdirSync(streamOutputPath, { recursive: true });
      }
      
      // Determine transcoding settings based on client and media
      const transcodingSettings = this.getTranscodingSettings(media, clientCapabilities);
      
      // Create stream record in database
      const stream = await Stream.create({
        stream_id: streamId,
        media_id: mediaId,
        user_id: userId,
        status: 'starting',
        started_at: new Date(),
        settings: JSON.stringify(transcodingSettings)
      });
      
      // Start FFmpeg process for HLS transcoding
      const ffmpegProcess = this.startFFmpegProcess(media, streamId, streamOutputPath, transcodingSettings);
      
      // Save stream data
      this.activeStreams.set(streamId, ffmpegProcess);
      this.viewerCounts.set(streamId, 1); // Start with 1 viewer (requester)
      this.streamData.set(streamId, {
        mediaId,
        userId,
        outputPath: streamOutputPath,
        media,
        stream,
        transcodingSettings
      });
      
      // Update stream status in database
      await Stream.update({ status: 'active' }, { 
        where: { id: stream.id }
      });
      
      // Emit stream started event
      webSocketService.emitStreamStarted(stream, media, user);
      
      logger.info(`Stream started for media ${mediaId}, stream ID: ${streamId}`);
      
      return {
        streamId,
        playlistUrl: `/api/stream/${streamId}/playlist.m3u8`,
        status: 'active',
        media
      };
    } catch (error) {
      logger.error(`Error starting stream: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Stop a stream and clean up resources
   * @param {string} streamId - The ID of the stream to stop
   * @returns {Promise<boolean>} - Success indicator
   */
  async stopStream(streamId) {
    try {
      if (!this.activeStreams.has(streamId)) {
        logger.warn(`Attempted to stop non-existent stream ${streamId}`);
        return false;
      }
      
      logger.info(`Stopping stream: ${streamId}`);
      
      // Get the FFmpeg process and kill it
      const ffmpegProcess = this.activeStreams.get(streamId);
      ffmpegProcess.kill('SIGTERM');
      
      // Wait for process to exit
      await new Promise(resolve => {
        ffmpegProcess.on('close', () => {
          resolve();
        });
        
        // Failsafe - force kill after 5 seconds
        setTimeout(() => {
          ffmpegProcess.kill('SIGKILL');
          resolve();
        }, 5000);
      });
      
      // Get stream data
      const streamData = this.streamData.get(streamId);
      
      // Update stream status in database
      const updatedStream = await Stream.findOne({ where: { stream_id: streamId } });
      if (updatedStream) {
        await updatedStream.update({
          status: 'stopped',
          stopped_at: new Date()
        });
        
        // Emit stream stopped event
        webSocketService.emitStreamStopped(updatedStream);
      }
      
      // Clean up resources
      this.activeStreams.delete(streamId);
      this.viewerCounts.delete(streamId);
      this.streamData.delete(streamId);
      
      // Clean up stream directory after a delay
      setTimeout(async () => {
        try {
          const streamDir = path.join(this.streamDir, streamId);
          if (fs.existsSync(streamDir)) {
            await fs.promises.rm(streamDir, { recursive: true, force: true });
            logger.info(`Cleaned up stream directory for ${streamId}`);
          }
        } catch (error) {
          logger.error(`Failed to clean up stream directory for ${streamId}`, error);
        }
      }, 30000); // 30 seconds delay to ensure clients can finish downloading segments
      
      logger.info(`Stream stopped: ${streamId}`);
      return true;
    } catch (error) {
      logger.error(`Error stopping stream ${streamId}: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Add a viewer to a stream
   * @param {string} streamId - Stream ID
   * @returns {number} Updated viewer count
   */
  addViewer(streamId) {
    if (!this.viewerCounts.has(streamId)) {
      this.viewerCounts.set(streamId, 0);
    }
    
    const count = this.viewerCounts.get(streamId) + 1;
    this.viewerCounts.set(streamId, count);
    
    logger.info(`Viewer added to stream ${streamId} - New count: ${count}`);
    
    // Update server stats (active streams/viewers)
    webSocketService.updateServerStats();
    
    return count;
  }
  
  /**
   * Remove a viewer from a stream
   * @param {string} streamId - Stream ID
   * @returns {number} Updated viewer count
   */
  removeViewer(streamId) {
    if (!this.viewerCounts.has(streamId)) {
      logger.warn(`Attempted to remove viewer from unknown stream: ${streamId}`);
      return 0;
    }
    
    const currentCount = this.viewerCounts.get(streamId);
    const newCount = Math.max(0, currentCount - 1);
    this.viewerCounts.set(streamId, newCount);
    
    logger.info(`Viewer removed from stream ${streamId} - New count: ${newCount}`);
    
    // Update server stats (active streams/viewers)
    webSocketService.updateServerStats();
    
    // If no viewers remain, stop the stream after a delay
    if (newCount === 0 && this.activeStreams.has(streamId)) {
      logger.info(`No viewers remaining for stream ${streamId} - Will auto-stop in 60s`);
      
      // Notify that stream will auto-stop soon
      webSocketService.emitServerAnnouncement(
        `Stream "${this.getStreamTitle(streamId)}" will auto-stop in 60 seconds due to no viewers`,
        'warning',
        false
      );
      
      setTimeout(async () => {
        // Double check that there are still no viewers before stopping
        if (this.viewerCounts.get(streamId) === 0 && this.activeStreams.has(streamId)) {
          logger.info(`Auto-stopping stream with no viewers: ${streamId}`);
          await this.stopStream(streamId);
        }
      }, 60000); // Auto-stop after 60s of no viewers
    }
    
    return newCount;
  }
  
  /**
   * Get stream title for display purposes
   * @private
   */
  getStreamTitle(streamId) {
    if (this.streamData.has(streamId)) {
      const streamData = this.streamData.get(streamId);
      if (streamData && streamData.media) {
        return streamData.media.title || 'Unnamed stream';
      }
    }
    return 'Unnamed stream';
  }
  
  /**
   * Get transcoding settings based on media properties and client capabilities
   * @param {Object} media - Media database object
   * @param {Object} clientCapabilities - Client device capabilities
   * @returns {Object} - Transcoding settings
   */
  getTranscodingSettings(media, clientCapabilities = {}) {
    // Default settings
    const settings = {
      videoCodec: 'libx264',
      videoPreset: 'veryfast',
      videoProfile: 'main',
      videoBitrate: '2000k',
      resolution: '1280x720',
      audioCodec: 'aac',
      audioBitrate: '128k',
      segmentDuration: 4, // HLS segment duration in seconds
      playlistSize: 10     // Number of segments in playlist
    };
    
    // Adjust settings based on media properties (if available)
    if (media.width && media.height) {
      // Keep original resolution if it's smaller than default
      if (media.width <= 1280 && media.height <= 720) {
        settings.resolution = `${media.width}x${media.height}`;
      } 
      // Choose appropriate resolution based on original
      else if (media.height > 1080) {
        settings.resolution = '1920x1080';
        settings.videoBitrate = '4000k';
      }
    }
    
    // Adjust settings based on client capabilities
    if (clientCapabilities.maxResolution) {
      // Parse client's max resolution
      const [clientWidth, clientHeight] = clientCapabilities.maxResolution.split('x').map(Number);
      const [currentWidth, currentHeight] = settings.resolution.split('x').map(Number);
      
      // Downscale if client resolution is smaller
      if (clientHeight < currentHeight) {
        if (clientHeight <= 360) {
          settings.resolution = '640x360';
          settings.videoBitrate = '800k';
        } else if (clientHeight <= 480) {
          settings.resolution = '854x480';
          settings.videoBitrate = '1200k';
        } else if (clientHeight <= 720) {
          settings.resolution = '1280x720';
          settings.videoBitrate = '2000k';
        }
      }
    }
    
    // Adjust based on bandwidth if specified
    if (clientCapabilities.bandwidth) {
      if (clientCapabilities.bandwidth < 2000000) { // Less than 2 Mbps
        settings.resolution = '854x480';
        settings.videoBitrate = '1200k';
      } else if (clientCapabilities.bandwidth < 1000000) { // Less than 1 Mbps
        settings.resolution = '640x360';
        settings.videoBitrate = '800k';
      }
    }
    
    return settings;
  }
  
  /**
   * Start FFmpeg process for HLS transcoding
   * @param {Object} media - Media database object
   * @param {string} streamId - Unique stream identifier
   * @param {string} outputPath - Directory path for HLS output
   * @param {Object} settings - Transcoding settings
   * @returns {ChildProcess} - FFmpeg process
   */
  startFFmpegProcess(media, streamId, outputPath, settings) {
    const inputPath = media.path;
    const outputPlaylist = path.join(outputPath, 'playlist.m3u8');
    
    logger.info(`Starting FFmpeg process for stream ${streamId}`);
    logger.info(`Input: ${inputPath}`);
    logger.info(`Output: ${outputPlaylist}`);
    
    // Build FFmpeg command
    const ffmpegArgs = [
      '-i', inputPath,
      '-c:v', settings.videoCodec || 'libx264',
      '-crf', settings.crf || '23',
      '-preset', settings.preset || 'veryfast',
      '-c:a', settings.audioCodec || 'aac',
      '-b:a', settings.audioBitrate || '128k',
      '-ac', '2',
      '-f', 'hls',
      '-hls_time', '4',
      '-hls_playlist_type', 'event',
      '-hls_segment_filename', path.join(outputPath, 'segment_%03d.ts'),
      outputPlaylist
    ];
    
    // Start FFmpeg process
    logger.info(`Starting FFmpeg with command: ffmpeg ${ffmpegArgs.join(' ')}`);
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
    
    // Track transcoding progress
    let duration = null;
    let currentTime = '00:00:00';
    let lastProgress = 0;
    
    ffmpegProcess.stdout.on('data', (data) => {
      logger.debug(`FFmpeg stdout (Stream ${streamId}): ${data}`);
    });
    
    ffmpegProcess.stderr.on('data', (data) => {
      const output = data.toString();
      logger.debug(`FFmpeg stderr (Stream ${streamId}): ${output}`);
      
      // Extract duration if not already captured
      if (!duration && output.includes('Duration:')) {
        const durationMatch = output.match(/Duration: (\d{2}:\d{2}:\d{2}\.\d{2})/i);
        if (durationMatch && durationMatch[1]) {
          duration = durationMatch[1];
          logger.info(`Stream ${streamId} duration: ${duration}`);
        }
      }
      
      // Extract current time for progress tracking
      const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/i);
      if (timeMatch && timeMatch[1] && duration) {
        currentTime = timeMatch[1];
        
        // Calculate progress percentage
        const durationSecs = this.timeToSeconds(duration);
        const currentSecs = this.timeToSeconds(currentTime);
        const progress = Math.round((currentSecs / durationSecs) * 100);
        
        // Only emit progress updates when significant change happens (every 5%)
        if (progress > lastProgress + 5 || progress === 100) {
          lastProgress = progress;
          webSocketService.emitTranscodeProgress(streamId, progress, currentTime, duration);
        }
      }
    });
    
    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        logger.info(`FFmpeg process for stream ${streamId} completed successfully`);
        // Emit final progress update
        if (duration) {
          webSocketService.emitTranscodeProgress(streamId, 100, duration, duration);
        }
      } else {
        logger.error(`FFmpeg process for stream ${streamId} exited with code ${code}`);
      }
    });
    
    return ffmpegProcess;
  }
  
  /**
   * Clean up stream directory and delete temporary files
   * @param {string} dirPath - Path to stream directory
   */
  cleanupStreamDirectory(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
          const filePath = path.join(dirPath, file);
          fs.unlinkSync(filePath);
        });
        fs.rmdirSync(dirPath);
        logger.info(`Stream directory ${dirPath} cleaned up`);
      }
    } catch (error) {
      logger.error(`Error cleaning up stream directory ${dirPath}: ${error.message}`, error);
    }
  }
  
  /**
   * Clean up any leftover stream directories from previous sessions
   */
  cleanupOldStreams() {
    try {
      // Find and mark all previous active streams as stopped
      Stream.update({ 
        status: 'stopped',
        ended_at: new Date()
      }, { 
        where: { status: { [Op.in]: ['active', 'starting'] } }
      }).then(([count]) => {
        if (count > 0) {
          logger.info(`Marked ${count} previously active streams as stopped`);
        }
      }).catch(err => {
        logger.error(`Error updating previous stream states: ${err.message}`, err);
      });
      
      // Clean up stream directories
      if (fs.existsSync(this.streamDir)) {
        fs.readdirSync(this.streamDir).forEach((dir) => {
          const streamDirPath = path.join(this.streamDir, dir);
          if (fs.statSync(streamDirPath).isDirectory()) {
            this.cleanupStreamDirectory(streamDirPath);
          }
        });
      }
    } catch (error) {
      logger.error(`Error cleaning up old streams: ${error.message}`, error);
    }
  }
  
  /**
   * Get all active streams
   * @returns {Map} - Active streams
   */
  getActiveStreams() {
    return this.streamData;
  }
}

module.exports = StreamManager;
