import React, { useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Settings,
  Mic,
  Cast,
  Maximize2,
  Minimize2,
  Tv,
  Layers,
  Radio,
  Share2,
  RefreshCw,
  Sliders,
  Check,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { FullscreenController } from './FullscreenController';

interface PlayerControlsProps {
  isPlaying: boolean;
  onTogglePlay: (e?: React.MouseEvent) => void;
  isMuted: boolean;
  volume: number;
  onToggleMute: (e?: React.MouseEvent) => void;
  onChangeVolume: (val: number) => void;
  showControls: boolean;
  onControlsInteraction: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTheaterMode: boolean;
  onToggleTheaterMode: () => void;
  showAudioMenu: boolean;
  onToggleAudioMenu: () => void;
  showQualityMenu: boolean;
  onToggleQualityMenu: () => void;
  onOpenCastModal: () => void;
  onReloadStream: () => void;
  currentResolution: string;
  triggerReaction: (emoji: string) => void;
  viewerCount: number;
  isCleanScreen?: boolean;
  onToggleCleanScreen?: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onTogglePlay,
  isMuted,
  volume,
  onToggleMute,
  onChangeVolume,
  showControls,
  onControlsInteraction,
  isFullscreen,
  onToggleFullscreen,
  isTheaterMode,
  onToggleTheaterMode,
  showAudioMenu,
  onToggleAudioMenu,
  showQualityMenu,
  onToggleQualityMenu,
  onOpenCastModal,
  onReloadStream,
  currentResolution,
  triggerReaction,
  viewerCount,
  isCleanScreen = false,
  onToggleCleanScreen,
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onControlsInteraction}
      onMouseMove={onControlsInteraction}
      className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/65 to-transparent p-3 sm:p-4 pt-10 transition-all duration-300 ${
        showControls && !isCleanScreen
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      {/* Bottom Bar Controls */}
      <div className="flex items-center justify-between gap-2">
        {/* Left Side: Play, Volume, Live Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label={isPlaying ? 'Pausar transmisión' : 'Reproducir transmisión'}
            title={isPlaying ? 'Pausar (o doble toque en video)' : 'Reproducir'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>

          {/* Volume with Hover Slider */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              type="button"
              onClick={onToggleMute}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {showVolumeSlider && (
              <div className="absolute bottom-10 -left-2 bg-slate-900/90 border border-slate-700/80 p-2 rounded-xl shadow-xl flex items-center animate-in fade-in zoom-in-95 duration-100 z-30">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                  className="w-20 h-1.5 accent-emerald-500 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Live Indicator Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>EN VIVO</span>
          </div>

          {/* Quick Reload Button */}
          <button
            type="button"
            onClick={onReloadStream}
            className="hidden sm:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Refrescar transmisión"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Reaction Bar (Center on desktop) */}
        <div className="hidden lg:flex items-center gap-1 bg-black/40 border border-white/10 rounded-full px-2 py-0.5">
          {['⚽', '🔥', '🇧🇴', '👏', '🏆'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => triggerReaction(emoji)}
              className="hover:scale-125 transition-transform p-1 cursor-pointer text-xs"
              title={`Enviar reacción ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Right Side: Clean Screen, Audio, Quality, Cast, Theater, Fullscreen */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Clean Screen Mode Toggle */}
          {onToggleCleanScreen && (
            <button
              type="button"
              onClick={onToggleCleanScreen}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs ${
                isCleanScreen
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Pantalla limpia (Ocultar botones e información para ver el partido despejado)"
            >
              <EyeOff className="w-4 h-4" />
              <span className="hidden xl:inline text-[11px]">Pantalla Limpia</span>
            </button>
          )}

          {/* Audio Selector Toggle */}
          <button
            type="button"
            onClick={onToggleAudioMenu}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs ${
              showAudioMenu ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Pista de Audio y Cámaras"
          >
            <Mic className="w-4 h-4" />
            <span className="hidden md:inline text-[11px]">Audio</span>
          </button>

          {/* Quality Selector Toggle */}
          <button
            type="button"
            onClick={onToggleQualityMenu}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs ${
              showQualityMenu ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Calidad de Video"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden md:inline text-[11px] font-mono">{currentResolution}</span>
          </button>

          {/* Cast to Smart TV */}
          <button
            type="button"
            onClick={onOpenCastModal}
            className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
            title="Transmitir a Smart TV / Chromecast / AirPlay"
          >
            <Cast className="w-4 h-4" />
          </button>

          {/* Theater Mode Toggle */}
          <button
            type="button"
            onClick={onToggleTheaterMode}
            className={`hidden sm:block p-1.5 rounded-lg transition-colors cursor-pointer ${
              isTheaterMode ? 'text-amber-400 bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title={isTheaterMode ? 'Modo normal' : 'Modo teatro'}
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle (Auto-rotates to landscape on mobile) */}
          <FullscreenController
            isFullscreen={isFullscreen}
            onToggleFullscreen={onToggleFullscreen}
          />
        </div>
      </div>
    </div>
  );
};
