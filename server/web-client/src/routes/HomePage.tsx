import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Paper, Stack } from '@mui/material';
import apiService from '../services/api';
import MediaGrid from '../components/MediaGrid';
import ServerStats from '../components/ServerStats';
import type { Media } from '../types';

const HomePage: React.FC = () => {
  const [recentlyAdded, setRecentlyAdded] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // This is a placeholder. In a real implementation, we would
  // fetch recently added content across all libraries
  useEffect(() => {
    const fetchRecentContent = async () => {
      try {
        setLoading(true);
        // Get libraries
        const librariesResponse = await apiService.getLibraries();
        
        if (librariesResponse.success && librariesResponse.data && librariesResponse.data.length > 0) {
          // For now, just get content from the first library
          const firstLibrary = librariesResponse.data[0];
          const contentResponse = await apiService.getLibraryContents(firstLibrary.id);
          
          if (contentResponse.success && contentResponse.data) {
            // Sort by date added and take most recent
            const sorted = [...contentResponse.data.media].sort((a, b) => {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            setRecentlyAdded(sorted.slice(0, 12)); // Show at most 12 items
          }
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
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Dashboard
      </Typography>
      
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
    </Box>
  );
};

export default HomePage;
