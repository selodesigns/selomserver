/**
 * SELO Media Server - FFmpeg Capability Checker
 * Tests FFmpeg installation and available hardware acceleration methods
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const logger = require('./logger');

/**
 * Check if FFmpeg is installed and determine its capabilities
 * @param {boolean} [detailed=false] Whether to perform detailed capability checks
 * @returns {Promise<Object>} FFmpeg capabilities information
 */
async function checkFFmpegCapabilities(detailed = false) {
  try {
    // Check if FFmpeg is installed
    const ffmpegResult = await execAsync('ffmpeg -version');
    const ffprobeResult = await execAsync('ffprobe -version');
    
    // Extract version information
    const ffmpegVersion = extractVersion(ffmpegResult.stdout);
    const ffprobeVersion = extractVersion(ffprobeResult.stdout);
    
    // Basic capabilities
    const capabilities = {
      available: true,
      ffmpegVersion,
      ffprobeVersion,
      path: await findFFmpegPath()
    };
    
    // If not detailed, return basic information
    if (!detailed) {
      return capabilities;
    }
    
    // Get detailed configuration and capabilities
    const { stdout: ffmpegConfig } = await execAsync('ffmpeg -hide_banner -buildconf');
    
    // Check for hardware acceleration support
    capabilities.hardwareAcceleration = {
      vaapi: ffmpegConfig.includes('--enable-vaapi'),
      nvenc: ffmpegConfig.includes('--enable-nvenc') || ffmpegConfig.includes('--enable-cuda'),
      qsv: ffmpegConfig.includes('--enable-qsv'),
      videotoolbox: ffmpegConfig.includes('--enable-videotoolbox'),
      d3d11va: ffmpegConfig.includes('--enable-d3d11va'),
      dxva2: ffmpegConfig.includes('--enable-dxva2')
    };
    
    // Get codecs
    const { stdout: codecInfo } = await execAsync('ffmpeg -hide_banner -codecs');
    capabilities.codecs = {
      h264: {
        decode: codecInfo.includes('DEV.L. h264'),
        encode: codecInfo.includes('.EV.L. h264') || codecInfo.includes('DEV.L. libx264')
      },
      h265: {
        decode: codecInfo.includes('DEV.L. hevc') || codecInfo.includes('DEV.L. h265'),
        encode: codecInfo.includes('.EV.L. hevc') || codecInfo.includes('.EV.L. libx265')
      },
      vp9: {
        decode: codecInfo.includes('DEV.L. vp9'),
        encode: codecInfo.includes('.EV.L. vp9') || codecInfo.includes('.EV.L. libvpx-vp9')
      },
      av1: {
        decode: codecInfo.includes('DEV.L. av1'),
        encode: codecInfo.includes('.EV.L. av1') || codecInfo.includes('.EV.L. libaom-av1')
      },
      aac: {
        decode: codecInfo.includes('DEA.L. aac'),
        encode: codecInfo.includes('.EA.L. aac')
      }
    };
    
    // Get formats
    const { stdout: formatInfo } = await execAsync('ffmpeg -hide_banner -formats');
    capabilities.formats = {
      mp4: formatInfo.includes(' mp4 '),
      mkv: formatInfo.includes(' matroska '),
      webm: formatInfo.includes(' webm '),
      hls: formatInfo.includes(' hls '),
      dash: formatInfo.includes(' dash ')
    };
    
    // Test actual transcoding capability if possible
    try {
      await testTranscodingCapability(capabilities);
    } catch (error) {
      logger.warn('FFmpeg transcoding test failed', { error: error.message });
      capabilities.transcodingTest = {
        success: false,
        error: error.message
      };
    }
    
    return capabilities;
  } catch (error) {
    logger.error('FFmpeg capability check failed', { error: error.message });
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * Find the path to the FFmpeg executable
 * @returns {Promise<string>} Path to FFmpeg
 */
async function findFFmpegPath() {
  try {
    // Check if custom path is set in environment
    const customPath = process.env.FFMPEG_PATH;
    if (customPath && await isExecutable(customPath)) {
      return customPath;
    }
    
    // Use 'which' on Unix-like systems or 'where' on Windows
    const command = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
    const { stdout } = await execAsync(command);
    return stdout.trim();
  } catch (error) {
    // If command fails, return just the command name (relies on PATH)
    return 'ffmpeg';
  }
}

/**
 * Check if a file exists and is executable
 * @param {string} filePath Path to check
 * @returns {Promise<boolean>} Whether file is executable
 */
async function isExecutable(filePath) {
  try {
    await fs.access(filePath, fs.constants.X_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Extract version information from command output
 * @param {string} output Command output
 * @returns {string} Version string
 */
function extractVersion(output) {
  const versionMatch = output.match(/version\s+(\S+)/i);
  return versionMatch ? versionMatch[1] : 'unknown';
}

/**
 * Test transcoding capability by creating a small test video
 * @param {Object} capabilities FFmpeg capabilities object
 * @returns {Promise<void>}
 */
async function testTranscodingCapability(capabilities) {
  // Create a temporary directory
  const tempDir = path.join(os.tmpdir(), `ffmpeg-test-${Date.now()}`);
  await fs.ensureDir(tempDir);
  
  try {
    const testOutputFile = path.join(tempDir, 'test-output.mp4');
    
    // Test parameters
    const testDuration = 3; // seconds
    const hwaccel = selectBestHwAccel(capabilities.hardwareAcceleration);
    
    // Create a test pattern video
    let command = `ffmpeg -y -f lavfi -i testsrc=duration=${testDuration}:size=640x360:rate=30 `;
    
    // Add hardware acceleration if available
    if (hwaccel) {
      if (hwaccel === 'vaapi') {
        command += `-hwaccel vaapi -hwaccel_output_format vaapi `;
      } else if (hwaccel === 'nvenc') {
        command += `-hwaccel cuda `;
      } else if (hwaccel === 'qsv') {
        command += `-hwaccel qsv -hwaccel_output_format qsv `;
      } else if (hwaccel === 'videotoolbox') {
        command += `-hwaccel videotoolbox `;
      } else if (hwaccel === 'd3d11va' || hwaccel === 'dxva2') {
        command += `-hwaccel ${hwaccel} `;
      }
    }
    
    // Encode the video
    if (hwaccel === 'nvenc' && capabilities.codecs.h264.encode) {
      command += `-c:v h264_nvenc `;
    } else if (hwaccel === 'qsv' && capabilities.codecs.h264.encode) {
      command += `-c:v h264_qsv `;
    } else if (hwaccel === 'vaapi' && capabilities.codecs.h264.encode) {
      command += `-c:v h264_vaapi `;
    } else if (hwaccel === 'videotoolbox' && capabilities.codecs.h264.encode) {
      command += `-c:v h264_videotoolbox `;
    } else {
      // Software encoding fallback
      command += `-c:v libx264 -preset ultrafast `;
    }
    
    // Complete the command
    command += `-b:v 1M -f mp4 "${testOutputFile}"`;
    
    // Execute the command
    const startTime = Date.now();
    await execAsync(command);
    const endTime = Date.now();
    
    // Verify the output file exists and has content
    const stats = await fs.stat(testOutputFile);
    const fileExists = stats.size > 0;
    
    // Return test results
    return {
      success: fileExists,
      duration: (endTime - startTime) / 1000,
      hwaccel: hwaccel || 'software',
      outputSize: stats.size,
      command
    };
  } finally {
    // Clean up temporary directory
    try {
      await fs.remove(tempDir);
    } catch (error) {
      logger.warn('Failed to clean up FFmpeg test directory', { 
        dir: tempDir, 
        error: error.message 
      });
    }
  }
}

/**
 * Select the best hardware acceleration method based on availability
 * @param {Object} hwaccel Hardware acceleration capabilities
 * @returns {string|null} Best hardware acceleration method or null
 */
function selectBestHwAccel(hwaccel) {
  if (!hwaccel) return null;
  
  // Check platform-specific accelerators first
  if (process.platform === 'linux' && hwaccel.vaapi) {
    return 'vaapi';
  } else if (process.platform === 'win32' && hwaccel.d3d11va) {
    return 'd3d11va';
  } else if (process.platform === 'darwin' && hwaccel.videotoolbox) {
    return 'videotoolbox';
  }
  
  // Check cross-platform accelerators
  if (hwaccel.nvenc) {
    return 'nvenc';
  } else if (hwaccel.qsv) {
    return 'qsv';
  } else if (process.platform === 'win32' && hwaccel.dxva2) {
    return 'dxva2';
  }
  
  // No hardware acceleration available
  return null;
}

module.exports = {
  checkFFmpegCapabilities
};
