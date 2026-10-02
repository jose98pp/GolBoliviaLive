import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
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
} from 'lucide-react';
import { StreamResolution, StreamSettings } from '../types/football';
import { RESOLUTIONS, BOLIVIAN_CLUBS } from '../data/bolivianFootballData';

interface StreamPlayerProps {
  isTheaterMode: boolean;
  setIsTheaterMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  openObsModal: () => void;
  triggerReaction: (emoji: string) => void;
  homeScore: number;
  awayScore: number;
  matchMinute: number;
  streamSettings?: StreamSettings;
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
}) => {
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

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(false);
    }
  };

  const handleSelectResolution = (res: StreamResolution) => {
    setCurrentResolution(res);
    setShowSettingsMenu(false);
  };

  const currentResConfig = RESOLUTIONS.find((r) => r.id === currentResolution) || RESOLUTIONS[0];

  const homeClub = (streamSettings && BOLIVIAN_CLUBS[streamSettings.homeClubId]) || BOLIVIAN_CLUBS.bolivar;
  const awayClub = (streamSettings && BOLIVIAN_CLUBS[streamSettings.awayClubId]) || BOLIVIAN_CLUBS.strongest;

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
      className={`relative bg-[#060911] rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 transition-all duration-300 group select-none ${
        !showControls && isPlaying ? 'cursor-none' : 'cursor-default'
      } ${
        isTheaterMode ? 'w-full aspect-[16/9] max-h-[85vh]' : 'w-full aspect-[16/9]'
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
          className="w-full h-full object-cover select-none"
        />
      ) : (
        <video
          ref={userVideoRef}
          autoPlay
          playsInline
          controls={false}
          muted={isMuted}
          className="w-full h-full object-cover select-none bg-black cursor-pointer"
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

      {/* 1. Top Right Broadcast Live Badge & Ingest Indicator (Auto-hiding) */}
      <div
        className={`absolute top-3 right-3 z-20 flex items-center gap-2 transition-all duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none -translate-y-2'
        }`}
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-600/90 text-white text-[11px] font-bold tracking-wider uppercase shadow-lg shadow-red-950/50">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>EN VIVO</span>
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

      {/* FLOATING QUICK REACTIONS TRIGGER BAR ON VIDEO (Auto-hiding) */}
      <div
        className={`absolute right-3 bottom-16 z-20 flex flex-col gap-1.5 transition-all duration-300 ${
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
                className="w-16 h-1 accent-emerald-500 bg-slate-700 rounded-lg cursor-pointer"
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
    </div>
  );
};
