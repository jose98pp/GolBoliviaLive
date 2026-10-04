import React, { useState } from 'react';
import {
  Cast,
  X,
  Tv,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Radio,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { CastConnectionStatus, CastDevice } from './hooks/useCast';

interface CastControllerProps {
  isOpen: boolean;
  onClose: () => void;
  castStatus: CastConnectionStatus;
  castDevice: CastDevice | null;
  castError: string | null;
  onDisconnect: () => void;
  streamTitle: string;
  streamUrl?: string;
  isAirPlayAvailable?: boolean;
  onTriggerAirPlay?: () => void;
  isRemotePlaybackAvailable?: boolean;
  onTriggerRemotePlayback?: () => void;
}

export const CastController: React.FC<CastControllerProps> = ({
  isOpen,
  onClose,
  castStatus,
  castDevice,
  castError,
  onDisconnect,
  streamTitle,
  streamUrl,
  isAirPlayAvailable,
  onTriggerAirPlay,
  isRemotePlaybackAvailable,
  onTriggerRemotePlayback,
}) => {
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyStreamUrl = () => {
    if (!streamUrl) return;
    navigator.clipboard.writeText(streamUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b1120] border border-slate-700/80 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Cerrar modal de transmisión"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg">
            <Cast className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-white">
              Transmitir Partido a la TV
            </h3>
            <p className="text-xs text-slate-400">
              Disfruta la señal oficial de GolBolivia en pantalla grande
            </p>
          </div>
        </div>

        {/* Connected State */}
        {castStatus === 'connected' && castDevice ? (
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/60 mb-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Conectado exitosamente</span>
            </div>
            <div className="font-mono text-base text-white font-semibold">{castDevice.friendlyName}</div>
            <p className="text-xs text-slate-300 mt-2">
              Emitiendo: <span className="text-white font-medium">{streamTitle}</span> en resolución HD 60 FPS.
            </p>

            <button
              onClick={() => {
                onDisconnect();
                onClose();
              }}
              className="mt-4 w-full py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Desconectar Transmisión de la TV
            </button>
          </div>
        ) : (
          <div className="space-y-4 mb-5">
            {/* Quick Action Buttons for Native TV protocols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {isAirPlayAvailable && onTriggerAirPlay && (
                <button
                  onClick={() => {
                    onTriggerAirPlay();
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 flex items-center gap-3 text-left transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <Tv className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">AirPlay (Apple TV)</div>
                    <div className="text-[10px] text-slate-400">Transmitir a Smart TV / Mac</div>
                  </div>
                </button>
              )}

              {isRemotePlaybackAvailable && onTriggerRemotePlayback && (
                <button
                  onClick={() => {
                    onTriggerRemotePlayback();
                  }}
                  className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 flex items-center gap-3 text-left transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Smart View / Wi-Fi</div>
                    <div className="text-[10px] text-slate-400">Detectar Smart TV cercana</div>
                  </div>
                </button>
              )}
            </div>

            {/* Error notice if any */}
            {castError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{castError}</span>
              </div>
            )}

            {/* Step-by-Step Instructions */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                <Tv className="w-4 h-4" />
                <span>Opciones para ver en cualquier Televisor:</span>
              </div>
              <ul className="space-y-2 text-slate-300 text-[11px] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                  <span><strong>Desde tu Celular Android:</strong> Desliza la barra de notificaciones y toca <em>Smart View</em>, <em>Emitir</em> o <em>Transmitir Pantalla</em>, y selecciona tu Smart TV.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                  <span><strong>Desde iPhone / iPad:</strong> Abre el Centro de Control y toca el ícono de <em>Duplicar Pantalla / AirPlay</em> para enlazar tu televisor.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                  <span><strong>Desde la PC / Laptop:</strong> En Google Chrome, haz clic en los 3 puntos superiores &gt; <em>Guardar y compartir &gt; Transmitir...</em> y elige tu TV o Chromecast.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                  <span><strong>En el Navegador de tu Smart TV:</strong> Abre el navegador de tu TV (Samsung Tizen, LG webOS o Android TV) e ingresa directamente a <span className="text-emerald-400 font-mono">golbolivialive-beta.vercel.app</span>.</span>
                </li>
              </ul>
            </div>

            {/* Copy Direct M3U8 Stream Link for Smart TV / IPTV apps */}
            {streamUrl && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-slate-400 text-[11px] font-medium">
                    Enlace directo de señal (para apps IPTV o VLC en tu TV):
                  </span>
                  <button
                    onClick={handleCopyStreamUrl}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-300" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar enlace M3U8</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-black/50 border border-white/5 font-mono text-[10px] text-slate-300 truncate">
                  {streamUrl}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Close */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
        >
          Entendido / Cerrar
        </button>
      </div>
    </div>
  );
};
