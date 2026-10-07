import React, { useEffect, useRef, useState, RefObject } from 'react';
import { Play, Pause, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { StreamSettings } from '../../types/football';
import { BOLIVIAN_CLUBS } from '../../data/bolivianFootballData';
import { useClubs } from '../../hooks/useClubs';

interface VideoSurfaceProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  streamSettings?: StreamSettings;
  isPlaying: boolean;
  isMuted: boolean;
  onTogglePlay: (e?: React.MouseEvent) => void;
  isReconnecting: boolean;
  streamError: string | null;
  onReloadStream: () => void;
  homeScore: number;
  awayScore: number;
  matchMinute: number;
  showControls: boolean;
  onSingleTap: () => void;
  isCleanScreen?: boolean;
}

export const VideoSurface: React.FC<VideoSurfaceProps> = ({
  videoRef,
  streamSettings,
  isPlaying,
  isMuted,
  onTogglePlay,
  isReconnecting,
  streamError,
  onReloadStream,
  homeScore,
  awayScore,
  matchMinute,
  showControls,
  onSingleTap,
  isCleanScreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { clubs } = useClubs();
  const homeClub = (streamSettings && (clubs[streamSettings.homeClubId] || BOLIVIAN_CLUBS[streamSettings.homeClubId])) || BOLIVIAN_CLUBS.bolivar;
  const awayClub = (streamSettings && (clubs[streamSettings.awayClubId] || BOLIVIAN_CLUBS[streamSettings.awayClubId])) || BOLIVIAN_CLUBS.strongest;

  // Double tap / click detection state
  const lastTapTimeRef = useRef<number>(0);
  const lastTouchTimeRef = useRef<number>(0);
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'pause' | 'play' | null>(null);

  const rawStreamUrl = streamSettings?.activeStreamSource === 'backup'
    ? (streamSettings?.backupVideoUrl || streamSettings?.customVideoUrl)
    : (streamSettings?.activeStreamSource === 'simulation' ? '' : (streamSettings?.customVideoUrl || streamSettings?.backupVideoUrl));

  // Determine stream source type cleanly
  const sourceInfo = React.useMemo(() => {
    if (!rawStreamUrl || !rawStreamUrl.trim() || streamSettings?.activeStreamSource === 'simulation') {
      return { type: 'simulation' as const, url: '' };
    }
    const clean = rawStreamUrl.trim();
    const ytMatch = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) {
      return { type: 'youtube' as const, url: clean, videoId: ytMatch[1] };
    }
    const kickMatch = clean.match(/kick\.com\/(?:video\/)?([a-zA-Z0-9_-]+)/);
    if (kickMatch && !clean.includes('.m3u8')) {
      return { type: 'kick' as const, url: clean, channel: kickMatch[1] };
    }
    return { type: 'hls' as const, url: clean };
  }, [rawStreamUrl, streamSettings?.activeStreamSource]);

  const hasCustomStream = sourceInfo.type !== 'simulation';

  // Handle tap / click with reliable double-tap logic for mobile devices
  const handleSurfaceTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (e.type === 'click' && now - lastTouchTimeRef.current < 400) {
      return;
    }
    if (e.type === 'touchend') {
      lastTouchTimeRef.current = now;
    }

    const timeDelta = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    if (timeDelta < 350 && timeDelta > 30) {
      // DOUBLE TAP / DOUBLE CLICK: Toggle play/pause
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }

      onTogglePlay();

      // Show tactile animated feedback
      setDoubleTapFeedback(isPlaying ? 'pause' : 'play');
      setTimeout(() => {
        setDoubleTapFeedback(null);
      }, 700);
    } else {
      // SINGLE TAP: Schedule control toggle without pausing video
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        onSingleTap();
      }, 280);
    }
  };

  // Canvas pitch simulation when no custom video URL is provided
  useEffect(() => {
    if (hasCustomStream) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let ballX = 400;
    let ballY = 225;
    let ballVx = 2.8;
    let ballVy = 1.4;
    let frameCount = 0;

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

      // Markings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 25, w - 60, h - 50);

      // Center line & circle
      ctx.beginPath();
      ctx.moveTo(w / 2, 25);
      ctx.lineTo(w / 2, h - 25);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 60, 0, Math.PI * 2);
      ctx.stroke();

      // Penalty boxes
      ctx.strokeRect(30, h / 2 - 75, 110, 150);
      ctx.strokeRect(w - 140, h / 2 - 75, 110, 150);

      // Move ball
      if (isPlaying) {
        ballX += ballVx;
        ballY += ballVy;
        if (ballX < 50 || ballX > w - 50) ballVx = -ballVx;
        if (ballY < 40 || ballY > h - 40) ballVy = -ballVy;
      }

      // Draw players
      players.forEach((p) => {
        if (isPlaying && frameCount % 60 === 0) {
          p.tx = p.x + (Math.random() * 40 - 20);
          p.ty = p.y + (Math.random() * 30 - 15);
        }
        p.x += (p.tx - p.x) * 0.05;
        p.y += (p.ty - p.y) * 0.05;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = p.team === 'home' ? (homeClub.primaryColor || '#0284c7') : (awayClub.primaryColor || '#f59e0b');
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.num.toString(), p.x, p.y);
      });

      // Draw ball
      ctx.beginPath();
      ctx.arc(ballX, ballY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000000';
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [hasCustomStream, isPlaying, homeClub.primaryColor, awayClub.primaryColor]);

  return (
    <div
      onClick={handleSurfaceTap}
      onTouchEnd={handleSurfaceTap}
      style={{ touchAction: 'manipulation' }}
      className={`relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none group ${
        !showControls ? 'cursor-none' : 'cursor-pointer'
      }`}
    >
      {/* Club Ambient Glow */}
      <div
        className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: homeClub.primaryColor }}
      />
      <div
        className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: awayClub.primaryColor }}
      />

      {/* Real Video Element for HLS / Custom Stream */}
      {sourceInfo.type === 'hls' && (
        <video
          ref={videoRef}
          playsInline
          muted={isMuted}
          className="w-full h-full object-contain"
        />
      )}

      {/* YouTube Embedded Stream if configured (unmuted by default) */}
      {sourceInfo.type === 'youtube' && sourceInfo.videoId && (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(sourceInfo.videoId)}?autoplay=1&mute=0&playsinline=1&rel=0&modestbranding=1`}
          className="w-full h-full border-0 absolute inset-0 pointer-events-auto"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title="Transmisión Oficial"
        />
      )}

      {/* Kick Embedded Stream if configured (unmuted by default) */}
      {sourceInfo.type === 'kick' && sourceInfo.channel && (
        <iframe
          src={`https://player.kick.com/${encodeURIComponent(sourceInfo.channel)}?autoplay=true&muted=false`}
          className="w-full h-full border-0 absolute inset-0 pointer-events-auto"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          title="Transmisión Oficial"
        />
      )}

      {/* Fallback Interactive Pitch Simulation */}
      {sourceInfo.type === 'simulation' && (
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          className="w-full h-full object-contain"
        />
      )}

      {/* TV Corner Badge / Watermark — Sin marcador en pantalla */}
      {!isCleanScreen && (
        <div
          className={`absolute top-3 left-3 z-15 flex items-center gap-2 pointer-events-none transition-all duration-500 ${
            showControls ? 'opacity-90 translate-y-0' : 'opacity-70 translate-y-0'
          }`}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white font-display text-xs font-bold shadow-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>GOLBOLIVIA</span>
            <span className="text-[10px] text-amber-400 font-mono">HD</span>
          </div>
        </div>
      )}

      {/* Double Tap / Double Click Feedback HUD */}
      {doubleTapFeedback && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-in zoom-in-75 fade-in duration-150">
          <div className="px-5 py-4 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-white shadow-2xl scale-110">
            {doubleTapFeedback === 'pause' ? (
              <>
                <Pause className="w-9 h-9 fill-amber-400 text-amber-400 mb-1" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-300 uppercase">
                  PAUSA
                </span>
              </>
            ) : (
              <>
                <Play className="w-9 h-9 fill-emerald-400 text-emerald-400 ml-1 mb-1" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-300 uppercase">
                  EN VIVO
                </span>
              </>
            )}
            <span className="text-[9px] text-slate-400 mt-0.5">Doble toque</span>
          </div>
        </div>
      )}

      {/* Big Play Overlay when Paused */}
      {!isPlaying && !isCleanScreen && (
        <div className="absolute inset-0 z-20 bg-black/45 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-2xl transition-all scale-100 hover:scale-110 active:scale-95 cursor-pointer border-2 border-emerald-300"
            aria-label="Reproducir transmisión"
          >
            <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-black ml-1" />
          </button>
        </div>
      )}

      {/* Reconnecting / Buffering Spinner */}
      {isReconnecting && (
        <div className="absolute inset-0 z-25 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-2" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Reconectando con el servidor HLS...
          </span>
          <span className="text-[10px] text-slate-400 mt-1">Sincronizando señal en vivo</span>
        </div>
      )}

      {/* Stream Error Notice */}
      {streamError && !isReconnecting && (
        <div className="absolute inset-0 z-25 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
          <div className="p-4 rounded-2xl bg-red-950/85 border border-red-500/60 max-w-sm">
            <AlertCircle className="w-7 h-7 text-red-400 mx-auto mb-2" />
            <div className="text-xs font-bold text-white mb-1">Señal no disponible temporalmente</div>
            <p className="text-[11px] text-slate-300 mb-3">{streamError}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReloadStream();
              }}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 mx-auto transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar Conexión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
