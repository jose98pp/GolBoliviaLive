import React from 'react';
import { X, Activity, Cpu, ShieldCheck } from 'lucide-react';
import { TelemetryStats } from './hooks/usePlayerTelemetry';

interface StreamStatsProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryStats;
  isLiveSignal: boolean;
  audioTrack: string;
}

export const StreamStats: React.FC<StreamStatsProps> = ({
  isOpen,
  onClose,
  telemetry,
  isLiveSignal,
  audioTrack,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-12 right-3 z-30 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-4 text-xs font-mono text-slate-200 shadow-2xl max-w-xs w-full animate-in fade-in duration-150">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <span className="font-bold flex items-center gap-1.5 text-white font-display text-[11px] uppercase tracking-wider">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Telemetría de Transmisión</span>
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-400">Tipo de Señal:</span>
          <span className={isLiveSignal ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
            {isLiveSignal ? 'HLS Master Feed (.m3u8)' : 'Simulador Cancha HD'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Resolución Activa:</span>
          <span className="text-white font-bold">{telemetry.resolutionText}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Bitrate de Video:</span>
          <span className="text-emerald-400 font-bold">{telemetry.bitrate} kbps</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Fotogramas (FPS):</span>
          <span className="text-white">{telemetry.fps} fps</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Buffer de Reproducción:</span>
          <span className="text-white">{telemetry.bufferHealth} s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Latencia estimada:</span>
          <span className="text-cyan-400">{telemetry.latencySeconds} s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Cuadros perdidos:</span>
          <span className="text-slate-300">{telemetry.droppedFrames}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Pista de Audio:</span>
          <span className="text-amber-300 uppercase">{audioTrack}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Códec:</span>
          <span className="text-slate-300">H.264 / AAC 48kHz</span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-emerald-400" />
          <span>Aceleración por Hardware</span>
        </span>
        <span className="text-emerald-400 font-bold">Activo</span>
      </div>
    </div>
  );
};
