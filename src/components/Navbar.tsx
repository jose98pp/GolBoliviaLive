import React, { useState } from 'react';
import { Radio, Bell, Tv, ShieldCheck, Menu, X, Users, Eye, Sparkles, ChevronRight, Activity, Zap, RefreshCw } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { SocialFollowBanner } from './SocialFollowBanner';

interface NavbarProps {
  activeTab: 'stream' | 'stats' | 'exclusive' | 'obs' | 'admin' | string;
  setActiveTab: (tab: any) => void;
  openObsModal: () => void;
  openPushModal: () => void;
  openAudienceModal: () => void;
  unreadNotificationsCount: number;
  isStreamingLive: boolean;
  isVipMember: boolean;
  toggleVipMembership: () => void;
  viewerCount?: number;
  activeCount?: number;
  totalCount?: number;
  homeScore?: number;
  awayScore?: number;
  matchMinute?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openObsModal,
  openPushModal,
  openAudienceModal,
  unreadNotificationsCount,
  isStreamingLive,
  isVipMember,
  toggleVipMembership,
  viewerCount = 14820,
  activeCount,
  totalCount,
  homeScore = 2,
  awayScore = 1,
  matchMinute = 78,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPurgingCache, setIsPurgingCache] = useState(false);

  const handleForceUpdateApp = async () => {
    setIsPurgingCache(true);
    try {
      if (typeof (window as any).__purgeGolBoliviaCache === 'function') {
        await (window as any).__purgeGolBoliviaCache();
        return;
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const r of registrations) {
          await r.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          await caches.delete(k);
        }
      }
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  const displayActive = activeCount || Math.round(viewerCount * 0.74);
  const displayTotal = totalCount || viewerCount;

  // Formatted compact viewer count (e.g., 10.9k)
  const formattedActiveCompact =
    displayActive >= 1000 ? `${(displayActive / 1000).toFixed(1)}k` : `${displayActive}`;

  return (
    <header className="sticky top-0 z-40 bg-[#080c14]/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('stream')}
            className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-yellow-500 to-red-600 p-[2px] shadow-lg shadow-emerald-950/40">
              <div className="w-full h-full bg-[#0b1120] rounded-[10px] flex items-center justify-center">
                <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                GolBolivia <span className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-normal uppercase">Live</span>
              </span>
            </div>
          </button>

          {/* Audiencia en Tiempo Real - Desktop & Tablet */}
          <button
            onClick={openAudienceModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-red-950/40 hover:bg-red-900/50 border border-red-700/50 rounded-full text-red-300 hover:text-white text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-sm shadow-red-950/40"
            title="Audiencia en Tiempo Real"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold text-white font-mono">{displayTotal.toLocaleString()}</span>
            <span className="text-red-400 text-[11px]">viendo en vivo</span>
          </button>
        </div>

        {/* Zone 2: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('stream')}
            className={`transition-colors flex items-center gap-1.5 hover:text-white cursor-pointer ${
              activeTab === 'stream' ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400 pb-0.5' : ''
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Transmisión</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`transition-colors flex items-center gap-1.5 hover:text-white cursor-pointer ${
              activeTab === 'stats' ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400 pb-0.5' : ''
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Estadísticas & Marcador</span>
          </button>
          <button
            onClick={() => setActiveTab('exclusive')}
            className={`transition-colors flex items-center gap-1.5 hover:text-white cursor-pointer ${
              activeTab === 'exclusive' ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400 pb-0.5' : ''
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Zona Clubes VIP</span>
          </button>
        </nav>

        {/* Zone 3: Actions (Desktop + Mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Creator Social Links (Desktop only) */}
          <div className="hidden lg:flex items-center gap-1.5 border-r border-slate-800 pr-2.5 mr-0.5">
            <span className="text-[11px] text-slate-400 font-medium">Sígueme:</span>
            <SocialFollowBanner variant="compact" />
          </div>

          {/* Audiencia en Tiempo Real - Mobile ONLY */}
          <button
            onClick={openAudienceModal}
            className="sm:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/70 border border-red-700/60 text-red-300 text-xs font-mono font-bold active:scale-95 transition-transform cursor-pointer"
            title="Audiencia en Tiempo Real"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <Eye className="w-3.5 h-3.5 text-red-400" />
            <span>{displayTotal >= 1000 ? `${(displayTotal / 1000).toFixed(1)}k` : displayTotal}</span>
          </button>

          {/* PWA Install Button (Desktop & Tablet) */}
          <div className="hidden sm:block">
            <PWAInstallButton variant="navbar" />
          </div>

          {/* Force Cache Purge / Update to Latest Commit button */}
          <button
            onClick={handleForceUpdateApp}
            disabled={isPurgingCache}
            aria-label="Actualizar a la última versión"
            className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-emerald-400 hover:bg-slate-800/80 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
            title="Actualizar a la última versión (Limpiar caché del navegador)"
          >
            <RefreshCw
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                isPurgingCache ? 'animate-spin text-emerald-400' : ''
              }`}
            />
          </button>

          {/* Essential Notifications trigger */}
          <button
            onClick={openPushModal}
            aria-label="Notificaciones Esenciales"
            className="relative p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
            title="Activar Notificaciones Esenciales (Goles & En Vivo)"
          >
            <Bell className="w-5 h-5 text-emerald-400" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#080c14] animate-pulse" />
            )}
          </button>

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-red-400" /> : <Menu className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* REFINED MOBILE DROP-DOWN DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-slate-800/90 flex flex-col gap-2.5 pb-3 animate-in fade-in slide-in-from-top-3 duration-200">
          {/* 1. Live Match & Audience Card on Mobile */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0c1424] to-slate-900 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest">
                  EN VIVO · Minuto {matchMinute}&apos;
                </span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAudienceModal();
                }}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/70 border border-red-600/40 text-[10px] text-white font-mono font-bold cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-300">{displayTotal.toLocaleString()} hinchas</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-white px-1">
              <span>Bolívar</span>
              <span className="font-mono text-base text-emerald-400 font-black">{homeScore} - {awayScore}</span>
              <span>The Strongest</span>
            </div>
          </div>

          {/* 2. Essential Notifications Quick Card */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              openPushModal();
            }}
            className="p-3 rounded-2xl bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-between transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <span>Notificaciones Esenciales</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-bold">1 Clic</span>
                </div>
                <div className="text-[11px] text-slate-400">Solo goles en vivo y transmisiones oficiales</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-400" />
          </button>

          {/* 3. Navigation Links */}
          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={() => {
                setActiveTab('stream');
                setMobileMenuOpen(false);
              }}
              className={`p-3 text-left text-xs rounded-xl flex items-center justify-between transition-colors ${
                activeTab === 'stream'
                  ? 'bg-slate-800 border border-emerald-500/50 text-emerald-400 font-bold'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4 text-emerald-400" />
                <span>Transmisión en Vivo & Chat</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">HD</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('stats');
                setMobileMenuOpen(false);
              }}
              className={`p-3 text-left text-xs rounded-xl flex items-center justify-between transition-colors ${
                activeTab === 'stats'
                  ? 'bg-slate-800 border border-emerald-500/50 text-emerald-400 font-bold'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-blue-400" />
                <span>Estadísticas & Tabla de Posiciones</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Minuto a Minuto</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('exclusive');
                setMobileMenuOpen(false);
              }}
              className={`p-3 text-left text-xs rounded-xl flex items-center justify-between transition-colors ${
                activeTab === 'exclusive'
                  ? 'bg-slate-800 border border-amber-500/50 text-amber-400 font-bold'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Zona Clubes VIP (Camerinos/Drones)</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                {isVipMember ? 'Desbloqueado' : 'Exclusivo'}
              </span>
            </button>
          </div>

          {/* 4. Install App button on mobile */}
          <div className="pt-1 space-y-2">
            <PWAInstallButton variant="banner" />
            
            {/* Force App Update & Cache Purge on Mobile */}
            <button
              onClick={handleForceUpdateApp}
              disabled={isPurgingCache}
              className="w-full p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPurgingCache ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
              <span>{isPurgingCache ? 'Actualizando página y limpiando caché...' : 'Actualizar a Última Versión (Limpiar Caché)'}</span>
            </button>
          </div>

          {/* 5. Mobile Social Channels Card */}
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>Sigue a @josecpp98</span>
              <span className="text-emerald-400 text-[10px]">Streams & Clips</span>
            </div>
            <div className="flex items-center justify-around">
              <SocialFollowBanner variant="compact" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
