/**
 * WebSocketService.js
 * 
 * Manages WebSocket connections and real-time events using Socket.IO
 * - Broadcasts server events to clients
 * - Handles real-time updates for libraries, media, streams
 * - Monitors server health and resource usage
 * - Tracks user activity and provides notifications
 */

const os = require('os');
const { EventEmitter } = require('events');
const { logger } = require('../utils/Logger');

class WebSocketService extends EventEmitter {
  constructor() {
    super();
    this.io = null;
    this.connectedClients = new Map();
    this.serverStats = {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      activeStreams: 0,
      activeUsers: 0,
      uptime: 0,
    };
    
    // Performance monitoring interval
    this.statsInterval = null;
    
    logger.info('WebSocketService initialized');
  }
  
  /**
   * Initialize with a Socket.IO server instance
   * @param {SocketIO.Server} io - Socket.IO server instance
   */
  initialize(io) {
    if (!io) {
      throw new Error('Socket.IO instance is required');
    }
    
    this.io = io;
    this.setupEventHandlers();
    this.startStatsMonitoring();
    
    logger.info('WebSocketService initialized with Socket.IO');
    return true;
  }

  /**
   * Set up Socket.IO connection and event handlers
   */
  setupEventHandlers() {
    if (!this.io) return;
    
    this.io.on('connection', (socket) => {
      // Handle new connection
      const clientInfo = {
        id: socket.id,
        user: socket.handshake.auth.userId ? { id: socket.handshake.auth.userId } : null,
        connectedAt: new Date(),
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'],
      };
      
      this.connectedClients.set(socket.id, clientInfo);
      
      logger.info(`WebSocket client connected: ${socket.id} ${clientInfo.user ? `(User: ${clientInfo.user.id})` : ''}`);
      
      // Update active users count
      this.serverStats.activeUsers = this.getAuthenticatedUsers().length;
      this.broadcastServerStats();
      
      // Send server status immediately to new client
      socket.emit('server_status', { status: 'online', ...this.serverStats });
      
      // Admin user connected - notify admins only
      if (clientInfo.user && this.isAdminUser(clientInfo.user.id)) {
        this.emitToAdmins('user_activity', {
          type: 'admin_connected',
          userId: clientInfo.user.id,
          timestamp: new Date(),
        });
      }
      
      // Handle general events
      socket.on('ping_server', (callback) => {
        if (typeof callback === 'function') {
          callback({ pong: true, timestamp: new Date() });
        }
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        const client = this.connectedClients.get(socket.id);
        if (client && client.user) {
          // Notify admins if authenticated user disconnected
          this.emitToAdmins('user_activity', {
            type: 'user_disconnected',
            userId: client.user.id,
            timestamp: new Date(),
          });
        }
        
        this.connectedClients.delete(socket.id);
        logger.info(`WebSocket client disconnected: ${socket.id}`);
        
        // Update active users count
        this.serverStats.activeUsers = this.getAuthenticatedUsers().length;
        this.broadcastServerStats();
      });
    });
  }
  
  /**
   * Start monitoring server statistics
   */
  startStatsMonitoring() {
    // Stop any existing interval
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    
    // Update stats every 5 seconds
    this.statsInterval = setInterval(async () => {
      await this.updateServerStats();
      this.broadcastServerStats();
    }, 5000);
  }
  
  /**
   * Update server statistics
   */
  async updateServerStats() {
    try {
      // Calculate CPU usage
      const cpus = os.cpus();
      const cpuCount = cpus.length;
      const totalCpuUsage = cpus.reduce((total, cpu) => {
        const total_cpu_time = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle_time = cpu.times.idle;
        return total + ((total_cpu_time - idle_time) / total_cpu_time);
      }, 0);
      
      // Calculate memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memPercent = (usedMem / totalMem) * 100;
      
      // Update server stats
      this.serverStats = {
        cpuUsage: (totalCpuUsage / cpuCount) * 100,
        memoryUsage: memPercent,
        diskUsage: await this.getDiskUsage(),
        activeStreams: this.getActiveStreamCount(),
        activeUsers: this.getAuthenticatedUsers().length,
        uptime: process.uptime(),
      };
    } catch (error) {
      logger.error('Error updating server stats', error);
    }
  }
  
  /**
   * Get disk usage of the server
   * @returns {Promise<number>} - Disk usage percentage
   */
  async getDiskUsage() {
    // This is a placeholder - you'd need to use a library like 'diskusage'
    // or run a command to get actual disk usage
    return 0;
  }
  
  /**
   * Get count of active streams
   * @returns {number} - Active stream count
   */
  getActiveStreamCount() {
    // This should be linked to your StreamManager
    return 0;
  }
  
  /**
   * Get authenticated users
   * @returns {Array} - List of authenticated user clients
   */
  getAuthenticatedUsers() {
    return Array.from(this.connectedClients.values())
      .filter(client => client.user !== null);
  }
  
  /**
   * Check if user is admin
   * @param {number} userId - User ID to check
   * @returns {boolean} - True if user is admin
   */
  isAdminUser(userId) {
    // This should check against your database
    return false;
  }
  
  /**
   * Broadcast server stats to all clients
   */
  broadcastServerStats() {
    if (!this.io) return;
    
    this.io.emit('server_stats', this.serverStats);
  }
  
