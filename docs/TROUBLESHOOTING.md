# SELO Media Server Troubleshooting Guide

This document provides solutions to common issues you might encounter with SELO Media Server.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Connection Issues](#connection-issues)
- [Media Library Issues](#media-library-issues)
- [Streaming Issues](#streaming-issues)
- [Transcoding Issues](#transcoding-issues)
- [Performance Issues](#performance-issues)
- [Authentication Issues](#authentication-issues)
- [Database Issues](#database-issues)
- [Logs and Diagnostics](#logs-and-diagnostics)

## Installation Issues

### Node.js Version Issues

**Problem**: Server won't start with error about Node.js version.

**Solution**: 
1. Check your Node.js version:
   ```bash
   node --version
   ```
2. SELO Media Server requires Node.js v18.0.0 or higher.
3. Install the required Node.js version:
   - For Windows: Download from [nodejs.org](https://nodejs.org/)
   - For Linux: `nvm install 18`
   - For macOS: `brew install node@18`

### Missing Dependencies

**Problem**: Errors about missing modules or dependencies.

**Solution**:
1. Make sure all dependencies are installed:
   ```bash
   npm install
   ```
2. If in the server directory:
   ```bash
   cd server && npm install
   ```
3. Run the dependency checker:
   ```bash
   node scripts/check-dependencies.js
   ```

### Permission Issues

**Problem**: Permission denied errors when starting the server.

**Solution**:
1. Check directory permissions:
   ```bash
   # Linux/macOS
   ls -la server/data
   ```
2. Ensure your user has write permissions to these directories:
   - `server/data`
   - `server/logs`
   - `server/data/thumbnails`
   - `server/data/cache`
3. Fix permissions if needed:
   ```bash
   # Linux/macOS
   sudo chown -R youruser:yourgroup server/data server/logs
   sudo chmod -R 755 server/data server/logs
   ```

## Connection Issues

### Server Not Accessible

**Problem**: Can't connect to the server after starting.

**Solutions**:
1. Check if the server is running:
   ```bash
   # Check for running node processes
   ps aux | grep node
   # or on Windows
   tasklist | findstr node
   ```
2. Verify the port isn't blocked by a firewall:
   - Windows: Check Windows Firewall settings
   - Linux: `sudo ufw status` or `sudo iptables -L`
   - macOS: Check System Preferences > Security & Privacy > Firewall
3. Ensure no other application is using the same port:
   ```bash
   # Linux/macOS
   lsof -i :32400
   # Windows
   netstat -ano | findstr :32400
   ```

### HTTPS/SSL Issues

**Problem**: HTTPS not working or certificate errors.

**Solutions**:
1. Check if your SSL certificate files exist and are valid:
   ```bash
   openssl x509 -in /path/to/certificate.crt -text -noout
   ```
2. Ensure the certificate and key are properly configured in your `.env` file:
   ```
   ENABLE_HTTPS=true
   SSL_KEY=/path/to/your/key.pem
   SSL_CERT=/path/to/your/cert.pem
   ```
3. For self-signed certificates, you'll need to accept the security warning in your browser.

## Media Library Issues

### Media Not Found

**Problem**: Media files aren't showing up in the library.

**Solutions**:
1. Verify file permissions:
   ```bash
   # Linux/macOS
   ls -la /path/to/your/media
   ```
2. Check if your media paths are correctly configured:
   ```
   MEDIA_LIBRARY_PATH=/path/to/your/media
   ```
3. Ensure your media follows the recommended naming format:
   - Movies: `Movie Title (Year)/Movie.File.mkv`
   - TV Shows: `Show Name/Season 01/Show.Name.S01E01.mkv`
4. Trigger a manual library scan:
   - Via UI: Admin > Libraries > [Select Library] > Scan
   - Via API: `POST /api/libraries/{libraryId}/scan`

### Metadata Issues

**Problem**: Missing or incorrect metadata/artwork.

**Solutions**:
1. Ensure media files are properly named for automatic matching
2. Try refreshing metadata:
   - Via UI: Select the media item > Edit > Refresh Metadata
3. Check the metadata provider configuration:
   ```
   METADATA_PROVIDER=tmdb
   METADATA_API_KEY=your_api_key
   ```

### Duplicate Media Items

**Problem**: Media appears multiple times in the library.

**Solutions**:
1. Check for duplicate files in your media folders
2. Make sure you don't have the same media folder added to multiple libraries
3. Clean and rescan the library:
   - Via UI: Admin > Libraries > [Select Library] > Clean > Scan

## Streaming Issues

### Playback Fails to Start

**Problem**: Playback fails to start or stops unexpectedly.

**Solutions**:
1. Check server logs for errors related to streaming or transcoding.
2. Ensure FFmpeg is installed and accessible.
3. Force transcoding for the problematic file:
   - Via UI: Player Settings > Disable Direct Play

### StreamManager Errors

**Problem**: Error `Stream.update is not a function` appears in logs during stream cleanup.

**Cause**: This occurs if the StreamManager attempts to call `update` on a stream object that is not a valid model instance or the method is missing.

**Solution**:
- Ensure the StreamManager cleanup logic uses the correct Stream model/method. See [Development Guide](DEVELOPMENT.md#streammanager-errors) for code fix details.
- Upgrade to the latest version if using an older release.

---

## Rate Limiting Issues

### Key Generator Error

**Problem**: Error `Key generator error` appears in logs related to rate limiting.

**Cause**: The rate limiter's key generator function may throw or return an invalid key (e.g., undefined/null).

**Solution**:
- Ensure your custom key generator always returns a valid string.
- If using the default, check for unusual proxy/network setups that may affect `req.ip`.
- See [Configuration Guide](CONFIGURATION.md#rate-limiting) for environment variable options.

---

## Routing/Middleware Issues

### Router.use() Requires Middleware Function

**Problem**: Error `Router.use() requires a middleware function but got undefined` when starting the server or accessing admin routes.

**Cause**: This usually means an import is missing or incorrect in `admin.js` or a referenced middleware file.

**Solution**:
- Check that all middleware and route handlers are properly imported/exported.
- See [Development Guide](DEVELOPMENT.md#middleware-imports) for troubleshooting route imports.
- Restart the server after fixing imports.

---

[← Installation Guide](INSTALLATION.md) | [Configuration Guide →](CONFIGURATION.md) | [API Reference](API.md)

**Problem**: Media doesn't play when selected.

**Solutions**:
1. Check browser console for errors (F12 > Console)
2. Verify the media file is accessible and not corrupted:
   ```bash
   ffmpeg -v error -i /path/to/media -f null -
   ```
3. Check server logs for streaming errors:
   ```bash
   tail -n 100 server/logs/error.log
   ```

### Buffering Issues

**Problem**: Stream keeps buffering or stuttering.

**Solutions**:
1. Lower the streaming quality in client settings
2. Check network speed between server and client
3. Verify server has enough resources:
   ```bash
   # Linux/macOS
   top
   # or
   htop
   ```
4. Adjust transcoding settings:
   ```
   TRANSCODING_THREADS=4
   HARDWARE_ACCELERATION=vaapi  # Use hardware acceleration if available
   ```

### Audio/Video Sync Issues

**Problem**: Audio and video are out of sync.

**Solutions**:
1. Check if the original file has sync issues:
   ```bash
   ffmpeg -i /path/to/media -f null -
   ```
2. Try a different player or browser
3. Force transcoding for the problematic file:
   - Via UI: Player Settings > Disable Direct Play

## Transcoding Issues

### FFmpeg Not Found

**Problem**: Transcoding fails with "FFmpeg not found" errors.

**Solutions**:
1. Verify FFmpeg is installed:
   ```bash
   ffmpeg -version
   ```
2. If not installed, install FFmpeg:
   - Windows: `choco install ffmpeg`
   - macOS: `brew install ffmpeg`
   - Ubuntu/Debian: `sudo apt install ffmpeg`
3. Or specify the FFmpeg path in your configuration:
   ```
   FFMPEG_PATH=/custom/path/to/ffmpeg
   ```

### Hardware Acceleration Issues

**Problem**: Hardware acceleration not working.

**Solutions**:
1. Check if your system supports hardware acceleration:
   ```bash
   # For VAAPI (Intel)
   vainfo
   # For NVENC (NVIDIA)
   nvidia-smi
   ```
2. Install required drivers:
   - NVIDIA: Latest NVIDIA drivers
   - Intel: `sudo apt install intel-media-va-driver`
3. Configure hardware acceleration:
   ```
   HARDWARE_ACCELERATION=vaapi  # or nvenc, qsv, videotoolbox
   ```
4. Check FFmpeg was compiled with hardware acceleration support:
   ```bash
   ffmpeg -hwaccels
   ```

### High CPU Usage During Transcoding

**Problem**: Transcoding consumes too much CPU.

**Solutions**:
1. Enable hardware acceleration if available
2. Limit concurrent transcodes:
   ```
   MAX_CONCURRENT_STREAMS=2
   ```
3. Lower the maximum transcoding quality:
   ```
   MAX_TRANSCODE_SIZE=720
   ```
4. Use optimized FFmpeg presets:
   ```
   CODEC_OPTIONS=-preset veryfast
   ```

## Performance Issues

### Slow Web Interface

**Problem**: Web interface is sluggish or unresponsive.

**Solutions**:
1. Check server resource usage:
   ```bash
   # Linux/macOS
   top
   ```
2. Reduce the number of items per page in settings
3. Clear browser cache
4. Optimize thumbnail generation:
   ```
   GENERATE_THUMBNAILS_ON_DEMAND=true
   ```

### High Memory Usage

**Problem**: Server uses too much RAM.

**Solutions**:
1. Limit concurrent operations:
   ```
   MAX_CONCURRENT_STREAMS=2
   MAX_CONCURRENT_JOBS=1
   ```
2. Clear cache periodically:
   - Via UI: Admin > Maintenance > Clear Cache
   - Via API: `POST /api/admin/maintenance/clear-cache`
3. Adjust Node.js memory limits:
   ```bash
   # Add to start script
   node --max-old-space-size=1024 index.js
   ```

### Slow Library Scanning

**Problem**: Library scanning takes too long.

**Solutions**:
1. Organize media into smaller libraries
2. Disable thumbnail generation during scan:
   ```
   GENERATE_THUMBNAILS_ON_SCAN=false
   ```
3. Increase scan performance:
   ```
   SCAN_BATCH_SIZE=50
   PARALLEL_SCAN_JOBS=2
   ```

## Authentication Issues

### Login Problems

**Problem**: Can't log in to the server.

**Solutions**:
1. Reset the admin password using the reset script:
   ```bash
   node scripts/reset-password.js admin newpassword
   ```
2. Check for database issues (see Database Issues section)
3. Verify JWT secret is correctly set:
   ```
   JWT_SECRET=your_jwt_secret
   ```

### Session Expires Too Quickly

**Problem**: Frequent login prompts as session expires.

**Solutions**:
1. Increase JWT token expiration:
   ```
   JWT_EXPIRATION=72  # In hours
   ```
2. Check server time is correct:
   ```bash
   date
   ```

## Database Issues

### Database Connection Errors

**Problem**: Server can't connect to the database.

**Solutions**:
1. For SQLite:
   - Check if database file exists:
     ```bash
     ls -la server/data/media.db
     ```
   - Check file permissions
   - Try creating a new database file

2. For PostgreSQL/MySQL:
   - Verify database server is running:
     ```bash
     # PostgreSQL
     pg_isready -h localhost -p 5432
     # MySQL
     mysqladmin ping -h localhost -P 3306
     ```
   - Check credentials in .env file
   - Try connecting with another client

### Database Corruption

**Problem**: Database errors about corruption or inconsistency.

**Solutions**:
1. For SQLite:
   - Back up existing database
   - Run integrity check:
     ```bash
     sqlite3 server/data/media.db "PRAGMA integrity_check;"
     ```
   - If corrupted, restore from backup or rebuild database

2. For PostgreSQL/MySQL:
   - Run database repair tools
   - Restore from backup if available

## Logs and Diagnostics

### Accessing Logs

Server logs are essential for troubleshooting. Find them at:
- Main log: `server/logs/selo.log`
- Error log: `server/logs/error.log`
- Access log: `server/logs/access.log`

Increase log verbosity by setting:
```
LOG_LEVEL=debug
```

### Running Diagnostics

Use the built-in diagnostics tool:
```bash
node scripts/diagnostics.js
```

This will check:
- System requirements
- File permissions
- Network connectivity
- Database health
- Media accessibility
- FFmpeg functionality

### Getting Support

If you're still experiencing issues:
1. Check the [GitHub Issues](https://github.com/yourusername/SELOMServer/issues) for similar problems
2. Include relevant logs and diagnostic information when asking for help
3. Describe your environment (OS, Node.js version, how SELO is installed)
4. List steps to reproduce the issue
