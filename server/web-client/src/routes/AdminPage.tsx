import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab,
  Grid,
  Divider,
  Alert,
  useTheme
} from '@mui/material';
import { Navigate } from 'react-router-dom';

// Admin Components
import AdminDashboard from '../components/admin/Dashboard';
import UserManagement from '../components/admin/UserManagement';
import LibraryManagement from '../components/admin/LibraryManagement';
import ServerSettings from '../components/admin/ServerSettings';
import ActivityLogs from '../components/admin/ActivityLogs';
import StreamMonitor from '../components/admin/StreamMonitor';

// Context
import { useAuth } from '../contexts/AuthContext';

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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3, px: 1 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Admin Page Component
const AdminPage: React.FC = () => {
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  // Handle unauthorized access - redirect non-admin users
  if (!isAuthenticated || !user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3, maxWidth: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Welcome to the SELO Media Server Administration Panel. Changes made here affect the entire server.
      </Alert>

      <Paper sx={{ mb: 4, width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="admin navigation tabs"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Tab label="Dashboard" />
          <Tab label="User Management" />
          <Tab label="Library Management" />
          <Tab label="Server Settings" />
          <Tab label="Activity Logs" />
          <Tab label="Stream Monitor" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <AdminDashboard />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <UserManagement />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <LibraryManagement />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <ServerSettings />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <ActivityLogs />
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <StreamMonitor />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AdminPage;
