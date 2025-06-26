import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tabs,
  Tab,
  Stack
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

// Components
import WebSocketTester from '../components/WebSocketTester';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [defaultQuality, setDefaultQuality] = useState('1080p');
  const [showSaved, setShowSaved] = useState(false);
  
  // User profile form
  const [formData, setFormData] = useState({
    name: user?.name || user?.displayName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Here you would call API to update user profile
    console.log('Saving profile:', formData);
    
    // Show saved message
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };
  
  const handleAppSettingSave = () => {
    // Here you would save app settings to local storage or user preferences API
    console.log('App settings saved:', { darkMode, autoPlay, defaultQuality });
    
    // Show saved message
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Settings
      </Typography>
      
      {showSaved && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          onClose={() => setShowSaved(false)}
        >
          Settings saved successfully
        </Alert>
      )}
      
      <Paper sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            aria-label="settings tabs"
          >
            <Tab label="Profile" />
            <Tab label="App Settings" />
            {user?.isAdmin && <Tab label="Admin" />}
          </Tabs>
        </Box>
        
        {/* Profile Tab */}
        <TabPanel value={activeTab} index={0}>
          <Typography variant="h6" gutterBottom>User Profile</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Box component="form" onSubmit={handleSaveProfile}>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
                
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled // Email changes might require verification
                />
              </Stack>
              
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Change Password
              </Typography>
              
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                <TextField
                  fullWidth
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                />
                
                <TextField
                  fullWidth
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                />
                
                <TextField
                  fullWidth
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
              </Stack>
              
              <Box sx={{ mt: 2 }}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                >
                  Save Profile
                </Button>
              </Box>
            </Stack>
          </Box>
        </TabPanel>
        
        {/* App Settings Tab */}
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6" gutterBottom>Application Settings</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Stack spacing={3}>
            <FormControlLabel
              control={
                <Switch 
                  checked={darkMode} 
                  onChange={() => setDarkMode(!darkMode)}
                  color="primary"
                />
              }
              label="Dark Mode"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={autoPlay} 
                  onChange={() => setAutoPlay(!autoPlay)}
                  color="primary"
                />
              }
              label="Auto-play videos"
            />
            
            <Box sx={{ maxWidth: { xs: '100%', md: '50%' } }}>
              <FormControl fullWidth>
                <InputLabel>Default Video Quality</InputLabel>
                <Select
                  value={defaultQuality}
                  label="Default Video Quality"
                  onChange={(e) => setDefaultQuality(e.target.value as string)}
                >
                  <MenuItem value="480p">480p</MenuItem>
                  <MenuItem value="720p">720p</MenuItem>
                  <MenuItem value="1080p">1080p (HD)</MenuItem>
                  <MenuItem value="4k">4K (Ultra HD)</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleAppSettingSave}
              >
                Save Settings
              </Button>
            </Box>
          </Stack>
        </TabPanel>
        
        {/* Admin Tab - Only shown for admin users */}
        {user?.isAdmin && (
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" gutterBottom>Admin Settings</Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Stack spacing={4}>
              {/* Server Control Section */}
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Server Management</Typography>
                <Stack direction="row" spacing={2}>
                  <Button variant="contained" color="primary">
                    Restart Server
                  </Button>
                  <Button variant="outlined" color="secondary">
                    View Logs
                  </Button>
                  <Button variant="outlined">
                    Clear Cache
                  </Button>
                </Stack>
              </Box>
              
              <Divider />
              
              {/* Real-Time WebSocket Testing */}
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>WebSocket Monitoring</Typography>
                <WebSocketTester />
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="outlined" 
                  color="primary"
                  onClick={() => window.open('/admin', '_blank')}
                >
                  Open Admin Interface
                </Button>
              </Box>
            </Stack>
          </TabPanel>
        )}
      </Paper>
    </Box>
  );
};

export default SettingsPage;