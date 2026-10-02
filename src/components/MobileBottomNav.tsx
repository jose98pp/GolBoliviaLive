import React from 'react';
import { Tv, MessageSquare, Activity, ShieldCheck } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  mobileViewMode: 'stream' | 'chat';
  setMobileViewMode: (mode: 'stream' | 'chat') => void;
  openObsModal?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  mobileViewMode,
  setMobileViewMode,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070b15]/95 backdrop-blur-lg border-t border-slate-800 pb-safe">
      <div className="flex items-center justify-around h-14 px-1">
        {/* Stream view */}
        <button
          onClick={() => {
            setActiveTab('stream');
            setMobileViewMode('stream');
          }}
          className={`flex-1 flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'stream' && mobileViewMode === 'stream'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tv className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">En Vivo</span>
        </button>

        {/* Live Chat */}
        <button
          onClick={() => {
            setActiveTab('stream');
            setMobileViewMode('chat');
          }}
          className={`flex-1 flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'stream' && mobileViewMode === 'chat'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Chat</span>
        </button>

        {/* Stats */}
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'stats'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Estadísticas</span>
        </button>

        {/* Exclusive VIP */}
        <button
          onClick={() => setActiveTab('exclusive')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'exclusive'
              ? 'text-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Zona VIP</span>
        </button>

        {/* PWA Mobile App Download Button */}
        <div className="flex-1 flex items-center justify-center">
          <PWAInstallButton variant="bottomNav" />
        </div>
      </div>
    </div>
  );
};
