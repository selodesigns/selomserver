/**
 * stream.js
 * 
 * Express routes for handling media streaming
 * - Start/stop streams
 * - Serve HLS playlists and segments
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Stream, Media, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/Logger');

// Will be initialized in the exports function
let streamManager;

/**
 * Start a new stream
 * POST /api/stream/start
 * Required body params: mediaId
 * Optional body params: clientCapabilities
 * Authentication: Required (JWT)
 */
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { mediaId, clientCapabilities = {} } = req.body;
    const userId = req.user.id; // Get authenticated user ID from token
    
    if (!mediaId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameter: mediaId is required' 
      });
    }
    
    // Check if media exists
    const media = await Media.findByPk(mediaId);
    if (!media) {
      return res.status(404).json({ 
        success: false, 
        message: `Media with ID ${mediaId} not found` 
      });
    }
    
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: `User with ID ${userId} not found` 
      });
    }
    
    // Start the stream
    const stream = await streamManager.startStream(mediaId, userId, clientCapabilities);
    
    res.status(200).json({
      success: true,
      message: 'Stream started successfully',
      stream
    });
  } catch (error) {
    logger.error(`Error starting stream: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: `Error starting stream: ${error.message}`
    });
  }
});

/**
 * Stop a stream
 * POST /api/stream/stop/:streamId
 * Authentication: Required (JWT)
 */
router.post('/stop/:streamId', authenticateToken, async (req, res) => {
  try {
    const { streamId } = req.params;
    
    if (!streamId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Stream ID is required' 
      });
    }
    
    // Check if stream exists in database
    const stream = await Stream.findOne({ where: { stream_id: streamId } });
    if (!stream) {
      return res.status(404).json({ 
        success: false, 
        message: `Stream with ID ${streamId} not found` 
      });
    }
    
    // Stop the stream
    const result = await streamManager.stopStream(streamId);
    
    if (result) {
      res.status(200).json({
        success: true,
        message: 'Stream stopped successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to stop stream'
      });
    }
  } catch (error) {
    logger.error(`Error stopping stream: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: `Error stopping stream: ${error.message}`
    });
  }
});

/**
 * Serve HLS playlist file
 * GET /api/stream/:streamId/playlist.m3u8
 */
router.get('/:streamId/playlist.m3u8', (req, res) => {
  try {
    const { streamId } = req.params;
    const playlistPath = path.join(__dirname, '../data/streams', streamId, 'playlist.m3u8');
    
    // Check if the playlist file exists
    if (!fs.existsSync(playlistPath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Playlist not found' 
      });
    }
    
    // Set appropriate MIME type for HLS playlist
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    // Allow CORS for the playlist
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Don't cache the playlist file (it's dynamically updated)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Send the playlist file
    res.sendFile(playlistPath);
    
    // Optionally add a viewer (could be based on Socket.IO instead)
    // streamManager.addViewer(streamId);
  } catch (error) {
    logger.error(`Error serving playlist: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: `Error serving playlist: ${error.message}`
    });
  }
});

/**
 * Serve HLS segment file
 * GET /api/stream/:streamId/segment_*.ts
 */
router.get('/:streamId/segment_:segmentNumber.ts', (req, res) => {
  try {
    const { streamId, segmentNumber } = req.params;
    const segmentPath = path.join(__dirname, '../data/streams', streamId, `segment_${segmentNumber}.ts`);
    
    // Check if the segment file exists
    if (!fs.existsSync(segmentPath)) {
      return res.status(404).json({ 
        success: false, 
        message: `Segment ${segmentNumber} not found` 
      });
    }
    
    // Set appropriate MIME type for MPEG-TS segment
    res.setHeader('Content-Type', 'video/mp2t');
    // Allow CORS for the segment
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Cache segments (they don't change once created)
    res.setHeader('Cache-Control', 'max-age=86400');
    
    // Send the segment file
    res.sendFile(segmentPath);
  } catch (error) {
    logger.error(`Error serving segment: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: `Error serving segment: ${error.message}`
    });
  }
});

/**
 * Get active streams information
 * GET /api/stream/active
 * Authentication: Required (JWT)
 */
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const activeStreams = streamManager.getActiveStreams();
    const streamInfo = [];
    
    activeStreams.forEach((data, streamId) => {
      streamInfo.push({
        streamId,
        mediaId: data.mediaId,
        userId: data.userId,
        title: data.media.title,
        viewerCount: streamManager.viewerCounts.get(streamId) || 0,
        startedAt: data.stream.started_at
      });
    });
    
    res.status(200).json({
      success: true,
      activeStreams: streamInfo
    });
  } catch (error) {
    logger.error(`Error getting active streams: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: `Error getting active streams: ${error.message}`
    });
  }
});

/**
 * Initialize router with StreamManager instance
 */
module.exports = (streamManagerInstance) => {
  streamManager = streamManagerInstance;
  return router;
};
