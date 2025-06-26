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
  CardMedia,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Folder as FolderIcon,
  Storage as StorageIcon
} from '@mui/icons-material';

// API Service
import apiService from '../../services/api';
import { Library } from '../../types';
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
  const { subscribe, unsubscribe } = useWebSocket();
  
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
    
    // Subscribe to scan progress events
    subscribe('scan_progress', (data) => {
      if (data.libraryId) {
        setScanProgress(prev => ({
          ...prev,
          [data.libraryId]: data.progress
        }));
        
        // If progress is 100, mark as not scanning
        if (data.progress === 100) {
          setTimeout(() => {
            setScanningLibraries(prev => ({
              ...prev,
              [data.libraryId]: false
            }));
            setScanProgress(prev => ({
              ...prev,
              [data.libraryId]: 0
            }));
            fetchLibraries();
          }, 1000);
        }
      }
    });
    
    // Subscribe to media events
    subscribe('media_added', () => fetchLibraries());
    subscribe('media_updated', () => fetchLibraries());
    subscribe('media_removed', () => fetchLibraries());
    
    return () => {
      unsubscribe('scan_progress');
      unsubscribe('media_added');
      unsubscribe('media_updated');
      unsubscribe('media_removed');
    };
  }, []);
  
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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value, checked } = e.target as any;
    setFormData({
      ...formData,
      [name as string]: checked !== undefined ? checked : value
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
    setFormData({
      ...formData,
      path
    });
    setFolderBrowserOpen(false);
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
      case 'movie':
        return 'Movies';
      case 'show':
        return 'TV Shows';
      case 'music':
        return 'Music';
      case 'photo':
        return 'Photos';
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
          >
            Add Library
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
              <Grid item xs={12} sm={6} md={4} key={library.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <StorageIcon sx={{ mr: 1 }} />
                      <Typography variant="h6" component="div">
                        {library.name}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Type:</strong> {getLibraryTypeLabel(library.type || 'unknown')}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Path:</strong> {library.path}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Items:</strong> {library.mediaCount || 0}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                      <strong>Size:</strong> {formatBytes(library.totalSize || 0)}
                    </Typography>
                    
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
                  
                  <CardActions>
                    <Tooltip title="Edit Library">
                      <IconButton 
                        onClick={() => handleEditDialogOpen(library)}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Scan Library">
                      <IconButton 
                        onClick={() => scanLibrary(library)}
                        size="small"
                        disabled={scanningLibraries[library.id]}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Delete Library">
                      <IconButton 
                        onClick={() => handleDeleteDialogOpen(library)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
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
      <Dialog open={createDialogOpen} onClose={handleCreateDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Library</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter the details for the new library.
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
      <Dialog open={editDialogOpen} onClose={handleEditDialogClose} maxWidth="sm" fullWidth>
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
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
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
      <Dialog open={folderBrowserOpen} onClose={handleFolderBrowserClose} maxWidth="md" fullWidth>
        <DialogTitle>Browse Folders</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            name="currentPath"
            label="Current Path"
            type="text"
            fullWidth
            variant="outlined"
            value={currentPath}
            InputProps={{ readOnly: true }}
            sx={{ mb: 2 }}
          />
          
          <Paper sx={{ p: 2, maxHeight: '400px', overflowY: 'auto' }}>
            {currentPath !== '/' && (
              <Button 
                fullWidth
                sx={{ justifyContent: 'flex-start', textAlign: 'left', mb: 1 }}
                onClick={() => {
                  // Navigate to parent directory
                  const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                  navigateToDirectory(parentPath);
                }}
              >
                <FolderIcon sx={{ mr: 1 }} /> ..
              </Button>
            )}
            
            {directories.map((dir, index) => (
              <Button 
                key={index}
                fullWidth
                sx={{ justifyContent: 'flex-start', textAlign: 'left', mb: 1 }}
                onClick={() => navigateToDirectory(dir)}
              >
                <FolderIcon sx={{ mr: 1 }} /> {dir.split('/').pop()}
              </Button>
            ))}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFolderBrowserClose}>Cancel</Button>
          <Button 
            onClick={() => selectDirectory(currentPath)} 
            variant="contained"
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
