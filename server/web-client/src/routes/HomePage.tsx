import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Paper, Stack, Fab, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import apiService from '../services/api';
import MediaGrid from '../components/MediaGrid';
import ServerStats from '../components/ServerStats';
import CreateLibraryDialog from '../components/CreateLibraryDialog';
import type { Media } from '../types';

const HomePage: React.FC = () => {
  const [recentlyAdded, setRecentlyAdded] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Now fetches recently added content across all libraries, sorted by date, top 12.
  useEffect(() => {
    const fetchRecentContent = async () => {
      try {
        setLoading(true);
        // Get libraries
        const librariesResponse = await apiService.getLibraries();
        
        if (librariesResponse.success && librariesResponse.data && librariesResponse.data.length > 0) {
          // Fetch media from all libraries in parallel
          const libraryIds = librariesResponse.data.map(lib => lib.id);
          const contentResponses = await Promise.all(libraryIds.map(id => apiService.getLibraryContents(id)));
          let allMedia: Media[] = [];
          for (const response of contentResponses) {
            if (response.success && response.data && Array.isArray(response.data.media)) {
              allMedia = allMedia.concat(response.data.media);
            }
          }
          // Sort all media by created_at (descending)
          const sorted = allMedia.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setRecentlyAdded(sorted.slice(0, 12)); // Show at most 12 items
        }
      } catch (err) {
        console.error('Error fetching recent content:', err);
        setError('Failed to load recent content');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentContent();
  }, []);
  
  // Handle create library dialog
  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  // Refresh content after adding a new library
  const handleLibraryCreated = () => {
    // Re-fetch recent content when a library is created
    const fetchRecentContent = async () => {
      try {
        setLoading(true);
        // Get libraries
        const librariesResponse = await apiService.getLibraries();
        
        if (librariesResponse.success && librariesResponse.data && librariesResponse.data.length > 0) {
          // Fetch media from all libraries in parallel
          const libraryIds = librariesResponse.data.map(lib => lib.id);
          const contentResponses = await Promise.all(libraryIds.map(id => apiService.getLibraryContents(id)));
          let allMedia: Media[] = [];
          for (const response of contentResponses) {
            if (response.success && response.data && Array.isArray(response.data.media)) {
              allMedia = allMedia.concat(response.data.media);
            }
          }
          // Sort all media by created_at (descending)
          const sorted = allMedia.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setRecentlyAdded(sorted.slice(0, 12)); // Show at most 12 items
        }
      } catch (err) {
        console.error('Error fetching recent content:', err);
        setError('Failed to load recent content');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentContent();
  };
  
  return (
    <Box sx={{ p: 3, position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">
          Dashboard
        </Typography>
      </Box>
      
      <Stack spacing={3}>
        {/* Server Stats Card */}
        <ServerStats />
        
        {/* Recently Added Section */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Recently Added
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : recentlyAdded.length > 0 ? (
            <MediaGrid 
              media={recentlyAdded} 
              isLoading={false}
              libraryType={(recentlyAdded[0]?.type === 'episode') ? 'tv' : 'movies'} 
            />
          ) : (
            <Typography>No media found. Add some to your libraries!</Typography>
          )}
        </Paper>
      </Stack>

      {/* Fixed position FAB for adding libraries */}
      <Tooltip title="Add Media Library" placement="left">
        <Fab 
          color="primary" 
          aria-label="add media library"
          onClick={handleOpenCreateDialog}
          sx={{ 
            position: 'fixed', 
            bottom: 32, 
            right: 32,
            boxShadow: 3
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      {/* Create Library Dialog */}
      <CreateLibraryDialog 
        open={createDialogOpen} 
        onClose={handleCloseCreateDialog} 
        onSuccess={handleLibraryCreated} 
      />
    </Box>
  );
};

export default HomePage;
