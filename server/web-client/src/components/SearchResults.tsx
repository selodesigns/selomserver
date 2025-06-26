import React from 'react';
import { 
  Box, 
  Typography, 
  Tabs,
  Tab,
  CircularProgress,
  Alert
} from '@mui/material';
import type { Media } from '../types';
import MediaGrid from './MediaGrid';

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
      id={`search-tabpanel-${index}`}
      aria-labelledby={`search-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

function a11yProps(index: number) {
  return {
    id: `search-tab-${index}`,
    'aria-controls': `search-tabpanel-${index}`,
  };
}

interface SearchResultsProps {
  query: string;
  results: Media[];
  loading: boolean;
  error: string | null;
}

const SearchResults: React.FC<SearchResultsProps> = ({ 
  query, 
  results, 
  loading, 
  error 
}) => {
  const [tabValue, setTabValue] = React.useState(0);

  // Filter results by media type
  const allResults = results;
  const movieResults = results.filter(item => item.type === 'movie');
  const tvResults = results.filter(item => item.type === 'episode');
  const musicResults = results.filter(item => item.type === 'music');
  const photoResults = results.filter(item => item.type === 'photo');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
    );
  }

  if (query && !loading && results.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" gutterBottom>No results found</Typography>
        <Typography variant="body2" color="text.secondary">
          No media matching "{query}" was found. Try another search term.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="search results tabs"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab 
            label={`All (${allResults.length})`} 
            {...a11yProps(0)} 
          />
          <Tab 
            label={`Movies (${movieResults.length})`} 
            {...a11yProps(1)} 
            disabled={movieResults.length === 0} 
          />
          <Tab 
            label={`TV (${tvResults.length})`} 
            {...a11yProps(2)} 
            disabled={tvResults.length === 0} 
          />
          <Tab 
            label={`Music (${musicResults.length})`} 
            {...a11yProps(3)} 
            disabled={musicResults.length === 0} 
          />
          <Tab 
            label={`Photos (${photoResults.length})`} 
            {...a11yProps(4)} 
            disabled={photoResults.length === 0} 
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {allResults.length > 0 ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Found {allResults.length} result{allResults.length !== 1 ? 's' : ''} for "{query}"
            </Typography>
            <MediaGrid media={allResults} isLoading={false} libraryType="movies" />
          </>
        ) : null}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {movieResults.length > 0 && (
          <MediaGrid media={movieResults} isLoading={false} libraryType="movies" />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {tvResults.length > 0 && (
          <MediaGrid media={tvResults} isLoading={false} libraryType="tv" />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {musicResults.length > 0 && (
          <MediaGrid media={musicResults} isLoading={false} libraryType="music" />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        {photoResults.length > 0 && (
          <MediaGrid media={photoResults} isLoading={false} libraryType="photos" />
        )}
      </TabPanel>
    </Box>
  );
};

export default SearchResults;