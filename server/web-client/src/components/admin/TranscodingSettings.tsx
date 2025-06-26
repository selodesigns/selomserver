import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  Switch,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  InputLabel,
  Stack,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

// API Service
import apiService from '../../services/api';

// Quality Preset interface
interface QualityPreset {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  video: {
    codec: string;
    resolution: string;
    bitrate: number;
    maxBitrate: number;
    framerate: number;
    preset: string;
  };
  audio: {
    codec: string;
    channels: number;
    bitrate: number;
  };
}

// TranscodingSettings component
const TranscodingSettings: React.FC = () => {
  // State for presets
  const [presets, setPresets] = useState<QualityPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<QualityPreset | null>(null);
  const [isNewPreset, setIsNewPreset] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Fetch presets on component mount
  useEffect(() => {
    fetchPresets();
  }, []);

  // Fetch presets
  const fetchPresets = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTranscodingPresets();
      setPresets(data);
    } catch (error) {
      console.error('Error fetching presets:', error);
      showNotification('Failed to load transcoding presets', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save preset
  const savePreset = async (preset: QualityPreset) => {
    try {
      setSaving(true);
      
      let updatedPreset;
      if (isNewPreset) {
        updatedPreset = await apiService.createTranscodingPreset(preset);
      } else {
        updatedPreset = await apiService.updateTranscodingPreset(preset.id, preset);
      }
      
      if (updatedPreset) {
        if (isNewPreset) {
          setPresets([...presets, updatedPreset]);
        } else {
          setPresets(presets.map(p => p.id === preset.id ? updatedPreset : p));
        }
        
        showNotification(`Preset ${isNewPreset ? 'created' : 'updated'} successfully`, 'success');
        closePresetDialog();
      }
    } catch (error) {
      console.error('Error saving preset:', error);
      showNotification(`Failed to ${isNewPreset ? 'create' : 'update'} preset`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete preset
  const deletePreset = async (presetId: string) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      try {
        await apiService.deleteTranscodingPreset(presetId);
        setPresets(presets.filter(preset => preset.id !== presetId));
        showNotification('Preset deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting preset:', error);
        showNotification('Failed to delete preset', 'error');
      }
    }
  };

  // Set default preset
  const setDefaultPreset = async (presetId: string) => {
    try {
      await apiService.setDefaultTranscodingPreset(presetId);
      
      // Update local state
      setPresets(presets.map(preset => ({
        ...preset,
        isDefault: preset.id === presetId
      } as QualityPreset)));
      
      showNotification('Default preset updated successfully', 'success');
    } catch (error) {
      console.error('Error setting default preset:', error);
      showNotification('Failed to set default preset', 'error');
    }
  };

  // Open preset dialog for editing
  const openEditPresetDialog = (preset: QualityPreset) => {
    setCurrentPreset({ ...preset });
    setIsNewPreset(false);
    setPresetDialogOpen(true);
  };

  // Open preset dialog for creating new
  const openNewPresetDialog = () => {
    setCurrentPreset({
      id: '',
      name: '',
      description: '',
      isDefault: false,
      video: {
        codec: 'h264',
        resolution: '1080p',
        bitrate: 4000,
        maxBitrate: 8000,
        framerate: 30,
        preset: 'medium'
      },
      audio: {
        codec: 'aac',
        channels: 2,
        bitrate: 192
      }
    });
    setIsNewPreset(true);
    setPresetDialogOpen(true);
  };

  // Close preset dialog
  const closePresetDialog = () => {
    setPresetDialogOpen(false);
    setCurrentPreset(null);
  };

  // Handle preset form submit
  const handlePresetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPreset) {
      savePreset(currentPreset);
    }
  };

  // Handle preset field change
  const handlePresetChange = (section: string, field: string, value: any) => {
    if (!currentPreset) return;
    
    if (section === 'root') {
      setCurrentPreset({
        ...currentPreset,
        [field]: value
      });
    } else {
      setCurrentPreset({
        ...currentPreset,
        [section]: {
          ...(currentPreset[section as keyof QualityPreset] as any),
          [field]: value
        }
      });
    }
  };

  // Show notification helper
  const showNotification = (message: string, severity: 'success' | 'info' | 'warning' | 'error') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  // Handle notification close
  const handleNotificationClose = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">
          Transcoding Settings
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchPresets}
            sx={{ mr: 1 }}
            disabled={loading}
          >
            Refresh
          </Button>
          
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={openNewPresetDialog}
          >
            Add Preset
          </Button>
        </Box>
      </Box>
      
      {/* Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Transcoding Overview
            </Typography>
            
            <Typography variant="body1" paragraph>
              Configure quality presets for video transcoding. These presets will be available 
              for users to select when streaming content, and will affect the quality and performance 
              of streaming on different devices and network conditions.
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              Note: The default preset is used when a user does not explicitly select a quality. 
              Make sure to set a reasonable default that balances quality and performance.
            </Alert>
          </Paper>

          {/* Quality Presets */}
          <Typography variant="h6" gutterBottom>
            Quality Presets
          </Typography>
          
          {presets.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" paragraph>
                No quality presets defined.
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={openNewPresetDialog}
              >
                Add Your First Preset
              </Button>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {presets.map(preset => (
                <Box key={preset.id} sx={{ width: { xs: '100%', md: '48%', lg: '32%' } }}>
                  <Card>
                    <CardHeader 
                      title={preset.name}
                      subheader={
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          {preset.isDefault && (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                bgcolor: 'primary.main', 
                                color: 'white', 
                                px: 1, 
                                py: 0.5, 
                                borderRadius: 1,
                                mr: 1
                              }}
                            >
                              Default
                            </Typography>
                          )}
                          <Typography variant="body2" color="textSecondary">
                            {preset.description}
                          </Typography>
                        </Box>
                      }
                    />
                    <Divider />
                    <CardContent>
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>Video Settings</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ width: 'calc(50% - 4px)' }}>
                              <Typography variant="body2" color="textSecondary">Codec</Typography>
                              <Typography variant="body1">{preset.video.codec}</Typography>
                            </Box>
                            <Box sx={{ width: 'calc(50% - 4px)' }}>
                              <Typography variant="body2" color="textSecondary">Resolution</Typography>
                              <Typography variant="body1">{preset.video.resolution}</Typography>
                            </Box>
                            <Box sx={{ width: 'calc(50% - 4px)' }}>
                              <Typography variant="body2" color="textSecondary">Bitrate</Typography>
                              <Typography variant="body1">{preset.video.bitrate} kbps</Typography>
                            </Box>
                            <Box sx={{ width: 'calc(50% - 4px)' }}>
                              <Typography variant="body2" color="textSecondary">Framerate</Typography>
                              <Typography variant="body1">{preset.video.framerate} fps</Typography>
                            </Box>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                      
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>Audio Settings</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ width: 'calc(50% - 4px)' }}>
                              <Typography variant="body2" color="textSecondary">Codec</Typography>
                              <Typography variant="body1">{preset.audio.codec}</Typography>
                            </Box>
                            <Box sx={{ width: 'calc(50% - 4px)' }}>
                              <Typography variant="body2" color="textSecondary">Channels</Typography>
                              <Typography variant="body1">{preset.audio.channels}</Typography>
                            </Box>
                            <Box sx={{ width: '100%' }}>
                              <Typography variant="body2" color="textSecondary">Bitrate</Typography>
                              <Typography variant="body1">{preset.audio.bitrate} kbps</Typography>
                            </Box>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    </CardContent>
                    <CardActions>
                      {!preset.isDefault && (
                        <Button 
                          size="small" 
                          onClick={() => setDefaultPreset(preset.id)}
                        >
                          Set as Default
                        </Button>
                      )}
                      <Button 
                        size="small"
                        onClick={() => openEditPresetDialog(preset)}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="small"
                        color="error"
                        onClick={() => deletePreset(preset.id)}
                        disabled={preset.isDefault}
                      >
                        Delete
                      </Button>
                    </CardActions>
                  </Card>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
      
      {/* Preset Dialog */}
      <Dialog 
        open={presetDialogOpen}
        onClose={closePresetDialog}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={handlePresetSubmit}>
          <DialogTitle>
            {isNewPreset ? 'Add New Quality Preset' : 'Edit Quality Preset'}
          </DialogTitle>
          
          <DialogContent dividers>
            {currentPreset && (
              <Stack spacing={2} direction="column" width="100%">
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <TextField
                    label="Preset Name"
                    fullWidth
                    value={currentPreset.name}
                    onChange={(e) => handlePresetChange('root', 'name', e.target.value)}
                    margin="normal"
                    required
                  />
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={currentPreset.isDefault}
                        onChange={(e) => handlePresetChange('root', 'isDefault', e.target.checked)}
                      />
                    }
                    label="Set as Default Preset"
                  />
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <TextField
                    label="Description"
                    fullWidth
                    value={currentPreset.description}
                    onChange={(e) => handlePresetChange('root', 'description', e.target.value)}
                    margin="normal"
                  />
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <Typography variant="h6" gutterBottom>
                    Video Settings
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Video Codec</InputLabel>
                    <Select
                      value={currentPreset.video.codec}
                      onChange={(e) => handlePresetChange('video', 'codec', e.target.value)}
                      label="Video Codec"
                    >
                      <MenuItem value="h264">H.264 (AVC)</MenuItem>
                      <MenuItem value="h265">H.265 (HEVC)</MenuItem>
                      <MenuItem value="vp9">VP9</MenuItem>
                      <MenuItem value="av1">AV1</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Resolution</InputLabel>
                    <Select
                      value={currentPreset.video.resolution}
                      onChange={(e) => handlePresetChange('video', 'resolution', e.target.value)}
                      label="Resolution"
                    >
                      <MenuItem value="480p">480p (SD)</MenuItem>
                      <MenuItem value="720p">720p (HD)</MenuItem>
                      <MenuItem value="1080p">1080p (Full HD)</MenuItem>
                      <MenuItem value="1440p">1440p (2K)</MenuItem>
                      <MenuItem value="2160p">2160p (4K)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <Typography gutterBottom>
                    Bitrate (kbps)
                  </Typography>
                  <Slider
                    value={currentPreset.video.bitrate}
                    onChange={(_, value) => handlePresetChange('video', 'bitrate', value as number)}
                    min={500}
                    max={20000}
                    step={500}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 500, label: '500' },
                      { value: 10000, label: '10000' },
                      { value: 20000, label: '20000' },
                    ]}
                  />
                  <TextField
                    type="number"
                    value={currentPreset.video.bitrate}
                    onChange={(e) => handlePresetChange('video', 'bitrate', parseInt(e.target.value) || 0)}
                    fullWidth
                    margin="normal"
                  />
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <Typography gutterBottom>
                    Max Bitrate (kbps)
                  </Typography>
                  <Slider
                    value={currentPreset.video.maxBitrate}
                    onChange={(_, value) => handlePresetChange('video', 'maxBitrate', value as number)}
                    min={1000}
                    max={50000}
                    step={1000}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 1000, label: '1000' },
                      { value: 25000, label: '25000' },
                      { value: 50000, label: '50000' },
                    ]}
                  />
                  <TextField
                    type="number"
                    value={currentPreset.video.maxBitrate}
                    onChange={(e) => handlePresetChange('video', 'maxBitrate', parseInt(e.target.value) || 0)}
                    fullWidth
                    margin="normal"
                  />
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Framerate</InputLabel>
                    <Select
                      value={currentPreset.video.framerate}
                      onChange={(e) => handlePresetChange('video', 'framerate', e.target.value)}
                      label="Framerate"
                    >
                      <MenuItem value={24}>24 fps</MenuItem>
                      <MenuItem value={25}>25 fps</MenuItem>
                      <MenuItem value={30}>30 fps</MenuItem>
                      <MenuItem value={60}>60 fps</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Encoding Preset</InputLabel>
                    <Select
                      value={currentPreset.video.preset}
                      onChange={(e) => handlePresetChange('video', 'preset', e.target.value)}
                      label="Encoding Preset"
                    >
                      <MenuItem value="ultrafast">Ultrafast (Lowest Quality)</MenuItem>
                      <MenuItem value="superfast">Superfast</MenuItem>
                      <MenuItem value="veryfast">Very Fast</MenuItem>
                      <MenuItem value="faster">Faster</MenuItem>
                      <MenuItem value="fast">Fast</MenuItem>
                      <MenuItem value="medium">Medium (Balanced)</MenuItem>
                      <MenuItem value="slow">Slow</MenuItem>
                      <MenuItem value="slower">Slower</MenuItem>
                      <MenuItem value="veryslow">Very Slow (Best Quality)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <Typography variant="h6" gutterBottom>
                    Audio Settings
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Audio Codec</InputLabel>
                    <Select
                      value={currentPreset.audio.codec}
                      onChange={(e) => handlePresetChange('audio', 'codec', e.target.value)}
                      label="Audio Codec"
                    >
                      <MenuItem value="aac">AAC</MenuItem>
                      <MenuItem value="mp3">MP3</MenuItem>
                      <MenuItem value="ac3">AC3</MenuItem>
                      <MenuItem value="opus">Opus</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Audio Channels</InputLabel>
                    <Select
                      value={currentPreset.audio.channels}
                      onChange={(e) => handlePresetChange('audio', 'channels', e.target.value)}
                      label="Audio Channels"
                    >
                      <MenuItem value={1}>Mono (1)</MenuItem>
                      <MenuItem value={2}>Stereo (2)</MenuItem>
                      <MenuItem value={6}>5.1 Surround (6)</MenuItem>
                      <MenuItem value={8}>7.1 Surround (8)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                  <Typography gutterBottom>
                    Audio Bitrate (kbps)
                  </Typography>
                  <Slider
                    value={currentPreset.audio.bitrate}
                    onChange={(_, value) => handlePresetChange('audio', 'bitrate', value as number)}
                    min={64}
                    max={384}
                    step={32}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 64, label: '64' },
                      { value: 192, label: '192' },
                      { value: 384, label: '384' },
                    ]}
                  />
                  <TextField
                    type="number"
                    value={currentPreset.audio.bitrate}
                    onChange={(e) => handlePresetChange('audio', 'bitrate', parseInt(e.target.value) || 0)}
                    fullWidth
                    margin="normal"
                  />
                </Box>
              </Stack>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={closePresetDialog} disabled={saving}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              startIcon={<SaveIcon />}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Preset'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
      >
        <Alert 
          onClose={handleNotificationClose} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TranscodingSettings;
