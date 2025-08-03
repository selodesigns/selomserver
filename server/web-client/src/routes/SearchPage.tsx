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

const DEFAULT_LIMIT = 20;

const SearchPage: React.FC = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const searchParam = query.get('q') || '';
  const pageParam = parseInt(query.get('page') || '1', 10);
  const limitParam = parseInt(query.get('limit') || String(DEFAULT_LIMIT), 10);

  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [results, setResults] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(pageParam);
  const [limit, setLimit] = useState(limitParam);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // When URL query param changes, update search input and pagination
  useEffect(() => {
    setSearchQuery(searchParam);
    setPage(pageParam);
    setLimit(limitParam);
    if (searchParam) {
      performSearch(searchParam, pageParam, limitParam);
    } else {
      setResults([]);
      setTotalResults(0);
      setTotalPages(1);
    }
  }, [searchParam, pageParam, limitParam]);

  const performSearch = async (query: string, page: number, limit: number) => {
    if (!query.trim()) {
      setResults([]);
      setTotalResults(0);
      setTotalPages(1);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * limit;
      const searchResponse = await apiService.searchMedia(query.trim(), {
        limit,
        offset
      });
      if (searchResponse.success && searchResponse.data) {
        setResults(searchResponse.data.results);
        setTotalResults(searchResponse.data.pagination?.total || 0);
        setTotalPages(searchResponse.data.pagination?.totalPages || 1);
      } else {
        setError(searchResponse.message || 'Search failed');
        setResults([]);
        setTotalResults(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Error performing search');
      setResults([]);
      setTotalResults(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}&page=1&limit=${limit}`);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    navigate('/search');
  };

  const handlePageChange = (newPage: number) => {
    navigate(`/search?q=${encodeURIComponent(searchParam)}&page=${newPage}&limit=${limit}`);
  };

  const handleLimitChange = (newLimit: number) => {
    navigate(`/search?q=${encodeURIComponent(searchParam)}&page=1&limit=${newLimit}`);
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
            page={page}
            limit={limit}
            totalResults={totalResults}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </Box>
      )}
    </Box>
  );
};

export default SearchPage;