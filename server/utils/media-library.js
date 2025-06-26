/**
 * SELO Media Server - Media Library Validator
 * Validates media library access, scanning, and content
 */

const fs = require('fs-extra');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);
const logger = require('./logger');

// Media file extensions we support
const VIDEO_EXTENSIONS = [
  '.mp4', '.mkv', '.mov', '.avi', '.wmv', '.m4v', '.mpg', '.mpeg', 
  '.ts', '.mts', '.m2ts', '.webm', '.flv', '.f4v', '.asf', '.3gp', '.3g2'
];

const AUDIO_EXTENSIONS = [
  '.mp3', '.aac', '.flac', '.wav', '.ogg', '.m4a', '.wma', '.opus',
  '.ape', '.alac', '.aiff'
];

const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp'
];

const SUBTITLE_EXTENSIONS = [
  '.srt', '.vtt', '.ass', '.ssa', '.sub', '.sbv', '.idx'
];

/**
 * Check media library accessibility and content
 * @param {boolean} [detailed=false] Whether to perform detailed scanning
 * @returns {Promise<Object>} Media library status information
 */
async function checkMediaLibraryAccess(detailed = false) {
  const mediaPath = process.env.MEDIA_LIBRARY_PATH || path.join(process.cwd(), 'data', 'media');
  const result = {
    accessible: false,
    path: mediaPath
  };
  
  try {
    // Check if media directory exists
    const exists = await fs.pathExists(mediaPath);
    result.exists = exists;
    
    if (!exists) {
      result.error = 'Media library directory does not exist';
      return result;
    }
    
    // Check if directory is readable
    try {
      await fs.access(mediaPath, fs.constants.R_OK);
      result.readable = true;
    } catch (err) {
      result.readable = false;
      result.error = 'Media library directory is not readable';
      return result;
    }
    
    // Check if directory is writable
    try {
      await fs.access(mediaPath, fs.constants.W_OK);
      result.writable = true;
    } catch (err) {
      result.writable = false;
      result.warning = 'Media library directory is read-only; some features may be limited';
    }
    
    // Directory is at least readable, so it's accessible
    result.accessible = true;
    
    // Basic directory structure check
    const topDirs = await fs.readdir(mediaPath);
    result.isEmpty = topDirs.length === 0;
    
    if (!detailed) {
      result.directories = topDirs.length;
      return result;
    }
    
    // Detailed scan if requested
    try {
      const scanResult = await scanMediaLibrary(mediaPath);
      Object.assign(result, scanResult);
    } catch (err) {
      result.scanError = err.message;
    }
    
    // Check available space
    try {
      result.diskSpace = await checkDiskSpace(mediaPath);
    } catch (err) {
      result.diskSpaceError = err.message;
    }
    
    // Check permissions recursively (sample check)
    try {
      result.permissions = await checkPermissions(mediaPath);
    } catch (err) {
      result.permissionsError = err.message;
    }
    
    return result;
  } catch (error) {
    logger.error('Media library access check failed', { error: error.message });
    result.accessible = false;
    result.error = error.message;
    return result;
  }
}

/**
 * Scan the media library for content
 * @param {string} mediaPath Path to the media library
 * @returns {Promise<Object>} Scan results
 */
