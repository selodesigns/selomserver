import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import { getMediaIcon } from '../utils/mediaIcons';
import apiService from '../services/api';
import MediaPlayer from '../components/MediaPlayer';
import type { Media } from '../types';

const MediaDetailPage: React.FC = () => {
  const { mediaId } = useParams<{ mediaId?: string }>();
  const navigate = useNavigate();
  const [media, setMedia] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  
  useEffect(() => {
    const fetchMediaDetails = async () => {
      if (!mediaId) {
        setError('Media ID not provided');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Use dedicated media detail endpoint for better performance
        const response = await apiService.getMediaDetail(parseInt(mediaId!));
        
        if (response.success && response.data) {
          setMedia(response.data);
        } else {
          setError(response.message || 'Media not found');
        }
      } catch (err) {
        console.error('Error fetching media:', err);
        setError('Error loading media details');
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
      setShowPlayer(true);
    }
  };
  
  const handleClosePlayer = () => {
    setShowPlayer(false);
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
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          {/* Media thumbnail/poster */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 33%' } }}>
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
          </Box>
          
          {/* Media details */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 67%' } }}>
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
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {media.director && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Director
                  </Typography>
                  <Typography variant="body1">
                    {media.director}
                  </Typography>
                </Box>
              )}
              
              {media.actors && media.actors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cast
                  </Typography>
                  <Typography variant="body1">
                    {media.actors.join(', ')}
                  </Typography>
                </Box>
              )}
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Added
                </Typography>
                <Typography variant="body1">
                  {formatDate(media.created_at)}
                </Typography>
              </Box>
              
              <Box>
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
              </Box>
            </Box>
          </Box>
        </Box>
      ) : (
        <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
          Media not found
        </Typography>
      )}
      
      {/* Media Player Dialog */}
      <Dialog
        open={showPlayer}
        onClose={handleClosePlayer}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'black',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          bgcolor: 'black',
          color: 'white',
          pb: 1
        }}>
          <Typography variant="h6" component="div">
            {media?.title}
          </Typography>
          <IconButton
            onClick={handleClosePlayer}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
          {media && showPlayer && (
            <MediaPlayer 
              media={media} 
              onClose={handleClosePlayer}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MediaDetailPage;