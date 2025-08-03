import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  IconButton,
  Slider,
  Typography,
  Paper
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import apiService from '../services/api';
import type { Media } from '../types';
import Hls from 'hls.js';
type HlsInstance = InstanceType<typeof Hls>;

interface MediaPlayerProps {
  media: Media;
  onClose?: () => void;
}

const MediaPlayer: React.FC<MediaPlayerProps> = ({ media, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  // HLS.js state
  const [hlsInstance, setHlsInstance] = useState<HlsInstance | null>(null);
  const [levels, setLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = auto
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<number>(-1); // -1 = off

  // Initialize stream and video player
  useEffect(() => {
    const initializePlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Start the stream
        const streamResponse = await apiService.startStream(media.id, 1); // TODO: Get actual user ID
        
        if (streamResponse.success && streamResponse.stream) {
          setStreamId(streamResponse.stream.streamId);
          
          // Set up HLS video source
          const video = videoRef.current;
          const playlistUrl = `/api/stream/${streamResponse.stream.streamId}/playlist.m3u8`;
          if (video) {
            if (Hls.isSupported()) {
              const hls = new Hls({
                enableWebVTT: true,
                capLevelToPlayerSize: true
              });
              hls.loadSource(playlistUrl);
              hls.attachMedia(video);
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setLevels(hls.levels);
                setCurrentLevel(hls.currentLevel);
                setSubtitleTracks(hls.subtitleTracks || []);
                setCurrentSubtitle(hls.subtitleTrack);
              });
              hls.on(Hls.Events.LEVEL_SWITCHED, () => {
                setCurrentLevel(hls.currentLevel);
              });
              hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, () => {
                setCurrentSubtitle(hls.subtitleTrack);
              });
              hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) {
                  setError('Fatal streaming error');
                } else {
                  // Try automatic recovery for non-fatal errors
                  if (data.type === 'networkError') {
                    hls.startLoad();
                  } else if (data.type === 'mediaError') {
                    hls.recoverMediaError();
                  }
                }
              });
              setHlsInstance(hls);
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              // Native HLS support (Safari)
              video.src = playlistUrl;
            } else {
              video.src = playlistUrl;
            }
            video.load();
          }
        } else {
          setError(streamResponse.message || 'Failed to start stream');
        }
      } catch (err) {
        console.error('Error initializing player:', err);
        setError('Failed to initialize media player');
      } finally {
        setIsLoading(false);
      }
    };

    initializePlayer();

    // Cleanup function
    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      if (streamId) {
        apiService.stopStream(streamId).catch(err => 
          console.error('Error stopping stream:', err)
        );
      }
    };
  }, [media.id]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    const handleError = () => {
      setError('Error loading video');
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, []);

  // Control handlers
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (_: Event, newValue: number | number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const seekTime = Array.isArray(newValue) ? newValue[0] : newValue;
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (_: Event, newValue: number | number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = Array.isArray(newValue) ? newValue[0] : newValue;
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const handleFullscreenToggle = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Format time helper
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Neon error overlay
  if (error) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#181924', border: '2px solid #ff00ea', boxShadow: '0 0 24px #00ffe7, 0 0 32px #ff00ea' }}>
        <div style={{ color: '#ff00ea', textShadow: '0 0 8px #ff00ea', fontSize: 20, marginBottom: 16 }}>
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#181924',
            color: '#00ffe7',
            border: '2px solid #ff00ea',
            borderRadius: 8,
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 16,
            boxShadow: '0 0 8px #00ffe7, 0 0 12px #ff00ea',
            outline: 'none',
            padding: '8px 32px',
            margin: '0 8px',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          Retry
        </button>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: '#181924',
              color: '#ff00ea',
              border: '2px solid #00ffe7',
              borderRadius: 8,
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 16,
              boxShadow: '0 0 8px #00ffe7, 0 0 12px #ff00ea',
              outline: 'none',
              padding: '8px 32px',
              margin: '0 8px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Close Player
          </button>
        )}
      </Paper>
    );
  }

  return (
    <Paper 
      ref={containerRef}
      sx={{ 
        position: 'relative',
        bgcolor: 'black',
        aspectRatio: '16/9',
        overflow: 'hidden'
      }}
    >
      {/* Video Element */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 18,
        border: '2px solid #00ffe7',
        boxShadow: '0 0 48px #00ffe7, 0 0 64px #ff00ea',
        overflow: 'hidden',
      }}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: '#181924',
            zIndex: 1
          }}
          playsInline
        />
        {/* Subtitle Styling */}
        <style>{`
          video::cue {
            color: #00ffe7;
            text-shadow: 0 0 8px #ff00ea, 0 0 2px #000;
            font-family: 'Share Tech Mono', 'Fira Mono', 'Consolas', monospace;
            font-size: 2.2vw;
            background: rgba(24,25,36,0.55);
            border-radius: 8px;
            padding: 0.15em 0.7em;
          }
        `}</style>
      </div>

      {/* Neon Buffering/Loading Overlay */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(24, 25, 36, 0.92)',
            color: '#00ffe7',
            zIndex: 10
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <div style={{
              width: 64,
              height: 64,
              border: '6px solid #00ffe7',
              borderTop: '6px solid #ff00ea',
              borderRadius: '50%',
              margin: '0 auto 18px',
              animation: 'spin 1.2s linear infinite',
              boxShadow: '0 0 32px #00ffe7, 0 0 36px #ff00ea'
            }} />
            <Typography variant="body1" sx={{ color: '#ff00ea', textShadow: '0 0 8px #ff00ea' }}>Loading video...</Typography>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
          </Box>
        </Box>
      )}

      {/* Controls Overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, #181924 90%)',
          p: 2,
          color: '#00ffe7',
          boxShadow: '0 0 24px #00ffe7, 0 0 32px #ff00ea',
          borderTop: '2px solid #ff00ea',
          borderRadius: '0 0 18px 18px',
          userSelect: 'none',
          transition: 'box-shadow 0.2s',
        }}
      >
        {/* Progress Bar */}
        <Box sx={{ mb: 1 }}>
          <Slider
            value={currentTime}
            max={duration}
            onChange={handleSeek}
            sx={{
              color: '#00ffe7',
              '& .MuiSlider-thumb': {
                width: 14,
                height: 14,
                boxShadow: '0 0 8px #ff00ea',
                background: '#181924',
                border: '2px solid #ff00ea',
              },
              '& .MuiSlider-rail': {
                background: '#222',
              },
              '& .MuiSlider-track': {
                background: 'linear-gradient(90deg, #00ffe7, #ff00ea)',
                boxShadow: '0 0 6px #00ffe7',
              },
            }}
          />
        </Box>

        {/* Control Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handlePlayPause} sx={{ color: isPlaying ? '#ff00ea' : '#00ffe7', boxShadow: isPlaying ? '0 0 10px #ff00ea' : '0 0 10px #00ffe7', background: '#181924', border: '2px solid #00ffe7', '&:hover': { color: '#ff00ea', borderColor: '#ff00ea' } }}>
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>

          <Typography variant="body2" sx={{ minWidth: 80, color: '#00ffe7', fontFamily: 'Share Tech Mono, monospace', textShadow: '0 0 6px #ff00ea' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>

          {/* Quality Selector */}
          {levels.length > 1 && hlsInstance && (
            <select
              value={currentLevel}
              onChange={e => {
                const newLevel = Number(e.target.value);
                hlsInstance.currentLevel = newLevel;
                setCurrentLevel(newLevel);
              }}
              style={{
                background: '#181924',
                color: '#00ffe7',
                border: '2px solid #ff00ea',
                borderRadius: 8,
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 15,
                boxShadow: '0 0 8px #00ffe7, 0 0 12px #ff00ea',
                outline: 'none',
                marginLeft: 16,
                padding: '4px 16px',
                transition: 'all 0.15s',
              }}
            >
              <option value={-1}>Auto</option>
              {levels.map((level, i) => (
                <option key={i} value={i}>{level.height ? `${level.height}p` : `Level ${i+1}`}</option>
              ))}
            </select>
          )}

          {/* Subtitle Selector */}
          {subtitleTracks.length > 0 && hlsInstance && (
            <>
              <select
                value={currentSubtitle}
                onChange={e => {
                  const newTrack = Number(e.target.value);
                  hlsInstance.subtitleTrack = newTrack;
                  setCurrentSubtitle(newTrack);
                }}
                style={{
                  background: '#181924',
                  color: '#00ffe7',
                  border: '2px solid #00ffe7',
                  borderRadius: 8,
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 15,
                  boxShadow: '0 0 8px #00ffe7, 0 0 12px #ff00ea',
                  outline: 'none',
                  marginLeft: 16,
                  padding: '4px 16px',
                  transition: 'all 0.15s',
                }}
                aria-label="Subtitle track selector"
              >
                <option value={-1}>No Subtitles</option>
                {subtitleTracks.map((track, i) => (
                  <option key={i} value={i}>{track.name || `Subtitle ${i+1}`}</option>
                ))}
              </select>
              {/* Subtitle font size selector */}
              <select
                defaultValue={2.2}
                onChange={e => {
                  const size = e.target.value;
                  const styleTag = document.querySelector('style[data-cyberpunk-subs]') as HTMLStyleElement;
                  if (styleTag) styleTag.remove();
                  const style = document.createElement('style');
                  style.setAttribute('data-cyberpunk-subs', 'true');
                  style.innerHTML = `video::cue { font-size: ${size}vw !important; }`;
                  document.head.appendChild(style);
                }}
                style={{
                  background: '#181924',
                  color: '#00ffe7',
                  border: '2px solid #ff00ea',
                  borderRadius: 8,
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 15,
                  boxShadow: '0 0 8px #00ffe7, 0 0 12px #ff00ea',
                  outline: 'none',
                  marginLeft: 8,
                  padding: '4px 8px',
                  transition: 'all 0.15s',
                }}
                aria-label="Subtitle font size"
              >
                <option value={1.5}>Small</option>
                <option value={2.2}>Medium</option>
                <option value={3.0}>Large</option>
              </select>
            </>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            <IconButton onClick={handleMuteToggle} sx={{ color: isMuted ? '#ff00ea' : '#00ffe7', background: '#181924', border: '2px solid #00ffe7', '&:hover': { color: '#ff00ea', borderColor: '#ff00ea' } }}>
              {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </IconButton>

            <Slider
              value={isMuted ? 0 : volume}
              max={1}
              step={0.1}
              onChange={handleVolumeChange}
              sx={{
                width: 80,
                color: '#00ffe7',
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12,
                  boxShadow: '0 0 8px #ff00ea',
                  background: '#181924',
                  border: '2px solid #ff00ea',
                },
                '& .MuiSlider-rail': {
                  background: '#222',
                },
                '& .MuiSlider-track': {
                  background: 'linear-gradient(90deg, #00ffe7, #ff00ea)',
                  boxShadow: '0 0 6px #00ffe7',
                },
              }}
            />

            <IconButton onClick={handleFullscreenToggle} sx={{ color: isFullscreen ? '#ff00ea' : '#00ffe7', background: '#181924', border: '2px solid #00ffe7', '&:hover': { color: '#ff00ea', borderColor: '#ff00ea' } }}>
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default MediaPlayer;