async function scanMediaLibrary(mediaPath) {
  const result = {
    mediaFiles: 0,
    directories: 0,
    videoFiles: 0,
    audioFiles: 0,
    imageFiles: 0,
    subtitleFiles: 0,
    otherFiles: 0,
    totalSize: 0,
    largestFiles: [],
    fileExtensions: {},
    topLevelFolders: []
  };
  
  // Get top level folders
  const topLevelItems = await fs.readdir(mediaPath);
  const topLevelFolders = [];
  
  for (const item of topLevelItems) {
    const itemPath = path.join(mediaPath, item);
    const stats = await fs.stat(itemPath);
    
    if (stats.isDirectory()) {
      topLevelFolders.push({
        name: item,
        path: itemPath
      });
    }
  }
  
  result.topLevelFolders = topLevelFolders.map(folder => folder.name);
  
  // Use a faster method for counting files on supported platforms
  if (process.platform !== 'win32') {
    try {
      // Try 'find' command for faster file count on Unix-like systems
      const { stdout: findOutput } = await execAsync(`find "${mediaPath}" -type f | wc -l`);
      result.mediaFiles = parseInt(findOutput.trim(), 10) || 0;
      
      // Count directories
      const { stdout: dirOutput } = await execAsync(`find "${mediaPath}" -type d | wc -l`);
      result.directories = parseInt(dirOutput.trim(), 10) || 0;
      
      // Sample file extensions (limit to reasonable number)
      const { stdout: extensionsOutput } = await execAsync(
        `find "${mediaPath}" -type f | grep -v '^\\..*' | sed 's/.*\\.//' | sort | uniq -c | sort -rn | head -20`
      );
      
      const extensionLines = extensionsOutput.trim().split('\n');
      for (const line of extensionLines) {
        const match = line.trim().match(/^\s*(\d+)\s+(.+)$/);
        if (match) {
          const count = parseInt(match[1], 10);
          const ext = match[2].toLowerCase();
          result.fileExtensions[ext] = count;
          
          // Categorize by file type
          if (VIDEO_EXTENSIONS.includes(`.${ext}`)) {
            result.videoFiles += count;
          } else if (AUDIO_EXTENSIONS.includes(`.${ext}`)) {
            result.audioFiles += count;
          } else if (IMAGE_EXTENSIONS.includes(`.${ext}`)) {
            result.imageFiles += count;
          } else if (SUBTITLE_EXTENSIONS.includes(`.${ext}`)) {
            result.subtitleFiles += count;
          } else {
            result.otherFiles += count;
          }
        }
      }
      
      // Get total size
      const { stdout: sizeOutput } = await execAsync(`du -sb "${mediaPath}" | cut -f1`);
      result.totalSize = parseInt(sizeOutput.trim(), 10) || 0;
      result.formattedSize = formatBytes(result.totalSize);
      
      // Find largest files (sample)
      const { stdout: largestFilesOutput } = await execAsync(
        `find "${mediaPath}" -type f -exec du -sk {} \\; | sort -rn | head -10 | awk '{print $2 ":" $1}'`
      );
      
      const largestFiles = largestFilesOutput.trim().split('\n').filter(Boolean);
      result.largestFiles = largestFiles.map(line => {
        const [filePath, sizeKb] = line.split(':');
        return {
          path: filePath,
          name: path.basename(filePath),
          size: parseInt(sizeKb, 10) * 1024,
          formattedSize: formatBytes(parseInt(sizeKb, 10) * 1024)
        };
      });
      
      return result;
    } catch (err) {
      logger.warn('Fast library scan failed, falling back to JS implementation', { 
        error: err.message 
      });
      // Fall back to JS implementation if command-line tools fail
    }
  }
  
  // Fallback JavaScript implementation for scanning
  return await scanMediaLibraryWithJS(mediaPath);
}

/**
 * Scan media library using pure JavaScript (slower but cross-platform)
 * @param {string} mediaPath Path to the media library
 * @returns {Promise<Object>} Scan results
 */
