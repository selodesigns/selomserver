import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import PersonIcon from '@mui/icons-material/Person';
import MovieIcon from '@mui/icons-material/Movie';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';

// Import services

import apiService from '../../services/api';
import type { ServerStats } from '../../types';

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activeStreams, setActiveStreams] = useState<number>(0);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  
  // Fetch initial data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch server stats
        const statsResponse = await apiService.post('/api/admin/stats');
        if (statsResponse && statsResponse.data) {
          setServerStats(statsResponse.data);
        }
        
        // Fetch recent activity
        const activityResponse = await apiService.post('/api/admin/activity');
        if (activityResponse && activityResponse.data) {
          setRecentActivity(activityResponse.data.slice(0, 10));
        }
        
        // Fetch active streams and users
        const streamsResponse = await apiService.post('/api/admin/streams');
        if (streamsResponse && streamsResponse.data) {
          setActiveStreams(streamsResponse.data.length);
        }
        
        const usersResponse = await apiService.post('/api/admin/sessions');
        if (usersResponse && usersResponse.data) {
          setActiveUsers(usersResponse.data.length);
        }
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
    
    // Set up interval to refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Handle manual refresh
  const handleRefresh = () => {
    setLoading(true);
    // Re-fetch all data
    // Using the useEffect dependencies would be better, but this is a simpler approach for now
    window.location.reload();
  };
  
  // Format bytes to human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">
          Server Dashboard
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <React.Fragment>
          {/* System Status Cards */}
          <Grid container spacing={3} mb={4}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardHeader 
                  avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><MemoryIcon /></Avatar>}
                  title="CPU Usage"
                />
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
                      {serverStats?.cpu?.usage || 0}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={serverStats?.cpu?.usage || 0} 
                    color={serverStats?.cpu?.usage && serverStats.cpu.usage > 80 ? "error" : "primary"}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {serverStats?.cpu?.cores || 0} Cores, {serverStats?.cpu?.model || 'Unknown'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardHeader 
                  avatar={<Avatar sx={{ bgcolor: 'secondary.main' }}><StorageIcon /></Avatar>}
                  title="Memory"
                />
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
                      {serverStats?.memory?.usage || 0}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={serverStats?.memory?.usage || 0}
                    color={serverStats?.memory?.usage && serverStats.memory.usage > 80 ? "error" : "secondary"}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {formatBytes(serverStats?.memory?.used || 0)} of {formatBytes(serverStats?.memory?.total || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardHeader 
                  avatar={<Avatar sx={{ bgcolor: 'success.main' }}><SaveIcon /></Avatar>}
                  title="Disk Space"
                />
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
                      {serverStats?.disk?.usage || 0}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={serverStats?.disk?.usage || 0}
                    color={serverStats?.disk?.usage && serverStats.disk.usage > 80 ? "error" : "success"}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {formatBytes(serverStats?.disk?.free || 0)} free of {formatBytes(serverStats?.disk?.total || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardHeader 
                  avatar={<Avatar sx={{ bgcolor: 'warning.main' }}><SpeedIcon /></Avatar>}
                  title="Network"
                />
                <CardContent>
                  <Typography variant="h5" component="div">
                    {formatBytes((serverStats?.network?.bytesReceived || 0) / 1024)}/s
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    In: {formatBytes(serverStats?.network?.bytesReceived || 0)}/s
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Out: {formatBytes(serverStats?.network?.bytesSent || 0)}/s
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Server Status Cards */}
          <Grid container spacing={3} mb={4}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="div">
                    <PersonIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Active Users
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ textAlign: 'center', my: 2 }}>
                    {activeUsers}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="div">
                    <PlayArrowIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Active Streams
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ textAlign: 'center', my: 2 }}>
                    {activeStreams}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="div">
                    <MovieIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Total Media
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ textAlign: 'center', my: 2 }}>
                    {serverStats?.media?.count || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="div">
                    <StorageIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Storage Used
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ textAlign: 'center', my: 2 }}>
                    {formatBytes(serverStats?.media?.size || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Recent Activity */}
          <Grid container spacing={3}>
            <Grid size={12}>
              <Card>
                <CardHeader title="Recent Activity" />
                <CardContent>
                  <List>
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity, index) => (
                        <React.Fragment key={activity.id}>
                          <ListItem>
                            <ListItemText
                              primary={activity.description}
                              secondary={`${activity.user} • ${new Date(activity.timestamp).toLocaleString()}`}
                            />
                          </ListItem>
                          {index < recentActivity.length - 1 && <Divider />}
                        </React.Fragment>
                      ))
                    ) : (
                      <ListItem>
                        <ListItemText primary="No recent activity" />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </React.Fragment>
      )}
    </Box>
  );
};

export default AdminDashboard;
