import React from 'react';
import { Check, Sliders, Zap } from 'lucide-react';
import { StreamResolution } from '../../types/football';
import { RESOLUTIONS } from '../../data/bolivianFootballData';

interface QualitySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentResolution: StreamResolution;
  onSelectResolution: (res: StreamResolution) => void;
  latencyMode: 'ultra-low' | 'standard';
  onToggleLatencyMode: () => void;
  onToggleStats: () => void;
  showStatsOverlay: boolean;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  isOpen,
  onClose,
  currentResolution,
  onSelectResolution,
  latencyMode,
  onToggleLatencyMode,
  onToggleStats,
  showStatsOverlay,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-14 right-3 z-30 bg-[#0a0f1d]/95 backdrop-blur-md border border-slate-700 rounded-xl p-3 text-xs text-slate-200 shadow-2xl w-56 animate-in fade-in zoom-in-95 duration-150">
      <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400 mb-2 px-1">
        Calidad de Video
      </div>

      <div className="space-y-1">
        {RESOLUTIONS.map((res) => (
          <button
            key={res.id}
            type="button"
            onClick={() => {
              onSelectResolution(res.id);
              onClose();
            }}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
              currentResolution === res.id
                ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{res.label}</span>
              {res.qualityBadge && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-red-500/20 text-red-400 font-bold uppercase">
                  {res.qualityBadge}
                </span>
              )}
            </div>
            {currentResolution === res.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        ))}
      </div>

      {/* Latency toggle */}
      <div className="mt-2.5 pt-2.5 border-t border-slate-800">
        <button
          type="button"
          onClick={onToggleLatencyMode}
          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Zap className={`w-3.5 h-3.5 ${latencyMode === 'ultra-low' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>Baja Latencia (Cero delay)</span>
          </div>
          <span className={`text-[10px] font-bold ${latencyMode === 'ultra-low' ? 'text-amber-400' : 'text-slate-500'}`}>
            {latencyMode === 'ultra-low' ? 'ACTIVADO' : 'ESTÁNDAR'}
          </span>
        </button>

        {/* Telemetry overlay toggle */}
        <button
          type="button"
          onClick={() => {
            onToggleStats();
            onClose();
          }}
          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer mt-1"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Estadísticas Técnicas</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-bold">
            {showStatsOverlay ? 'OCULTAR' : 'VER'}
          </span>
        </button>
      </div>
    </div>
  );
};
