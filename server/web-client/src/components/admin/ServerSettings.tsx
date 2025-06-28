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

  Alert,
  Snackbar,
  CircularProgress,
  Tab,
  Tabs,
  InputAdornment,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';

// API Service
import apiService from '../../services/api';

// Tab Panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
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

// Settings interface
interface ServerSettingsData {
  general: {
    serverName: string;
    serverDescription: string;
    allowRegistration: boolean;
    serverPort: number;
    serverUrl: string;
    enableLogs: boolean;
    logLevel: string;
  };
  stream: {
    maxConcurrentStreams: number;
    transcodingEnabled: boolean;
    defaultQuality: string;
    bufferSize: number;
    useHardwareAcceleration: boolean;
    allowDirectPlay: boolean;
    allowDirectStream: boolean;
  };
  security: {
    sessionTimeout: number;
    maxFailedLogins: number;
    enableRateLimit: boolean;
    rateLimitRequests: number;
    rateLimitWindow: number;
    enableTwoFactor: boolean;
    requirePasswordChange: number;
    minimumPasswordLength: number;
    requireStrongPasswords: boolean;
  };
  storage: {
    thumbnailPath: string;
    cachePath: string;
    tempPath: string;
    maxCacheSize: number;
    autoClearCache: boolean;
    backupEnabled: boolean;
    backupPath: string;
    backupSchedule: string;
    backupRetention: number;
  };
}

