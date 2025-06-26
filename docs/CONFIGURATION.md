# SELO Media Server Configuration Guide

This document outlines all available configuration options for SELO Media Server.

## Table of Contents
- [Configuration Methods](#configuration-methods)
- [Environment Variables](#environment-variables)
- [Server Configuration](#server-configuration)
- [Media Library Configuration](#media-library-configuration)
- [Transcoding Configuration](#transcoding-configuration)
- [User Management Configuration](#user-management-configuration)
- [Security Configuration](#security-configuration)
- [Advanced Configuration](#advanced-configuration)
- [Example Configurations](#example-configurations)

---

## Configuration Methods

SELO Media Server can be configured through several methods (listed in order of precedence):

1. **Command Line Arguments** - Highest priority
2. **Environment Variables** - Second priority
3. **.env File** - Third priority 
4. **Configuration Files** - Fourth priority
5. **Default Values** - Used if no configuration is provided

### Configuration Files

The main configuration files are located in the `server/config` directory:

- `default.js` - Default configuration values
- `production.js` - Production environment overrides
- `development.js` - Development environment overrides
- `database.js` - Database configuration

You can also create a custom configuration file by copying `default.js` to `custom.js` and modifying it.

### .env File

The `.env` file should be placed in the `server` directory. You can copy the `example.env` from the `config` directory to get started.

---

## Environment Variables

### Core Server Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Server port number | `32400` | `PORT=8080` |
| `HOST` | Host to bind to | `0.0.0.0` (all interfaces) | `HOST=127.0.0.1` |
| `NODE_ENV` | Node.js environment | `production` | `NODE_ENV=development` |
| `SERVER_NAME` | Name of your server | `SELO Media Server` | `SERVER_NAME=Home Movies` |
| `BASE_URL` | Base URL for server | `http://localhost:32400` | `BASE_URL=https://media.example.com` |
| `LOG_LEVEL` | Logging level | `info` | `LOG_LEVEL=debug` |
| `LOG_FORMAT` | Log format (simple, json, pretty) | `simple` | `LOG_FORMAT=json` |

### Database Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DB_TYPE` | Database type | `sqlite` | `DB_TYPE=postgres` |
| `DB_PATH` | Path for SQLite database | `./data/media.db` | `DB_PATH=/data/selo.db` |
| `DB_HOST` | Database host (for PostgreSQL/MySQL) | `localhost` | `DB_HOST=db.example.com` |
| `DB_PORT` | Database port (for PostgreSQL/MySQL) | Depends on `DB_TYPE` | `DB_PORT=5432` |
| `DB_NAME` | Database name (for PostgreSQL/MySQL) | `selo` | `DB_NAME=mediaserver` |
| `DB_USER` | Database username (for PostgreSQL/MySQL) | | `DB_USER=dbuser` |
| `DB_PASSWORD` | Database password (for PostgreSQL/MySQL) | | `DB_PASSWORD=secret` |

### Media Library Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MEDIA_LIBRARY_PATH` | Path to your media library | `./data/media` | `MEDIA_LIBRARY_PATH=/mnt/media` |
| `THUMBNAIL_PATH` | Path for storing thumbnails | `./data/thumbnails` | `THUMBNAIL_PATH=/mnt/cache/thumbnails` |
| `CACHE_PATH` | Path for cache files | `./data/cache` | `CACHE_PATH=/mnt/cache` |
| `METADATA_REFRESH_INTERVAL` | Interval for metadata refresh (in hours) | `24` | `METADATA_REFRESH_INTERVAL=12` |
| `METADATA_PROVIDER` | Primary metadata provider | `tmdb` | `METADATA_PROVIDER=omdb` |
| `METADATA_LANGUAGE` | Preferred language for metadata | `en-US` | `METADATA_LANGUAGE=fr-FR` |
| `LIBRARY_SCAN_INTERVAL` | Interval for library scanning (in minutes) | `60` | `LIBRARY_SCAN_INTERVAL=30` |

### Transcoding Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ENABLE_TRANSCODING` | Enable video transcoding | `true` | `ENABLE_TRANSCODING=false` |
| `FFMPEG_PATH` | Path to FFmpeg executable | `ffmpeg` (auto-detect) | `FFMPEG_PATH=/usr/bin/ffmpeg` |
| `HARDWARE_ACCELERATION` | Hardware acceleration method | `none` | `HARDWARE_ACCELERATION=vaapi` |
| `TRANSCODING_THREADS` | Number of threads for transcoding | CPU core count | `TRANSCODING_THREADS=4` |
| `MAX_TRANSCODE_SIZE` | Maximum resolution for transcoding | `1080` | `MAX_TRANSCODE_SIZE=720` |
| `DEFAULT_QUALITY` | Default streaming quality | `1080p` | `DEFAULT_QUALITY=720p` |
| `CODEC_OPTIONS` | Additional FFmpeg codec options | | `CODEC_OPTIONS=-preset veryfast` |

### Streaming Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MAX_CONCURRENT_STREAMS` | Maximum concurrent streams | `5` | `MAX_CONCURRENT_STREAMS=10` |
| `STREAM_BUFFER_SIZE` | Buffer size in MB | `10` | `STREAM_BUFFER_SIZE=20` |
| `SESSION_TIMEOUT` | Session timeout in minutes | `60` | `SESSION_TIMEOUT=120` |
| `ENABLE_HLS` | Enable HLS streaming | `true` | `ENABLE_HLS=false` |
| `ENABLE_DASH` | Enable DASH streaming | `true` | `ENABLE_DASH=false` |
| `MAX_BITRATE` | Maximum streaming bitrate in Mbps | `20` | `MAX_BITRATE=10` |
| `DIRECT_PLAY` | Allow direct play when possible | `true` | `DIRECT_PLAY=false` |

### User Management Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ALLOW_REGISTRATION` | Allow user registration | `false` | `ALLOW_REGISTRATION=true` |
| `INVITE_ONLY` | Require invitations for registration | `true` | `INVITE_ONLY=false` |
| `DEFAULT_USER_QUOTA` | Default streaming quota in hours per month | `0` (unlimited) | `DEFAULT_USER_QUOTA=50` |
| `PASSWORD_MIN_LENGTH` | Minimum password length | `8` | `PASSWORD_MIN_LENGTH=12` |
| `MAX_LOGIN_ATTEMPTS` | Maximum failed login attempts | `5` | `MAX_LOGIN_ATTEMPTS=3` |
| `PASSWORD_EXPIRATION_DAYS` | Password expiration in days | `0` (never) | `PASSWORD_EXPIRATION_DAYS=90` |

### Security Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `JWT_SECRET` | Secret for JWT tokens | Auto-generated | `JWT_SECRET=your-secret-key` |
| `JWT_EXPIRATION` | Token expiration in hours | `24` | `JWT_EXPIRATION=12` |
| `ENABLE_HTTPS` | Enable HTTPS | `false` | `ENABLE_HTTPS=true` |
| `SSL_KEY` | Path to SSL key | | `SSL_KEY=/etc/ssl/private/selo.key` |
| `SSL_CERT` | Path to SSL certificate | | `SSL_CERT=/etc/ssl/certs/selo.crt` |
| `RATE_LIMIT` | Rate limit in requests per minute | `100` | `RATE_LIMIT=50` |
| `ENABLE_2FA` | Enable two-factor authentication | `false` | `ENABLE_2FA=true` |
| `IP_WHITELIST` | Comma-separated list of allowed IPs | | `IP_WHITELIST=192.168.1.0/24,10.0.0.1` |

### Backup Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ENABLE_BACKUPS` | Enable automated backups | `false` | `ENABLE_BACKUPS=true` |
| `BACKUP_PATH` | Path for backups | `./data/backups` | `BACKUP_PATH=/mnt/backups` |
| `BACKUP_SCHEDULE` | Cron schedule for backups | `0 0 * * *` (midnight) | `BACKUP_SCHEDULE=0 2 * * 0` (2am Sundays) |
| `BACKUP_RETENTION` | Number of backups to keep | `7` | `BACKUP_RETENTION=14` |
| `INCLUDE_METADATA_IN_BACKUP` | Include metadata in backups | `true` | `INCLUDE_METADATA_IN_BACKUP=false` |
| `INCLUDE_THUMBNAILS_IN_BACKUP` | Include thumbnails in backups | `false` | `INCLUDE_THUMBNAILS_IN_BACKUP=true` |

---

## Server Configuration

### Reverse Proxy Configuration

When running SELO Media Server behind a reverse proxy (like Nginx or Apache), set:

```
BASE_URL=https://your-domain.com
```

And make sure your reverse proxy forwards the following headers:

- `X-Forwarded-For`
- `X-Forwarded-Proto`
- `X-Forwarded-Host`

### Example Nginx Configuration

```nginx
server {
    listen 80;
    server_name media.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name media.example.com;

    ssl_certificate /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    location / {
        proxy_pass http://localhost:32400;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Media Library Configuration

### Library Structure

SELO Media Server works best with organized media libraries. Recommended structure:

```
/media
├── Movies
│   ├── Movie Title (Year)
│   │   └── Movie.File.mkv
│   └── Another Movie (Year)
│       └── Another.Movie.mp4
└── TV Shows
    └── Show Name
        └── Season 01
            ├── Show.Name.S01E01.mkv
            └── Show.Name.S01E02.mkv
```

### Library Setup in the Admin Panel

1. Log in as an admin
2. Go to Settings > Libraries
3. Click "Add Library"
4. Select library type (Movies, TV Shows, Music, etc.)
5. Enter the path to your media
6. Configure scanning and metadata options
7. Click "Save"

---

## Transcoding Configuration

### Hardware Acceleration Options

SELO Media Server supports several hardware acceleration methods:

| Option | Platform | GPU |
|--------|----------|-----|
| `vaapi` | Linux | Intel with VA-API support |
| `nvenc` | Windows/Linux | NVIDIA with NVENC support |
| `qsv` | Windows/Linux | Intel with QuickSync |
| `videotoolbox` | macOS | Any Mac |
| `none` | Any | CPU encoding only |

To enable hardware acceleration:

```
HARDWARE_ACCELERATION=vaapi  # Replace with your preferred method
```

Additional configuration may be required depending on your hardware.

---

## Example Configurations

### Minimal Server

```env
PORT=32400
MEDIA_LIBRARY_PATH=/path/to/media
ENABLE_TRANSCODING=false
```

### Home Server with Hardware Acceleration

```env
PORT=32400
SERVER_NAME=Home Media
MEDIA_LIBRARY_PATH=/mnt/nas/media
THUMBNAIL_PATH=/mnt/ssd/thumbnails
CACHE_PATH=/mnt/ssd/cache
ENABLE_TRANSCODING=true
HARDWARE_ACCELERATION=nvenc
MAX_CONCURRENT_STREAMS=3
```

### Production Server

```env
PORT=32400
SERVER_NAME=Production Media
BASE_URL=https://media.example.com
LOG_LEVEL=info
LOG_FORMAT=json

DB_TYPE=postgres
DB_HOST=db.example.com
DB_NAME=selo_media
DB_USER=dbuser
DB_PASSWORD=secure_password

MEDIA_LIBRARY_PATH=/mnt/storage/media
THUMBNAIL_PATH=/mnt/ssd/thumbnails
CACHE_PATH=/mnt/ssd/cache

ENABLE_TRANSCODING=true
HARDWARE_ACCELERATION=vaapi
TRANSCODING_THREADS=8

ENABLE_HTTPS=true
SSL_KEY=/etc/ssl/private/example.com.key
SSL_CERT=/etc/ssl/certs/example.com.crt

ENABLE_BACKUPS=true
BACKUP_PATH=/mnt/backup
BACKUP_RETENTION=14
```

---

## Dynamic Configuration

Some configuration options can be changed through the web interface under Settings > Server. Changes made through the web interface take precedence over environment variables and configuration files.
