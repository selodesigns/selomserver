import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CssBaseline, useMediaQuery, useTheme } from '@mui/material';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';

const SIDEBAR_WIDTH = 240;

const MainLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      <AppHeader 
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        sidebarWidth={SIDEBAR_WIDTH}
      />
      
      <Sidebar 
        open={sidebarOpen} 
        width={SIDEBAR_WIDTH}
        onClose={() => setSidebarOpen(false)}
      />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${sidebarOpen ? SIDEBAR_WIDTH : 0}px)` },
          ml: { md: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0 },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* Toolbar spacer to push content below app bar */}
        <Box sx={{ height: { xs: 56, sm: 64 }, mb: 2 }} />
        
        {/* Page content */}
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;