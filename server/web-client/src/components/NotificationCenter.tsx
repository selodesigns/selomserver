import React, { useState, useEffect } from 'react';
import {
  Badge,
  Box,
  IconButton,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';

// Icons
import NotificationsIcon from '@mui/icons-material/Notifications';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MovieIcon from '@mui/icons-material/Movie';
import PeopleIcon from '@mui/icons-material/People';
import StorageIcon from '@mui/icons-material/Storage';
import ScannerIcon from '@mui/icons-material/Scanner';

// Context
import { useWebSocket } from '../contexts/WebSocketContext';
import type { ServerAnnouncement } from '../contexts/WebSocketContext';

// Convert timestamp to relative time (e.g., "2 minutes ago")
const getRelativeTime = (timestamp: string) => {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffMs = now.getTime() - eventTime.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  return eventTime.toLocaleDateString();
};

// Select the appropriate icon based on notification type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'info':
      return <InfoIcon color="info" />;
    case 'warning':
      return <WarningIcon color="warning" />;
    case 'error':
      return <ErrorIcon color="error" />;
    case 'success':
      return <CheckCircleIcon color="success" />;
    case 'media':
      return <MovieIcon color="primary" />;
    case 'user':
      return <PeopleIcon color="secondary" />;
    case 'server':
      return <StorageIcon color="action" />;
    case 'scan':
      return <ScannerIcon color="primary" />;
    default:
      return <InfoIcon />;
  }
};

interface NotificationItem extends ServerAnnouncement {
  category?: string;
  details?: string;
  read?: boolean;
  id: string;
}

const NotificationCenter = () => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { recentAnnouncements, activeScans, activeStreams } = useWebSocket();
  
  // Convert server announcements to notification items
  useEffect(() => {
    if (recentAnnouncements.length > 0) {
      const newNotifications = recentAnnouncements.map((announcement, index) => ({
        ...announcement,
        id: `announcement-${announcement.timestamp}-${index}`,
        category: 'server',
        read: false
      }));
      
      setNotifications(prev => {
        // Only add notifications that don't already exist
        const existingIds = new Set(prev.map(n => n.id));
        const newItems = newNotifications.filter(n => !existingIds.has(n.id));
        if (newItems.length === 0) return prev;
        
        // Update unread count
        setUnreadCount(count => count + newItems.length);
        
        // Combine and sort by timestamp (newest first)
        return [...newItems, ...prev]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 20); // Keep only last 20 notifications
      });
    }
  }, [recentAnnouncements]);
  
  // Add notifications for active scans
  useEffect(() => {
    if (activeScans.size > 0) {
      const scanNotifications: NotificationItem[] = [];
      
      activeScans.forEach((scan) => {
        scanNotifications.push({
          id: `scan-${scan.libraryId}-${Date.now()}`,
          message: `Library scan in progress: ${scan.processedFiles}/${scan.totalFiles} files (${scan.progress}%)`,
          type: 'info',
          timestamp: new Date().toISOString(),
          category: 'scan',
          details: `Library ID: ${scan.libraryId}`,
          read: false
        });
      });
      
      if (scanNotifications.length > 0) {
        setNotifications(prev => {
          // Remove old scan notifications for the same libraries
          const newScanLibraryId = scanNotifications[0].details?.split(':')[1]?.trim() || '';
          const filtered = prev.filter(n => 
            !(n.category === 'scan' && n.details && n.details.includes(newScanLibraryId))
          );
          
          // Update unread count
          setUnreadCount(count => count + scanNotifications.length);
          
          // Add new scan notifications
          return [...scanNotifications, ...filtered]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 20); // Keep only last 20 notifications
        });
      }
    }
  }, [activeScans]);
  
  // Add notifications for stream events
  useEffect(() => {
    if (activeStreams.size > 0) {
      const streamNotifications: NotificationItem[] = [];
      
      activeStreams.forEach((stream, id) => {
        streamNotifications.push({
          id: `stream-${id}-${Date.now()}`,
          message: `Stream active: ${stream.title || 'Unnamed stream'}`,
          type: 'success',
          timestamp: new Date().toISOString(),
          category: 'media',
          details: `${stream.viewers || 0} viewer(s)`,
          read: false
        });
      });
      
      if (streamNotifications.length > 0) {
        setNotifications(prev => {
          // Remove old stream notifications for the same streams
          const newStreamId = streamNotifications[0].id.split('-')[1];
          const filtered = prev.filter(n => 
            !(n.id.startsWith('stream-') && n.id.split('-')[1] === newStreamId)
          );
          
          // Update unread count (only if it's a new stream)
          if (filtered.length < prev.length) {
            setUnreadCount(count => count + streamNotifications.length);
          }
          
          // Add new stream notifications
          return [...streamNotifications, ...filtered]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 20); // Keep only last 20 notifications
        });
      }
    }
  }, [activeStreams]);
  
  const handleOpenNotifications = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleCloseNotifications = () => {
    setAnchorEl(null);
    
    // Mark all as read when closing
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };
  
  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    setAnchorEl(null);
  };
  
  const open = Boolean(anchorEl);
  
  return (
    <>
      <Tooltip title="Notifications">
        <IconButton 
          color="inherit" 
          onClick={handleOpenNotifications}
          sx={{ ml: 2 }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleCloseNotifications}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{
          mt: 1,
        }}
      >
        <Box 
          sx={{ 
            width: 320,
            maxHeight: 500,
          }}
        >
          <Box 
            sx={{ 
              p: 2, 
              display: 'flex', 
              justifyContent: 'space-between',
              borderBottom: `1px solid ${theme.palette.divider}`
            }}
          >
            <Typography variant="h6">Notifications</Typography>
            <Typography 
              variant="body2" 
              color="primary" 
              sx={{ cursor: 'pointer' }}
              onClick={handleClearAll}
            >
              Clear all
            </Typography>
          </Box>
          
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto', py: 0 }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  {index > 0 && <Divider component="li" />}
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      backgroundColor: notification.read ? 'transparent' : alpha(theme.palette.primary.main, 0.08),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ mt: 1, minWidth: 40 }}>
                      {getNotificationIcon(notification.category || notification.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={notification.message}
                      secondary={
                        <>
                          {notification.details && (
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                              display="block"
                            >
                              {notification.details}
                            </Typography>
                          )}
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                          >
                            {getRelativeTime(notification.timestamp)}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationCenter;
