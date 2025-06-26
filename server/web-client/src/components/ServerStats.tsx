import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Grid, 
  Typography, 
  LinearProgress, 
  Chip,
  Stack,
  Divider
} from '@mui/material';
import { 
  Memory as MemoryIcon,
  Storage as StorageIcon,
  PlayCircle as StreamIcon,
  Person as ViewerIcon,
  Movie as MediaIcon
} from '@mui/icons-material';
import { useWebSocket } from '../contexts/WebSocketContext';

// Format bytes to human readable format
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Format uptime to human readable format
const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

// Server stats component for displaying real-time server metrics
const ServerStats: React.FC = () => {
  const { isConnected, serverStats, activeScans, activeStreams } = useWebSocket();
  
  // Function to render scan progress
  const renderScanProgress = () => {
    if (activeScans.size === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No active library scans
        </Typography>
      );
    }
    
    return Array.from(activeScans.entries()).map(([libraryId, scan]) => (
      <Box key={libraryId} sx={{ mt: 1, mb: 1 }}>
        <Typography variant="body2">
          Scanning library: {scan.progress}% ({scan.processedFiles}/{scan.totalFiles})
        </Typography>
        <LinearProgress variant="determinate" value={scan.progress} sx={{ mt: 0.5 }} />
      </Box>
    ));
  };
  
  if (!isConnected) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" color="error">
            Server Disconnected
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Attempting to reconnect...
          </Typography>
        </CardContent>
      </Card>
    );
  }
  
  if (!serverStats) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">
            Server Statistics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Loading server information...
          </Typography>
          <LinearProgress sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Server Statistics 
          <Chip 
            label="Live" 
            color="success" 
            size="small" 
            sx={{ ml: 1, height: 20 }} 
          />
        </Typography>
        
        <Grid container spacing={2}>
          {/* CPU Usage */}
          <Grid item xs={12} sm={6} md={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              <MemoryIcon color="primary" />
              <Typography variant="body2">
                CPU: {serverStats.cpu}%
              </Typography>
            </Stack>
            <LinearProgress 
              variant="determinate" 
              value={serverStats.cpu} 
              sx={{ mt: 1 }} 
              color={serverStats.cpu > 80 ? "error" : "primary"} 
            />
          </Grid>
          
          {/* Memory Usage */}
          <Grid item xs={12} sm={6} md={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              <MemoryIcon color="primary" />
              <Typography variant="body2">
                Memory: {serverStats.memory}%
              </Typography>
            </Stack>
            <LinearProgress 
              variant="determinate" 
              value={serverStats.memory} 
              sx={{ mt: 1 }} 
              color={serverStats.memory > 80 ? "error" : "primary"} 
            />
          </Grid>
          
          {/* Disk Usage */}
          <Grid item xs={12} sm={6} md={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              <StorageIcon color="primary" />
              <Typography variant="body2">
                Disk: {formatBytes(serverStats.diskUsage)}/{formatBytes(serverStats.diskUsage + serverStats.diskFree)}
              </Typography>
            </Stack>
            <LinearProgress 
              variant="determinate" 
              value={(serverStats.diskUsage / (serverStats.diskUsage + serverStats.diskFree)) * 100} 
              sx={{ mt: 1 }} 
            />
          </Grid>
          
          {/* Active Streams */}
          <Grid item xs={6} sm={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              <StreamIcon color="secondary" />
              <Typography variant="body2">
                Streams: {serverStats.activeStreams}
              </Typography>
            </Stack>
          </Grid>
          
          {/* Active Viewers */}
          <Grid item xs={6} sm={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ViewerIcon color="secondary" />
              <Typography variant="body2">
                Viewers: {serverStats.activeViewers}
              </Typography>
            </Stack>
          </Grid>
          
          {/* Total Media */}
          <Grid item xs={6} sm={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              <MediaIcon color="secondary" />
              <Typography variant="body2">
                Media: {serverStats.totalMedia}
              </Typography>
            </Stack>
          </Grid>
          
          {/* Uptime */}
          <Grid item xs={6} sm={3}>
            <Typography variant="body2">
              Uptime: {formatUptime(serverStats.uptime)}
            </Typography>
          </Grid>
        </Grid>
        
        <Divider sx={{ mt: 2, mb: 2 }} />
        
        {/* Library Scan Progress */}
        <Typography variant="subtitle2" gutterBottom>
          Active Tasks
        </Typography>
        {renderScanProgress()}
        
        {/* Display active streams if any */}
        {activeStreams.size > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              Active Streams: {activeStreams.size}
            </Typography>
            {Array.from(activeStreams.keys()).map(streamId => (
              <Chip 
                key={streamId}
                label={`Stream ${streamId}`}
                size="small"
                color="primary"
                sx={{ mr: 0.5, mt: 0.5 }}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ServerStats;
