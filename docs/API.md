# SELO Media Server API Documentation

This document outlines the REST API endpoints available in SELO Media Server.

## Table of Contents
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Server Information](#server-information)
- [Library Management](#library-management)
- [Media Operations](#media-operations)
- [Streaming](#streaming)
- [User Management](#user-management)
- [System Administration](#system-administration)

## Authentication

All API requests (except for login) require authentication using JWT tokens.

### Login

```
POST /api/auth/login
```

Request:
```json
{
  "username": "user",
  "password": "password"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123",
    "username": "user",
    "isAdmin": false
  }
}
```

### Using the Token

Include the token in the Authorization header for all requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refresh Token

```
POST /api/auth/refresh
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout

```
POST /api/auth/logout
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

Error responses have the format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

## Server Information

### Get Server Status

```
GET /api/server/status
```

Response:
```json
{
  "status": "online",
  "uptime": 86400,
  "version": "1.0.0",
  "activeUsers": 2,
  "activeStreams": 1
}
```

### Get Server Information

```
GET /api/server/info
```

Response:
```json
{
  "name": "SELO Media Server",
  "version": "1.0.0",
  "platform": "linux",
  "architecture": "x64",
  "nodeVersion": "v18.0.0",
  "ffmpegVersion": "4.4",
  "startTime": "2023-01-01T00:00:00Z",
  "mediaLibraries": 3,
  "totalItems": 1500
}
```

### Get Server Settings

```
GET /api/server/settings
```

Response:
```json
{
  "serverName": "SELO Media Server",
  "streamingSettings": {
    "maxBitrate": 20,
    "transcodeQuality": "auto"
  },
  "securitySettings": {
    "enableHttps": true,
    "allowRegistration": false,
    "inviteOnly": true
  }
}
```

### Update Server Settings

```
PUT /api/server/settings
```

Request:
```json
{
  "serverName": "My Media Server",
  "streamingSettings": {
    "maxBitrate": 15
  }
}
```

## Library Management

### Get Libraries

```
GET /api/libraries
```

Response:
```json
{
  "libraries": [
    {
      "id": "movies",
      "name": "Movies",
      "type": "movie",
      "path": "/media/movies",
      "itemCount": 500
    },
    {
      "id": "tvshows",
      "name": "TV Shows",
      "type": "show",
      "path": "/media/tvshows",
      "itemCount": 1000
    }
  ]
}
```

### Create Library

```
POST /api/libraries
```

Request:
```json
{
  "name": "Documentaries",
  "type": "movie",
  "path": "/media/documentaries",
  "scanAutomatically": true
}
```

### Update Library

```
PUT /api/libraries/{libraryId}
```

Request:
```json
{
  "name": "Documentary Films",
  "scanAutomatically": false
}
```

### Delete Library

```
DELETE /api/libraries/{libraryId}
```

### Scan Library

```
POST /api/libraries/{libraryId}/scan
```

Response:
```json
{
  "status": "scanning",
  "message": "Library scan started",
  "jobId": "scan-123"
}
```

### Get Library Contents

```
GET /api/libraries/{libraryId}/items
```

Parameters:
- `sort`: Sort order (name, date, rating)
- `order`: Sort direction (asc, desc)
- `page`: Page number
- `limit`: Items per page
- `filter`: Filter by field

Response:
```json
{
  "items": [
    {
      "id": "movie-123",
      "title": "Sample Movie",
      "year": 2022,
      "posterUrl": "/api/media/posters/movie-123.jpg",
      "duration": 7200
    }
  ],
  "total": 500,
  "page": 1,
  "pageSize": 20
}
```

## Media Operations

### Get Media Item

```
GET /api/media/items/{itemId}
```

Response:
```json
{
  "id": "movie-123",
  "title": "Sample Movie",
  "originalTitle": "Original Title",
  "year": 2022,
  "overview": "A sample movie description",
  "genres": ["Action", "Drama"],
  "director": "Director Name",
  "cast": ["Actor 1", "Actor 2"],
  "duration": 7200,
  "rating": 8.5,
  "posterUrl": "/api/media/posters/movie-123.jpg",
  "backdropUrl": "/api/media/backdrops/movie-123.jpg",
  "mediaFiles": [
    {
      "id": "file-123",
      "path": "/media/movies/Sample Movie (2022)/movie.mkv",
      "size": 5000000000,
      "format": "mkv",
      "videoCodec": "h264",
      "audioCodec": "aac",
      "resolution": "1080p",
      "bitrate": 8000000
    }
  ]
}
```

### Search Media

```
GET /api/search?query={query}
```

Parameters:
- `type`: Filter by media type (movie, show, episode)
- `library`: Filter by library ID
- `year`: Filter by year
- `genre`: Filter by genre
- `page`: Page number
- `limit`: Items per page

Response:
```json
{
  "results": [
    {
      "id": "movie-123",
      "title": "Sample Movie",
      "year": 2022,
      "type": "movie",
      "posterUrl": "/api/media/posters/movie-123.jpg"
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 20
}
```

### Get Image

```
GET /api/media/posters/{itemId}.jpg
GET /api/media/backdrops/{itemId}.jpg
GET /api/media/thumbnails/{itemId}.jpg
```

Parameters:
- `width`: Resize width
- `height`: Resize height
- `quality`: JPEG quality (1-100)

### Update Media Item

```
PUT /api/media/items/{itemId}
```

Request:
```json
{
  "title": "Updated Movie Title",
  "overview": "Updated description",
  "genres": ["Action", "Thriller"]
}
```

### Delete Media Item

```
DELETE /api/media/items/{itemId}
```

## Streaming

### Get Stream Information

```
GET /api/stream/info/{itemId}
```

Response:
```json
{
  "formats": [
    {
      "id": "direct",
      "label": "Original (1080p)",
      "directPlay": true
    },
    {
      "id": "1080p",
      "label": "1080p",
      "directPlay": false
    },
    {
      "id": "720p",
      "label": "720p",
      "directPlay": false
    }
  ],
  "subtitles": [
    {
      "id": "sub-en",
      "language": "English",
      "format": "srt"
    }
  ]
}
```

### Start Streaming Session

```
POST /api/stream/start
```

Request:
```json
{
  "itemId": "movie-123",
  "quality": "720p",
  "subtitleId": "sub-en",
  "startTime": 0
}
```

Response:
```json
{
  "streamUrl": "/api/stream/play/session-123",
  "sessionId": "session-123",
  "manifestUrl": "/api/stream/manifest/session-123.m3u8",
  "subtitleUrl": "/api/stream/subtitles/session-123/sub-en"
}
```

### Stream HLS Manifest

```
GET /api/stream/manifest/{sessionId}.m3u8
```

### Stream Video Segment

```
GET /api/stream/segments/{sessionId}/{segmentId}.ts
```

### Stream Subtitles

```
GET /api/stream/subtitles/{sessionId}/{subtitleId}
```

### Control Playback

```
PUT /api/stream/control/{sessionId}
```

Request:
```json
{
  "action": "pause" // or "play", "seek"
  "position": 120 // for seek action
}
```

### End Streaming Session

```
DELETE /api/stream/session/{sessionId}
```

## User Management

### Get Users

```
GET /api/users
```

Response:
```json
{
  "users": [
    {
      "id": "user-123",
      "username": "admin",
      "email": "admin@example.com",
      "isAdmin": true,
      "createdAt": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### Create User

```
POST /api/users
```

Request:
```json
{
  "username": "newuser",
  "password": "password",
  "email": "user@example.com",
  "isAdmin": false
}
```

### Update User

```
PUT /api/users/{userId}
```

Request:
```json
{
  "email": "updated@example.com",
  "isAdmin": true
}
```

### Delete User

```
DELETE /api/users/{userId}
```

### Change Password

```
PUT /api/users/{userId}/password
```

Request:
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

### Generate Invite

```
POST /api/users/invites
```

Response:
```json
{
  "inviteCode": "INV-123456",
  "expiresAt": "2023-02-01T00:00:00Z"
}
```

## System Administration

### Get System Resources

```
GET /api/admin/resources
```

Response:
```json
{
  "cpu": {
    "usage": 25.5,
    "cores": 8
  },
  "memory": {
    "total": 16000000000,
    "used": 4000000000,
    "free": 12000000000
  },
  "disk": {
    "total": 1000000000000,
    "used": 500000000000,
    "free": 500000000000
  }
}
```

### Get Logs

```
GET /api/admin/logs
```

Parameters:
- `level`: Log level (error, warn, info, debug)
- `from`: Start timestamp
- `to`: End timestamp
- `page`: Page number
- `limit`: Items per page

Response:
```json
{
  "logs": [
    {
      "timestamp": "2023-01-01T12:00:00Z",
      "level": "info",
      "message": "Server started",
      "source": "system"
    }
  ],
  "total": 1000,
  "page": 1,
  "pageSize": 100
}
```

### Backup System

```
POST /api/admin/backup
```

Response:
```json
{
  "backupId": "backup-123",
  "filename": "selo-backup-2023-01-01.zip",
  "size": 5000000,
  "status": "started",
  "jobId": "job-123"
}
```

### Restore Backup

```
POST /api/admin/restore
```

Request:
```json
{
  "backupId": "backup-123"
}
```

Response:
```json
{
  "status": "restoring",
  "message": "Restore started",
  "jobId": "restore-123"
}
```

### Get Jobs

```
GET /api/admin/jobs
```

Response:
```json
{
  "jobs": [
    {
      "id": "job-123",
      "type": "backup",
      "status": "completed",
      "progress": 100,
      "startTime": "2023-01-01T12:00:00Z",
      "endTime": "2023-01-01T12:05:00Z"
    }
  ]
}
```

### Cancel Job

```
DELETE /api/admin/jobs/{jobId}
```

Response:
```json
{
  "status": "cancelled",
  "message": "Job cancelled successfully"
}
```
