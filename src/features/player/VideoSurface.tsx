import React, { useEffect, useRef, RefObject } from 'react';
import { Play, AlertCircle, RefreshCw, Loader2, Radio } from 'lucide-react';
import { StreamSettings } from '../../types/football';
import { BOLIVIAN_CLUBS } from '../../data/bolivianFootballData';

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const homeClub = (streamSettings && BOLIVIAN_CLUBS[streamSettings.homeClubId]) || BOLIVIAN_CLUBS.bolivar;
  const awayClub = (streamSettings && BOLIVIAN_CLUBS[streamSettings.awayClubId]) || BOLIVIAN_CLUBS.strongest;

  const hasCustomStream = Boolean(streamSettings?.customVideoUrl);

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
      onClick={onTogglePlay}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none group"
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

      {/* Real Video Element */}
      <video
        ref={videoRef}
        playsInline
        muted={isMuted}
        className={`w-full h-full object-contain ${hasCustomStream ? 'block' : 'hidden'}`}
      />

      {/* Fallback Canvas Simulation */}
      {!hasCustomStream && (
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          className="w-full h-full object-contain"
        />
      )}

      {/* TV Corner Badge / Watermark */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white font-display text-xs font-bold shadow-lg">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>GOLBOLIVIA</span>
          <span className="text-[10px] text-amber-400 font-mono">HD</span>
        </div>
      </div>

      {/* Big Play Overlay when Paused */}
      {!isPlaying && (
        <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
          <button
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-emerald-500/90 hover:bg-emerald-400 text-black flex items-center justify-center shadow-2xl transition-all scale-100 hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="Reproducir transmisión"
          >
            <Play className="w-8 h-8 fill-black ml-1" />
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
          <div className="p-3 rounded-2xl bg-red-950/80 border border-red-500/60 max-w-sm">
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
