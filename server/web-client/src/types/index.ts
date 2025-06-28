export interface Library {
  id: number;
  name: string;
  path: string;
  type: 'movies' | 'tv' | 'music';
  enabled: boolean;
  last_scan?: string;
  mediaCount: number;
  createdAt: string;
  updatedAt: string;
  scanAutomatically?: boolean;
  totalSize?: number;
}

export interface Media {
  id: number;
  library_id: number;
  title: string;
  path: string;
  file_size: number;
  duration: number;
  width?: number;
  height?: number;
  codec?: string;
  container: string;
  thumbnail_path?: string;
  thumbnailUrl?: string;
  thumbnail_url?: string; // For backward compatibility
  bitrate?: number;
  created_at: string;
  updated_at: string;
  type: 'movie' | 'episode' | 'music' | 'photo';
  // Additional fields for media details
  year?: number;
  summary?: string;
  director?: string;
  actors?: string[];
  genre?: string[];
  rating?: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  name?: string;       // Add name property for profile form
  isAdmin: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
}

export interface LibraryContents {
  library: Library;
  mediaCount: number;
  media: Media[];
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  refreshToken: string;
  message?: string;
}

export interface AuthError {
  success: boolean;
  message: string;
}
