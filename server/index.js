require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs-extra');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { Logger, logger } = require('./utils/Logger');
const { initDatabase } = require('./config/database');
const mediaScanner = require('./services/MediaScanner');
const StreamManager = require('./services/StreamManager');
const webSocketService = require('./services/WebSocketService');

/**
 * SELO Media Server
 * A Plex-like streaming server for media content
 */
class SELOMediaServer {
  constructor(options = {}) {
    // Set server configuration from .env or parameters
    this.config = {
      port: options.port || process.env.PORT || 32420,
      serverName: options.serverName || process.env.SERVER_NAME || 'SELO Media Server',
      serverId: options.serverId || process.env.SERVER_ID || uuidv4(),
      version: options.version || process.env.VERSION || '1.0.0',
      dataPath: options.dataPath || process.env.DATA_PATH || path.join(__dirname, 'data')
    };

    // Create Express application
    this.app = express();
    
    // Create logger instance
    this.logger = logger;
    
    // Initialize data directories
    this.dataDirectories = {
      thumbnails: path.join(this.config.dataPath, 'thumbnails'),
      streams: path.join(this.config.dataPath, 'streams'),
      cache: path.join(this.config.dataPath, 'cache')
    };
    
    // Track server state
    this.isRunning = false;
    this.startTime = null;
    
    // Store server instances
    this.server = null;
    this.io = null;
    this.streamManager = null;
    
    // Initialize shutdown handlers
    this._registerShutdownHandlers();
  }

  /**
   * Initialize the server
   */
  async initialize() {
    try {
      this.logger.info('Initializing SELO Media Server...');
      
      // Ensure data directories exist
      await this._ensureDirectories();

      // Initialize database
      this.logger.info('Initializing database...');
      const dbInitialized = await initDatabase();
      if (!dbInitialized) {
        throw new Error('Database initialization failed');
      }
      
      // Initialize StreamManager
      this.logger.info('Initializing StreamManager...');
      this.streamManager = new StreamManager();
      
      // Setup middleware
      this._setupMiddleware();
      
      // Setup routes
      this._setupRoutes();
      
      // Initialize media scanner
      this.logger.info('Initializing media scanner...');
      const scannerInitialized = await mediaScanner.initialize();
      if (!scannerInitialized) {
        this.logger.warn('Media scanner initialization failed, continuing anyway');
        // We continue even if scanner fails as this is not critical for basic server functionality
      }
      
      // Initialize WebSocket service with Socket.IO instance from start method
      
      this.logger.info('SELO Media Server initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize SELO Media Server', error);
      return false;
    }
  }

  /**
   * Start the server
   */
  async start() {
    try {
      if (this.isRunning) {
        this.logger.warn('Server is already running');
        return false;
      }
      
      // Ensure server is initialized
      if (!await this.initialize()) {
        throw new Error('Server initialization failed');
      }
      
      return new Promise((resolve) => {
        // Create HTTP server using Express app
        const httpServer = http.createServer(this.app);
        
        // Initialize Socket.IO with CORS support
        this.io = new Server(httpServer, {
          cors: {
            origin: '*', // Allow all origins in development
            methods: ['GET', 'POST']
          }
        });
        
        // Initialize WebSocket service with Socket.IO instance
        webSocketService.initialize(this.io);

        // Set up Socket.IO connection handlers
        this._setupSocketHandlers();
        
        // Start HTTP server
        this.server = httpServer.listen(this.config.port, () => {
          this.isRunning = true;
          this.startTime = new Date();
          
          this.logger.info('');
          this.logger.info('🎬 SELO Media Server Started!');
          this.logger.info(`Server Name: ${this.config.serverName}`);
          this.logger.info(`Server ID: ${this.config.serverId}`);
          this.logger.info(`Version: ${this.config.version}`);
          this.logger.info(`Listening on: http://localhost:${this.config.port}`);
          this.logger.info('');
          
          resolve(true);
        });
      });
    } catch (error) {
      this.logger.error('Failed to start SELO Media Server', error);
      return false;
    }
  }

  /**
   * Gracefully shutdown the server
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down server...');
      
      // Stop media watchers
      mediaScanner.stopWatchers();
      this.logger.info('Media watchers stopped');
      
      // Shut down WebSocket service
      webSocketService.shutdown();
      this.logger.info('WebSocket service shut down');
      
      // Close all active streams if any
      if (this.streamManager) {
        const activeStreams = this.streamManager.getActiveStreams();
        for (const [streamId] of activeStreams) {
          this.streamManager.stopStream(streamId);
        }
        this.logger.info('All active streams stopped.');
      }
      
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(() => {
            this.logger.info('Server connections closed.');
            resolve();
          });
        });
        this.server = null;
      }
      
      this.logger.info('Server shutdown complete.');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }

  /**
   * Ensure required data directories exist
   * @private
   */
  async _ensureDirectories() {
    this.logger.info('Ensuring data directories exist');
    
    for (const [name, dir] of Object.entries(this.dataDirectories)) {
      try {
        await fs.ensureDir(dir);
        this.logger.debug(`Directory ensured: ${name} (${dir})`);
      } catch (error) {
        this.logger.error(`Failed to create directory: ${name} (${dir})`, error);
        throw error;
      }
    }
  }

