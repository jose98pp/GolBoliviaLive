import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface FullscreenControllerProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const FullscreenController: React.FC<FullscreenControllerProps> = ({
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <button
      type="button"
      onClick={onToggleFullscreen}
      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
      title={
        isFullscreen
          ? 'Salir de pantalla completa'
          : 'Extender pantalla completa (Gira automáticamente a horizontal en móvil)'
      }
      aria-label={
        isFullscreen
          ? 'Salir de pantalla completa'
          : 'Extender pantalla completa (Gira automáticamente a horizontal en móvil)'
      }
    >
      {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4" />}
    </button>
  );
};
