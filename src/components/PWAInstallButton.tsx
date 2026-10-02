import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'bottomNav' | 'banner' | 'modal';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone mode (already installed), hide
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowIOSGuide(true);
    }
  };

  if (variant === 'bottomNav') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`flex flex-col items-center justify-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer ${className}`}
          title="Descargar GolBolivia como App en tu celular"
        >
          <div className="relative">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Instalar App</span>
        </button>

        {showIOSGuide && <InstallGuideModal onClose={() => setShowIOSGuide(false)} isIOS={isIOS} />}
      </>
    );
  }

  if (variant === 'banner') {
    return (
      <>
        <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/pwa-192x192.png" alt="GolBolivia Logo" className="w-11 h-11 rounded-xl shadow-lg border border-emerald-500/40" />
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                <span>Instalar GolBolivia en tu Celular</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">PWA Móvil</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Acceso directo desde tu pantalla de inicio, sin barras de navegación y con carga ultra rápida.
              </p>
            </div>
          </div>

          <button
            onClick={handleInstallClick}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Download className="w-4 h-4" />
            <span>Descargar App Gratis</span>
          </button>
        </div>

        {showIOSGuide && <InstallGuideModal onClose={() => setShowIOSGuide(false)} isIOS={isIOS} />}
      </>
    );
  }

  // Default navbar variant
  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 shadow-sm shadow-emerald-950/40 cursor-pointer ${className}`}
        title="Instalar GolBolivia como Aplicación en tu pantalla de inicio"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">App</span>
      </button>

      {showIOSGuide && <InstallGuideModal onClose={() => setShowIOSGuide(false)} isIOS={isIOS} />}
    </>
  );
};

interface InstallGuideModalProps {
  onClose: () => void;
  isIOS: boolean;
}

const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ onClose, isIOS }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b111e] border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <img
            src="/pwa-192x192.png"
            alt="GolBolivia Logo"
            className="w-12 h-12 rounded-2xl border border-emerald-500/50 shadow-lg"
          />
          <div>
            <h3 className="font-bold text-white text-base">Instalar GolBolivia</h3>
            <p className="text-xs text-emerald-400 font-medium">Aplicación Web Progresiva (PWA)</p>
          </div>
        </div>

        {isIOS ? (
          <div className="space-y-3 text-xs">
            <p className="text-slate-300 leading-relaxed">
              Para instalar en tu <strong>iPhone o iPad</strong> desde Safari:
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-slate-200">
                <Share2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>1. Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>2. Desplázate y selecciona <strong>"Agregar al inicio"</strong>.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>3. Toca <strong>"Agregar"</strong> arriba a la derecha.</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              ¡Listo! Podrás abrir GolBolivia a pantalla completa desde tu pantalla de inicio como una app nativa.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <p className="text-slate-300 leading-relaxed">
              Para instalar en tu celular <strong>Android</strong> o navegador:
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>Toca el menú de tres puntos <strong>(⋮)</strong> en la esquina del navegador.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>Confirma en <strong>Instalar</strong>.</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-colors cursor-pointer"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};