// Server Settings Component
const ServerSettings: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Loading state
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  
  // Settings state
  const [settings, setSettings] = useState<ServerSettingsData>({
    general: {
      serverName: 'SELO Media Server',
      serverDescription: '',
      allowRegistration: true,
      serverPort: 3241,
      serverUrl: '',
      enableLogs: true,
      logLevel: 'info',
    },
    stream: {
      maxConcurrentStreams: 5,
      transcodingEnabled: true,
      defaultQuality: '1080p',
      bufferSize: 10,
      useHardwareAcceleration: true,
      allowDirectPlay: true,
      allowDirectStream: true,
    },
    security: {
      sessionTimeout: 24,
      maxFailedLogins: 5,
      enableRateLimit: true,
      rateLimitRequests: 100,
      rateLimitWindow: 15,
      enableTwoFactor: false,
      requirePasswordChange: 90,
      minimumPasswordLength: 8,
      requireStrongPasswords: true,
    },
    storage: {
      thumbnailPath: '',
      cachePath: '',
      tempPath: '',
      maxCacheSize: 1024,
      autoClearCache: true,
      backupEnabled: false,
      backupPath: '',
      backupSchedule: 'daily',
      backupRetention: 7,
    }
  });
  
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
  
  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);
  
  // Fetch server settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.post('/api/admin/settings');
      
      if (response && response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showNotification('Failed to load server settings', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Save settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Only send the active tab settings to avoid overwriting other settings
      let settingsToSave;
      
      switch (activeTab) {
        case 0:
          settingsToSave = { general: settings.general };
          break;
        case 1:
          settingsToSave = { stream: settings.stream };
          break;
        case 2:
          settingsToSave = { security: settings.security };
          break;
        case 3:
          settingsToSave = { storage: settings.storage };
          break;
        default:
          settingsToSave = settings;
      }
      
      const response = await apiService.post('/api/admin/settings/update', settingsToSave);
      
      if (response && response.data) {
        showNotification('Settings saved successfully', 'success');
      } else {
        showNotification('Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('Failed to save settings', 'error');
    } finally {
      setSaving(false);
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
  const handleNotificationClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    
    setNotification(prevNotification => ({
      ...prevNotification,
      open: false
    }));
  };
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Handle form field change
  const handleChange = (section: keyof ServerSettingsData, field: string, value: any) => {
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [field]: value
      }
    });
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">
          Server Settings
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchSettings}
            sx={{ mr: 1 }}
            disabled={loading || saving}
          >
            Refresh
          </Button>
          
          <Button 
            variant="contained" 
            startIcon={<SaveIcon />} 
            onClick={saveSettings}
            disabled={loading || saving}
          >
            Save Changes
          </Button>
        </Box>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="General" />
            <Tab label="Streaming" />
            <Tab label="Security" />
            <Tab label="Storage & Backup" />
          </Tabs>
          
          {/* General Settings */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Server Name"
                  variant="outlined"
                  fullWidth
                  value={settings.general.serverName}
                  onChange={(e) => handleChange('general', 'serverName', e.target.value)}
                  margin="normal"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Server Description"
                  variant="outlined"
                  fullWidth
                  value={settings.general.serverDescription}
                  onChange={(e) => handleChange('general', 'serverDescription', e.target.value)}
                  margin="normal"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Server Port"
                  variant="outlined"
                  fullWidth
                  type="number"
                  value={settings.general.serverPort}
                  onChange={(e) => handleChange('general', 'serverPort', parseInt(e.target.value) || 3241)}
                  margin="normal"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Server URL"
                  variant="outlined"
                  fullWidth
                  value={settings.general.serverUrl}
                  onChange={(e) => handleChange('general', 'serverUrl', e.target.value)}
                  margin="normal"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.general.allowRegistration}
                      onChange={(e) => handleChange('general', 'allowRegistration', e.target.checked)}
                    />
                  }
                  label="Allow User Registration"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.general.enableLogs}
                      onChange={(e) => handleChange('general', 'enableLogs', e.target.checked)}
                    />
                  }
                  label="Enable Logs"
                />
              </Box>
            </Box>
          </TabPanel>
          
          {/* Streaming Settings */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Max Concurrent Streams"
                  variant="outlined"
                  fullWidth
                  type="number"
                  value={settings.stream.maxConcurrentStreams}
                  onChange={(e) => handleChange('stream', 'maxConcurrentStreams', parseInt(e.target.value) || 5)}
                  margin="normal"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <FormControl variant="outlined" fullWidth margin="normal">
                  <InputLabel>Default Quality</InputLabel>
                  <Select
                    value={settings.stream.defaultQuality}
                    onChange={(e) => handleChange('stream', 'defaultQuality', e.target.value)}
                    label="Default Quality"
                  >
                    <MenuItem value="480p">480p</MenuItem>
                    <MenuItem value="720p">720p</MenuItem>
                    <MenuItem value="1080p">1080p</MenuItem>
                    <MenuItem value="4k">4K</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Buffer Size"
                  variant="outlined"
                  fullWidth
                  type="number"
                  value={settings.stream.bufferSize}
                  onChange={(e) => handleChange('stream', 'bufferSize', parseInt(e.target.value) || 10)}
                  margin="normal"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">MB</InputAdornment>,
                  }}
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.stream.transcodingEnabled}
                      onChange={(e) => handleChange('stream', 'transcodingEnabled', e.target.checked)}
                    />
                  }
                  label="Enable Transcoding"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.stream.useHardwareAcceleration}
                      onChange={(e) => handleChange('stream', 'useHardwareAcceleration', e.target.checked)}
                    />
                  }
                  label="Use Hardware Acceleration"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.stream.allowDirectPlay}
                      onChange={(e) => handleChange('stream', 'allowDirectPlay', e.target.checked)}
                    />
                  }
                  label="Allow Direct Play"
                />
              </Box>
            </Box>
          </TabPanel>
          
          {/* Security Settings */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Session Timeout"
                  variant="outlined"
                  fullWidth
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => handleChange('security', 'sessionTimeout', parseInt(e.target.value) || 24)}
                  margin="normal"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                  }}
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Max Failed Logins"
                  variant="outlined"
                  fullWidth
                  type="number"
                  value={settings.security.maxFailedLogins}
                  onChange={(e) => handleChange('security', 'maxFailedLogins', parseInt(e.target.value) || 5)}
                  margin="normal"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Minimum Password Length"
                  variant="outlined"
                  fullWidth
                  type="number"
                  value={settings.security.minimumPasswordLength}
                  onChange={(e) => handleChange('security', 'minimumPasswordLength', parseInt(e.target.value) || 8)}
                  margin="normal"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Require Password Change"
                  variant="outlined"
                  fullWidth
                  type="number"
                  value={settings.security.requirePasswordChange}
                  onChange={(e) => handleChange('security', 'requirePasswordChange', parseInt(e.target.value) || 90)}
                  margin="normal"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">days</InputAdornment>,
                  }}
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.security.enableRateLimit}
                      onChange={(e) => handleChange('security', 'enableRateLimit', e.target.checked)}
                    />
                  }
                  label="Enable Rate Limiting"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.security.enableTwoFactor}
                      onChange={(e) => handleChange('security', 'enableTwoFactor', e.target.checked)}
                    />
                  }
                  label="Enable Two-Factor Authentication"
                />
              </Box>
            </Box>
          </TabPanel>
          
          {/* Storage & Backup Settings */}
          <TabPanel value={activeTab} index={3}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Thumbnail Path"
                  variant="outlined"
                  fullWidth
                  value={settings.storage.thumbnailPath}
                  onChange={(e) => handleChange('storage', 'thumbnailPath', e.target.value)}
                  margin="normal"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Cache Path"
                  variant="outlined"
                  fullWidth
                  value={settings.storage.cachePath}
                  onChange={(e) => handleChange('storage', 'cachePath', e.target.value)}
                  margin="normal"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Temp Path"
                  variant="outlined"
                  fullWidth
                  value={settings.storage.tempPath}
                  onChange={(e) => handleChange('storage', 'tempPath', e.target.value)}
                  margin="normal"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Max Cache Size"
                  variant="outlined"
                  fullWidth
                  type="number"
                  value={settings.storage.maxCacheSize}
                  onChange={(e) => handleChange('storage', 'maxCacheSize', parseInt(e.target.value) || 1024)}
                  margin="normal"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">MB</InputAdornment>,
                  }}
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.storage.autoClearCache}
                      onChange={(e) => handleChange('storage', 'autoClearCache', e.target.checked)}
                    />
                  }
                  label="Auto Clear Cache"
                />
              </Box>
              
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.storage.backupEnabled}
                      onChange={(e) => handleChange('storage', 'backupEnabled', e.target.checked)}
                    />
                  }
                  label="Enable Automated Backups"
                />
              </Box>
              
              {settings.storage.backupEnabled && (
                <>
                  <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                    <TextField
                      label="Backup Path"
                      variant="outlined"
                      fullWidth
                      value={settings.storage.backupPath}
                      onChange={(e) => handleChange('storage', 'backupPath', e.target.value)}
                      margin="normal"
                    />
                  </Box>
                  
                  <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                    <FormControl variant="outlined" fullWidth margin="normal">
                      <InputLabel>Backup Schedule</InputLabel>
                      <Select
                        value={settings.storage.backupSchedule}
                        onChange={(e) => handleChange('storage', 'backupSchedule', e.target.value)}
                        label="Backup Schedule"
                      >
                        <MenuItem value="hourly">Hourly</MenuItem>
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="weekly">Weekly</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                    <TextField
                      label="Backup Retention"
                      variant="outlined"
                      fullWidth
                      type="number"
                      value={settings.storage.backupRetention}
                      onChange={(e) => handleChange('storage', 'backupRetention', parseInt(e.target.value) || 7)}
                      margin="normal"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">days</InputAdornment>,
                      }}
                    />
                  </Box>
                </>
              )}
            </Box>
          </TabPanel>
        </Paper>
      )}
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification?.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
      >
        <Alert 
          onClose={handleNotificationClose} 
          severity={notification?.severity} 
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ServerSettings;
