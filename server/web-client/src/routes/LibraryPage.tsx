import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Chip, Stack, Divider } from '@mui/material';
import { useSnackbar } from 'notistack';
import apiService from '../services/api';
import MediaGrid from '../components/MediaGrid';
import { useWebSocket } from '../contexts/WebSocketContext';
import type { Library, Media } from '../types';

const LibraryPage: React.FC = () => {
  const { libraryId } = useParams<{ libraryId?: string }>();
  const [library, setLibrary] = useState<Library | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { enqueueSnackbar } = useSnackbar();
  const { isConnected } = useWebSocket();
  
  // Define fetch function with useCallback so we can call it from WebSocket events
  const fetchLibraryContent = useCallback(async () => {
    if (!libraryId) {
      setError('Library ID not provided');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await apiService.getLibraryContents(parseInt(libraryId, 10));
      
      if (response.success && response.data) {
        setLibrary(response.data.library);
        setMedia(response.data.media);
      } else {
        setError('Failed to load library content');
      }
    } catch (err) {
      console.error('Error fetching library content:', err);
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, [libraryId]);
  
  // Initial fetch on component mount
  useEffect(() => {
    fetchLibraryContent();
  }, [fetchLibraryContent]);
  
  // Subscribe to WebSocket events for real-time updates
  useEffect(() => {
    if (!isConnected || !libraryId) return;
    
    // Setup event listeners for Socket.IO events
    const handleMediaAdded = (newMedia: Media) => {
      // Only refresh if the media belongs to this library
      if (newMedia.library_id === parseInt(libraryId, 10)) {
        enqueueSnackbar(`New media added: ${newMedia.title}`, { variant: 'info' });
        fetchLibraryContent(); // Refresh library content
      }
    };
    
    const handleMediaUpdated = (updatedMedia: Media) => {
      // Only refresh if the media belongs to this library
      if (updatedMedia.library_id === parseInt(libraryId, 10)) {
        // Update just the specific media item without refetching
        setMedia(prevMedia => {
          return prevMedia.map(item => 
            item.id === updatedMedia.id ? updatedMedia : item
          );
        });
      }
    };
    
    const handleMediaRemoved = (removedMedia: { id: number, library_id: number }) => {
      // Only refresh if the media belongs to this library
      if (removedMedia.library_id === parseInt(libraryId, 10)) {
        enqueueSnackbar('Media removed from library', { variant: 'warning' });
        // Remove the item from the state without refetching
        setMedia(prevMedia => prevMedia.filter(item => item.id !== removedMedia.id));
      }
    };
    
    // Register event listeners
    document.addEventListener('media_added', (e: any) => handleMediaAdded(e.detail));
    document.addEventListener('media_updated', (e: any) => handleMediaUpdated(e.detail));
    document.addEventListener('media_removed', (e: any) => handleMediaRemoved(e.detail));
    
    // Cleanup function
    return () => {
      document.removeEventListener('media_added', (e: any) => handleMediaAdded(e.detail));
      document.removeEventListener('media_updated', (e: any) => handleMediaUpdated(e.detail));
      document.removeEventListener('media_removed', (e: any) => handleMediaRemoved(e.detail));
    };
  }, [isConnected, libraryId, fetchLibraryContent, enqueueSnackbar]);
  
  return (
    <Box sx={{ p: 3 }}>
      {error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="error" gutterBottom>
            {error}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please ensure the server is running and the library ID is valid
          </Typography>
        </Box>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : library ? (
        <>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom>
              {library.name}
            </Typography>
            <Stack 
              direction="row" 
              spacing={2} 
              divider={<Divider orientation="vertical" flexItem />} 
              sx={{ mb: 2 }}
            >
              <Typography variant="body2" color="text.secondary">
                {library.path}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {media.length} items
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last scan: {library.last_scan ? new Date(library.last_scan).toLocaleString() : 'Never'}
              </Typography>
            </Stack>
            <Chip 
              label={library.type.toUpperCase()} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          </Box>
          
          {media.length > 0 ? (
            <MediaGrid 
              media={media} 
              isLoading={false} 
              libraryType={library.type} 
            />
          ) : (
            <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
              No media found in this library
            </Typography>
          )}
        </>
      ) : (
        <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
          Library not found
        </Typography>
      )}
    </Box>
  );
};

export default LibraryPage;