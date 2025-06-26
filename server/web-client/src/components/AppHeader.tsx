import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  IconButton, 
  Avatar, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  Divider, 
  Tooltip, 
  InputBase, 
  alpha, 
  Paper, 
  ClickAwayListener, 
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import MovieIcon from '@mui/icons-material/Movie';
import PersonIcon from '@mui/icons-material/Person';
import PhotoIcon from '@mui/icons-material/Photo';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import TvIcon from '@mui/icons-material/Tv';

// Context
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';

// Services
import apiService from '../services/api';

// Components
import NotificationCenter from './NotificationCenter';

// Types
import type { Media } from '../types';

// Declare an additional property on the Window interface
declare global {
  interface Window {
    searchTimeout?: number;
  }
}

interface AppHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  sidebarWidth: number;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  sidebarOpen, 
  onToggleSidebar, 
  sidebarWidth 
}) => {
  const theme = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected } = useWebSocket();
  
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Search state
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Media[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // User menu state
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  // Utility function to determine which icon to show for each media type
  const getMediaIcon = (media: Media) => {
    if (!media.type) return <VideoFileIcon />;
    
    switch (media.type) {
      case 'movie':
        return <VideoFileIcon />;
      case 'photo':
        return <PhotoIcon />;
      case 'music':
        return <MusicNoteIcon />;
      case 'episode':
        return <TvIcon />;
      default:
        return <VideoFileIcon />;
    }
  };
  
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    handleCloseUserMenu();
    logout();
  };
  
  // Search handlers
  const handleSearchActivate = () => {
    setSearchActive(true);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };
  
  const handleSearchClose = () => {
    setSearchActive(false);
    setSearchQuery('');
    setShowSuggestions(false);
    setSearchResults([]);
  };
  
  // Listen for real-time updates that may affect search results
  useEffect(() => {
    if (!isConnected) return;
    
    // Refresh search results when new media is added or removed
    const handleMediaAdded = () => {
      if (searchQuery && searchResults.length > 0) {
        // Optionally refresh search results here
        debouncedSearch(searchQuery);
      }
    };
    
    document.addEventListener('media_added', handleMediaAdded);
    document.addEventListener('media_removed', handleMediaAdded);
    
    return () => {
      document.removeEventListener('media_added', handleMediaAdded);
      document.removeEventListener('media_removed', handleMediaAdded);
    };
  }, [isConnected, searchQuery, searchResults]);

  // Debounced search function to prevent excessive API calls
  const debouncedSearch = useCallback(
    async (query: string) => {
      if (!query || query.trim().length < 2) {
        setSearchResults([]);
        setShowSuggestions(false);
        setIsSearching(false);
        return;
      }
      
      try {
        setIsSearching(true);
        // Use the generic search endpoint instead
        const response = await apiService.post('/api/search', { query });
        if (response && response.data) {
          setSearchResults(response.data.slice(0, 5)); // Limit to top 5 results
          setShowSuggestions(true);
        } else {
          setSearchResults([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Error searching media:', error);
        setSearchResults([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );
  
  // Handle input change with debounce
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear previous timeout if exists
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }
    
    // Set a new timeout
    window.searchTimeout = window.setTimeout(() => {
      debouncedSearch(query);
    }, 300) as unknown as number; // 300ms debounce time
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      handleSearchClose();
    }
  };
  
  const handleSuggestionClick = (media: Media) => {
    navigate(`/media/${media.id}`);
    handleSearchClose();
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={0} 
      sx={{
        width: { md: sidebarOpen ? `calc(100% - ${sidebarWidth}px)` : '100%' },
        ml: { md: sidebarOpen ? `${sidebarWidth}px` : 0 },
        transition: theme.transitions.create(['margin', 'width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        borderBottom: `1px solid ${theme.palette.divider}`,
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onToggleSidebar}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        
        {!searchActive && (
          <>
            <MovieIcon sx={{ mr: 1, color: 'primary.main', display: { xs: 'none', sm: 'block' } }} />
            <Typography variant="h6" noWrap component="div" sx={{ 
              flexGrow: 1, 
              fontWeight: 'bold',
              display: { xs: 'none', sm: 'block' } 
            }}>
              SELO Media Server
            </Typography>
          </>
        )}
        
        {/* Search bar */}
        <Box 
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{
            position: 'relative',
            borderRadius: 1,
            backgroundColor: alpha(theme.palette.common.white, 0.15),
            '&:hover': {
              backgroundColor: alpha(theme.palette.common.white, 0.25),
            },
            width: searchActive ? '100%' : 'auto',
            ml: searchActive ? 0 : 2,
            mr: searchActive ? 2 : 0,
            flexGrow: searchActive ? 1 : 0,
            transition: theme.transitions.create(['width', 'flex-grow']),
          }}
        >
          {searchActive ? (
            <>
              <Box sx={{ 
                padding: theme.spacing(0, 2), 
                height: '100%', 
                position: 'absolute', 
                display: 'flex', 
                alignItems: 'center'
              }}>
                <SearchIcon />
              </Box>
              <InputBase
                placeholder="Search media…"
                value={searchQuery}
                onChange={handleSearchInputChange}
                inputRef={searchInputRef}
                autoFocus
                sx={{
                  color: 'inherit',
                  width: '100%',
                  '& .MuiInputBase-input': {
                    padding: theme.spacing(1, 1, 1, 0),
                    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
                    width: '100%',
                  },
                }}
              />
              <IconButton sx={{ position: 'absolute', right: 8, top: 4 }} onClick={handleSearchClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
              
              {/* Search suggestions dropdown */}
              {showSuggestions && searchResults.length > 0 && (
                <ClickAwayListener onClickAway={() => setShowSuggestions(false)}>
                  <Paper
                    elevation={3}
                    sx={{
                      position: 'absolute',
                      width: '100%',
                      top: '100%',
                      left: 0,
                      zIndex: theme.zIndex.modal,
                      maxHeight: 350,
                      overflow: 'auto',
                      mt: 0.5,
                      borderRadius: 1,
                    }}
                  >
                    <List dense>
                      {searchResults.map((item) => (
                        <ListItem
                          key={item.id}
                          onClick={() => handleSuggestionClick(item)}
                          sx={{
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            },
                            cursor: 'pointer',
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            {getMediaIcon(item)}
                          </ListItemIcon>
                          <ListItemText 
                            primary={item.title} 
                            secondary={item.year ? `${item.year}` : ''}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </ClickAwayListener>
              )}
              
              {/* Loading indicator */}
              {isSearching && (
                <CircularProgress
                  size={20}
                  sx={{
                    position: 'absolute',
                    right: 40,
                    top: 12,
                    color: 'white',
                  }}
                />
              )}
            </>
          ) : (
            <IconButton sx={{ p: '10px' }} onClick={handleSearchActivate}>
              <SearchIcon />
            </IconButton>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
          {/* Real-time Notifications Center */}
          <NotificationCenter />
          
          {isAuthenticated ? (
            <>
              <IconButton color="inherit" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
                <SettingsIcon />
              </IconButton>
              
              <Tooltip title="Account settings">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0, ml: 1 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <PersonIcon />}
                  </Avatar>
                </IconButton>
              </Tooltip>
              
              <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={open}
                onClose={handleCloseUserMenu}
                PaperProps={{
                  sx: {
                    minWidth: 180,
                    mt: 1.5,
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={handleCloseUserMenu}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2">{user?.displayName}</Typography>
                    <Typography variant="caption" color="text.secondary">{user?.username}</Typography>
                  </Box>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : null}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader;
