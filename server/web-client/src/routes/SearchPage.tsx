import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  InputAdornment, 
  IconButton,
  Paper,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import apiService from '../services/api';
import SearchResults from '../components/SearchResults';
import type { Media } from '../types';

// Helper function to get query params
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const SearchPage: React.FC = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const searchParam = query.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [results, setResults] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  // When URL query param changes, update search input
  useEffect(() => {
    setSearchQuery(searchParam);
    
    if (searchParam) {
      performSearch(searchParam);
    } else {
      setResults([]);
    }
  }, [searchParam]);
  
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, this would call a search endpoint
      // For now, we'll search across all libraries and do client-side filtering
      const librariesResponse = await apiService.getLibraries();
      
      if (librariesResponse.success && librariesResponse.data) {
        const allMedia: Media[] = [];
        
        // Fetch media from all libraries
        for (const library of librariesResponse.data) {
          const response = await apiService.getLibraryContents(library.id);
          
          if (response.success && response.data) {
            allMedia.push(...response.data.media);
          }
        }
        
        // Filter by search query (case insensitive)
        const filteredResults = allMedia.filter(item => 
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.path.toLowerCase().includes(query.toLowerCase())
        );
        
        setResults(filteredResults);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Error performing search');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  
  const handleClearSearch = () => {
    setSearchQuery('');
    navigate('/search');
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Search
      </Typography>
      
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <form onSubmit={handleSearchSubmit}>
          <TextField
            fullWidth
            variant="outlined"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for media..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="clear search"
                    onClick={handleClearSearch}
                    edge="end"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />
        </form>
      </Paper>
      
      {searchParam && (
        <Box sx={{ mt: 2 }}>
          <SearchResults 
            query={searchParam}
            results={results}
            loading={loading}
            error={error}
          />
        </Box>
      )}
    </Box>
  );
};

export default SearchPage;