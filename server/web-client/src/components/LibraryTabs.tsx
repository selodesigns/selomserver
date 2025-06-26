import React from 'react';
import { Tabs, Tab, Box, Typography, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { Library } from '../types';
import apiService from '../services/api';

interface LibraryTabsProps {
  libraries: Library[];
  selectedLibraryId: number | null;
  onSelectLibrary: (libraryId: number) => void;
  isLoading: boolean;
}

const LibraryTabs: React.FC<LibraryTabsProps> = ({ 
  libraries, 
  selectedLibraryId, 
  onSelectLibrary,
  isLoading
}) => {
  // Handle scan button click
  const handleScan = async (libraryId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await apiService.scanLibrary(libraryId);
      // Could show a notification here that scan was triggered
    } catch (error) {
      console.error('Failed to trigger library scan:', error);
    }
  };

  // Show empty state if no libraries
  if (libraries.length === 0 && !isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No libraries found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add a library in the server to get started
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      borderBottom: 1, 
      borderColor: 'divider', 
      mb: 3,
      display: 'flex',
      alignItems: 'center',
      overflowX: 'auto'
    }}>
      <Tabs
        value={selectedLibraryId || false}
        onChange={(_, newValue) => onSelectLibrary(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="library navigation tabs"
        sx={{ flexGrow: 1 }}
      >
        {libraries.map((library) => (
          <Tab 
            key={library.id} 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography component="span">
                  {library.name}
                </Typography>
                <Typography 
                  component="span" 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  ({library.mediaCount})
                </Typography>
              </Box>
            }
            value={library.id}
            sx={{ 
              textTransform: 'none',
              minWidth: 100
            }}
          />
        ))}
      </Tabs>
      
      {selectedLibraryId && (
        <Button
          startIcon={<RefreshIcon />}
          size="small"
          onClick={(e) => handleScan(selectedLibraryId, e)}
          sx={{ minWidth: 'auto', mx: 1 }}
        >
          Scan
        </Button>
      )}
    </Box>
  );
};

export default LibraryTabs;
