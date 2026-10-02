import React from 'react';
import { Cast, X, Tv, Smartphone, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { CastConnectionStatus, CastDevice } from './hooks/useCast';

interface CastControllerProps {
  isOpen: boolean;
  onClose: () => void;
  castStatus: CastConnectionStatus;
  castDevice: CastDevice | null;
  castError: string | null;
  onDisconnect: () => void;
  streamTitle: string;
}

export const CastController: React.FC<CastControllerProps> = ({
  isOpen,
  onClose,
  castStatus,
  castDevice,
  castError,
  onDisconnect,
  streamTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b101e] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Cast className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-white">
              Transmitir a Smart TV / Chromecast
            </h3>
            <p className="text-xs text-slate-400">
              Disfruta el partido de fútbol en pantalla grande
            </p>
          </div>
        </div>

        {castStatus === 'connected' && castDevice ? (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 mb-4">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Conectado a la TV</span>
            </div>
            <div className="font-mono text-sm text-white font-semibold">{castDevice.friendlyName}</div>
            <p className="text-xs text-slate-300 mt-2">
              Emitiendo: <span className="text-white font-medium">{streamTitle}</span> en 1080p 60fps.
            </p>

            <button
              onClick={() => {
                onDisconnect();
                onClose();
              }}
              className="mt-4 w-full py-2 rounded-lg bg-red-900/60 hover:bg-red-800/80 text-red-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Desconectar Transmisión
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-5 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2 text-cyan-300 font-bold mb-1">
                <Tv className="w-4 h-4" />
                <span>¿Cómo transmitir a tu televisor?</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
                <li>Asegúrate de que tu TV y este dispositivo estén en la misma red Wi-Fi.</li>
                <li>Si estás en <strong>Google Chrome</strong> en tu PC, haz clic en los 3 puntos del navegador &gt; <em>Transmitir...</em> y elige tu TV.</li>
                <li>Si estás en <strong>Android</strong>, toca el ícono de Cast o <em>Smart View / Emitir pantalla</em> desde la barra de notificaciones.</li>
                <li>Si tienes <strong>iPhone / Mac / Apple TV</strong>, activa <em>AirPlay o Duplicar pantalla</em>.</li>
              </ol>
            </div>

            {castError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{castError}</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
