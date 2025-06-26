import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSnackbar } from 'notistack';
import { useAuth } from './AuthContext';

// Define types for socket events
export interface ServerStats {
  cpu: number;
  memory: number;
  uptime: number;
  activeStreams: number;
  activeViewers: number;
  totalMedia: number;
  diskUsage: number;
  diskFree: number;
}

export interface ScanProgress {
  libraryId: string;
  progress: number;
  totalFiles: number;
  processedFiles: number;
}

export interface TranscodeProgress {
  streamId: string;
  progress: number;
  currentTime: string;
  duration: string;
}

export interface ServerAnnouncement {
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
}

export interface WebSocketContextType {
  isConnected: boolean;
  serverStats: ServerStats | null;
  activeScans: Map<string, ScanProgress>;
  activeStreams: Map<string, any>;
  recentAnnouncements: ServerAnnouncement[];
  transcodingProgress: Map<string, TranscodeProgress>;
}

// Create context with default values
const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  serverStats: null,
  activeScans: new Map(),
  activeStreams: new Map(),
  recentAnnouncements: [],
  transcodingProgress: new Map(),
});

// Provider component
export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [activeScans, setActiveScans] = useState<Map<string, ScanProgress>>(new Map());
  const [activeStreams, setActiveStreams] = useState<Map<string, any>>(new Map());
  const [recentAnnouncements, setRecentAnnouncements] = useState<ServerAnnouncement[]>([]);
  const [transcodingProgress, setTranscodingProgress] = useState<Map<string, TranscodeProgress>>(new Map());
  
  const { enqueueSnackbar } = useSnackbar();
  const { token } = useAuth();

  // Initialize socket connection
  useEffect(() => {
    // Only connect if we have an auth token
    if (!token) return;

    // Connect to socket.io server
    const newSocket = io('/', {
      auth: {
        token
      }
    });

    // Socket connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to WebSocket server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket server');
    });

    // Server stats updates
    newSocket.on('server_stats', (stats) => {
      setServerStats(stats);
    });

    // Server announcements
    newSocket.on('server_announcement', (announcement) => {
      setRecentAnnouncements(prev => [announcement, ...prev].slice(0, 10));
      
      // Show toast notification
      enqueueSnackbar(announcement.message, { 
        variant: announcement.type,
        autoHideDuration: 5000
      });
    });

    // Library scan progress events
    newSocket.on('scan_progress', (progress: ScanProgress) => {
      setActiveScans(prev => {
        const newMap = new Map(prev);
        newMap.set(progress.libraryId, progress);
        // Remove completed scans after a delay
        if (progress.progress === 100) {
          setTimeout(() => {
            setActiveScans(current => {
              const updatedMap = new Map(current);
              updatedMap.delete(progress.libraryId);
              return updatedMap;
            });
          }, 5000);
        }
        return newMap;
      });
    });

    // Media events (add, update, remove)
    newSocket.on('media_added', (media) => {
      // This will be handled by components that need to refresh their data
      console.log('New media added:', media);
    });

    newSocket.on('media_updated', (media) => {
      // This will be handled by components that need to refresh their data
      console.log('Media updated:', media);
    });

    newSocket.on('media_removed', (media) => {
      // This will be handled by components that need to refresh their data
      console.log('Media removed:', media);
    });

    // Stream events
    newSocket.on('stream_started', (stream) => {
      setActiveStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(stream.id, stream);
        return newMap;
      });
    });

    newSocket.on('stream_stopped', (stream) => {
      setActiveStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(stream.id);
        return newMap;
      });
    });

    // Transcode progress
    newSocket.on('transcode_progress', (progress: TranscodeProgress) => {
      setTranscodingProgress(prev => {
        const newMap = new Map(prev);
        newMap.set(progress.streamId, progress);
        // Clean up completed transcodes after a delay
        if (progress.progress === 100) {
          setTimeout(() => {
            setTranscodingProgress(current => {
              const updatedMap = new Map(current);
              updatedMap.delete(progress.streamId);
              return updatedMap;
            });
          }, 5000);
        }
        return newMap;
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [token, enqueueSnackbar]);

  // Update server stats every 30 seconds
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const intervalId = setInterval(() => {
      socket.emit('get_server_stats');
    }, 30000);
    
    // Initial request
    socket.emit('get_server_stats');
    
    return () => clearInterval(intervalId);
  }, [socket, isConnected]);

  // Create context value object
  const contextValue = {
    isConnected,
    serverStats,
    activeScans,
    activeStreams,
    recentAnnouncements,
    transcodingProgress,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook for accessing the WebSocket context
export const useWebSocket = () => useContext(WebSocketContext);

export default WebSocketContext;
