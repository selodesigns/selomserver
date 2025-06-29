import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Box, 
  Skeleton, 
  Chip, 
  IconButton, 
  Dialog, 
  DialogContent,
  Button
} from '@mui/material';
import type { Media } from '../types';
import MovieIcon from '@mui/icons-material/Movie';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PhotoIcon from '@mui/icons-material/Photo';
import TvIcon from '@mui/icons-material/Tv';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloseIcon from '@mui/icons-material/Close';
import VideoPlayer from './VideoPlayer';
import api from '../services/api';

interface MediaGridProps {
  media: Media[];
  isLoading?: boolean;
  libraryType?: string;
  userId?: number; // Optional user ID for streaming
}

// Format file size to human-readable format (KB, MB, GB)
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format duration from seconds to HH:MM:SS
const formatDuration = (seconds: number): string => {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [
    hours > 0 ? hours.toString().padStart(2, '0') : null,
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].filter(Boolean).join(':');
};

// Return appropriate icon based on media type
const getMediaIcon = (type: string, props: any = {}) => {
  switch (type?.toLowerCase()) {
    case 'movie':
      return <MovieIcon {...props} />;
    case 'tv':
    case 'episode':
      return <TvIcon {...props} />;
    case 'music':
      return <MusicNoteIcon {...props} />;
    case 'photo':
      return <PhotoIcon {...props} />;
    default:
      return <MovieIcon {...props} />;
  }
};

const MediaGrid: React.FC<MediaGridProps> = ({ media, isLoading, libraryType = 'movies', userId = 1 }) => {
  // State for controlling the video player dialog
  const [playingMedia, setPlayingMedia] = useState<Media | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  
  // Function to handle play button click
  const handlePlayClick = async (mediaItem: Media) => {
    setPlayingMedia(mediaItem);
    setStreamError(null);
    setIsLoadingStream(true);
    
    try {
      // Basic client capabilities (could be enhanced to detect actual client capabilities)
      const clientCapabilities = {
        maxResolution: '1920x1080',
        bandwidth: 5000000, // 5 Mbps
        supportedCodecs: ['h264', 'aac']
      };
      
      // Request a stream from the server
      const response = await api.post('/api/stream/start', {
        mediaId: mediaItem.id,
        userId: userId,
        clientCapabilities
      });
      
      if (response.data.success && response.data.stream) {
        setStreamId(response.data.stream.streamId);
      } else {
        setStreamError('Failed to start stream: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error starting stream:', error);
      setStreamError('Error starting stream: ' + (error.response?.data?.message || error.message || 'Unknown error'));
    } finally {
      setIsLoadingStream(false);
    }
  };
  
  // Function to close the video player dialog
  const handleClosePlayer = async () => {
    if (streamId) {
      // Try to stop the stream
      try {
        await api.post(`/api/stream/stop/${streamId}`);
      } catch (error) {
        console.error('Error stopping stream:', error);
      }
    }
    
    setPlayingMedia(null);
    setStreamId(null);
  };
  
  // Generate loading skeletons
  const loadingSkeletons = Array(8).fill(0).map((_, index) => (
    <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.33%', lg: '25%' }, p: 1.5 }} key={`skeleton-${index}`}>
      <Card sx={{ height: '100%', width: '100%' }}>
        <Skeleton variant="rectangular" height={180} />
        <CardContent>
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="50%" />
        </CardContent>
      </Card>
    </Box>
  ));

  // Empty state
  if (media.length === 0 && !isLoading) {
    return (
      <Box sx={{ textAlign: 'center', p: 5 }}>
        {getMediaIcon(libraryType)}
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No media found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add some media to your library or trigger a scan
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: -1.5 }}>  
        {isLoading ? loadingSkeletons : (
          media.map((item) => (
            <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.33%', lg: '25%' }, p: 1.5 }} key={item.id}>
              <Card sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ position: 'relative' }}>
                  {item.thumbnailUrl ? (
                    <CardMedia
                      component="img"
                      height="180"
                      image={item.thumbnailUrl}
                      alt={item.title}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 180,
                        backgroundColor: 'grey.800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {getMediaIcon(item.type, { fontSize: 'large' })}
                    </Box>
                  )}
                  
                  {/* Play button overlay */}
                  {(item.type === 'movie' || item.type === 'episode') && (
                    <IconButton 
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          transform: 'translate(-50%, -50%) scale(1.1)'
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onClick={() => handlePlayClick(item)}
                    >
                      <PlayArrowIcon sx={{ fontSize: 40 }} />
                    </IconButton>
                  )}
                </Box>
                
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div" noWrap title={item.title}>
                    {item.title}
                  </Typography>
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {item.duration > 0 && (
                    <Chip 
                      label={formatDuration(item.duration)} 
                      size="small" 
                      variant="outlined" 
                    />
                  )}
                  
                  {item.width && item.height && (
                    <Chip 
                      label={`${item.width}x${item.height}`} 
                      size="small" 
                      variant="outlined" 
                    />
                  )}
                  
                  {item.file_size > 0 && (
                    <Chip 
                      label={formatFileSize(item.file_size)} 
                      size="small" 
                      variant="outlined" 
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))
      )}
      </Box>
      
      {/* Video Player Dialog */}
      <Dialog 
        open={!!playingMedia} 
        onClose={handleClosePlayer} 
        maxWidth="lg" 
        fullWidth
        disableEnforceFocus
        keepMounted={false}
        disablePortal
        PaperProps={{
          sx: { 
            backgroundColor: 'background.paper',
            backgroundImage: 'none'
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton edge="end" color="inherit" onClick={handleClosePlayer}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 0 }}>
          {streamId ? (
            <VideoPlayer 
              streamId={streamId} 
              title={playingMedia?.title} 
              autoPlay={true}
              onError={(error) => setStreamError(`Streaming error: ${error}`)}
            />
          ) : (
            <Box sx={{ 
              height: 400, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              {isLoadingStream ? (
                <>
                  <Skeleton variant="rectangular" width="100%" height={300} />
                  <Typography variant="h6" sx={{ mt: 2 }}>Preparing stream...</Typography>
                </>
              ) : streamError ? (
                <>
                  <Typography variant="h6" color="error" gutterBottom>{streamError}</Typography>
                  <Button variant="contained" onClick={() => handleClosePlayer()}>Close</Button>
                </>
              ) : (
                <Typography variant="h6">Loading...</Typography>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MediaGrid;
