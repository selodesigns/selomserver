import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Card,
  CardContent,
  Alert,
  TextField,
  useTheme
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

// Context
import { useWebSocket } from '../contexts/WebSocketContext';

// API Service for test functions
import apiService from '../services/api';

const WebSocketTester: React.FC = () => {
  const theme = useTheme();
  const { isConnected } = useWebSocket();
  
  const [messages, setMessages] = useState<{event: string, data: any, time: string}[]>([]);
  const [testMessage, setTestMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Listen for all Socket.IO events for testing purposes
  useEffect(() => {
    const events = [
      'server_announcement', 'scan_progress', 'media_added', 
      'media_updated', 'media_removed', 'stream_started', 
      'stream_stopped', 'viewer_joined', 'viewer_left',
      'server_stats', 'transcode_progress'
    ];
    
    const handlers: {[key: string]: (data: any) => void} = {};
    
    // Create event handlers for each event type
    events.forEach(eventType => {
      // Create handler for this event type
      const handler = (data: any) => {
        console.log(`Socket event received: ${eventType}`, data);
        
        setMessages(prev => [
          {
            event: eventType,
            data,
            time: new Date().toLocaleTimeString()
          },
          ...prev.slice(0, 19) // Keep last 20 messages
        ]);
      };
      
      // Attach custom event handler to document for this event
      document.addEventListener(eventType, handler);
      
      // Store handler reference so we can remove it later
      handlers[eventType] = handler;
    });
    
    // Cleanup function to remove event listeners
    return () => {
      events.forEach(eventType => {
        if (handlers[eventType]) {
          document.removeEventListener(eventType, handlers[eventType]);
        }
      });
    };
  }, []);
  
  // Send test announcement for testing purposes
  const sendTestAnnouncement = async () => {
    if (!testMessage.trim()) {
      setError('Please enter a message');
      return;
    }
    
    try {
      setError(null);
      const response = await apiService.post('/api/admin/test-broadcast', {
        message: testMessage,
        type: 'info'
      });
      
      if (response && response.data) {
        setTestMessage('');
      } else {
        setError('Failed to send test announcement');
      }
    } catch (err) {
      console.error('Error sending test announcement:', err);
      setError('Failed to send test announcement. Check console for details.');
    }
  };
  
  // Trigger a library scan for testing progress events
  const triggerLibraryScan = async () => {
    try {
      setError(null);
      // Get the first library
      const librariesResponse = await apiService.getLibraries();
      if (librariesResponse.success && librariesResponse.data && librariesResponse.data.length > 0) {
        const libraryId = librariesResponse.data[0].id;
        
        // Trigger scan for this library
        const response = await apiService.post(`/api/library/sections/${libraryId}/scan`);
        if (!response || !response.data) {
          setError('Failed to trigger library scan');
        }
      } else {
        setError('No libraries found to scan');
      }
    } catch (err) {
      console.error('Error triggering library scan:', err);
      setError('Failed to trigger library scan. Check console for details.');
    }
  };
  
  // Clear all messages
  const clearMessages = () => {
    setMessages([]);
  };
  
  return (
    <Card 
      variant="outlined"
      sx={{
        mb: 4,
        overflow: 'hidden',
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          WebSocket Tester
        </Typography>
        
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <Chip 
            label={isConnected ? 'Connected' : 'Disconnected'} 
            color={isConnected ? 'success' : 'error'} 
            size="small"
            sx={{ mr: 2 }}
          />
          <Typography variant="body2" color="text.secondary">
            Monitor and test real-time events
          </Typography>
        </Box>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
        
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <TextField
            label="Test Message"
            variant="outlined"
            size="small"
            fullWidth
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter a test message to broadcast"
          />
          <Button 
            variant="contained" 
            startIcon={<SendIcon />}
            onClick={sendTestAnnouncement}
          >
            Send
          </Button>
        </Stack>
        
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button 
            variant="outlined"
            onClick={triggerLibraryScan}
          >
            Trigger Library Scan
          </Button>
          <Button 
            variant="outlined" 
            color="secondary"
            startIcon={<DeleteSweepIcon />}
            onClick={clearMessages}
          >
            Clear Messages
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Reconnect
          </Button>
        </Stack>
        
        <Paper
          variant="outlined"
          sx={{
            maxHeight: 400,
            overflow: 'auto',
            backgroundColor: theme.palette.background.default,
          }}
        >
          <List dense sx={{ py: 0 }}>
            {messages.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="No events received yet"
                  secondary="Waiting for real-time events..."
                />
              </ListItem>
            ) : (
              messages.map((msg, index) => (
                <React.Fragment key={`${msg.event}-${index}`}>
                  {index > 0 && <Divider component="li" />}
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Chip 
                            label={msg.event} 
                            color="primary" 
                            size="small" 
                            sx={{ mr: 1 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {msg.time}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography 
                          variant="body2" 
                          component="pre" 
                          sx={{ 
                            mt: 1,
                            p: 1, 
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1,
                            maxHeight: 100,
                            overflow: 'auto',
                            fontSize: '0.75rem'
                          }}
                        >
                          {JSON.stringify(msg.data, null, 2)}
                        </Typography>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))
            )}
          </List>
        </Paper>
      </CardContent>
    </Card>
  );
};

export default WebSocketTester;
