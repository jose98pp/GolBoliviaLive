import React from 'react';
import { Mic, Check, Camera } from 'lucide-react';

interface AudioSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  audioTrack: 'oficial' | 'radio' | 'ambiente';
  onSelectAudioTrack: (track: 'oficial' | 'radio' | 'ambiente') => void;
  cameraAngle: 'principal' | 'arco' | 'tactica' | 'ras_piso';
  onSelectCameraAngle: (angle: 'principal' | 'arco' | 'tactica' | 'ras_piso') => void;
}

export const AudioSelector: React.FC<AudioSelectorProps> = ({
  isOpen,
  onClose,
  audioTrack,
  onSelectAudioTrack,
  cameraAngle,
  onSelectCameraAngle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-14 right-16 z-30 bg-[#0a0f1d]/95 backdrop-blur-md border border-slate-700 rounded-xl p-3 text-xs text-slate-200 shadow-2xl w-60 animate-in fade-in zoom-in-95 duration-150">
      <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400 mb-2 px-1 flex items-center gap-1.5">
        <Mic className="w-3 h-3 text-amber-400" />
        <span>Pistas de Audio en Vivo</span>
      </div>

      <div className="space-y-1">
        <button
          type="button"
          onClick={() => {
            onSelectAudioTrack('oficial');
            onClose();
          }}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
            audioTrack === 'oficial'
              ? 'bg-amber-500/20 text-amber-300 font-bold'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <div>
            <div className="font-medium">Relato Oficial GolBolivia</div>
            <div className="text-[10px] text-slate-400">Transmisión TV Principal</div>
          </div>
          {audioTrack === 'oficial' && <Check className="w-3.5 h-3.5 text-amber-400" />}
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectAudioTrack('radio');
            onClose();
          }}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
            audioTrack === 'radio'
              ? 'bg-amber-500/20 text-amber-300 font-bold'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <div>
            <div className="font-medium">Sintonía Radial Paceña</div>
            <div className="text-[10px] text-slate-400">Radio Panamericana / Deportes</div>
          </div>
          {audioTrack === 'radio' && <Check className="w-3.5 h-3.5 text-amber-400" />}
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectAudioTrack('ambiente');
            onClose();
          }}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
            audioTrack === 'ambiente'
              ? 'bg-amber-500/20 text-amber-300 font-bold'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <div>
            <div className="font-medium">Solo Sonido de Cancha</div>
            <div className="text-[10px] text-slate-400">Hinchada Hernando Siles</div>
          </div>
          {audioTrack === 'ambiente' && <Check className="w-3.5 h-3.5 text-amber-400" />}
        </button>
      </div>

      {/* Multicam Angle Switcher */}
      <div className="mt-3 pt-2.5 border-t border-slate-800">
        <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400 mb-2 px-1 flex items-center gap-1.5">
          <Camera className="w-3 h-3 text-cyan-400" />
          <span>Ángulo de Cámara</span>
        </div>

        <div className="grid grid-cols-2 gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => onSelectCameraAngle('principal')}
            className={`px-2 py-1 rounded text-center cursor-pointer transition-colors ${
              cameraAngle === 'principal' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Principal
          </button>
          <button
            type="button"
            onClick={() => onSelectCameraAngle('tactica')}
            className={`px-2 py-1 rounded text-center cursor-pointer transition-colors ${
              cameraAngle === 'tactica' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Táctica Alta
          </button>
          <button
            type="button"
            onClick={() => onSelectCameraAngle('arco')}
            className={`px-2 py-1 rounded text-center cursor-pointer transition-colors ${
              cameraAngle === 'arco' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Detrás de Arco
          </button>
          <button
            type="button"
            onClick={() => onSelectCameraAngle('ras_piso')}
            className={`px-2 py-1 rounded text-center cursor-pointer transition-colors ${
              cameraAngle === 'ras_piso' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Ras de Piso
          </button>
        </div>
      </div>
    </div>
  );
};
