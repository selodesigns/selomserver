import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Grid,
  Chip,
  Stack,
  LinearProgress,
  Tooltip,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Stop as StopIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Movie as MovieIcon,
  LiveTv as LiveTvIcon,
} from '@mui/icons-material';

// WebSocket context for real-time updates
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useSnackbar } from 'notistack';

// API Service
import apiService from '../../services/api';

// Stream interface
interface Stream {
  id: string;
  userId: string;
  userName: string;
  mediaId: string;
  mediaTitle: string;
  mediaType: 'movie' | 'tvshow' | 'music' | 'photo';
  startTime: string;
  duration: number;
  progress: number;
  quality: string;
  bandwidth: number;
  sourceResolution: string;
  targetResolution: string;
  transcodingEnabled: boolean;
  directPlay: boolean;
  clientIp: string;
  clientDevice: string;
  clientBrowser: string;
  status: 'active' | 'buffering' | 'error' | 'stopped';
}

// Stream Detail Dialog component
interface StreamDetailProps {
  open: boolean;
  onClose: () => void;
  stream: Stream | null;
}

const StreamDetail: React.FC<StreamDetailProps & { onStopStream: (streamId: string) => void, stopLoading: boolean }> = ({ open, onClose, stream, onStopStream, stopLoading }) => {
  if (!stream) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Stream Details - {stream.mediaTitle}
      </DialogTitle>
      <DialogContent dividers>
        {/* ...same as before... */}
        <Box display="flex" flexWrap="wrap" gap={2}>
          {/* ...fields... */}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button 
          variant="contained" 
          color="error" 
          startIcon={<StopIcon />}
          onClick={() => stream && onStopStream(stream.id)}
          disabled={stopLoading}
        >
          {stopLoading ? 'Stopping...' : 'Stop Stream'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Stream Monitor Component
const StreamMonitor: React.FC = () => {
  // State variables
  const [loading, setLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // WebSocket context for real-time updates
  const { serverStats, activeStreams } = useWebSocket();

  // Convert activeStreams Map to array for rendering
  const streams = Array.from(activeStreams?.values?.() || []);

  // Use stats from context, fallback to default if missing
  // Compute stats with correct property names and fallbacks
  const stats = serverStats || {
    activeStreams: streams.length,
    cpu: 0,
    memory: 0,
    uptime: 0,
    activeViewers: 0,
    totalMedia: 0,
    diskUsage: 0,
    diskFree: 0,
  };
  // Compute total bandwidth from streams (not part of ServerStats interface)
  const totalBandwidth = streams.reduce((sum, s) => sum + (s.bandwidth || 0), 0);

  // Fetch active streams
  const fetchStreams = async () => {
    try {
      setLoading(true);
      await apiService.request.get('/api/admin/streams');
    } catch (error: any) {
      enqueueSnackbar('Error fetching streams', { variant: 'error' });
      console.error('Error fetching streams:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stop a stream
  const stopStream = async (streamId: string) => {
    setStopLoading(true);
    try {
      await apiService.request.post(`/api/admin/streams/${streamId}/stop`);
      if (selectedStream && selectedStream.id === streamId) {
        setDetailOpen(false);
      }
      enqueueSnackbar('Stream stopped successfully', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar('Failed to stop stream', { variant: 'error' });
      console.error('Error stopping stream:', error);
    } finally {
      setStopLoading(false);
    }
  };

  // Open stream detail dialog
  const openStreamDetail = (stream: Stream) => {
    setSelectedStream(stream);
    setDetailOpen(true);
  };

  // Close stream detail dialog
  const closeStreamDetail = () => {
    setDetailOpen(false);
  };

  // Get status chip color
  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'buffering':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get media icon based on type
  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'movie':
        return <MovieIcon />;
      case 'tvshow':
        return <LiveTvIcon />;
      default:
        return <MovieIcon />;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">
          Stream Monitor
        </Typography>
        
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />} 
          onClick={fetchStreams}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      
      {/* Stats Cards */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Streams
              </Typography>
              <Typography variant="h4" component="div">
                {stats?.activeStreams ?? streams.length}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Bandwidth
              </Typography>
              <Typography variant="h4" component="div">
                {(totalBandwidth / 1000000).toFixed(2)} Mbps
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                CPU Usage
              </Typography>
              <Box display="flex" alignItems="center">
                <Typography variant="h4" component="div" sx={{ mr: 1 }}>
                  {(stats?.cpu ?? 0).toFixed(1)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stats?.cpu ?? 0} 
                  sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                  color={(stats?.cpu ?? 0) > 80 ? "error" : (stats?.cpu ?? 0) > 60 ? "warning" : "primary"}
                />
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Memory Usage
              </Typography>
              <Box display="flex" alignItems="center">
                <Typography variant="h4" component="div" sx={{ mr: 1 }}>
                  {(stats?.memory ?? 0).toFixed(1)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stats?.memory ?? 0} 
                  sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                  color={(stats?.memory ?? 0) > 80 ? "error" : (stats?.memory ?? 0) > 60 ? "warning" : "primary"}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
      
      {/* Active Streams */}
      <Typography variant="h6" gutterBottom>
        Active Streams
      </Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <CircularProgress />
        </Box>
      ) : streams.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1">No active streams</Typography>
        </Paper>
      ) : (
        <Box display="flex" flexWrap="wrap" gap={2}>
          {streams.map(stream => (
            <Box key={stream.id} sx={{ flex: '1 1 300px', minWidth: 300, maxWidth: 400 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    {getMediaIcon(stream.mediaType)}
                    <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                      {stream.mediaTitle}
                    </Typography>
                    <Chip 
                      label={stream.status.toUpperCase()} 
                      color={getStatusColor(stream.status) as any}
                      size="small" 
                    />
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2">{stream.userName}</Typography>
                  </Stack>
                  
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <SpeedIcon fontSize="small" color="action" />
                    <Typography variant="body2">{(stream.bandwidth / 1000000).toFixed(2)} Mbps</Typography>
                  </Stack>
                  
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <StorageIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {stream.transcodingEnabled ? 'Transcoding' : 'Direct Play'} • {stream.quality}
                    </Typography>
                  </Stack>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Progress
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={stream.progress} 
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, textAlign: 'right' }}>
                      {stream.progress}%
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small"
                    startIcon={<InfoIcon />}
                    onClick={() => openStreamDetail(stream)}
                  >
                    Details
                  </Button>
                  <Button 
                    size="small"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={() => stopStream(stream.id)}
                  >
                    Stop Stream
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>
      )}
      
      {/* Stream Detail Dialog */}
      <StreamDetail
        open={detailOpen}
        onClose={closeStreamDetail}
        stream={selectedStream}
        onStopStream={stopStream}
        stopLoading={stopLoading}
      />
    </Box>
  );
};

export default StreamMonitor;
