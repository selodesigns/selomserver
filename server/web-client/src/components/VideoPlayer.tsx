import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import io from 'socket.io-client';

interface VideoPlayerProps {
  streamId: string;
  title?: string;
  autoPlay?: boolean;
  controlsList?: string;
  onEnded?: () => void;
  onError?: (error: any) => void;
}

/**
 * HLS-based video player component using hls.js
 * Falls back to native HLS support on Safari
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamId,
  title,
  autoPlay = true,
  controlsList = 'nodownload',
  onEnded,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const socketRef = useRef<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(1);
  
  // Build the playlist URL
  const playlistUrl = `/api/stream/${streamId}/playlist.m3u8`;
  
  useEffect(() => {
    let hls: Hls | null = null;
    let reconnectInterval: NodeJS.Timeout | null = null;
    let videoElement = videoRef.current;
    
    // Function to initialize HLS
    const initializeHls = () => {
      if (!videoElement) return;
      
      setLoading(true);
      setError(null);
      
      // Connect to Socket.IO
      if (!socketRef.current) {
        socketRef.current = io();
        
        // Join the stream room
        socketRef.current.emit('joinStream', streamId);
        
        // Listen for viewer count updates
        socketRef.current.on('viewerCount', (data: { streamId: string, count: number }) => {
          if (data.streamId === streamId) {
            setViewerCount(data.count);
          }
        });
      }
      
      // Check if HLS.js is supported
      if (Hls.isSupported()) {
        // Destroy any existing HLS instance
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        
        // Create a new HLS instance
        hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        
        hlsRef.current = hls;
        
        // Bind HLS to video element
        hls.attachMedia(videoElement);
        
        // Handle HLS events
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('HLS: Media attached');
          // Load the playlist
          hls!.loadSource(playlistUrl);
        });
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS: Manifest parsed');
          setLoading(false);
          // Start playback if autoPlay is true
          if (autoPlay && videoElement) {
            videoElement.play().catch((e) => {
              console.error('Autoplay failed:', e);
            });
          }
        });
        
        hls.on(Hls.Events.ERROR, (_event, data) => {
          const { type, details, fatal } = data;
          console.error('HLS error:', type, details, fatal);
          
          if (fatal) {
            switch (type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Try to recover network error
                console.log('Fatal network error... trying to recover');
                hls!.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                // Try to recover media error
                console.log('Fatal media error... trying to recover');
                hls!.recoverMediaError();
                break;
              default:
                // Cannot recover
                setError(`Streaming error: ${details}`);
                if (onError) onError(details);
                break;
            }
          }
        });
      }
      // For Safari which has native HLS support
      else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('Using native HLS support');
        videoElement.src = playlistUrl;
        
        videoElement.addEventListener('loadedmetadata', () => {
          setLoading(false);
          if (autoPlay) {
            videoElement!.play().catch((e) => {
              console.error('Autoplay failed:', e);
            });
          }
        });
        
        videoElement.addEventListener('error', (errorEvent) => {
          console.error('Video error:', errorEvent);
          setError('Error loading video. Please try again.');
          if (onError) onError(errorEvent);
        });
      }
      // HLS not supported at all
      else {
        setError('HLS streaming is not supported in your browser.');
        if (onError) onError('HLS not supported');
      }
    };
    
    // Initialize HLS
    initializeHls();
    
    // Could track playback progress here if needed
    const handleTimeUpdate = () => {
      // Currently not tracking time/duration for UI display
      // Uncomment if progress tracking is added to the UI
      /*
      if (videoElement) {
        const currentTime = videoElement.currentTime;
        const duration = videoElement.duration !== Infinity ? videoElement.duration : 0;
        // Use these values for progress bar or time display
      }
      */
    };
    
    if (videoElement) {
      videoElement.addEventListener('timeupdate', handleTimeUpdate);
      
      // Handle video end
      videoElement.addEventListener('ended', () => {
        if (onEnded) onEnded();
      });
    }
    
    // Clean up
    return () => {
      // Remove event listeners
      if (videoElement) {
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      }
      
      // Clean up HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      // Clear reconnect interval if any
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
      }
      
      // Clean up socket connection
      if (socketRef.current) {
        // Leave the stream room
        socketRef.current.emit('leaveStream', streamId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [streamId, playlistUrl, autoPlay, onEnded, onError]);
  
  return (
    <Box sx={{ 
      width: '100%', 
      position: 'relative',
      bgcolor: 'black',
      borderRadius: 1,
      overflow: 'hidden',
      '& video': {
        width: '100%',
        height: '100%',
        maxHeight: 'calc(100vh - 200px)',
        objectFit: 'contain'
      }
    }}>
      {title && (
        <Box sx={{ 
          position: 'absolute', 
          top: 16, 
          left: 16, 
          right: 16,
          zIndex: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white',
          textShadow: '0 0 4px rgba(0,0,0,0.5)'
        }}>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2">Viewers: {viewerCount}</Typography>
        </Box>
      )}
      
      <video 
        ref={videoRef} 
        controls 
        controlsList={controlsList}
        style={{ backgroundColor: 'black' }}
        poster="/api/media/poster-default.jpg"
      />
      
      {loading && (
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 1
        }}>
          <CircularProgress color="primary" size={60} thickness={4} />
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: 'white', 
              mt: 2 
            }}
          >
            Loading stream...
          </Typography>
        </Box>
      )}
      
      {error && (
        <Box sx={{ position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 2 }}>
          <Alert severity="error" variant="filled">
            {error}
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default VideoPlayer;
