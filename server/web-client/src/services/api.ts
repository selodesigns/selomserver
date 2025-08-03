import axios from 'axios';
import type { ApiResponse, Library, LibraryContents } from '../types';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  get: async (url: string, config?: any) => {
    const response = await api.get(url, config);
    return response.data;
  },
  // Direct axios instance for custom requests
  request: api,
  // Get server status
  getStatus: async () => {
    const response = await api.get<{ message: string }>('/status');
    return response.data;
  },
  
  // Get server identity
  getIdentity: async () => {
    const response = await api.get<any>('/identity');
    return response.data;
  },
  
  // Get all libraries
  getLibraries: async () => {
    const response = await api.get<ApiResponse<Library[]>>('/api/library/sections');
    return response.data;
  },
  
  // Get library contents (media items)
  getLibraryContents: async (libraryId: number) => {
    const response = await api.get<ApiResponse<LibraryContents>>(`/api/library/sections/${libraryId}/all`);
    return response.data;
  },
  
  // Search across all media items
  searchMedia: async (query: string, options?: { limit?: number; offset?: number; type?: string; library_id?: number }) => {
    const params = new URLSearchParams({ q: query });
    
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.type) params.append('type', options.type);
    if (options?.library_id) params.append('library_id', options.library_id.toString());
    
    const response = await api.get(`/api/library/search?${params.toString()}`);
    return response.data;
  },
  
  // Get detailed information for a specific media item
  getMediaDetail: async (mediaId: number) => {
    const response = await api.get(`/api/library/media/${mediaId}`);
    return response.data;
  },
  
  // Trigger library scan
  scanLibrary: async (libraryId: number) => {
    const response = await api.post<ApiResponse<{ success: boolean }>>(`/api/library/sections/${libraryId}/scan`);
    return response.data;
  },
  
  // Start a stream
  startStream: async (mediaId: number, userId: number, clientCapabilities?: any) => {
    const response = await api.post('/api/stream/start', { mediaId, userId, clientCapabilities });
    return response.data;
  },
  
  // Stop a stream
  stopStream: async (streamId: string) => {
    const response = await api.post(`/api/stream/stop/${streamId}`);
    return response.data;
  },
  
  // Direct POST helper for custom requests
  post: async (url: string, data?: any) => {
    const response = await api.post(url, data);
    return response.data;
  },

  // Transcoding preset methods
  getTranscodingPresets: async () => {
    const response = await api.get('/api/admin/transcoding/presets');
    return response.data;
  },

  getTranscodingPreset: async (presetId: string) => {
    const response = await api.get(`/api/admin/transcoding/presets/${presetId}`);
    return response.data;
  },

  createTranscodingPreset: async (preset: any) => {
    const response = await api.post('/api/admin/transcoding/presets', preset);
    return response.data;
  },

  updateTranscodingPreset: async (presetId: string, preset: any) => {
    const response = await api.put(`/api/admin/transcoding/presets/${presetId}`, preset);
    return response.data;
  },

  deleteTranscodingPreset: async (presetId: string) => {
    const response = await api.delete(`/api/admin/transcoding/presets/${presetId}`);
    return response.data;
  },

  setDefaultTranscodingPreset: async (presetId: string) => {
    const response = await api.put(`/api/admin/transcoding/presets/${presetId}/default`);
    return response.data;
  },
};

export default apiService;
