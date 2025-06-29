import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  IconButton,
  Tooltip
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import CloseIcon from '@mui/icons-material/Close';
import apiService from '../services/api';
import type { SelectChangeEvent } from '@mui/material';

interface CreateLibraryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  path: string;
  type: string;
  scanAutomatically: boolean;
}

const CreateLibraryDialog: React.FC<CreateLibraryDialogProps> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    path: '',
    type: 'movies',
    scanAutomatically: true
  });
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [directories, setDirectories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form data when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        path: '',
        type: 'movies',
        scanAutomatically: true
      });
      setError(null);
    }
  }, [open]);

  // Handle input change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    const target = e.target as HTMLInputElement | { name?: string; value: unknown; checked?: boolean };
    const name = target.name as string;
    let value: any = target.value;
    if (typeof target.checked !== 'undefined') {
      value = target.checked;
    }
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
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
      setError('Failed to load directories');
    }
  };

  // Navigate to directory
  const navigateToDirectory = (path: string) => {
    fetchDirectories(path);
  };

  // Select directory
  const selectDirectory = (path: string) => {
    setFormData(prevData => ({
      ...prevData,
      path
    }));
    setFolderBrowserOpen(false);
  };

  // Handle create library
  const handleCreateLibrary = async () => {
    if (!formData.name || !formData.path) {
      setError('Library name and path are required');
      return;
    }

    try {
      setLoading(true);
      
      const response = await apiService.post('/api/library/sections', {
        name: formData.name,
        path: formData.path,
        type: formData.type,
        scanAutomatically: formData.scanAutomatically
      });
      
      if (response && response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response?.message || 'Failed to create library');
      }
    } catch (error: any) {
      console.error('Error creating library:', error);
      setError(error?.message || 'Failed to create library');
    } finally {
      setLoading(false);
    }
  };

  // Render directory browser dialog
  const renderFolderBrowser = () => (
    <Dialog 
      open={folderBrowserOpen} 
      onClose={handleFolderBrowserClose}
      maxWidth="md"
      fullWidth
      disableEnforceFocus
      keepMounted={false}
      disablePortal
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography>Select Directory</Typography>
          <IconButton onClick={handleFolderBrowserClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box mb={2} display="flex" alignItems="center">
          <Typography variant="subtitle2" mr={1}>Current Path:</Typography>
          <Typography fontFamily="monospace" sx={{ overflowWrap: 'break-word' }}>
            {currentPath}
          </Typography>
        </Box>
        
        {/* Display path as breadcrumbs */}
        <Box mb={2} display="flex" flexWrap="wrap" alignItems="center">
          {currentPath.split('/').map((part, index, parts) => {
            if (!part) return null;
            const path = parts.slice(0, index + 1).join('/') || '/';
            return (
              <React.Fragment key={path}>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={() => navigateToDirectory(path)}
                  sx={{ minWidth: 'unset', padding: '2px 4px' }}
                >
                  {part}
                </Button>
                {index < parts.length - 1 && part && <Typography mx={0.5}>/</Typography>}
              </React.Fragment>
            );
          })}
        </Box>
        
        <Box display="flex" flexWrap="wrap" gap={1}>
          {/* Parent directory button */}
          {currentPath !== '/' && (
            <Button 
              variant="outlined" 
              onClick={() => {
                const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                navigateToDirectory(parentPath);
              }}
              startIcon={<FolderIcon />}
              size="small"
              sx={{ mb: 1 }}
            >
              ..
            </Button>
          )}
          
          {/* Display directories */}
          {directories.map((dir) => (
            <Box key={dir} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Button
                variant="outlined"
                onClick={() => navigateToDirectory(`${currentPath}/${dir}`.replace(/\/\//g, '/'))}
                startIcon={<FolderIcon />}
                size="small"
                sx={{ mr: 1 }}
              >
                {dir}
              </Button>
              <Tooltip title="Select this directory">
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => selectDirectory(`${currentPath}/${dir}`.replace(/\/\//g, '/'))}
                >
                  Select
                </Button>
              </Tooltip>
            </Box>
          ))}
          
          {directories.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No subdirectories found
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleFolderBrowserClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        keepMounted={false}
        disablePortal
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography>Create New Media Library</Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box mt={1}>
            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            
            <TextField
              fullWidth
              margin="normal"
              label="Library Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              helperText="A name for your library (e.g., 'My Movies')"
            />
            
            <Box display="flex" alignItems="flex-start" mt={2} mb={1}>
              <TextField
                fullWidth
                margin="normal"
                label="Library Path"
                name="path"
                value={formData.path}
                onChange={handleInputChange}
                required
                helperText="Path to the directory containing your media files"
                sx={{ mr: 1 }}
              />
              <Tooltip title="Browse for folder">
                <Button
                  variant="outlined"
                  onClick={handleFolderBrowserOpen}
                  sx={{ mt: 2 }}
                >
                  <FolderIcon />
                </Button>
              </Tooltip>
            </Box>
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="type-label">Library Type</InputLabel>
              <Select
                labelId="type-label"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                label="Library Type"
              >
                <MenuItem value="movies">Movies</MenuItem>
                <MenuItem value="tv">TV Shows</MenuItem>
                <MenuItem value="music">Music</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  name="scanAutomatically"
                  checked={formData.scanAutomatically}
                  onChange={handleInputChange}
                  color="primary"
                />
              }
              label="Scan automatically"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleCreateLibrary} 
            variant="contained" 
            color="primary"
            disabled={loading || !formData.name || !formData.path}
          >
            {loading ? 'Creating...' : 'Create Library'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {renderFolderBrowser()}
    </>
  );
};

export default CreateLibraryDialog;
