import React, { useState, useEffect } from 'react';
import { LiveEvent, StreamProvider } from '../../types/football';
import { CloudflarePlayer } from './CloudflarePlayer';
import { YouTubePlayer } from './YouTubePlayer';
import { KickPlayer } from './KickPlayer';
import { Zap, Radio, Tv, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

export interface UniversalStreamPlayerProps {
  event: LiveEvent;
  isTheaterMode?: boolean;
  setIsTheaterMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  onProviderChange?: (newProvider: StreamProvider) => void;
  homeScore?: number;
  awayScore?: number;
  matchMinute?: number;
  viewerCount?: number;
}

export const UniversalStreamPlayer: React.FC<UniversalStreamPlayerProps> = ({
  event,
  isTheaterMode,
  setIsTheaterMode,
  onProviderChange,
  homeScore,
  awayScore,
  matchMinute,
  viewerCount = 14820,
}) => {
  // Current active provider state initialized to event.primaryProvider
  const [activeProvider, setActiveProvider] = useState<StreamProvider>(event.primaryProvider);

  // Keep active provider in sync if event.primaryProvider changes from backend/admin
  useEffect(() => {
    setActiveProvider(event.primaryProvider);
  }, [event.primaryProvider, event.id]);

  // Handle automatic failover to the next provider in fallbackOrder
  const handleFailover = () => {
    const order = event.fallbackOrder && event.fallbackOrder.length > 0
      ? event.fallbackOrder
      : ['cloudflare', 'youtube', 'kick'] as StreamProvider[];

    const currentIndex = order.indexOf(activeProvider);
    const nextIndex = (currentIndex + 1) % order.length;
    const nextProvider = order[nextIndex];

    console.warn(`[UniversalStreamPlayer] Failover ejecutado: cambiando de ${activeProvider} a ${nextProvider}`);
    setActiveProvider(nextProvider);
    if (onProviderChange) {
      onProviderChange(nextProvider);
    }
  };

  const handleManualProviderSelect = (provider: StreamProvider) => {
    setActiveProvider(provider);
    if (onProviderChange) {
      onProviderChange(provider);
    }
  };

  // Helper to render the specific player component
  const renderPlayer = () => {
    switch (activeProvider) {
      case 'cloudflare':
        return (
          <CloudflarePlayer
            event={event}
            onFailover={handleFailover}
            isTheaterMode={isTheaterMode}
            onToggleTheater={() => setIsTheaterMode?.((prev) => !prev)}
          />
        );

      case 'youtube':
        return (
          <YouTubePlayer
            event={event}
            onFailover={handleFailover}
            isTheaterMode={isTheaterMode}
            onToggleTheater={() => setIsTheaterMode?.((prev) => !prev)}
          />
        );

      case 'kick':
        return (
          <KickPlayer
            event={event}
            onFailover={handleFailover}
            isTheaterMode={isTheaterMode}
            onToggleTheater={() => setIsTheaterMode?.((prev) => !prev)}
          />
        );

      default:
        return (
          <CloudflarePlayer
            event={event}
            onFailover={handleFailover}
            isTheaterMode={isTheaterMode}
            onToggleTheater={() => setIsTheaterMode?.((prev) => !prev)}
          />
        );
    }
  };

  // Provider branding styling
  const providerBadges: Record<StreamProvider, { label: string; icon: any; color: string; border: string }> = {
    cloudflare: {
      label: 'Cloudflare Stream',
      icon: Zap,
      color: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      border: 'hover:border-sky-400',
    },
    youtube: {
      label: 'YouTube Live',
      icon: Tv,
      color: 'bg-red-500/20 text-red-300 border-red-500/40',
      border: 'hover:border-red-400',
    },
    kick: {
      label: 'Kick Streaming',
      icon: Radio,
      color: 'bg-emerald-500/20 text-[#53fc18] border-emerald-500/40',
      border: 'hover:border-emerald-400',
    },
  };

  return (
    <div className="w-full flex flex-col space-y-2">
      {/* Universal Multi-Provider Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs">
        {/* Active stream info */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>EN VIVO</span>
          </div>
          <span className="text-white font-semibold hidden sm:inline">{event.title}</span>
        </div>

        {/* Available Source Providers selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 text-[11px] hidden md:inline">Fuente:</span>
          {(['cloudflare', 'youtube', 'kick'] as StreamProvider[]).map((prov) => {
            const badge = providerBadges[prov];
            const Icon = badge.icon;
            const isCurrent = activeProvider === prov;
            const isPrimary = event.primaryProvider === prov;

            return (
              <button
                key={prov}
                onClick={() => handleManualProviderSelect(prov)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                  isCurrent
                    ? `${badge.color} ring-1 ring-white/20 shadow-md font-bold scale-[1.02]`
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
                title={`Cambiar a ${badge.label} ${isPrimary ? '(Fuente primaria)' : ''}`}
              >
                <Icon className="w-3 h-3" />
                <span>{badge.label.split(' ')[0]}</span>
                {isPrimary && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                    ★
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Fallback Order Pill */}
        {event.fallbackOrder && event.fallbackOrder.length > 0 && (
          <div className="hidden lg:flex items-center gap-1 text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            <span className="text-slate-500">Failover:</span>
            {event.fallbackOrder.map((prov, i) => (
              <React.Fragment key={prov}>
                <span className={activeProvider === prov ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                  {prov}
                </span>
                {i < event.fallbackOrder.length - 1 && <span className="text-slate-600">→</span>}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Render the selected provider player */}
      <div className="w-full">
        {renderPlayer()}
      </div>
    </div>
  );
};
