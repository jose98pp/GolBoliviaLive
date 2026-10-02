import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Minimize2,
  Settings,
  Tv,
  Layers,
  Radio,
  Share2,
  RefreshCw,
  Sliders,
  Check,
  Zap,
  Mic,
  Cast,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { StreamResolution, StreamSettings } from '../types/football';
import { RESOLUTIONS, BOLIVIAN_CLUBS } from '../data/bolivianFootballData';

// Google Cast & W3C Presentation API Types
declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    __isGCastApiAvailable?: boolean;
    cast?: {
      framework: {
        CastContext: {
          getInstance: () => {
            setOptions: (options: { receiverApplicationId: string; autoJoinPolicy: unknown }) => void;
            requestSession: () => Promise<void>;
            getCurrentSession: () => any;
            endCurrentSession?: (stopCasting: boolean) => void;
            addEventListener: (type: string, handler: (event: any) => void) => void;
            getCastState: () => string;
          };
        };
        CastContextEventType: {
          SESSION_STATE_CHANGED: string;
          CAST_STATE_CHANGED: string;
        };
        SessionState: {
          SESSION_STARTED: string;
          SESSION_RESUMED: string;
          SESSION_ENDED: string;
        };
      };
    };
    chrome?: {
      cast: {
        AutoJoinPolicy: {
          ORIGIN_SCOPED: unknown;
        };
        media: {
          DEFAULT_MEDIA_RECEIVER_APP_ID: string;
          StreamType?: {
            LIVE: unknown;
          };
          MediaInfo: new (contentId: string, contentType: string) => any;
          GenericMediaMetadata: new () => any;
          LoadRequest: new (mediaInfo: any) => any;
        };
      };
    };
  }
}

interface PresentationConnection {
  id: string;
  state: 'connecting' | 'connected' | 'closed' | 'terminated';
  send: (data: string) => void;
  close: () => void;
  terminate: () => void;
  onconnect: (() => void) | null;
  onclose: (() => void) | null;
  onterminate: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
}

interface PresentationAvailability {
  value: boolean;
  onchange: (() => void) | null;
}

interface PresentationRequestInstance {
  start: () => Promise<PresentationConnection>;
  reconnect: (id: string) => Promise<PresentationConnection>;
  getAvailability?: () => Promise<PresentationAvailability>;
}