  /**
   * Setup Express middleware
   * @private
   */
  _setupMiddleware() {
    // Basic middleware setup
    this.app.use(helmet()); // Security headers
    this.app.use(cors());    // CORS support
    this.app.use(compression()); // Response compression
    this.app.use(express.json()); // Parse JSON requests
    this.app.use(express.urlencoded({ extended: true })); // Parse URL-encoded requests
    
    // Serve static files from the React app build
    const webClientDistPath = path.join(__dirname, 'web-client', 'dist');
    this.app.use(express.static(webClientDistPath));
    
    // Request logging
    this.app.use((req, res, next) => {
      this.logger.debug(`${req.method} ${req.url}`);
      next();
    });
  }

  /**
   * Setup server routes
   * @private
   */
  _setupRoutes() {
    this.logger.info('Setting up routes');
    
    // Import API routes
    const libraryRoutes = require('./routes/library');
    const streamRoutes = require('./routes/stream')(this.streamManager); // Initialize with streamManager
    const adminRoutes = require('./routes/admin'); // Admin routes for server management
    const authRoutes = require('./routes/auth'); // Auth routes for login/register

    // Health check endpoint
    this.app.get('/status', (req, res) => {
      const uptime = this.startTime ? Math.floor((new Date() - this.startTime) / 1000) : 0;
      res.json({
        status: 'ok',
        serverName: this.config.serverName,
        version: this.config.version,
        uptime
      });
    });

    // Server identity endpoint (similar to Plex)
    this.app.get('/identity', (req, res) => {
      res.set('Content-Type', 'application/xml');
      res.send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <MediaContainer size="1">
          <Server name="${this.config.serverName}" 
                  identifier="${this.config.serverId}"
                  version="${this.config.version}" />
        </MediaContainer>
      `.trim());
    });

    // API root endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        name: this.config.serverName,
        version: this.config.version,
        id: this.config.serverId,
        endpoints: {
          status: '/status',
          identity: '/identity',
          api: '/api/*'
        }
      });
    });

    // API routes
    this.app.use('/api/library', libraryRoutes);
    this.app.use('/api/stream', streamRoutes);
    this.app.use('/api/admin', adminRoutes); // Mount admin routes
    this.app.use('/api/auth', authRoutes); // Mount auth routes

    // Catch-all route to handle React Router
    // Place this after all API routes but before error handlers
    this.app.get('*', (req, res) => {
      // Send the main index.html file for any client-side routes
      res.sendFile(path.join(__dirname, 'web-client', 'dist', 'index.html'));
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      this.logger.error('Request error', err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
  }

  /**
   * Register process signal handlers for graceful shutdown
   * @private
   */
  _registerShutdownHandlers() {
    const gracefulShutdown = async () => {
      this.logger.info('Received shutdown signal');
      await this.shutdown();
      process.exit(0);
    };
    
    // Handle termination signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', error);
      gracefulShutdown();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      if (reason instanceof Error) {
        this.logger.error('Unhandled rejection:', reason.message, reason.stack);
        console.error('Unhandled rejection:', reason.message, reason.stack);
      } else {
        this.logger.error('Unhandled rejection:', JSON.stringify(reason));
        console.error('Unhandled rejection:', reason);
      }
      gracefulShutdown();
    });
  }
  
  /**
   * Setup Socket.IO handlers for streaming
   * @private
   */
  _setupSocketHandlers() {
    if (!this.io) return;
    
    this.io.on('connection', (socket) => {
      // Basic socket handlers for backward compatibility
      // Main handling is now moved to WebSocketService
      
      // Handle client joining a stream
      socket.on('joinStream', (streamId) => {
        this.logger.info(`Client ${socket.id} joined stream: ${streamId}`);
        socket.join(`stream:${streamId}`);
        
        // Add viewer to stream count
        if (this.streamManager) {
          const viewerCount = this.streamManager.addViewer(streamId);
          
          // Use WebSocketService for broadcasting
          webSocketService.emitViewerJoined(streamId, viewerCount);
        }
      });
      
      // Handle client leaving a stream
      socket.on('leaveStream', (streamId) => {
        this.logger.info(`Client ${socket.id} left stream: ${streamId}`);
        socket.leave(`stream:${streamId}`);
        
        // Remove viewer from stream count
        if (this.streamManager) {
          const viewerCount = this.streamManager.removeViewer(streamId);
          
          // Use WebSocketService for broadcasting
          webSocketService.emitViewerLeft(streamId, viewerCount);
        }
      });
    });
  }
}

// Create and export server instance
const server = new SELOMediaServer();

// Start server if this file is run directly
if (require.main === module) {
  server.start();
}

module.exports = {
  SELOMediaServer,
  server
};