  /**
   * Emit event only to admin users
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emitToAdmins(event, data) {
    if (!this.io) return;
    
    const adminSockets = Array.from(this.connectedClients.entries())
      .filter(([_, client]) => client.user && this.isAdminUser(client.user.id))
      .map(([socketId]) => socketId);
    
    adminSockets.forEach(socketId => {
      this.io.to(socketId).emit(event, data);
    });
  }
  
  /**
   * Emit event to all authenticated users
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emitToAuthenticatedUsers(event, data) {
    if (!this.io) return;
    
    const userSockets = Array.from(this.connectedClients.entries())
      .filter(([_, client]) => client.user !== null)
      .map(([socketId]) => socketId);
    
    userSockets.forEach(socketId => {
      this.io.to(socketId).emit(event, data);
    });
  }
  
  /**
   * Emit media added event
   * @param {Object} media - New media object
   */
  emitMediaAdded(media) {
    if (!this.io) return;
    
    this.io.emit('media_added', {
      id: media.id,
      title: media.title,
      type: media.type,
      libraryId: media.library_id,
      thumbnail: media.thumbnail_url,
      timestamp: new Date(),
    });
    
    logger.debug(`Emitted media_added event for media ${media.id}`);
  }
  
  /**
   * Emit media removed event
   * @param {Object} media - Removed media object
   */
  emitMediaRemoved(media) {
    if (!this.io) return;
    
    this.io.emit('media_removed', {
      id: media.id,
      title: media.title,
      libraryId: media.library_id,
      timestamp: new Date(),
    });
    
    logger.debug(`Emitted media_removed event for media ${media.id}`);
  }
  
  /**
   * Emit media updated event
   * @param {Object} media - Updated media object
   */
  emitMediaUpdated(media) {
    if (!this.io) return;
    
    this.io.emit('media_updated', {
      id: media.id,
      title: media.title,
      type: media.type,
      libraryId: media.library_id,
      thumbnail: media.thumbnail_url,
      timestamp: new Date(),
    });
    
    logger.debug(`Emitted media_updated event for media ${media.id}`);
  }
  
  /**
   * Emit stream started event
   * @param {Object} stream - Stream object
   * @param {Object} media - Media being streamed
   * @param {Object} user - User who started the stream
   */
  emitStreamStarted(stream, media, user) {
    if (!this.io) return;
    
    // Notify all users
    this.io.emit('stream_started', {
      streamId: stream.stream_id,
      mediaId: media.id,
      mediaTitle: media.title,
      userId: user.id,
      userName: user.name,
      timestamp: new Date(),
    });
    
    logger.debug(`Emitted stream_started event for stream ${stream.stream_id}`);
  }
  
  /**
   * Emit stream stopped event
   * @param {Object} stream - Stream object
   */
  emitStreamStopped(stream) {
    if (!this.io) return;
    
    this.io.emit('stream_stopped', {
      streamId: stream.stream_id,
      timestamp: new Date(),
    });
    
    logger.debug(`Emitted stream_stopped event for stream ${stream.stream_id}`);
  }
  
  /**
   * Emit viewer joined stream event
   * @param {string} streamId - Stream ID
   * @param {number} viewerCount - New viewer count
   */
  emitViewerJoined(streamId, viewerCount) {
    if (!this.io) return;
    
    this.io.to(`stream:${streamId}`).emit('viewer_count', { 
      streamId, 
      count: viewerCount,
      timestamp: new Date(),
    });
    
    logger.debug(`Emitted viewer_count event for stream ${streamId}: ${viewerCount} viewers`);
  }
  
  /**
   * Emit viewer left stream event
   * @param {string} streamId - Stream ID
   * @param {number} viewerCount - New viewer count
   */
  emitViewerLeft(streamId, viewerCount) {
    if (!this.io) return;
    
    this.io.to(`stream:${streamId}`).emit('viewer_count', { 
      streamId, 
      count: viewerCount,
      timestamp: new Date(),
    });
    
    logger.debug(`Emitted viewer_count event for stream ${streamId}: ${viewerCount} viewers`);
  }
  
  /**
   * Emit library scan progress event
   * @param {number} libraryId - Library ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {number} totalFiles - Total files being scanned
   * @param {number} processedFiles - Processed files count
   */
  emitScanProgress(libraryId, progress, totalFiles, processedFiles) {
    if (!this.io) return;
    
    this.io.emit('scan_progress', {
      libraryId,
      progress,
      totalFiles,
      processedFiles,
      timestamp: new Date(),
    });
    
    logger.debug(`Emitted scan_progress event for library ${libraryId}: ${progress}%`);
  }
  
  /**
   * Emit transcode progress event
   * @param {string} streamId - Stream ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} currentTime - Current time in stream
   * @param {string} totalTime - Total time of media
   */
  emitTranscodeProgress(streamId, progress, currentTime, totalTime) {
    if (!this.io) return;
    
    this.io.to(`stream:${streamId}`).emit('transcode_progress', {
      streamId,
      progress,
      currentTime,
      totalTime,
      timestamp: new Date(),
    });
    
    logger.debug(`Emitted transcode_progress event for stream ${streamId}: ${progress}%`);
  }
  
  /**
   * Emit server announcement
   * @param {string} message - Announcement message
   * @param {string} type - Announcement type (info, warning, error)
   * @param {boolean} persistUntilRead - Whether notification should persist until read
   */
  emitServerAnnouncement(message, type = 'info', persistUntilRead = false) {
    if (!this.io) return;
    
    const announcement = {
      id: Date.now().toString(),
      message,
      type,
      persistUntilRead,
      timestamp: new Date(),
    };
    
    this.io.emit('server_announcement', announcement);
    
    logger.info(`Server announcement sent: ${message}`);
  }
  
  /**
   * Clean up and stop WebSocket service
   */
  shutdown() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    
    logger.info('WebSocketService shut down');
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

module.exports = webSocketService;