async function scanMediaLibraryWithJS(mediaPath) {
  const result = {
    mediaFiles: 0,
    directories: 0,
    videoFiles: 0,
    audioFiles: 0,
    imageFiles: 0,
    subtitleFiles: 0,
    otherFiles: 0,
    totalSize: 0,
    fileExtensions: {},
    largestFiles: []
  };
  
  const largestFiles = [];
  const MAX_FILES_TO_SCAN = 10000; // Limit scanning to avoid memory issues
  let filesScanned = 0;
  
  // Helper function to scan recursively
  async function scanRecursive(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        result.directories++;
        await scanRecursive(entryPath);
      } else if (entry.isFile()) {
        if (filesScanned >= MAX_FILES_TO_SCAN) {
          // Hit the limit, stop scanning more files
          result.scanLimited = true;
          return;
        }
        
        filesScanned++;
        result.mediaFiles++;
        
        const stats = await fs.stat(entryPath);
        result.totalSize += stats.size;
        
        // Track largest files
        if (largestFiles.length < 10) {
          largestFiles.push({
            path: entryPath,
            name: entry.name,
            size: stats.size,
            formattedSize: formatBytes(stats.size)
          });
          largestFiles.sort((a, b) => b.size - a.size);
        } else if (stats.size > largestFiles[9].size) {
          largestFiles[9] = {
            path: entryPath,
            name: entry.name,
            size: stats.size,
            formattedSize: formatBytes(stats.size)
          };
          largestFiles.sort((a, b) => b.size - a.size);
        }
        
        // Categorize by extension
        const ext = path.extname(entry.name).toLowerCase();
        if (ext) {
          if (!result.fileExtensions[ext]) {
            result.fileExtensions[ext] = 0;
          }
          result.fileExtensions[ext]++;
          
          if (VIDEO_EXTENSIONS.includes(ext)) {
            result.videoFiles++;
          } else if (AUDIO_EXTENSIONS.includes(ext)) {
            result.audioFiles++;
          } else if (IMAGE_EXTENSIONS.includes(ext)) {
            result.imageFiles++;
          } else if (SUBTITLE_EXTENSIONS.includes(ext)) {
            result.subtitleFiles++;
          } else {
            result.otherFiles++;
          }
        }
      }
    }
  }
  
  await scanRecursive(mediaPath);
  
  result.formattedSize = formatBytes(result.totalSize);
  result.largestFiles = largestFiles;
  
  return result;
}

/**
 * Check disk space at the given path
 * @param {string} dirPath Directory path to check
 * @returns {Promise<Object>} Disk space information
 */
async function checkDiskSpace(dirPath) {
  if (process.platform === 'win32') {
    // Windows approach
    try {
      const driveLetter = path.parse(dirPath).root;
      const { stdout } = await execAsync(
        `wmic logicaldisk where "DeviceID='${driveLetter.replace('\\', '')}'" get Size,FreeSpace`
      );
      
      const lines = stdout.trim().split('\n').filter(Boolean);
      if (lines.length > 1) {
        const parts = lines[1].trim().split(/\s+/);
        const freeSpace = parseInt(parts[0], 10);
        const totalSize = parseInt(parts[1], 10);
        
        return {
          free: freeSpace,
          total: totalSize,
          used: totalSize - freeSpace,
          percent: Math.round((freeSpace / totalSize) * 100),
          formattedFree: formatBytes(freeSpace),
          formattedTotal: formatBytes(totalSize),
          formattedUsed: formatBytes(totalSize - freeSpace)
        };
      }
      
      throw new Error('Could not parse disk space output');
    } catch (error) {
      logger.warn('Failed to check disk space on Windows', { error: error.message });
      return { error: error.message };
    }
  } else {
    // Unix approach
    try {
      const { stdout } = await execAsync(`df -k "${dirPath}" | tail -1`);
      const parts = stdout.trim().split(/\s+/);
      
      // Format: Filesystem, 1K-blocks, Used, Available, Capacity, Mounted on
      const totalKB = parseInt(parts[1], 10);
      const usedKB = parseInt(parts[2], 10);
      const freeKB = parseInt(parts[3], 10);
      
      return {
        free: freeKB * 1024,
        total: totalKB * 1024,
        used: usedKB * 1024,
        percent: parseInt(parts[4], 10),
        formattedFree: formatBytes(freeKB * 1024),
        formattedTotal: formatBytes(totalKB * 1024),
        formattedUsed: formatBytes(usedKB * 1024),
        mountPoint: parts[5]
      };
    } catch (error) {
      logger.warn('Failed to check disk space on Unix', { error: error.message });
      return { error: error.message };
    }
  }
}

/**
 * Check permissions on media directory (sampling)
 * @param {string} dirPath Directory path to check
 * @returns {Promise<Object>} Permission check results
 */
