import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Divider,
  IconButton
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getMediaIcon } from '../utils/mediaIcons';
import apiService from '../services/api';
import type { Media } from '../types';

const MediaDetailPage: React.FC = () => {
  const { mediaId } = useParams<{ mediaId?: string }>();
  const navigate = useNavigate();
  const [media, setMedia] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchMediaDetails = async () => {
      if (!mediaId) {
        setError('Media ID not provided');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // In a real implementation, this would call a dedicated media detail endpoint
        // For now, we'll fetch all libraries and search for the media item
        const librariesResponse = await apiService.getLibraries();
        
        if (librariesResponse.success && librariesResponse.data) {
          let foundMedia: Media | null = null;
          
          // Search for the media in all libraries
          for (const library of librariesResponse.data) {
            if (foundMedia) break;
            
            const response = await apiService.getLibraryContents(library.id);
            
            if (response.success && response.data) {
              foundMedia = response.data.media.find(item => 
                item.id === parseInt(mediaId, 10)
              ) || null;
            }
          }
          
          if (foundMedia) {
            setMedia(foundMedia);
          } else {
            setError('Media not found');
          }
        } else {
          setError('Failed to load libraries');
        }
        
      } catch (err) {
        console.error('Error fetching media details:', err);
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMediaDetails();
  }, [mediaId]);
  
  // Format date string
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return 'Unknown date';
    }
  };
  
  const handlePlayMedia = () => {
    if (media) {
      // In a real implementation, this would start streaming or open a player
      console.log('Playing media:', media.title);
    }
  };
  
  const handleGoBack = () => {
    navigate(-1); // Go back to previous page
  };
  
  // Get appropriate icon based on media type
  const MediaIcon = media ? getMediaIcon(media) : null;
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Back button */}
      <IconButton onClick={handleGoBack} sx={{ mb: 2 }}>
        <ArrowBackIcon />
      </IconButton>
      
      {error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="error" gutterBottom>
            {error}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Unable to load media details
          </Typography>
        </Box>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : media ? (
        <Grid container spacing={4}>
          {/* Media thumbnail/poster */}
          <Grid item xs={12} md={4}>
            <Paper 
              sx={{
                aspectRatio: '2/3',
                bgcolor: 'background.paper',
                backgroundImage: media.thumbnail_url ? 
                  `url(${media.thumbnail_url})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
                overflow: 'hidden',
                boxShadow: 3
              }}
            >
              {!media.thumbnail_url && MediaIcon && (
                <Box sx={{ p: 4, color: 'text.secondary' }}>
                  <MediaIcon style={{ fontSize: 80 }} />
                </Box>
              )}
            </Paper>
            
            {/* Play button for videos */}
            {(media.type === 'movie' || media.type === 'episode') && (
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={handlePlayMedia}
                sx={{ mt: 2 }}
              >
                Play
              </Button>
            )}
          </Grid>
          
          {/* Media details */}
          <Grid item xs={12} md={8}>
            <Typography variant="h4" gutterBottom>
              {media.title}
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Chip 
                label={media.type.toUpperCase()} 
                size="small" 
                color="primary" 
                sx={{ mr: 1 }} 
              />
              {media.year && (
                <Chip 
                  label={media.year} 
                  size="small" 
                  variant="outlined" 
                  sx={{ mr: 1 }} 
                />
              )}
              {media.duration && (
                <Chip 
                  label={`${Math.floor(media.duration / 60)} min`} 
                  size="small" 
                  variant="outlined" 
                />
              )}
            </Box>
            
            {media.summary && (
              <Typography variant="body1" paragraph>
                {media.summary}
              </Typography>
            )}
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              {media.director && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Director
                  </Typography>
                  <Typography variant="body1">
                    {media.director}
                  </Typography>
                </Grid>
              )}
              
              {media.actors && media.actors.length > 0 && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cast
                  </Typography>
                  <Typography variant="body1">
                    {media.actors.join(', ')}
                  </Typography>
                </Grid>
              )}
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Added
                </Typography>
                <Typography variant="body1">
                  {formatDate(media.created_at)}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  File Path
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{
                    wordBreak: 'break-all',
                    opacity: 0.7
                  }}
                >
                  {media.path}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      ) : (
        <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
          Media not found
        </Typography>
      )}
    </Box>
  );
};

export default MediaDetailPage;