import React from 'react';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PhotoIcon from '@mui/icons-material/Photo';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import type { Media } from '../types';

/**
 * Returns the appropriate MUI icon component based on media type
 */
export const getMediaIcon = (media: Media) => {
  switch (media.type) {
    case 'movie':
      return MovieIcon;
    case 'episode':
      return TvIcon;
    case 'music':
      return MusicNoteIcon;
    case 'photo':
      return PhotoIcon;
    default:
      return InsertDriveFileIcon;
  }
};
