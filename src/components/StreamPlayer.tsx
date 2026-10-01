import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  Tv,
  Camera,
  Layers,
  Radio,
  Share2,
  RefreshCw,
  Sliders,
  Check,
  Zap,
  Mic,
  Monitor
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
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [currentResolution, setCurrentResolution] = useState<StreamResolution>('1080p60');
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [showAudioMenu, setShowAudioMenu] = useState<boolean>(false);
  const [showCameraMenu, setShowCameraMenu] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [latencyMode, setLatencyMode] = useState<'ultra-low' | 'standard'>('ultra-low');
  const [audioTrack, setAudioTrack] = useState<'oficial' | 'radio' | 'ambiente'>('oficial');
  const [cameraAngle, setCameraAngle] = useState<'principal' | 'arco' | 'tactica' | 'ras_piso'>('principal');

  // Broadcast source: 'simulation' | 'webcam' | 'screen'
  const [broadcastSource, setBroadcastSource] = useState<'simulation' | 'webcam' | 'screen'>('simulation');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Live telemetry (real-time stream stats)
  const [bitrateTelemetry, setBitrateTelemetry] = useState<number>(5940);
  const [fpsTelemetry, setFpsTelemetry] = useState<number>(59.9);
  const [showStatsOverlay, setShowStatsOverlay] = useState<boolean>(false);

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

  // Start direct webcam/OBS virtual cam capture
  const handleStartWebcam = async () => {
    try {
      setMediaError(null);
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080, frameRate: 60 },
        audio: true,
      });
      setMediaStream(stream);
      setBroadcastSource('webcam');
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
        userVideoRef.current.play();
      }
    } catch (err) {
      setMediaError('No se pudo acceder a la cámara o dispositivo OBS virtual.');
      console.warn('Webcam capture error', err);
    }
  };

  // Screen share capture for OBS desktop streaming
  const handleStartScreenShare = async () => {
    try {
      setMediaError(null);
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60 },
        audio: true,
      });
      setMediaStream(stream);
      setBroadcastSource('screen');
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
        userVideoRef.current.play();
      }
      stream.getVideoTracks()[0].onended = () => {
        setBroadcastSource('simulation');
      };
    } catch (err) {
      setMediaError('Permiso de captura de pantalla cancelado o no disponible.');
      console.warn('Screen share error', err);
    }
  };

  const handleSwitchToSimulation = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setBroadcastSource('simulation');
  };

  // Canvas-based football match broadcast simulation
  useEffect(() => {
    if (broadcastSource !== 'simulation') return;
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
  }, [broadcastSource, isPlaying, cameraAngle]);

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
      className={`relative bg-[#060911] rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 transition-all duration-300 group ${
        isTheaterMode ? 'w-full aspect-[16/9] max-h-[85vh]' : 'w-full aspect-[16/9]'
      }`}
    >
      {/* Video Content: Custom Stream URL, Canvas Simulation, or Live MediaStream Video */}
      {streamSettings?.customVideoUrl && broadcastSource === 'simulation' ? (
        <video
          src={streamSettings.customVideoUrl}
          autoPlay
          playsInline
          controls={false}
          muted={isMuted}
          className="w-full h-full object-cover select-none bg-black"
        />
      ) : broadcastSource === 'simulation' ? (
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
          muted={isMuted}
          className="w-full h-full object-cover select-none bg-black"
        />
      )}

      {/* TOP OVERLAYS */}
      {/* 1. Official TV Scoreboard Bug */}
      <div className="absolute top-3 left-3 z-20 flex items-center shadow-2xl select-none">
        <div className="flex items-center bg-[#090e1a]/95 backdrop-blur-md border border-slate-700/80 rounded-lg overflow-hidden text-xs">
          {/* Home team */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-r border-slate-700/60" style={{ backgroundColor: `${homeClub.primaryColor}25` }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: homeClub.primaryColor }} />
            <span className="font-bold text-white tracking-wider">{homeClub.shortName.slice(0, 3).toUpperCase()}</span>
            <span className="font-mono text-sm font-extrabold text-white px-1 tabular-nums">{homeScore}</span>
          </div>
          {/* Away team */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-r border-slate-700/60" style={{ backgroundColor: `${awayClub.primaryColor}25` }}>
            <span className="font-mono text-sm font-extrabold text-white px-1 tabular-nums">{awayScore}</span>
            <span className="font-bold text-white tracking-wider">{awayClub.shortName.slice(0, 3).toUpperCase()}</span>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: awayClub.primaryColor }} />
          </div>
          {/* Match minute */}
          <div className="px-2.5 py-1.5 font-mono text-[11px] font-semibold text-emerald-400 bg-slate-900/90 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{matchMinute}&apos; {streamSettings?.period || '2T'}</span>
          </div>
        </div>

        {/* Tournament name unboxed metadata */}
        <div className="hidden sm:flex items-center text-[10px] text-slate-300 ml-2 font-medium px-2 py-1 bg-black/60 backdrop-blur-sm rounded">
          <span>{streamSettings?.tournamentName || 'División Profesional Boliviana'}</span>
          <span className="mx-1.5">·</span>
          <span>{streamSettings?.stadiumName || 'Estadio Siles'}</span>
        </div>
      </div>

      {/* 2. Top Right Broadcast Live Badge & Ingest Indicator */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {/* Source indicator tag */}
        {broadcastSource !== 'simulation' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 text-[11px] font-semibold backdrop-blur-md">
            {broadcastSource === 'webcam' ? <Camera className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
            <span>{broadcastSource === 'webcam' ? 'OBS Cam / WebRTC' : 'Pantalla OBS'}</span>
          </div>
        )}

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

      {/* Notification error banner */}
      {mediaError && (
        <div className="absolute top-14 left-3 z-30 bg-red-950/90 border border-red-700 text-red-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span>{mediaError}</span>
          <button onClick={() => setMediaError(null)} className="underline text-white font-bold">Cerrar</button>
        </div>
      )}

      {/* FLOATING QUICK REACTIONS TRIGGER BAR ON VIDEO */}
      <div className="absolute right-3 bottom-16 z-20 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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

      {/* STREAM CONTROLS BAR (BOTTOM) */}
      <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 flex flex-col gap-2">
        {/* Progress live scrubber line */}
        <div className="w-full h-1 bg-slate-700/80 rounded-full overflow-hidden flex">
          <div className="w-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 h-full" />
        </div>

        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Controls: Play/Pause, Volume, Live, Audio track */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (!isPlaying) playWhistleSound();
              }}
              className="p-1.5 hover:text-emerald-400 transition-colors cursor-pointer"
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
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

          {/* Right Controls: Ingest Switch, Resolutions Menu, Theater, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Quick OBS / Ingest broadcast options */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-700/80 text-[10px] sm:text-[11px]">
              <button
                onClick={handleSwitchToSimulation}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  broadcastSource === 'simulation' ? 'bg-emerald-600 text-black font-semibold' : 'text-slate-400 hover:text-white'
                }`}
                title="Ver animación de cancha"
              >
                Cancha
              </button>
              <button
                onClick={handleStartWebcam}
                className={`px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                  broadcastSource === 'webcam' ? 'bg-red-600 text-white font-bold animate-pulse' : 'text-slate-400 hover:text-white'
                }`}
                title="Conectar cámara web o cámara virtual OBS Studio"
              >
                <Camera className="w-3 h-3" />
                <span>{broadcastSource === 'webcam' ? 'En Vivo (OBS)' : 'OBS Cam'}</span>
              </button>
              <button
                onClick={handleStartScreenShare}
                className={`px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                  broadcastSource === 'screen' ? 'bg-red-600 text-white font-bold animate-pulse' : 'text-slate-400 hover:text-white'
                }`}
                title="Compartir pantalla o ventana de OBS Studio"
              >
                <Monitor className="w-3 h-3" />
                <span>{broadcastSource === 'screen' ? 'En Vivo (Pantalla)' : 'Pantalla'}</span>
              </button>
            </div>

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
