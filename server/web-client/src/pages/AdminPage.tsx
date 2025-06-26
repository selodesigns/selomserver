import React, { useState } from 'react';
import { 
  Box, 
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  Divider,
  Alert
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  VideoLibrary as LibraryIcon,
  Settings as SettingsIcon,
  Assessment as LogsIcon,
  OndemandVideo as StreamIcon,
  Tune as TuneIcon
} from '@mui/icons-material';

// Admin Components
import Dashboard from '../components/admin/Dashboard';
import UserManagement from '../components/admin/UserManagement';
import LibraryManagement from '../components/admin/LibraryManagement';
import ServerSettings from '../components/admin/ServerSettings';
import ActivityLogs from '../components/admin/ActivityLogs';
import StreamMonitor from '../components/admin/StreamMonitor';
import TranscodingSettings from '../components/admin/TranscodingSettings';

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
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Admin Page
const AdminPage = () => {
  // Active tab state
  const [activeTab, setActiveTab] = useState(0);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Panel
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Manage your SELO Media Server
        </Typography>
        <Divider />
      </Box>

      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          aria-label="admin panel tabs"
        >
          <Tab icon={<DashboardIcon />} label="Dashboard" iconPosition="start" />
          <Tab icon={<PeopleIcon />} label="Users" iconPosition="start" />
          <Tab icon={<LibraryIcon />} label="Libraries" iconPosition="start" />
          <Tab icon={<SettingsIcon />} label="Server Settings" iconPosition="start" />
          <Tab icon={<LogsIcon />} label="Logs" iconPosition="start" />
          <Tab icon={<StreamIcon />} label="Streams" iconPosition="start" />
          <Tab icon={<TuneIcon />} label="Transcoding" iconPosition="start" />
        </Tabs>
      </Paper>

      <TabPanel value={activeTab} index={0}>
        <Dashboard />
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
      <TabPanel value={activeTab} index={6}>
        <TranscodingSettings />
      </TabPanel>
    </Container>
  );
};

export default AdminPage;
