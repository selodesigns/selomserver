import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  CircularProgress,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  IconButton,
  Divider,
  InputAdornment,
  Pagination
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
// import FilterIcon from '@mui/icons-material/FilterList'; // Unused import
import DownloadIcon from '@mui/icons-material/GetApp';
import ClearIcon from '@mui/icons-material/Clear';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
// Install date-fns: npm install date-fns
// For now, using simple date formatting function
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString();
};

// API Service
import apiService from '../../services/api';

// Log interface
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  source: string;
  userId?: string;
  userName?: string;
  details?: any;
}

// Activity Logs Component
const ActivityLogs: React.FC = () => {
  // State variables
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [logLevel, setLogLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [source, setSource] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  // Fetch logs on component mount
  useEffect(() => {
    fetchLogs();
  }, [page, logLevel, source, dateRange]);

  // Fetch logs from API
  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const response = await apiService.request({
        method: 'GET',
        url: '/api/admin/logs',
        params: {
          page,
          pageSize,
          level: logLevel !== 'all' ? logLevel : undefined,
          source: source !== 'all' ? source : undefined,
          query: searchQuery || undefined,
          startDate: dateRange.start ? dateRange.start : undefined,
          endDate: dateRange.end ? dateRange.end : undefined
        }
      });
      
      if (response && response.data) {
        setLogs(response.data.logs || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  // Handle search
  const handleSearch = () => {
    setPage(1); // Reset to first page on new search
    fetchLogs();
  };

  // Clear filters
  const clearFilters = () => {
    setLogLevel('all');
    setSource('all');
    setSearchQuery('');
    setDateRange({
      start: '',
      end: ''
    });
    setPage(1);
  };

  // Download logs
  const downloadLogs = async () => {
    try {
      // Prepare download parameters similar to the fetch parameters
      const params: any = {};
      if (logLevel !== 'all') params.level = logLevel;
      if (source !== 'all') params.source = source;
      if (searchQuery) params.query = searchQuery;
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      
      const response = await apiService.request({
        method: 'GET',
        url: '/api/admin/logs/download',
        params,
        responseType: 'blob'
      });
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const currentDate = new Date();
      const filename = `logs-${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading logs:', error);
    }
  };

  // Data grid columns
  const columns: GridColDef[] = [
    { 
      field: 'timestamp', 
      headerName: 'Timestamp', 
      width: 180,
      renderCell: (params) => {
        return formatDate(params.value as string);
      }
    },
    { 
      field: 'level', 
      headerName: 'Level', 
      width: 120,
      renderCell: (params) => {
        const level = params.value as string;
        let color = 'default';
        
        switch (level) {
          case 'error':
            color = 'error';
            break;
          case 'warn':
            color = 'warning';
            break;
          case 'info':
            color = 'info';
            break;
          case 'debug':
            color = 'success';
            break;
        }
        
        return <Chip label={level.toUpperCase()} color={color as any} size="small" />;
      }
    },
    { field: 'source', headerName: 'Source', width: 150 },
    { field: 'message', headerName: 'Message', flex: 1 },
    { 
      field: 'userName', 
      headerName: 'User', 
      width: 150,
      valueGetter: (params: any) => {
        return params.row.userName || 'System';
      }
    },
    { 
      field: 'details', 
      headerName: 'Details', 
      width: 120,
      renderCell: (params) => {
        if (params.value) {
          return (
            <Button
              size="small"
              onClick={() => alert(JSON.stringify(params.value, null, 2))}
            >
              View
            </Button>
          );
        }
        return null;
      }
    },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">
          Activity Logs
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchLogs}
            sx={{ mr: 1 }}
            disabled={loading}
          >
            Refresh
          </Button>
          
          <Button 
            variant="outlined"
            startIcon={<DownloadIcon />} 
            onClick={downloadLogs}
            disabled={loading}
          >
            Download Logs
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Log Filters
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton edge="end" onClick={() => handleSearch()}>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl variant="outlined" sx={{ minWidth: 120 }}>
            <InputLabel>Log Level</InputLabel>
            <Select
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value as string)}
              label="Log Level"
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value="error">Error</MenuItem>
              <MenuItem value="warn">Warning</MenuItem>
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="debug">Debug</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl variant="outlined" sx={{ minWidth: 120 }}>
            <InputLabel>Source</InputLabel>
            <Select
              value={source}
              onChange={(e) => setSource(e.target.value as string)}
              label="Source"
            >
              <MenuItem value="all">All Sources</MenuItem>
              <MenuItem value="server">Server</MenuItem>
              <MenuItem value="auth">Authentication</MenuItem>
              <MenuItem value="media">Media</MenuItem>
              <MenuItem value="stream">Streaming</MenuItem>
              <MenuItem value="library">Library</MenuItem>
              <MenuItem value="scanner">Media Scanner</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Start Date"
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          
          <TextField
            label="End Date"
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          
          <Button 
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
        </Stack>
      </Paper>
      
      <Paper style={{ height: 600, width: '100%' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : (
          <>
            <DataGrid
              rows={logs}
              columns={columns}
              paginationModel={{
                pageSize: pageSize,
                page: page - 1
              }}
              disableRowSelectionOnClick
              disableColumnMenu
              hideFooter
              loading={loading}
            />
            <Box p={2} display="flex" justifyContent="center">
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={(event, page) => handlePageChange(event, page)} 
                color="primary" 
              />
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default ActivityLogs;
