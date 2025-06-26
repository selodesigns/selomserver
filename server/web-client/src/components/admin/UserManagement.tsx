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
  FormControl,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// DataGrid for User table
import { 
  DataGrid, 
  GridColDef, 
  GridRenderCellParams,
  GridToolbar
} from '@mui/x-data-grid';

// API Service
import apiService from '../../services/api';
import { User } from '../../types';

// User Management Component
const UserManagement: React.FC = () => {
  // State for users
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // State for dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState<boolean>(false);
  
  // Form data
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    name: '',
    isAdmin: false
  });
  
  // Notifications
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);
  
  // Fetch user list
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.post('/api/admin/users');
      
      if (response && response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showNotification('Failed to load users', 'error');
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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle create user dialog
  const handleCreateDialogOpen = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      name: '',
      isAdmin: false
    });
    setCreateDialogOpen(true);
  };
  
  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
  };
  
  // Handle edit user dialog
  const handleEditDialogOpen = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      name: user.name || '',
      isAdmin: user.isAdmin || false
    });
    setEditDialogOpen(true);
  };
  
  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
  };
  
  // Handle delete user dialog
  const handleDeleteDialogOpen = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };
  
  // Handle reset password dialog
  const handleResetPasswordDialogOpen = (user: User) => {
    setSelectedUser(user);
    setFormData({
      ...formData,
      password: ''
    });
    setResetPasswordDialogOpen(true);
  };
  
  const handleResetPasswordDialogClose = () => {
    setResetPasswordDialogOpen(false);
    setSelectedUser(null);
  };
  
  // Create user
  const createUser = async () => {
    try {
      setLoading(true);
      
      const response = await apiService.post('/api/admin/users/create', formData);
      
      if (response && response.data) {
        showNotification('User created successfully', 'success');
        handleCreateDialogClose();
        fetchUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showNotification('Failed to create user', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Update user
  const updateUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      
      const userData = {
        ...formData,
        id: selectedUser.id
      };
      
      // If password is empty, remove it from the request
      if (!userData.password) {
        delete userData.password;
      }
      
      const response = await apiService.post(`/api/admin/users/${selectedUser.id}`, userData);
      
      if (response && response.data) {
        showNotification('User updated successfully', 'success');
        handleEditDialogClose();
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification('Failed to update user', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete user
  const deleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      
      const response = await apiService.post(`/api/admin/users/${selectedUser.id}/delete`);
      
      if (response && response.data) {
        showNotification('User deleted successfully', 'success');
        handleDeleteDialogClose();
        fetchUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('Failed to delete user', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Reset password
  const resetPassword = async () => {
    if (!selectedUser || !formData.password) return;
    
    try {
      setLoading(true);
      
      const response = await apiService.post(`/api/admin/users/${selectedUser.id}/reset-password`, {
        password: formData.password
      });
      
      if (response && response.data) {
        showNotification('Password reset successfully', 'success');
        handleResetPasswordDialogClose();
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      showNotification('Failed to reset password', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Table Columns
  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'username', headerName: 'Username', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'name', headerName: 'Name', width: 150 },
    { 
      field: 'isAdmin', 
      headerName: 'Admin', 
      width: 100,
      renderCell: (params: GridRenderCellParams<any>) => (
        params.value ? <LockIcon color="primary" /> : <LockOpenIcon />
      )
    },
    { 
      field: 'lastLogin', 
      headerName: 'Last Login', 
      width: 200,
      valueFormatter: (params) => {
        return params.value ? new Date(params.value).toLocaleString() : 'Never';
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams<any>) => (
        <Box>
          <Tooltip title="Edit User">
            <IconButton 
              onClick={() => handleEditDialogOpen(params.row)}
              size="small"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reset Password">
            <IconButton 
              onClick={() => handleResetPasswordDialogOpen(params.row)}
              size="small"
            >
              <LockIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete User">
            <IconButton 
              onClick={() => handleDeleteDialogOpen(params.row)}
              size="small"
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">
          User Management
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchUsers}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleCreateDialogOpen}
          >
            Add User
          </Button>
        </Box>
      </Box>
      
      {/* Users DataGrid */}
      <Paper sx={{ width: '100%', height: 'calc(100vh - 250px)', mb: 2 }}>
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          components={{
            Toolbar: GridToolbar,
          }}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 }
            },
          }}
        />
      </Paper>
      
      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter the details for the new user.
          </DialogContentText>
          
          <TextField
            margin="dense"
            name="username"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.username}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
            required
          />
          
          <TextField
            margin="dense"
            name="password"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={formData.password}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
            required
          />
          
          <TextField
            margin="dense"
            name="email"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="name"
            label="Full Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.isAdmin}
                onChange={handleInputChange}
                name="isAdmin"
              />
            }
            label="Administrator Account"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose}>Cancel</Button>
          <Button 
            onClick={createUser} 
            variant="contained" 
            disabled={!formData.username || !formData.password}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Update user information. Leave password blank to keep current password.
          </DialogContentText>
          
          <TextField
            margin="dense"
            name="username"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.username}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
            required
          />
          
          <TextField
            margin="dense"
            name="email"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="name"
            label="Full Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.isAdmin}
                onChange={handleInputChange}
                name="isAdmin"
              />
            }
            label="Administrator Account"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose}>Cancel</Button>
          <Button 
            onClick={updateUser} 
            variant="contained" 
            disabled={!formData.username}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete user "{selectedUser?.username}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button onClick={deleteUser} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onClose={handleResetPasswordDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Set a new password for user "{selectedUser?.username}".
          </DialogContentText>
          
          <TextField
            margin="dense"
            name="password"
            label="New Password"
            type="password"
            fullWidth
            variant="outlined"
            value={formData.password}
            onChange={handleInputChange}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetPasswordDialogClose}>Cancel</Button>
          <Button 
            onClick={resetPassword} 
            variant="contained" 
            disabled={!formData.password}
          >
            Reset Password
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

export default UserManagement;
