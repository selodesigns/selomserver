import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Collapse,
  IconButton,
  useTheme,
  alpha
} from '@mui/material';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PhotoIcon from '@mui/icons-material/Photo';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';

// Data & Services
import apiService from '../services/api';
import type { Library } from '../types';

interface SidebarProps {
  open: boolean;
  width: number;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, width, onClose }) => {
  const theme = useTheme();
  const location = useLocation();
  
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [librariesExpanded, setLibrariesExpanded] = useState(true);
  
  // Fetch libraries when component mounts
  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const response = await apiService.getLibraries();
        if (response.success && response.data) {
          setLibraries(response.data);
        }
      } catch (error) {
        console.error('Error fetching libraries:', error);
      }
    };
    
    fetchLibraries();
  }, []);

  const isCurrentPath = (path: string) => {
    return location.pathname === path;
  };
  
  const getLibraryIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'movies':
        return <MovieIcon />;
      case 'tv':
        return <TvIcon />;
      case 'music':
        return <MusicNoteIcon />;
      case 'photos':
        return <PhotoIcon />;
      default:
        return <MovieIcon />;
    }
  };

  // Sidebar drawer content
  const drawerContent = (
    <>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: [1],
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box 
            component="img"
            src="/images/smslogo.png"
            alt="SELO Media Server"
            sx={{ 
              height: 32, 
              width: 'auto', 
              mr: 1
            }}
          />
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            SELO Media
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ display: { md: 'none' } }}>
          <ChevronLeftIcon />
        </IconButton>
      </Toolbar>
      
      <Divider />
      
      <List component="nav">
        {/* Main navigation */}
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/"
            selected={isCurrentPath('/')}
            sx={{
              '&.Mui-selected': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                },
              },
            }}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        
        {/* Libraries Section */}
        <ListItem disablePadding>
          <ListItemButton onClick={() => setLibrariesExpanded(!librariesExpanded)}>
            <ListItemIcon>
              <PlaylistPlayIcon />
            </ListItemIcon>
            <ListItemText primary="Libraries" />
            {librariesExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
        </ListItem>
        
        <Collapse in={librariesExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {libraries.map((library) => (
              <ListItemButton
                key={library.id}
                component={Link}
                to={`/library/${library.id}`}
                selected={isCurrentPath(`/library/${library.id}`)}
                sx={{
                  pl: 4,
                  '&.Mui-selected': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.2),
                    },
                  },
                }}
              >
                <ListItemIcon>
                  {getLibraryIcon(library.type)}
                </ListItemIcon>
                <ListItemText primary={library.name} />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
        
        {/* Search */}
        <ListItem disablePadding>
          <ListItemButton 
            component={Link} 
            to="/search"
            selected={isCurrentPath('/search')}
            sx={{
              '&.Mui-selected': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                },
              },
            }}
          >
            <ListItemIcon>
              <SearchIcon />
            </ListItemIcon>
            <ListItemText primary="Search" />
          </ListItemButton>
        </ListItem>
        
        {/* Settings */}
        <ListItem disablePadding>
          <ListItemButton 
            component={Link} 
            to="/settings"
            selected={isCurrentPath('/settings')}
            sx={{
              '&.Mui-selected': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                },
              },
            }}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );

  return (
    <>
      {/* Mobile drawer (temporary) */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: width, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>
      
      {/* Desktop drawer (persistent) */}
      <Drawer
        variant="persistent"
        open={open}
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: width, boxSizing: 'border-box' },
          width: open ? width : 0,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: 'hidden',
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;