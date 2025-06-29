import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  InputAdornment,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { SelectChangeEvent } from '@mui/material/Select';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import FolderIcon from '@mui/icons-material/Folder';
import HomeIcon from '@mui/icons-material/Home';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import FolderOffIcon from '@mui/icons-material/FolderOff';
import CheckIcon from '@mui/icons-material/Check';
import InfoIcon from '@mui/icons-material/Info';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import StorageIcon from '@mui/icons-material/Storage';

// API Service
import apiService from '../../services/api';
import type { Library } from '../../types';
import { useWebSocket } from '../../contexts/WebSocketContext';

// Library Management Component
const LibraryManagement: React.FC = () => {
  // State for libraries
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [scanningLibraries, setScanningLibraries] = useState<Record<string, boolean>>({});
  const [scanProgress, setScanProgress] = useState<Record<string, number>>({});
  
  // WebSocket context for real-time updates
  const { activeScans } = useWebSocket();
  
  // State for dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [folderBrowserOpen, setFolderBrowserOpen] = useState<boolean>(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    type: 'movie',
    scanAutomatically: true
  });
  
  // Directory browser
  const [currentPath, setCurrentPath] = useState<string>('');
  const [directories, setDirectories] = useState<string[]>([]);
  
  // Notification
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Fetch libraries on component mount
  useEffect(() => {
    fetchLibraries();
    
    // No need to manually subscribe/unsubscribe as the WebSocketContext handles this
    return () => {
      // Cleanup if needed
    };
  }, []);
  
  // Monitor activeScans from WebSocketContext
  useEffect(() => {
    if (activeScans && activeScans.size > 0) {
      // Convert Map to Record for our local state
      const scanProgressUpdate: Record<string, number> = {};
      const scanningUpdate: Record<string, boolean> = {};
      
      activeScans.forEach((scanData, libraryId) => {
        scanProgressUpdate[libraryId] = scanData.progress;
        scanningUpdate[libraryId] = scanData.progress < 100;
        
        // If progress is 100, mark as not scanning after a delay
        if (scanData.progress === 100) {
          setTimeout(() => {
            setScanningLibraries(prev => ({
              ...prev,
              [libraryId]: false
            }));
            setScanProgress(prev => ({
              ...prev,
              [libraryId]: 0
            }));
            fetchLibraries();
          }, 1000);
        }
      });
      
      setScanProgress(prev => ({ ...prev, ...scanProgressUpdate }));
      setScanningLibraries(prev => ({ ...prev, ...scanningUpdate }));
    }
  }, [activeScans]);
  
  // Fetch library list
  const fetchLibraries = async () => {
    try {
      setLoading(true);
      const response = await apiService.getLibraries();
      
      if (response.success && response.data) {
        setLibraries(response.data);
      }
    } catch (error) {
      console.error('Error fetching libraries:', error);
      showNotification('Failed to load libraries', 'error');
    } finally {
      setLoading(false);
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
  
  // Handle input change
  // Compatible with both MUI TextField and Select
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    const target = e.target as HTMLInputElement | { name?: string; value: unknown; checked?: boolean };
    const name = target.name as string;
    let value: any = target.value;
    if (typeof target.checked !== 'undefined') {
      value = target.checked;
    }
    setFormData({
      ...formData,
      [name]: value
    });
  };

  
  // Handle create library dialog
  const handleCreateDialogOpen = () => {
    setFormData({
      name: '',
      path: '',
      type: 'movie',
      scanAutomatically: true
    });
    setCreateDialogOpen(true);
  };
  
  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
  };
  
  // Handle edit library dialog
  const handleEditDialogOpen = (library: Library) => {
    setSelectedLibrary(library);
    setFormData({
      name: library.name,
      path: library.path,
      type: library.type || 'movie',
      scanAutomatically: library.scanAutomatically !== false
    });
    setEditDialogOpen(true);
  };
  
  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setSelectedLibrary(null);
  };
  
  // Handle delete library dialog
  const handleDeleteDialogOpen = (library: Library) => {
    setSelectedLibrary(library);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setSelectedLibrary(null);
  };
  
  // Handle folder browser dialog
  const handleFolderBrowserOpen = () => {
    setCurrentPath('/');
    fetchDirectories('/');
    setFolderBrowserOpen(true);
  };
  
  const handleFolderBrowserClose = () => {
    setFolderBrowserOpen(false);
  };
  
  // Fetch directories for folder browser
  const fetchDirectories = async (path: string) => {
    try {
      const response = await apiService.post('/api/admin/directories', { path });
      
      if (response && response.data) {
        setDirectories(response.data);
        setCurrentPath(path);
      }
    } catch (error) {
      console.error('Error fetching directories:', error);
      showNotification('Failed to load directories', 'error');
    }
  };
  
  // Navigate to directory
  const navigateToDirectory = (path: string) => {
    fetchDirectories(path);
  };
  
  // Select directory
  const selectDirectory = (path: string) => {
    // If there's a selected library, it means we're adding a directory to an existing library
    if (selectedLibrary) {
      // Update the library with the new path
      const updatedFormData = {
        name: selectedLibrary.name,
        path: path,
        type: selectedLibrary.type,
        scanAutomatically: selectedLibrary.scanAutomatically !== false
      };
      
      // Set the form data and update the library
      setFormData(updatedFormData);
      updateLibraryPath(selectedLibrary.id, path);
    } else {
      // Otherwise, just update the form data for creating a new library
      setFormData({
        ...formData,
        path
      });
    }
    
    setFolderBrowserOpen(false);
  };
  
  // Update library path (for adding media directory)
  const updateLibraryPath = async (libraryId: number, path: string) => {
    try {
      setLoading(true);
      
      const response = await apiService.post(`/api/library/sections/${libraryId}`, {
        name: selectedLibrary?.name || '',
        path: path,
        type: selectedLibrary?.type || 'movies',
        scanAutomatically: selectedLibrary?.scanAutomatically !== false
      });
      
      if (response && response.data) {
        showNotification(`Media directory added to library: ${path}`, 'success');
        fetchLibraries(); // Refresh libraries to show updated path
      }
    } catch (error) {
      console.error('Error updating library path:', error);
      showNotification('Failed to add media directory to library', 'error');
    } finally {
      setLoading(false);
      setSelectedLibrary(null);
    }
  };
  
  // Create library
  const createLibrary = async () => {
    try {
      setLoading(true);
      
      const response = await apiService.post('/api/library/sections', formData);
      
      if (response && response.data) {
        showNotification('Library created successfully', 'success');
        handleCreateDialogClose();
        fetchLibraries();
      }
    } catch (error) {
      console.error('Error creating library:', error);
      showNotification('Failed to create library', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Update library
  const updateLibrary = async () => {
    if (!selectedLibrary) return;
    
    try {
      setLoading(true);
      
      const response = await apiService.post(`/api/library/sections/${selectedLibrary.id}`, formData);
      
      if (response && response.data) {
        showNotification('Library updated successfully', 'success');
        handleEditDialogClose();
        fetchLibraries();
      }
    } catch (error) {
      console.error('Error updating library:', error);
      showNotification('Failed to update library', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete library
  const deleteLibrary = async () => {
    if (!selectedLibrary) return;
    
    try {
      setLoading(true);
      
      const response = await apiService.post(`/api/library/sections/${selectedLibrary.id}/delete`);
      
      if (response && response.data) {
        showNotification('Library deleted successfully', 'success');
        handleDeleteDialogClose();
        fetchLibraries();
      }
    } catch (error) {
      console.error('Error deleting library:', error);
      showNotification('Failed to delete library', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Scan library
  const scanLibrary = async (library: Library) => {
    try {
      // Set scanning state
      setScanningLibraries(prev => ({
        ...prev,
        [library.id]: true
      }));
      
      const response = await apiService.post(`/api/library/sections/${library.id}/scan`);
      
      if (response && response.data) {
        showNotification(`Scanning library: ${library.name}`, 'info');
      } else {
        // Reset scanning state on error
        setScanningLibraries(prev => ({
          ...prev,
          [library.id]: false
        }));
        showNotification('Failed to start library scan', 'error');
      }
    } catch (error) {
      console.error('Error scanning library:', error);
      showNotification('Failed to start library scan', 'error');
      
      // Reset scanning state on error
      setScanningLibraries(prev => ({
        ...prev,
        [library.id]: false
      }));
    }
  };
  
  // Format bytes to human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Get library type label
  const getLibraryTypeLabel = (type: string): string => {
    switch (type) {
      case 'movies':
        return 'Movies';
      case 'tv':
        return 'TV Shows';
      case 'music':
        return 'Music';
      default:
        return 'Unknown';
    }
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">
          Library Management
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchLibraries}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleCreateDialogOpen}
            color="primary"
            size="medium"
            sx={{ fontWeight: 'bold', px: 2, py: 1 }}
          >
            Add Media Library
          </Button>
        </Box>
      </Box>
      
      {/* Libraries Grid */}
      {loading && libraries.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {libraries.length > 0 ? (
            libraries.map((library) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={library.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, pb: 1, borderBottom: '1px solid #eee' }}>
                      {library.type === 'movies' && <MovieIcon sx={{ mr: 1, color: 'primary.main' }} />}
                      {library.type === 'tv' && <TvIcon sx={{ mr: 1, color: 'secondary.main' }} />}
                      {library.type === 'music' && <MusicNoteIcon sx={{ mr: 1, color: 'success.main' }} />}
                      {(!library.type || !['movies', 'tv', 'music'].includes(library.type)) && <StorageIcon sx={{ mr: 1 }} />}
                      <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        {library.name}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={getLibraryTypeLabel(library.type || 'unknown')} 
                        color={library.type === 'movies' ? 'primary' : 
                              library.type === 'tv' ? 'secondary' : 
                              library.type === 'music' ? 'success' : 
                              'default'}
                        sx={{ ml: 'auto', fontSize: '0.75rem' }}
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                        <FolderIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
                        <Tooltip title={library.path}>
                          <Box sx={{ 
                            maxWidth: '100%', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap' 
                          }}>
                            {library.path}
                          </Box>
                        </Tooltip>
                      </Typography>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Paper sx={{ p: 1, bgcolor: 'background.default', textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {library.mediaCount || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Media Items
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid size={{ xs: 6 }}>
                        <Paper sx={{ p: 1, bgcolor: 'background.default', textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {formatBytes(library.totalSize || 0)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total Size
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                    
                    {scanningLibraries[library.id] && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          Scanning: {scanProgress[library.id] || 0}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={scanProgress[library.id] || 0}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    )}
                  </CardContent>
                  
                  <CardActions sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: '8px 16px' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<FolderIcon />}
                      onClick={() => {
                        setSelectedLibrary(library);
                        handleFolderBrowserOpen();
                      }}
                      sx={{ mb: 1, fontWeight: 'medium' }}
                      fullWidth
                    >
                      Add Media Directory
                    </Button>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box>
                        <Tooltip title="Edit Library Settings">
                          <IconButton 
                            onClick={() => handleEditDialogOpen(library)}
                            size="small"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Scan Library for New Media">
                          <IconButton 
                            onClick={() => scanLibrary(library)}
                            size="small"
                            disabled={scanningLibraries[library.id]}
                          >
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      
                      <Tooltip title="Delete Library">
                        <IconButton 
                          onClick={() => handleDeleteDialogOpen(library)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid size={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1">
                  No libraries found. Click "Add Library" to create your first library.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
      
      {/* Create Library Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={handleCreateDialogClose} 
        maxWidth="sm" 
        fullWidth
        disableEnforceFocus
        keepMounted={false}
        disablePortal
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0', pb: 2 }}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <StorageIcon sx={{ mr: 1, color: 'primary.main' }} />
            Add New Library
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
            Create a new library by specifying a location containing your media files
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ mb: 3, p: 2, bgcolor: 'info.main', color: 'info.contrastText', borderRadius: 1, display: 'flex', alignItems: 'center' }}>
            <InfoIcon sx={{ mr: 1 }} />
            <Typography variant="body2">
              Libraries help organize your media collection. Each library should point to a folder containing similar media types.
            </Typography>
          </Box>
          
          <TextField
            margin="dense"
            name="name"
            label="Library Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
            required
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TextField
              margin="dense"
              name="path"
              label="Library Path"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.path}
              onChange={handleInputChange}
              sx={{ flexGrow: 1, mr: 1 }}
              required
            />
            
            <Button 
              variant="outlined" 
              onClick={handleFolderBrowserOpen}
              startIcon={<FolderIcon />}
            >
              Browse
            </Button>
          </Box>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="library-type-label">Library Type</InputLabel>
            <Select
              labelId="library-type-label"
              name="type"
              value={formData.type}
              label="Library Type"
              onChange={handleInputChange}
            >
              <MenuItem value="movie">Movies</MenuItem>
              <MenuItem value="show">TV Shows</MenuItem>
              <MenuItem value="music">Music</MenuItem>
              <MenuItem value="photo">Photos</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose}>Cancel</Button>
          <Button 
            onClick={createLibrary} 
            variant="contained" 
            disabled={!formData.name || !formData.path}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Library Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleEditDialogClose} 
        maxWidth="sm" 
        fullWidth
        disableEnforceFocus
        keepMounted={false}
        disablePortal
      >
        <DialogTitle>Edit Library</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Update library information.
          </DialogContentText>
          
          <TextField
            margin="dense"
            name="name"
            label="Library Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
            required
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TextField
              margin="dense"
              name="path"
              label="Library Path"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.path}
              onChange={handleInputChange}
              sx={{ flexGrow: 1, mr: 1 }}
              required
            />
            
            <Button 
              variant="outlined" 
              onClick={handleFolderBrowserOpen}
              startIcon={<FolderIcon />}
            >
              Browse
            </Button>
          </Box>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="library-type-label">Library Type</InputLabel>
            <Select
              labelId="library-type-label"
              name="type"
              value={formData.type}
              label="Library Type"
              onChange={handleInputChange}
            >
              <MenuItem value="movie">Movies</MenuItem>
              <MenuItem value="show">TV Shows</MenuItem>
              <MenuItem value="music">Music</MenuItem>
              <MenuItem value="photo">Photos</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose}>Cancel</Button>
          <Button 
            onClick={updateLibrary} 
            variant="contained" 
            disabled={!formData.name || !formData.path}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Library Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={handleDeleteDialogClose}
        disableEnforceFocus
        keepMounted={false}
        disablePortal
      >
        <DialogTitle>Delete Library</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the library "{selectedLibrary?.name}"? This will remove the library reference but not delete any files from disk.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button onClick={deleteLibrary} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Folder Browser Dialog */}
      <Dialog 
        open={folderBrowserOpen} 
        onClose={handleFolderBrowserClose} 
        maxWidth="md" 
        fullWidth
        disableEnforceFocus
        keepMounted={false}
        disablePortal
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0', pb: 2 }}>
          <Typography variant="h6" component="div">
            <FolderIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Select Media Directory
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
            Choose the folder containing your media files
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {/* Breadcrumb Navigation */}
          <Paper sx={{ p: 1, mb: 2, display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
            <Tooltip title="Root directory">
              <IconButton 
                size="small"
                onClick={() => navigateToDirectory('/')}
                color={currentPath === '/' ? 'primary' : 'default'}
              >
                <HomeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            {currentPath !== '/' && currentPath.split('/').filter(Boolean).map((segment, i, segments) => {
              const path = '/' + segments.slice(0, i + 1).join('/');
              return (
                <React.Fragment key={i}>
                  <Typography variant="body2" color="text.secondary" sx={{ mx: 0.5 }}>
                    /
                  </Typography>
                  <Tooltip title={`Navigate to /${segment}`}>
                    <Button 
                      size="small" 
                      onClick={() => navigateToDirectory(path)}
                      sx={{ minWidth: 'auto', textTransform: 'none' }}
                      color="inherit"
                    >
                      {segment}
                    </Button>
                  </Tooltip>
                </React.Fragment>
              );
            })}
          </Paper>
          
          <TextField
            margin="dense"
            name="currentPath"
            label="Current Path"
            type="text"
            fullWidth
            variant="outlined"
            value={currentPath}
            InputProps={{ 
              readOnly: true,
              startAdornment: (
                <InputAdornment position="start">
                  <FolderIcon color="action" />
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />
          
          <Paper sx={{ p: 2, maxHeight: '400px', overflowY: 'auto', bgcolor: 'background.default', border: '1px solid #e0e0e0' }}>
            {currentPath !== '/' && (
              <Tooltip title="Up to parent directory">
                <Button 
                  fullWidth
                  sx={{ 
                    justifyContent: 'flex-start', 
                    textAlign: 'left', 
                    mb: 1,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                  onClick={() => {
                    // Navigate to parent directory
                    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                    navigateToDirectory(parentPath);
                  }}
                  startIcon={<ArrowUpwardIcon />}
                >
                  Parent Directory
                </Button>
              </Tooltip>
            )}
            
            {directories.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <FolderOffIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No accessible directories found
                </Typography>
              </Box>
            ) : (
              directories.map((dir, index) => (
                <Tooltip key={index} title={`Open ${dir.split('/').pop()}`}>
                  <Button 
                    fullWidth
                    sx={{ 
                      justifyContent: 'flex-start', 
                      textAlign: 'left', 
                      mb: 1,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => navigateToDirectory(dir)}
                  >
                    <FolderIcon sx={{ mr: 1, color: 'primary.light' }} /> {dir.split('/').pop()}
                  </Button>
                </Tooltip>
              ))
            )}
          </Paper>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e0e0e0', py: 2 }}>
          <Button onClick={handleFolderBrowserClose} color="inherit">Cancel</Button>
          <Button 
            onClick={() => selectDirectory(currentPath)} 
            variant="contained"
            startIcon={<CheckIcon />}
            color="primary"
          >
            Select This Folder
          </Button>
        </DialogActions>
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

export default LibraryManagement;