async function checkPermissions(dirPath) {
  const results = {
    mainDirPermissions: '',
    readablePercent: 0,
    writablePercent: 0,
    executablePercent: 0,
    sampleSize: 0,
    permissionIssues: []
  };
  
  try {
    // Check main directory permissions
    const stats = await fs.stat(dirPath);
    results.mainDirPermissions = stats.mode.toString(8).slice(-3);
    
    // Sample some subdirectories and files for permissions
    const MAX_SAMPLES = 50;
    let readable = 0;
    let writable = 0;
    let executable = 0;
    
    // Helper function to sample permissions recursively
    async function samplePermissions(currentPath, depth = 0) {
      if (depth > 3 || results.sampleSize >= MAX_SAMPLES) {
        return;
      }
      
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        const samplesToTake = Math.min(5, entries.length); // Take at most 5 samples per directory
        
        // Select random samples if there are more than 5 entries
        const sampleIndices = [];
        if (entries.length > samplesToTake) {
          while (sampleIndices.length < samplesToTake) {
            const randomIndex = Math.floor(Math.random() * entries.length);
            if (!sampleIndices.includes(randomIndex)) {
              sampleIndices.push(randomIndex);
            }
          }
        } else {
          // Just use all entries if 5 or fewer
          for (let i = 0; i < entries.length; i++) {
            sampleIndices.push(i);
          }
        }
        
        // Check permissions for sampled entries
        for (const index of sampleIndices) {
          const entry = entries[index];
          const entryPath = path.join(currentPath, entry.name);
          
          try {
            results.sampleSize++;
            
            // Check read permission
            try {
              await fs.access(entryPath, fs.constants.R_OK);
              readable++;
            } catch (err) {
              results.permissionIssues.push({
                path: entryPath,
                issue: 'Not readable',
                isDirectory: entry.isDirectory()
              });
            }
            
            // Check write permission
            try {
              await fs.access(entryPath, fs.constants.W_OK);
              writable++;
            } catch (err) {
              // This is often normal for media files to be read-only
              if (entry.isDirectory()) {
                results.permissionIssues.push({
                  path: entryPath,
                  issue: 'Directory not writable',
                  isDirectory: true
                });
              }
            }
            
            // Check execute permission for directories
            if (entry.isDirectory()) {
              try {
                await fs.access(entryPath, fs.constants.X_OK);
                executable++;
              } catch (err) {
                results.permissionIssues.push({
                  path: entryPath,
                  issue: 'Directory not traversable (executable)',
                  isDirectory: true
                });
              }
              
              // If directory is readable and executable, sample its contents too
              if (depth < 3) {
                await samplePermissions(entryPath, depth + 1);
              }
            }
          } catch (err) {
            // Skip this entry on error
          }
          
          // Stop if we've collected enough samples
          if (results.sampleSize >= MAX_SAMPLES) {
            break;
          }
        }
      } catch (err) {
        // Skip this directory on error
      }
    }
    
    await samplePermissions(dirPath);
    
    // Calculate percentages if we have samples
    if (results.sampleSize > 0) {
      results.readablePercent = Math.round((readable / results.sampleSize) * 100);
      results.writablePercent = Math.round((writable / results.sampleSize) * 100);
      results.executablePercent = Math.round((executable / results.sampleSize) * 100);
    }
    
    // Limit the number of permission issues reported
    if (results.permissionIssues.length > 5) {
      const issueCount = results.permissionIssues.length;
      results.permissionIssues = results.permissionIssues.slice(0, 5);
      results.permissionIssues.push({
        path: '...',
        issue: `${issueCount - 5} more issues not shown`
      });
    }
    
    return results;
  } catch (error) {
    logger.error('Permission check failed', { error: error.message });
    return {
      error: error.message
    };
  }
}

/**
 * Format bytes to human readable format
 * @param {number} bytes Number of bytes
 * @param {number} decimals Number of decimal places
 * @returns {string} Formatted string
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = {
  checkMediaLibraryAccess
};
