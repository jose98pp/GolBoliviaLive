import React from 'react';
import { ExternalLink, CheckCircle2, Flame, Users, Sparkles } from 'lucide-react';

export interface SocialChannel {
  id: string;
  name: string;
  handle: string;
  url: string;
  category: string;
  actionText: string;
  bgHoverGradient: string;
  borderColor: string;
  badgeColor: string;
  brandColor: string;
  icon: React.ReactNode;
}

export const SOCIAL_CHANNELS: SocialChannel[] = [
  {
    id: 'kick',
    name: 'Kick',
    handle: 'josecpp98',
    url: 'https://kick.com/josecpp98',
    category: 'Transmisiones en Vivo',
    actionText: 'Seguir en Kick',
    bgHoverGradient: 'hover:from-emerald-950/40 hover:to-[#53fc18]/10',
    borderColor: 'border-[#53fc18]/30 hover:border-[#53fc18]',
    badgeColor: 'bg-[#53fc18]/15 text-[#53fc18] border-[#53fc18]/40',
    brandColor: '#53fc18',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#53fc18] shrink-0" aria-hidden="true">
        <path d="M4 3h4.2v6.6l4.6-6.6h5.2l-6 7.6 6.3 10.4h-5.2l-4.9-8.4V21H4V3z" />
      </svg>
    ),
  },
  {
    id: 'youtube',
    name: 'YouTube',
    handle: '@Josecpp98',
    url: 'https://www.youtube.com/@Josecpp98',
    category: 'Resúmenes, Goles & Análisis',
    actionText: 'Suscribirse',
    bgHoverGradient: 'hover:from-red-950/40 hover:to-red-600/10',
    borderColor: 'border-red-500/30 hover:border-red-500',
    badgeColor: 'bg-red-500/15 text-red-400 border-red-500/40',
    brandColor: '#FF0000',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FF0000] shrink-0" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: '@josecpp98',
    url: 'https://www.tiktok.com/@josecpp98',
    category: 'Clips, Reacciones & Jugadas',
    actionText: 'Seguir en TikTok',
    bgHoverGradient: 'hover:from-cyan-950/40 hover:to-pink-950/20',
    borderColor: 'border-pink-500/30 hover:border-cyan-400',
    badgeColor: 'bg-pink-500/15 text-pink-400 border-pink-500/40',
    brandColor: '#fe0979',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.34 6.34 0 0 0 9.35 22a6.34 6.34 0 0 0 6.33-6.32V8.92a8.28 8.28 0 0 0 4.84 1.54V7.02a4.83 4.83 0 0 1-.93-.33z" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    handle: 'josecpp98',
    url: 'https://www.facebook.com/josecpp98',
    category: 'Comunidad & Transmisiones',
    actionText: 'Seguir en Facebook',
    bgHoverGradient: 'hover:from-blue-950/40 hover:to-blue-600/10',
    borderColor: 'border-blue-500/30 hover:border-blue-500',
    badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
    brandColor: '#1877F2',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1877F2] shrink-0" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
];

interface SocialFollowBannerProps {
  variant?: 'cards' | 'compact' | 'footer';
  className?: string;
}

export const SocialFollowBanner: React.FC<SocialFollowBannerProps> = ({
  variant = 'cards',
  className = '',
}) => {
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {SOCIAL_CHANNELS.map((ch) => (
          <a
            key={ch.id}
            href={ch.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${ch.name}: ${ch.handle}`}
            className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center transition-all hover:scale-110 shadow-sm"
          >
            {ch.icon}
          </a>
        ))}
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <footer className={`mt-12 border-t border-slate-800 bg-[#060913] pt-10 pb-20 md:pb-10 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
            {/* Creator Profile */}
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-yellow-500 to-red-500 p-0.5 shadow-xl">
                  <div className="w-full h-full rounded-2xl bg-[#070b14] flex items-center justify-center text-xl font-black text-white">
                    JP
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-black rounded-full p-0.5" title="Creador Verificado">
                  <CheckCircle2 className="w-4 h-4 fill-emerald-400 text-black" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h3 className="font-extrabold text-white text-base sm:text-lg">josecpp98</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Creador Oficial
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                  Fútbol Boliviano en vivo, reacciones en directo, debates y el mejor contenido de la División Profesional.
                </p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {SOCIAL_CHANNELS.map((ch) => (
                <a
                  key={ch.id}
                  href={ch.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all hover:scale-105 hover:border-slate-500 shadow-md cursor-pointer"
                >
                  {ch.icon}
                  <span>{ch.name}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              ))}
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
            <p>© {new Date().getFullYear()} GolBolivia Live · Contenido independiente de @josecpp98.</p>
            <p className="text-[11px] text-slate-400">
              Hecho con pasión por el fútbol de Bolivia 🇧🇴
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // Default: cards variant
  return (
    <section className={`p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-[#0b101d] to-[#070b14] border border-slate-800/90 shadow-2xl relative overflow-hidden ${className}`}>
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Flame className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Redes Sociales Oficiales</span>
          </div>
          <h3 className="font-extrabold text-white text-lg sm:text-xl tracking-tight flex items-center gap-2">
            <span>Sigue a @josecpp98 para más transmisiones y contenido</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Conéctate a los streams en vivo en Kick y YouTube, mira jugadas virales en TikTok y mantente al día con la comunidad en Facebook.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 shrink-0">
          <Users className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white">Comunidad Activa</span>
        </div>
      </div>

      {/* 4 Social Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
        {SOCIAL_CHANNELS.map((ch) => (
          <a
            key={ch.id}
            href={ch.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group p-4 rounded-xl bg-slate-900/70 hover:bg-gradient-to-b ${ch.bgHoverGradient} border ${ch.borderColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between cursor-pointer`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#070b14] border border-slate-800 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  {ch.icon}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ch.badgeColor}`}>
                  {ch.name}
                </span>
              </div>

              <div className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors flex items-center gap-1">
                <span>{ch.handle}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-snug">
                {ch.category}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
              <span>{ch.actionText}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};
