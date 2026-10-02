import React from 'react';
import { Radio, Bell, Tv, ShieldCheck, Menu, X } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { SocialFollowBanner } from './SocialFollowBanner';

interface NavbarProps {
  activeTab: 'stream' | 'stats' | 'exclusive' | 'obs' | 'admin' | string;
  setActiveTab: (tab: any) => void;
  openObsModal: () => void;
  openPushModal: () => void;
  unreadNotificationsCount: number;
  isStreamingLive: boolean;
  isVipMember: boolean;
  toggleVipMembership: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openObsModal,
  openPushModal,
  unreadNotificationsCount,
  isStreamingLive,
  isVipMember,
  toggleVipMembership,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#080c14]/95 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Zone 1: Single element Brand Wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('stream')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-yellow-500 to-red-600 p-[2px] shadow-lg shadow-emerald-950/40">
              <div className="w-full h-full bg-[#0b1120] rounded-[10px] flex items-center justify-center">
                <Radio className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                GolBolivia <span className="text-emerald-400 text-sm font-semibold tracking-normal uppercase">Live</span>
              </span>
            </div>
          </button>

          {isStreamingLive && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-red-950/60 border border-red-800/50 rounded-md text-red-400 text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>EN VIVO</span>
            </div>
          )}
        </div>

        {/* Zone 2: Navigation Links (single line, no pill enclosures, clean typography) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
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
            <span>Estadísticas & Minuto a Minuto</span>
          </button>
          <button
            onClick={() => setActiveTab('exclusive')}
            className={`transition-colors flex items-center gap-1.5 hover:text-white cursor-pointer ${
              activeTab === 'exclusive' ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400 pb-0.5' : ''
            }`}
          >
            <span>Zona Clubes VIP</span>
          </button>
        </nav>

        {/* Zone 3: 1-2 Primary Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Creator Social Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-1.5 border-r border-slate-800 pr-2.5 mr-0.5">
            <span className="text-[11px] text-slate-400 font-medium">Sígueme:</span>
            <SocialFollowBanner variant="compact" />
          </div>

          {/* PWA Install Button */}
          <PWAInstallButton variant="navbar" />

          {/* Push Notifications trigger */}
          <button
            onClick={openPushModal}
            aria-label="Notificaciones Push"
            className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Configurar Notificaciones Push"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#080c14] animate-pulse" />
            )}
          </button>

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drop-down drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-slate-800 flex flex-col gap-2 pb-2">
          {/* Mobile Social Links Banner */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 mb-1">
            <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>Canales de @josecpp98</span>
              <span className="text-emerald-400 text-[10px]">Streams & Videos</span>
            </div>
            <div className="flex items-center justify-around">
              <SocialFollowBanner variant="compact" />
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('stream');
              setMobileMenuOpen(false);
            }}
            className={`px-3 py-2 text-left text-sm rounded-lg flex items-center justify-between ${
              activeTab === 'stream' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300'
            }`}
          >
            <span>Transmisión & Chat</span>
            <Tv className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setActiveTab('stats');
              setMobileMenuOpen(false);
            }}
            className={`px-3 py-2 text-left text-sm rounded-lg flex items-center justify-between ${
              activeTab === 'stats' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300'
            }`}
          >
            <span>Estadísticas en Vivo & Minuto a Minuto</span>
            <span className="text-xs text-slate-500">2 - 1</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('exclusive');
              setMobileMenuOpen(false);
            }}
            className={`px-3 py-2 text-left text-sm rounded-lg flex items-center justify-between ${
              activeTab === 'exclusive' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300'
            }`}
          >
            <span>Zona Clubes Exclusiva (Camerinos/Drones)</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </button>
          <button
            onClick={() => {
              toggleVipMembership();
              setMobileMenuOpen(false);
            }}
            className="px-3 py-2 text-left text-sm rounded-lg text-slate-300 flex items-center justify-between"
          >
            <span>Estado Socio Digital: {isVipMember ? 'Activo (Desbloqueado)' : 'Estándar'}</span>
          </button>
        </div>
      )}
    </header>
  );
};