interface StreamPlayerProps {
  isTheaterMode: boolean;
  setIsTheaterMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  openObsModal: () => void;
  triggerReaction: (emoji: string) => void;
  homeScore: number;
  awayScore: number;
  matchMinute: number;
  streamSettings?: StreamSettings;
  viewerCount?: number;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  isTheaterMode,
  setIsTheaterMode,
  openObsModal,
  triggerReaction,
  homeScore,
  awayScore,
  matchMinute,
  streamSettings,
  viewerCount = 14820,
}) => {
  const homeClub = (streamSettings && BOLIVIAN_CLUBS[streamSettings.homeClubId]) || BOLIVIAN_CLUBS.bolivar;
  const awayClub = (streamSettings && BOLIVIAN_CLUBS[streamSettings.awayClubId]) || BOLIVIAN_CLUBS.strongest;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.85);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [streamReloadKey, setStreamReloadKey] = useState<number>(0);
  const [currentResolution, setCurrentResolution] = useState<StreamResolution>('1080p60');
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [showAudioMenu, setShowAudioMenu] = useState<boolean>(false);
  const [showCameraMenu, setShowCameraMenu] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [latencyMode, setLatencyMode] = useState<'ultra-low' | 'standard'>('ultra-low');
  const [audioTrack, setAudioTrack] = useState<'oficial' | 'radio' | 'ambiente'>('oficial');
  const [cameraAngle, setCameraAngle] = useState<'principal' | 'arco' | 'tactica' | 'ras_piso'>('principal');

  // Live telemetry (real-time stream stats)
  const [bitrateTelemetry, setBitrateTelemetry] = useState<number>(5940);
  const [fpsTelemetry, setFpsTelemetry] = useState<number>(59.9);
  const [showStatsOverlay, setShowStatsOverlay] = useState<boolean>(false);
  const [showCastModal, setShowCastModal] = useState<boolean>(false);

  // Google Cast & Presentation API state for Chromium browsers
  type CastConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';
  const [castStatus, setCastStatus] = useState<CastConnectionStatus>('idle');
  const [castError, setCastError] = useState<string | null>(null);
  const [castDiagnosticsMessage, setCastDiagnosticsMessage] = useState<string | null>(null);
  const [castDevice, setCastDevice] = useState<{ friendlyName: string; modelName?: string } | null>(null);
  const [castIsPaused, setCastIsPaused] = useState<boolean>(false);
  const [castTvVolume, setCastTvVolume] = useState<number>(1);
  const [castTvMuted, setCastTvMuted] = useState<boolean>(false);

  const [isCastConnected, setIsCastConnected] = useState<boolean>(false);
  const [isPresentationAvailable, setIsPresentationAvailable] = useState<boolean>(false);
  const [presentationDeviceName, setPresentationDeviceName] = useState<string>('');
  const presentationRequestRef = useRef<PresentationRequestInstance | null>(null);
  const presentationConnectionRef = useRef<PresentationConnection | null>(null);

  // Auto-hide on-screen controls for clean video view
  const [showControls, setShowControls] = useState<boolean>(true);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying && !showSettingsMenu && !showAudioMenu && !showCameraMenu && !showStatsOverlay) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  useEffect(() => {
    if (!isPlaying || showSettingsMenu || showAudioMenu || showCameraMenu || showStatsOverlay) {
      setShowControls(true);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    } else {
      resetControlsTimeout();
    }
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [isPlaying, showSettingsMenu, showAudioMenu, showCameraMenu, showStatsOverlay]);

  // Audio simulation using Web Audio API for stadium buzz and whistle
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playWhistleSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {
      // AudioContext muted/unsupported
    }
  };

  const handleTogglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = userVideoRef.current;
    if (video) {
      if (!video.paused) {
        video.pause();
        setIsPlaying(false);
      } else {
        video.play().then(() => setIsPlaying(true)).catch(() => {});
        setIsPlaying(true);
        playWhistleSound();
      }
    } else {
      setIsPlaying((prev) => !prev);
      if (!isPlaying) playWhistleSound();
    }
  };

  const handleReloadStream = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsReconnecting(true);
    setStreamError(null);
    setStreamReloadKey((prev) => prev + 1);
    const video = userVideoRef.current;
    if (video) {
      try {
        video.load();
        video.play().catch(() => {});
      } catch {}
    }
    setTimeout(() => setIsReconnecting(false), 900);
  };

  // Sync isPlaying state with real video element events
  useEffect(() => {
    const video = userVideoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [userVideoRef.current]);

  // Canvas-based football match broadcast simulation
  useEffect(() => {
    if (streamSettings?.customVideoUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let ballX = 400;
    let ballY = 225;
    let ballVx = 3.2;
    let ballVy = 1.8;
    let frameCount = 0;

    // 10 home players + 10 away players + 2 goalkeepers
    interface PlayerPos {
      x: number;
      y: number;
      tx: number;
      ty: number;
      team: 'home' | 'away';
      role: string;
      num: number;
    }

    const players: PlayerPos[] = [];
    // Home team (Bolívar - Celeste)
    for (let i = 0; i < 11; i++) {
      players.push({
        x: 120 + (i % 4) * 80,
        y: 80 + Math.floor(i / 4) * 90,
        tx: 120 + (i % 4) * 80,
        ty: 80 + Math.floor(i / 4) * 90,
        team: 'home',
        role: i === 0 ? 'POR' : 'FLD',
        num: i + 1,
      });
    }
    // Away team (Strongest - Oro y Negro)
    for (let i = 0; i < 11; i++) {
      players.push({
        x: 680 - (i % 4) * 80,
        y: 80 + Math.floor(i / 4) * 90,
        tx: 680 - (i % 4) * 80,
        ty: 80 + Math.floor(i / 4) * 90,
        team: 'away',
        role: i === 0 ? 'POR' : 'FLD',
        num: i + 1,
      });
    }

    const render = () => {
      frameCount++;
      const w = canvas.width;
      const h = canvas.height;

      // Pitch background with grass stripes
      ctx.fillStyle = '#105228';
      ctx.fillRect(0, 0, w, h);

      const stripes = 12;
      const stripeW = w / stripes;
      for (let s = 0; s < stripes; s += 2) {
        ctx.fillStyle = '#0f4823';
        ctx.fillRect(s * stripeW, 0, stripeW, h);
      }

      // Stadium line markings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2.5;

      // Outer boundary & center line
      ctx.strokeRect(30, 25, w - 60, h - 50);
      ctx.beginPath();
      ctx.moveTo(w / 2, 25);
      ctx.lineTo(w / 2, h - 25);
      ctx.stroke();

      // Center circle
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();

      // Penalty areas
      // Left (Home goal)
      ctx.strokeRect(30, h / 2 - 80, 110, 160);
      ctx.strokeRect(30, h / 2 - 40, 40, 80);
      // Right (Away goal)
      ctx.strokeRect(w - 140, h / 2 - 80, 110, 160);
      ctx.strokeRect(w - 70, h / 2 - 40, 40, 80);

      // Ball movement
      ballX += ballVx;
      ballY += ballVy;

      if (ballX < 60 || ballX > w - 60) {
        ballVx = -ballVx * 0.95;
      }
      if (ballY < 40 || ballY > h - 40) {
        ballVy = -ballVy * 0.95;
      }

      // Periodic pass to random player
      if (frameCount % 130 === 0) {
        const randP = players[Math.floor(Math.random() * players.length)];
        const dx = randP.x - ballX;
        const dy = randP.y - ballY;
        const dist = Math.hypot(dx, dy) || 1;
        ballVx = (dx / dist) * 4.5;
        ballVy = (dy / dist) * 4.5;
      }

      // Draw players
      players.forEach((p, idx) => {
        // Subtle organic movement toward ball
        const distToBall = Math.hypot(ballX - p.x, ballY - p.y);
        if (distToBall < 180 && p.role !== 'POR') {
          p.x += (ballX - p.x) * 0.015;
          p.y += (ballY - p.y) * 0.015;
        } else {
          p.x += (p.tx - p.x) * 0.01;
          p.y += (p.ty - p.y) * 0.01;
        }

        // Player shadow
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 7, 7, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        // Player jersey circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        if (p.team === 'home') {
          ctx.fillStyle = '#0284c7'; // Celeste Bolívar
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#eab308'; // Oro y Negro The Strongest
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Player number
        ctx.fillStyle = p.team === 'home' ? '#ffffff' : '#000000';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.num.toString(), p.x, p.y);
      });

      // Draw Ball with glow
      ctx.beginPath();
      ctx.arc(ballX, ballY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Camera lens vignette effect
      const grad = ctx.createRadialGradient(w / 2, h / 2, w / 4, w / 2, h / 2, w / 1.5);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      if (isPlaying) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [streamSettings?.customVideoUrl, isPlaying, cameraAngle]);

  // MediaMTX & OBS HLS Stream Handler with Hls.js
  useEffect(() => {
    const video = userVideoRef.current;
    const url = streamSettings?.customVideoUrl?.trim();
    if (!video || !url) return;

    let hls: Hls | null = null;
    const isHlsStream = url.includes('.m3u8') || url.includes('/hls/') || url.includes(':8888');

    // Ensure mute and volume are set before loading
    video.muted = isMuted;
    video.volume = volume;
    setStreamError(null);

    if (isHlsStream && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 15,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 4,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStreamError(null);
        if (isPlaying) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setStreamError('Conectando con OBS Studio... Verifica que OBS esté transmitiendo y Cloudflare activo.');
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS (Safari iOS/macOS)
      video.src = url;
      if (isPlaying) video.play().catch(() => {});
    } else {
      video.src = url;
      if (isPlaying) video.play().catch(() => {});
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamSettings?.customVideoUrl, streamSettings?.broadcastMode, streamReloadKey]);

  // Sync mute and volume with video element
  useEffect(() => {
    if (userVideoRef.current) {
      userVideoRef.current.muted = isMuted;
      userVideoRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  // Dynamic telemetry fluctuation
  useEffect(() => {
    const timer = setInterval(() => {
      const baseBitrate = currentResolution === '1080p60' ? 5900 : currentResolution === '720p60' ? 3480 : 1480;
      const variation = Math.floor((Math.random() - 0.5) * 160);
      setBitrateTelemetry(Math.max(500, baseBitrate + variation));
      setFpsTelemetry(currentResolution.includes('60') ? 59.8 + (Math.random() * 0.4) : 29.9 + (Math.random() * 0.2));
    }, 2000);
    return () => clearInterval(timer);
  }, [currentResolution]);

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    const video = userVideoRef.current;
    if (!container) return;

    const isFs = !!(
      document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement: Element }).webkitFullscreenElement
    );

    if (!isFs) {
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen) {
          await (container as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        } else if (video && (video as unknown as { webkitEnterFullscreen: () => void }).webkitEnterFullscreen) {
          (video as unknown as { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
        }

        // Auto-rotate: lock orientation to landscape on mobile devices
        if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
          try {
            await (screen.orientation as unknown as { lock: (orientation: string) => Promise<void> }).lock('landscape');
          } catch {}
        }
      } catch (err) {
        console.warn('Fullscreen request failed:', err);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen) {
          await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
        }

        // Unlock orientation when exiting fullscreen
        if (typeof screen !== 'undefined' && screen.orientation && 'unlock' in screen.orientation) {
          try {
            (screen.orientation as unknown as { unlock: () => void }).unlock();
          } catch {}
        }
      } catch (err) {
        console.warn('Exit fullscreen failed:', err);
      }
    }
  };

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement: Element }).webkitFullscreenElement
      );
      setIsFullscreen(isFs);
      if (!isFs) {
        try {
          if (typeof screen !== 'undefined' && screen.orientation && 'unlock' in screen.orientation) {
            (screen.orientation as unknown as { unlock: () => void }).unlock();
          }
        } catch {}
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Automatic rotation: when a mobile user turns their phone to landscape, auto-enter fullscreen
  useEffect(() => {
    const handleOrientationOrResize = () => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 1024;
      const isLandscape = typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches;
      const isFs = !!(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement: Element }).webkitFullscreenElement
      );

      if (isMobile && isLandscape && isPlaying && !isFs) {
        const container = containerRef.current;
        if (container?.requestFullscreen) {
          container.requestFullscreen().catch(() => {});
        }
      }
    };

    window.addEventListener('resize', handleOrientationOrResize);
    window.addEventListener('orientationchange', handleOrientationOrResize);
    return () => {
      window.removeEventListener('resize', handleOrientationOrResize);
      window.removeEventListener('orientationchange', handleOrientationOrResize);
    };
  }, [isPlaying]);

  // Google Cast Framework & W3C Presentation Request API initialization
  useEffect(() => {
    // 1. Google Cast SDK (Chromecast, Android TV, Google TV, Smart TVs with Cast)
    const initGoogleCast = (isAvailable: boolean) => {
      if (isAvailable && window.cast?.framework) {
        try {
          const context = window.cast.framework.CastContext.getInstance();
          // Explicit receiver application ID: Google Default Media Receiver CC1AD845
          const receiverAppId =
            window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID || 'CC1AD845';

          context.setOptions({
            receiverApplicationId: receiverAppId,
            autoJoinPolicy: window.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED || 'origin_scoped',
          });
          setIsPresentationAvailable(true);

          context.addEventListener(
            window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            (event: { sessionState: string }) => {
              const state = event.sessionState;
              if (
                state === window.cast?.framework?.SessionState?.SESSION_STARTED ||
                state === window.cast?.framework?.SessionState?.SESSION_RESUMED
              ) {
                const session = context.getCurrentSession();
                const dev = session?.getCastDevice?.();
                const friendlyName = dev?.friendlyName || 'Smart TV / Chromecast';
                const modelName = dev?.modelName;

                setCastStatus('connected');
                setCastError(null);
                setCastDevice({ friendlyName, modelName });
                setIsCastConnected(true);
                setPresentationDeviceName(friendlyName);

                const videoUrl = streamSettings?.customVideoUrl;
                if (videoUrl && window.chrome?.cast?.media) {
                  try {
                    const mediaInfo = new window.chrome.cast.media.MediaInfo(videoUrl, 'application/x-mpegURL');
                    mediaInfo.streamType = window.chrome.cast.media.StreamType?.LIVE || 'LIVE';
                    mediaInfo.contentType = 'application/x-mpegURL';
                    mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
                    mediaInfo.metadata.title = `${homeClub.name} vs ${awayClub.name}`;
                    mediaInfo.metadata.subtitle = streamSettings?.tournamentName || 'GolBolivia Live';

                    const loadReq = new window.chrome.cast.media.LoadRequest(mediaInfo);
                    loadReq.autoplay = true;

                    session.loadMedia(loadReq).then(
                      () => {
                        console.log('Google Cast: Señal HLS cargada en la TV correctamente.');
                      },
                      (mediaError: unknown) => {
                        console.warn('Cast media load error:', mediaError);
                        setCastError('No se pudo reproducir la señal en el receptor. Verifica el formato de transmisión.');
                        setCastStatus('error');
                      }
                    );
                  } catch (e) {
                    console.warn('Cast load media error:', e);
                  }
                }
              } else if (state === window.cast?.framework?.SessionState?.SESSION_ENDED) {
                setCastStatus('idle');
                setIsCastConnected(false);
                setCastDevice(null);
              }
            }
          );
        } catch (e) {
          console.warn('Cast init error:', e);
        }
      }
    };

    if (window.cast?.framework) {
      initGoogleCast(true);
    } else if (window.__isGCastApiAvailable) {
      initGoogleCast(true);
    } else {
      window.__onGCastApiAvailable = (isAvailable: boolean) => {
        initGoogleCast(isAvailable);
      };
      window.addEventListener('google-cast-api-available', () => {
        initGoogleCast(true);
      });
    }

    // 2. W3C Presentation API
    if (typeof window !== 'undefined' && 'PresentationRequest' in window) {
      try {
        const presentationUrl = `${window.location.origin}${window.location.pathname}?presentation=true`;
        const PresentationRequestClass = (
          window as unknown as { PresentationRequest: new (urls: string[]) => PresentationRequestInstance }
        ).PresentationRequest;

        const request = new PresentationRequestClass([presentationUrl, window.location.href]);
        presentationRequestRef.current = request;

        const navPresentation = (
          navigator as unknown as { presentation?: { defaultRequest?: PresentationRequestInstance } }
        ).presentation;
        if (navPresentation) {
          navPresentation.defaultRequest = request;
        }

        if (typeof request.getAvailability === 'function') {
          request
            .getAvailability()
            .then((availability) => {
              setIsPresentationAvailable(availability.value);
              availability.onchange = () => {
                setIsPresentationAvailable(availability.value);
              };
            })
            .catch(() => {});
        }
      } catch (err) {
        console.warn('Presentation API initialization:', err);
      }
    }
  }, [streamSettings?.customVideoUrl, homeClub.name, awayClub.name]);

  const handleTriggerCast = async () => {
    setCastError(null);
    setCastDiagnosticsMessage(null);
    setCastStatus('connecting');

    const video = userVideoRef.current;

    // 1. Google Cast SDK (Native Chrome on Android & PC -> Chromecast / Smart TVs)
    if (window.cast?.framework) {
      try {
        const castContext = window.cast.framework.CastContext.getInstance();
        if (castContext) {
          await castContext.requestSession();
          // If requestSession succeeds, the SESSION_STARTED event listener sets castStatus to 'connected'.
          return;
        }
      } catch (err: unknown) {
        const str = String(err);
        if (str.includes('cancel') || (err as { name?: string })?.name === 'AbortError') {
          setCastStatus('idle');
          return; // User intentionally dismissed the device selector
        }
        console.warn('Google Cast requestSession non-fatal error:', err);
        let errorMsg = 'No se pudo conectar con el dispositivo de transmisión.';
        if (str.includes('receiver_unavailable') || str.includes('timeout')) {
          errorMsg = 'No se encontró ningún Smart TV o Chromecast activo en la red Wi-Fi.';
        } else if (str.includes('session_error')) {
          errorMsg = 'Error en la sesión del receptor de TV. Prueba reiniciar el televisor.';
        } else if (str.includes('not_allowed') || str.includes('SecurityError') || str.includes('Permissions policy')) {
          errorMsg = 'El navegador restringió el acceso a Cast dentro del visor embebido.';
          setCastDiagnosticsMessage('Abre la página en una pestaña directa para permitir el acceso completo a dispositivos Wi-Fi.');
        }
        setCastError(errorMsg);
        setCastStatus('error');
        setShowCastModal(true);
        return;
      }
    }

    // 2. HTML5 Remote Playback API (Standard Chromium on mobile Android and desktop Chrome)
    if (
      video &&
      'remote' in video &&
      typeof (video as unknown as { remote: { prompt: () => Promise<void> } }).remote?.prompt === 'function'
    ) {
      try {
        await (video as unknown as { remote: { prompt: () => Promise<void> } }).remote.prompt();
        setCastStatus('connected');
        setIsCastConnected(true);
        setPresentationDeviceName('Smart TV');
        return;
      } catch (err: unknown) {
        const error = err as { name?: string };
        if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') {
          setCastStatus('idle');
          return;
        }
        console.warn('Remote playback prompt error:', err);
      }
    }

    // 3. Apple AirPlay (Safari iOS / macOS)
    if (
      video &&
      typeof (video as unknown as { webkitShowPlaybackTargetPicker: () => void }).webkitShowPlaybackTargetPicker === 'function'
    ) {
      try {
        (video as unknown as { webkitShowPlaybackTargetPicker: () => void }).webkitShowPlaybackTargetPicker();
        setCastStatus('idle');
        return;
      } catch (err) {
        console.warn('AirPlay target picker error:', err);
      }
    }

    // 4. W3C Presentation Request API
    if (presentationRequestRef.current) {
      try {
        const connection = await presentationRequestRef.current.start();
        presentationConnectionRef.current = connection;
        setCastStatus('connected');
        setIsCastConnected(true);
        setPresentationDeviceName('Smart TV');
        setCastDevice({ friendlyName: 'Smart TV' });

        connection.onconnect = () => {
          setCastStatus('connected');
          setIsCastConnected(true);
          try {
            connection.send(
              JSON.stringify({
                type: 'PLAY_STREAM',
                streamUrl: streamSettings?.customVideoUrl,
                title: `${homeClub.name} vs ${awayClub.name}`,
              })
            );
          } catch {}
        };

        connection.onclose = () => {
          setCastStatus('idle');
          setIsCastConnected(false);
          presentationConnectionRef.current = null;
        };

        connection.onterminate = () => {
          setCastStatus('idle');
          setIsCastConnected(false);
          presentationConnectionRef.current = null;
        };

        return;
      } catch (err: unknown) {
        const error = err as { name?: string };
        if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') {
          setCastStatus('idle');
          return;
        }
        console.warn('PresentationRequest error:', err);
      }
    }

    // 5. Fallback if no native Cast API could open
    setCastStatus('error');
    setCastError('No se pudo abrir el selector de dispositivos Cast en este navegador.');
    setCastDiagnosticsMessage('Prueba abriendo en una pestaña completa o verifica que tu TV y dispositivo estén en la misma red Wi-Fi.');
    setShowCastModal(true);
  };

  const handleToggleCastPlayback = () => {
    if (window.cast?.framework) {
      try {
        const session = window.cast.framework.CastContext.getInstance()?.getCurrentSession();
        const media = session?.getMediaSession?.();
        if (castIsPaused) {
          media?.play?.();
          setCastIsPaused(false);
        } else {
          media?.pause?.();
          setCastIsPaused(true);
        }
      } catch (err) {
        console.warn('Cast toggle playback error:', err);
      }
    } else if (presentationConnectionRef.current) {
      try {
        presentationConnectionRef.current.send(JSON.stringify({ type: castIsPaused ? 'PLAY' : 'PAUSE' }));
        setCastIsPaused(!castIsPaused);
      } catch (err) {
        console.warn('Presentation toggle error:', err);
      }
    }
  };

  const handleSetCastVolume = (vol: number) => {
    setCastTvVolume(vol);
    if (window.cast?.framework) {
      try {
        const session = window.cast.framework.CastContext.getInstance()?.getCurrentSession();
        session?.setVolume?.(vol);
      } catch (err) {
        console.warn('Cast set volume error:', err);
      }
    }
  };

  const handleToggleCastMute = () => {
    const nextMuted = !castTvMuted;
    setCastTvMuted(nextMuted);
    if (window.cast?.framework) {
      try {
        const session = window.cast.framework.CastContext.getInstance()?.getCurrentSession();
        session?.setMute?.(nextMuted);
      } catch (err) {
        console.warn('Cast set mute error:', err);
      }
    }
  };

  const handleDisconnectCast = () => {
    // 1. Google Cast
    if (window.cast?.framework) {
      try {
        const castContext = window.cast.framework.CastContext.getInstance();
        castContext.endCurrentSession?.(true);
      } catch {}
    }
    // 2. Presentation API
    if (presentationConnectionRef.current) {
      try {
        presentationConnectionRef.current.terminate();
      } catch {}
      presentationConnectionRef.current = null;
    }
    setCastStatus('idle');
    setIsCastConnected(false);
    setCastDevice(null);
    setCastError(null);
  };

  const handleSelectResolution = (res: StreamResolution) => {
    setCurrentResolution(res);
    setShowSettingsMenu(false);
  };

  const currentResConfig = RESOLUTIONS.find((r) => r.id === currentResolution) || RESOLUTIONS[0];

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      onPointerMove={resetControlsTimeout}
      onMouseLeave={() => {
        if (isPlaying && !showSettingsMenu && !showAudioMenu && !showCameraMenu && !showStatsOverlay) {
          setShowControls(false);
        }
      }}
      className={`relative bg-black transition-all duration-300 group select-none flex items-center justify-center ${
        !showControls && isPlaying ? 'cursor-none' : 'cursor-default'
      } ${
        isFullscreen
          ? 'fixed inset-0 w-screen h-screen z-50 rounded-none border-0 aspect-auto overflow-hidden bg-black'
          : isTheaterMode
          ? 'w-full aspect-[16/9] max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 bg-black'
          : 'w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 bg-black'
      }`}
    >
      {/* Video Content: Modes (Pre-Match, Halftime, VAR, Post-Match, OBS Video, Canvas Simulation) */}
      {streamSettings?.broadcastMode === 'pre_match' ? (
        <div className="w-full h-full bg-gradient-to-br from-[#070b14] via-[#0a1122] to-[#040810] flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
          {/* Animated stadium spotlight and tricolor border */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-500" />
          <div className="absolute -top-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Transmisión Inicia en Breve
          </div>

          <div className="flex items-center justify-center gap-6 sm:gap-12 my-2">
            <div className="text-center">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-2xl border-2 mx-auto mb-2"
                style={{ backgroundColor: `${homeClub.primaryColor}30`, borderColor: homeClub.primaryColor }}
              >
                {homeClub.badgeEmoji}
              </div>
              <span className="font-bold text-sm sm:text-base text-white">{homeClub.name}</span>
            </div>

            <div className="text-center">
              <span className="text-xs font-mono font-bold text-slate-400 px-3 py-1 bg-slate-900/80 rounded-lg border border-slate-700">VS</span>
            </div>

            <div className="text-center">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-2xl border-2 mx-auto mb-2"
                style={{ backgroundColor: `${awayClub.primaryColor}30`, borderColor: awayClub.primaryColor }}
              >
                {awayClub.badgeEmoji}
              </div>
              <span className="font-bold text-sm sm:text-base text-white">{awayClub.name}</span>
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-sm font-semibold text-slate-300">{streamSettings.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{streamSettings.stadiumName} · {streamSettings.altitudeMeters} msnm · La Paz, Bolivia</p>
          </div>
        </div>
      ) : streamSettings?.broadcastMode === 'halftime' ? (
        <div className="w-full h-full bg-[#070c18] flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <span>⏸️</span>
            Entretiempo · Análisis de Partido
          </div>

          <div className="text-center mb-3">
            <div className="font-mono text-4xl sm:text-5xl font-black text-white tracking-widest">
              {homeScore} - {awayScore}
            </div>
            <p className="text-xs text-emerald-400 font-semibold mt-1">Primer Tiempo Finalizado</p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm w-full bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="text-center border-r border-slate-800">
              <span className="text-slate-400 text-[10px]">Posesión</span>
              <div className="font-bold text-white mt-0.5">54% - 46%</div>
            </div>
            <div className="text-center">
              <span className="text-slate-400 text-[10px]">Tiros a Puerta</span>
              <div className="font-bold text-white mt-0.5">6 - 3</div>
            </div>
          </div>
        </div>
      ) : streamSettings?.broadcastMode === 'var' ? (
        <div className="w-full h-full bg-[#110505] flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-500 mb-3 animate-pulse">
            <Tv className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 rounded bg-red-600 text-white font-mono font-black text-sm tracking-wider uppercase shadow-lg shadow-red-950/80">
            REVISIÓN VAR EN PROCESO
          </span>
          <p className="text-xs text-slate-300 mt-2 font-medium">Árbitro revisando monitor oficial en cancha</p>
          <span className="text-[11px] text-red-400 font-mono mt-1">FBF · Comisión de Arbitraje</span>
        </div>
      ) : streamSettings?.broadcastMode === 'post_match' ? (
        <div className="w-full h-full bg-[#050914] flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
          <span className="px-3 py-1 rounded bg-slate-800 text-slate-300 font-mono font-bold text-xs uppercase mb-2">
            Final del Partido
          </span>
          <div className="font-mono text-4xl sm:text-5xl font-black text-white tracking-widest mb-1">
            {homeScore} - {awayScore}
          </div>
          <p className="text-xs text-slate-400">{homeClub.name} vs {awayClub.name}</p>
          <p className="text-[11px] text-emerald-400 mt-2">Gracias por sintonizar GolBolivia Live</p>
        </div>
      ) : streamSettings?.broadcastMode === 'simulation' ? (
        <canvas
          ref={canvasRef}
          width={854}
          height={480}
          className="w-full h-full object-contain select-none bg-black"
        />
      ) : (
        <video
          ref={userVideoRef}
          autoPlay
          playsInline
          controls={false}
          muted={isMuted}
          className="w-full h-full object-contain select-none bg-black cursor-pointer"
          onClick={handleTogglePlay}
        />
      )}

      {/* Paused Overlay */}
      {!isPlaying && streamSettings?.broadcastMode !== 'simulation' && (
        <div
          onClick={handleTogglePlay}
          className="absolute inset-0 z-15 bg-black/60 flex items-center justify-center cursor-pointer select-none"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all">
            <Play className="w-8 h-8 fill-black translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Unmute floating banner */}
      {isMuted && streamSettings?.broadcastMode !== 'simulation' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(false);
            if (userVideoRef.current) userVideoRef.current.muted = false;
          }}
          className="absolute top-14 left-3 z-30 px-3 py-1.5 rounded-full bg-black/85 hover:bg-black border border-amber-500/60 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-xl transition-all hover:scale-105 cursor-pointer animate-pulse"
        >
          <VolumeX className="w-3.5 h-3.5 text-amber-400" />
          <span>Toca para activar audio 🔊</span>
        </button>
      )}

      {/* Reconnecting / Stream Error Overlay */}
      {streamError && streamSettings?.broadcastMode !== 'simulation' && (
        <div className="absolute inset-0 z-15 bg-black/90 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-white font-bold text-sm">Esperando señal de OBS Studio...</h3>
          <p className="text-xs text-slate-300 max-w-md mt-1 mb-4 leading-relaxed">
            {streamError}
          </p>
          <button
            onClick={handleReloadStream}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span>Reconectar Señal</span>
          </button>
        </div>
      )}

      {/* Dynamic Cast Status Banner in Top-Left */}
      {castStatus === 'connected' && (
        <div
          className={`absolute top-3 left-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/95 border border-emerald-500/70 text-emerald-300 text-xs shadow-2xl backdrop-blur-md select-none transition-all duration-300 ${
            showControls ? 'opacity-100 pointer-events-auto' : 'opacity-85 pointer-events-auto'
          }`}
        >
          <Cast className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-semibold text-[11px]">En TV: {castDevice?.friendlyName || presentationDeviceName || 'Smart TV'}</span>
          <button
            onClick={handleToggleCastPlayback}
            className="ml-1 px-2 py-0.5 rounded bg-emerald-800/90 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors cursor-pointer"
            title={castIsPaused ? 'Reanudar en TV' : 'Pausar en TV'}
          >
            {castIsPaused ? '▶️ TV' : '⏸️ TV'}
          </button>
          <button
            onClick={handleDisconnectCast}
            className="px-2 py-0.5 rounded bg-red-600/90 hover:bg-red-500 text-white text-[10px] font-bold transition-colors cursor-pointer"
          >
            Desconectar
          </button>
        </div>
      )}

      {castStatus === 'connecting' && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/95 border border-amber-500/70 text-amber-300 text-xs shadow-2xl backdrop-blur-md animate-in fade-in select-none">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
          <span className="font-semibold text-[11px]">Conectando con Smart TV...</span>
          <button
            onClick={() => setCastStatus('idle')}
            className="ml-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {castStatus === 'error' && castError && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/95 border border-red-500/70 text-red-200 text-xs shadow-2xl backdrop-blur-md animate-in fade-in max-w-sm select-none">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-[11px] truncate">{castError}</span>
          <button
            onClick={handleTriggerCast}
            className="ml-auto px-2 py-0.5 rounded bg-red-700 hover:bg-red-600 text-white text-[10px] font-bold transition-colors cursor-pointer shrink-0"
          >
            Reintentar
          </button>
          <button
            onClick={() => setCastStatus('idle')}
            className="p-0.5 text-slate-400 hover:text-white shrink-0 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 1. Top Right Broadcast Live Badge & Ingest Indicator (Auto-hiding) */}
      <div
        className={`absolute top-3 right-3 z-20 flex items-center gap-2 transition-all duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none -translate-y-2'
        }`}
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-600/90 text-white text-[11px] font-bold tracking-wider uppercase shadow-lg shadow-red-950/50">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>EN VIVO</span>
          <span className="opacity-90 font-mono">· {viewerCount >= 1000 ? `${(viewerCount / 1000).toFixed(1)}k` : viewerCount}</span>
        </div>

        <button
          onClick={() => setShowStatsOverlay(!showStatsOverlay)}
          className="hidden sm:flex items-center gap-1 px-2 py-1 bg-black/70 hover:bg-black/90 text-slate-300 text-[11px] rounded border border-slate-700/80 transition-colors cursor-pointer"
          title="Telemetría de Stream"
        >
          <Zap className="w-3 h-3 text-emerald-400" />
          <span className="font-mono tabular-nums">{(bitrateTelemetry / 1000).toFixed(1)} Mbps</span>
        </button>
      </div>

      {/* Stream Telemetry Overlay (OBS Stats) */}
      {showStatsOverlay && (
        <div className="absolute top-14 right-3 z-30 bg-[#070b14]/95 border border-slate-700/90 p-3 rounded-xl shadow-2xl text-[11px] font-mono text-slate-300 backdrop-blur-lg w-64">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Ingest OBS Telemetry
            </span>
            <span className="text-[10px] text-emerald-400">ÓPTIMO</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Resolución:</span>
              <span className="text-white font-semibold">{currentResConfig.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Bitrate actual:</span>
              <span className="text-emerald-400 font-bold">{bitrateTelemetry} Kbps</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cuadros / seg:</span>
              <span className="text-white font-bold">{fpsTelemetry.toFixed(1)} FPS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Frames perdidos:</span>
              <span className="text-slate-300">0 (0.0%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Latencia estimada:</span>
              <span className="text-yellow-400">{latencyMode === 'ultra-low' ? '0.8s Ultra Baja' : '2.4s Normal'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Códec Video:</span>
              <span className="text-slate-300">H.264 / AVC1 (NVENC)</span>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING QUICK REACTIONS TRIGGER BAR ON VIDEO (Auto-hiding on desktop only so it doesn't block mobile screen) */}
      <div
        className={`hidden sm:flex absolute right-3 bottom-16 z-20 flex-col gap-1.5 transition-all duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto translate-x-0' : 'opacity-0 pointer-events-none translate-x-2'
        }`}
      >
        <button
          onClick={() => triggerReaction('⚽')}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-slate-700 flex items-center justify-center text-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
          title="Grito de Gol"
        >
          ⚽
        </button>
        <button
          onClick={() => triggerReaction('🇧🇴')}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-slate-700 flex items-center justify-center text-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
          title="Tricolor Boliviana"
        >
          🇧🇴
        </button>
        <button
          onClick={() => triggerReaction('🔥')}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-slate-700 flex items-center justify-center text-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
          title="Fuego / Emoción"
        >
          🔥
        </button>
        <button
          onClick={() => triggerReaction('⚡')}
          className="w-8 h-8 rounded-full bg-[#0284c7]/80 hover:bg-[#0284c7] border border-sky-400 flex items-center justify-center text-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
          title="Aguante Bolívar"
        >
          ⚡
        </button>
        <button
          onClick={() => triggerReaction('🐯')}
          className="w-8 h-8 rounded-full bg-[#eab308]/80 hover:bg-[#eab308] border border-yellow-300 text-black flex items-center justify-center text-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
          title="Aguante Tigre"
        >
          🐯
        </button>
      </div>

      {/* STREAM CONTROLS BAR (BOTTOM - Auto-hiding for clean view) */}
      <div
        className={`absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 pt-8 flex flex-col gap-2 transition-all duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-4'
        }`}
      >
        {/* Progress live scrubber line */}
        <div className="w-full h-1 bg-slate-700/80 rounded-full overflow-hidden flex">
          <div className="w-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 h-full" />
        </div>

        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Controls: Play/Pause, Volume, Live, Audio track */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTogglePlay}
              className="p-1.5 hover:text-emerald-400 transition-colors cursor-pointer"
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              title={isPlaying ? 'Pausar transmisión' : 'Reanudar transmisión'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={handleReloadStream}
              className="p-1.5 hover:text-emerald-400 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              title="Recargar señal en vivo"
              aria-label="Recargar señal"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline text-[11px] font-mono">Recargar</span>
            </button>

            {/* Volume control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1 hover:text-emerald-400 transition-colors cursor-pointer"
                aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="hidden sm:block w-16 h-1 accent-emerald-500 bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            {/* Audio Track Selector Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowAudioMenu(!showAudioMenu);
                  setShowSettingsMenu(false);
                  setShowCameraMenu(false);
                }}
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 text-[11px] cursor-pointer"
                title="Pistas de Audio y Relatores"
              >
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {audioTrack === 'oficial' ? 'Relato TV Oficial' : audioTrack === 'radio' ? 'Radio Panamericana' : 'Solo Ambiente Siles'}
                </span>
              </button>

              {/* Audio track flyout */}
              {showAudioMenu && (
                <div className="absolute bottom-9 left-0 w-52 bg-[#0c121e] border border-slate-700 rounded-xl p-1.5 shadow-2xl z-40 text-xs">
                  <div className="px-2 py-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Pista de Comentarios
                  </div>
                  <button
                    onClick={() => {
                      setAudioTrack('oficial');
                      setShowAudioMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      audioTrack === 'oficial' ? 'bg-emerald-950/60 text-emerald-400 font-medium' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Relato Deporte Total HD</span>
                    {audioTrack === 'oficial' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setAudioTrack('radio');
                      setShowAudioMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      audioTrack === 'radio' ? 'bg-emerald-950/60 text-emerald-400 font-medium' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Radio Panamericana (AM/FM)</span>
                    {audioTrack === 'radio' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setAudioTrack('ambiente');
                      setShowAudioMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      audioTrack === 'ambiente' ? 'bg-emerald-950/60 text-emerald-400 font-medium' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Sonido Ambiente Estadio</span>
                    {audioTrack === 'ambiente' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Camera angle switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowCameraMenu(!showCameraMenu);
                  setShowSettingsMenu(false);
                  setShowAudioMenu(false);
                }}
                className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 text-[11px] cursor-pointer"
                title="Ángulo de Cámara"
              >
                <Layers className="w-3.5 h-3.5 text-yellow-400" />
                <span>
                  {cameraAngle === 'principal'
                    ? 'Tribuna Alta'
                    : cameraAngle === 'arco'
                    ? 'Detrás Arco'
                    : cameraAngle === 'tactica'
                    ? 'Táctica Aérea'
                    : 'Ras de Césped'}
                </span>
              </button>

              {showCameraMenu && (
                <div className="absolute bottom-9 left-0 w-48 bg-[#0c121e] border border-slate-700 rounded-xl p-1.5 shadow-2xl z-40 text-xs">
                  <div className="px-2 py-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Cámaras del Estadio
                  </div>
                  <button
                    onClick={() => {
                      setCameraAngle('principal');
                      setShowCameraMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      cameraAngle === 'principal' ? 'bg-yellow-950/60 text-yellow-400 font-medium' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Cámara Principal (Siles)</span>
                    {cameraAngle === 'principal' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setCameraAngle('arco');
                      setShowCameraMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      cameraAngle === 'arco' ? 'bg-yellow-950/60 text-yellow-400 font-medium' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Detrás del Arco Sur</span>
                    {cameraAngle === 'arco' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setCameraAngle('tactica');
                      setShowCameraMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      cameraAngle === 'tactica' ? 'bg-yellow-950/60 text-yellow-400 font-medium' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Plano Táctico Dron</span>
                    {cameraAngle === 'tactica' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setCameraAngle('ras_piso');
                      setShowCameraMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      cameraAngle === 'ras_piso' ? 'bg-yellow-950/60 text-yellow-400 font-medium' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Ras de Césped / Suplentes</span>
                    {cameraAngle === 'ras_piso' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Controls: Resolutions Menu, Theater, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Resolution Selector Button & Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSettingsMenu(!showSettingsMenu);
                  setShowAudioMenu(false);
                  setShowCameraMenu(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                aria-label="Resolución y Calidad"
              >
                <Settings className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentResConfig.qualityBadge}</span>
              </button>

              {/* Resolution selection dropdown */}
              {showSettingsMenu && (
                <div className="absolute bottom-9 right-0 w-60 bg-[#0c121e] border border-slate-700 rounded-xl p-2 shadow-2xl z-40 text-xs">
                  <div className="px-2 py-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex justify-between">
                    <span>Resolución de Video</span>
                    <span className="text-emerald-400">HLS / RTMP</span>
                  </div>

                  <div className="space-y-0.5 mt-1">
                    {RESOLUTIONS.map((res) => (
                      <button
                        key={res.id}
                        onClick={() => handleSelectResolution(res.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          currentResolution === res.id
                            ? 'bg-emerald-950/70 text-emerald-400 font-medium'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{res.label}</span>
                          <span className="text-[10px] text-slate-400">Bitrate: {res.bitrate}</span>
                        </div>
                        {currentResolution === res.id && <Check className="w-4 h-4 text-emerald-400" />}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-800 my-2 pt-2">
                    <div className="px-2 py-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Modo de Latencia
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-1 p-0.5 bg-slate-900 rounded-lg">
                      <button
                        onClick={() => setLatencyMode('ultra-low')}
                        className={`py-1 text-[11px] rounded font-medium cursor-pointer ${
                          latencyMode === 'ultra-low' ? 'bg-emerald-600 text-black font-semibold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Baja (0.8s)
                      </button>
                      <button
                        onClick={() => setLatencyMode('standard')}
                        className={`py-1 text-[11px] rounded font-medium cursor-pointer ${
                          latencyMode === 'standard' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Normal (2.5s)
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 mt-2 pt-1.5 px-1">
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false);
                        openObsModal();
                      }}
                      className="w-full py-1 text-center text-[11px] text-yellow-400 hover:underline cursor-pointer"
                    >
                      Abrir Ingest & Servidor OBS →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cast to Smart TV */}
            <button
              onClick={() => {
                if (castStatus === 'connected') {
                  setShowCastModal(true);
                } else {
                  handleTriggerCast();
                }
              }}
              className={`p-1.5 transition-all cursor-pointer flex items-center gap-1 rounded-lg ${
                castStatus === 'connected'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-950/40'
                  : castStatus === 'connecting'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                  : castStatus === 'error'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'hover:text-emerald-400 text-slate-300 hover:text-white'
              }`}
              title={
                castStatus === 'connected'
                  ? `Transmitiendo en ${castDevice?.friendlyName || presentationDeviceName || 'Smart TV'} (Click para panel de control TV)`
                  : castStatus === 'connecting'
                  ? 'Conectando con Smart TV...'
                  : castStatus === 'error'
                  ? `Error: ${castError || 'Click para reintentar'}`
                  : 'Transmitir a Smart TV / Chromecast (Google Cast & AirPlay)'
              }
              aria-label="Transmitir a Smart TV"
            >
              {castStatus === 'connecting' ? (
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              ) : (
                <Cast className={`w-4 h-4 ${castStatus === 'connected' ? 'text-emerald-400 animate-pulse' : 'text-emerald-400'}`} />
              )}
              <span className="hidden xl:inline text-[11px] font-medium">
                {castStatus === 'connected' ? 'En TV' : castStatus === 'connecting' ? 'Conectando...' : 'Cast'}
              </span>
              {isPresentationAvailable && castStatus === 'idle' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" title="Dispositivo de transmisión disponible" />
              )}
            </button>

            {/* Theater Mode toggle */}
            <button
              onClick={() => setIsTheaterMode((prev) => !prev)}
              className="p-1.5 hover:text-emerald-400 transition-colors hidden sm:block cursor-pointer"
              title={isTheaterMode ? 'Vista Estándar' : 'Modo Teatro'}
            >
              <Tv className="w-4 h-4" />
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:text-emerald-400 transition-colors cursor-pointer"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* CAST TO SMART TV MODAL & VIRTUAL TV REMOTE CENTER */}
      {showCastModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b111e] border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCastModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Cast className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Centro de Transmisión Smart TV</h3>
                <p className="text-xs text-slate-400">Google Cast SDK (Receptor CC1AD845) & AirPlay</p>
              </div>
            </div>

            {/* 1. CONNECTED STATE: VIRTUAL TV REMOTE DASHBOARD */}
            {castStatus === 'connected' && (
              <div className="space-y-3 mb-4">
                <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>Transmitiendo en Vivo</span>
                        </div>
                        <div className="font-bold text-white text-sm sm:text-base">
                          {castDevice?.friendlyName || presentationDeviceName || 'Smart TV'}
                        </div>
                        {castDevice?.modelName && (
                          <div className="text-[10px] text-slate-400">{castDevice.modelName}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnectCast}
                      className="px-3 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Desconectar
                    </button>
                  </div>

                  {/* Remote TV Control actions */}
                  <div className="pt-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleCastPlayback}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        {castIsPaused ? <Play className="w-4 h-4 fill-emerald-400 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                        <span>{castIsPaused ? 'Reanudar en TV' : 'Pausar en TV'}</span>
                      </button>

                      <button
                        onClick={handleToggleCastMute}
                        className="py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        {castTvMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                        <span>{castTvMuted ? 'Activar Sonido' : 'Silenciar TV'}</span>
                      </button>
                    </div>

                    {/* TV Volume Slider */}
                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
                      <Volume1 className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>Volumen del Smart TV</span>
                          <span className="font-mono text-emerald-400">{Math.round(castTvVolume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={castTvMuted ? 0 : castTvVolume}
                          onChange={(e) => handleSetCastVolume(parseFloat(e.target.value))}
                          className="w-full h-1.5 accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CONNECTING STATE: ACTIVE SPINNER & NEGOTIATION */}
            {castStatus === 'connecting' && (
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 mb-4 flex flex-col items-center text-center">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-2" />
                <h4 className="font-bold text-white text-sm">Buscando y negociando señal con tu Smart TV...</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-sm leading-relaxed">
                  Si tu navegador mostró una lista de dispositivos (Chromecast o televisores en tu Wi-Fi), selecciónalo para empezar a transmitir.
                </p>
                <button
                  onClick={() => setCastStatus('idle')}
                  className="mt-3 px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar Búsqueda
                </button>
              </div>
            )}

            {/* 3. ERROR STATE: DIAGNOSTICS & RETRY */}
            {castStatus === 'error' && (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-red-300 text-sm">No se pudo completar la conexión</h4>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{castError}</p>
                    {castDiagnosticsMessage && (
                      <p className="text-xs text-amber-300/90 mt-1.5 bg-amber-950/30 p-2 rounded-lg border border-amber-500/30">
                        💡 {castDiagnosticsMessage}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 mt-3 pt-3 border-t border-red-500/20">
                  <button
                    onClick={handleTriggerCast}
                    className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reintentar Conexión</span>
                  </button>
                  <button
                    onClick={() => {
                      window.open(window.location.href, '_blank');
                    }}
                    className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>Abrir en Pestaña Directa</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. IDLE STATE: PRIMARY ACTION BUTTONS */}
            {castStatus === 'idle' && (
              <div className="space-y-2.5 mb-4">
                <button
                  onClick={handleTriggerCast}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <Cast className="w-4 h-4" />
                  <span>Buscar y Conectar Smart TV / Chromecast</span>
                </button>

                <button
                  onClick={() => {
                    window.open(window.location.href, '_blank');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  title="Abre la página fuera del marco para máxima compatibilidad con Cast"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Abrir en Pestaña Directa (Permite Cast y AirPlay 100%)</span>
                </button>
              </div>
            )}

            {/* Compatibility Guide & Methods */}
            <div className="space-y-2.5 text-xs max-h-[48vh] overflow-y-auto pr-1">
              {/* Option 1: Chrome / Edge Presentation Request API */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <span>📺 1. Google Cast SDK (Receptor CC1AD845)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  En Google Chrome o Microsoft Edge, el reproductor inicializa el receptor multimedia oficial de Google Cast para enviar la señal HLS a cualquier <strong>Chromecast</strong>, <strong>Android TV</strong> o <strong>Google TV</strong>.
                </p>
              </div>

              {/* Option 2: Smart View / Duplicar Pantalla */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <span>📱 2. Celulares Android (Smart View / Duplicar)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Baja el panel superior de tu celular Android y pulsa el botón <strong>Smart View</strong> o <strong>Transmitir pantalla</strong> para duplicar la imagen hacia tu TV Samsung, LG o Roku.
                </p>
              </div>

              {/* Option 3: Apple AirPlay */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <span>🍏 3. iPhone / iPad / Mac (AirPlay 2)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Desliza para abrir el Centro de Control de tu iPhone o Mac, pulsa en <strong>Duplicar pantalla</strong> y selecciona tu Apple TV o Smart TV compatible con AirPlay.
                </p>
              </div>

              {/* Option 4: Navegador directo de la Smart TV */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                  <span>🌐 4. Opción Directa: Navegador de la Smart TV</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Abre la aplicación <strong>Internet / Navegador Web</strong> en tu Smart TV e ingresa la URL de esta página para ver el partido directamente a pantalla completa en la TV.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCastModal(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
