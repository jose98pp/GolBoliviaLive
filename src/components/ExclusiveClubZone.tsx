import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Play,
  Eye,
  ShieldCheck,
  Video,
  Clock,
  Sparkles,
  Camera,
  Check,
  X
} from 'lucide-react';
import { ExclusiveContent } from '../types/football';
import { EXCLUSIVE_ITEMS, BOLIVIAN_CLUBS } from '../data/bolivianFootballData';

interface ExclusiveClubZoneProps {
  isVipMember: boolean;
  toggleVipMembership: () => void;
}

export const ExclusiveClubZone: React.FC<ExclusiveClubZoneProps> = ({
  isVipMember,
  toggleVipMembership,
}) => {
  const [selectedClubFilter, setSelectedClubFilter] = useState<string>('all');
  const [activeVideoModal, setActiveVideoModal] = useState<ExclusiveContent | null>(null);

  const filteredContent = EXCLUSIVE_ITEMS.filter((item) => {
    if (selectedClubFilter === 'all') return true;
    return item.clubId === selectedClubFilter;
  });

  const handleOpenVideo = (item: ExclusiveContent) => {
    if (item.isLocked && !isVipMember) {
      // Prompt VIP unlock
      return;
    }
    setActiveVideoModal(item);
  };

  return (
    <div className="bg-[#0a0f1d] border border-slate-800/80 rounded-2xl p-4 md:p-6 shadow-xl">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#11192e] via-[#0d1628] to-[#16223b] border border-slate-700/60 rounded-xl p-5 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-extrabold text-lg md:text-xl text-white">
              Zona Exclusiva de Clubes Bolivianos
            </span>
            <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
              VIP Backstage
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Acceso privilegiado a cámaras en vestuarios, charlas técnicas de vestuario, vuelos con dron en Villa Ingenio y el Siles, y entrevistas sin filtro.
          </p>
        </div>

        {/* VIP Pass status button */}
        <button
          onClick={toggleVipMembership}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg whitespace-nowrap ${
            isVipMember
              ? 'bg-amber-500 text-black shadow-amber-500/30 hover:bg-amber-400'
              : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-emerald-950/50 hover:brightness-110'
          }`}
        >
          {isVipMember ? (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Pase Socio Activo (Todo Desbloqueado)</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Desbloquear Todo con Pase Socio Digital</span>
            </>
          )}
        </button>
      </div>

      {/* CLUB FILTER BUTTONS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-5 text-xs">
        <button
          onClick={() => setSelectedClubFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
            selectedClubFilter === 'all'
              ? 'bg-emerald-600 text-black font-semibold'
              : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-750'
          }`}
        >
          Todos los Clubes
        </button>
        {Object.values(BOLIVIAN_CLUBS).map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedClubFilter(c.id)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer ${
              selectedClubFilter === c.id
                ? 'bg-slate-200 text-slate-950 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-750'
            }`}
          >
            <span>{c.badgeEmoji}</span>
            <span>{c.shortName}</span>
          </button>
        ))}
      </div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContent.map((item) => {
          const club = BOLIVIAN_CLUBS[item.clubId] || BOLIVIAN_CLUBS.bolivar;
          const isItemLocked = item.isLocked && !isVipMember;

          return (
            <div
              key={item.id}
              onClick={() => handleOpenVideo(item)}
              className={`group bg-[#0d1424] border rounded-xl overflow-hidden transition-all duration-200 flex flex-col cursor-pointer ${
                isItemLocked
                  ? 'border-slate-800 hover:border-amber-500/40 opacity-90'
                  : 'border-slate-800/90 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-950/20'
              }`}
            >
              {/* Media Thumbnail Container with styled CSS fallback */}
              <div className="relative aspect-video bg-gradient-to-br from-[#0c1626] to-[#060a12] flex items-center justify-center overflow-hidden">
                {/* Decorative football pattern */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Club colored ambient illumination */}
                <div
                  className="absolute -top-12 -left-12 w-36 h-36 rounded-full blur-3xl opacity-30"
                  style={{ backgroundColor: club.primaryColor }}
                />

                {/* Central Category Visualizer */}
                <div className="relative z-10 flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-black/60 border border-slate-700 flex items-center justify-center text-2xl mb-2 group-hover:scale-110 transition-transform">
                    {item.category === 'camerino' ? '🚪' : item.category === 'entrenamiento' ? '⛰️' : item.category === 'prensa' ? '🎙️' : '⭐️'}
                  </div>
                  <span className="text-[11px] font-bold text-slate-300 font-display uppercase tracking-wider">
                    {item.category === 'camerino' ? 'Camerinos & Arenga' : item.category === 'entrenamiento' ? 'Entrenamiento Altura' : item.category === 'prensa' ? 'Conferencia Oficial' : 'Entrevista VIP'}
                  </span>
                </div>

                {/* Lock or Play Overlay */}
                {isItemLocked ? (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-3 z-20">
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-1.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-amber-300">Exclusivo Socios</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVipMembership();
                      }}
                      className="mt-2 text-[10px] bg-amber-500 hover:bg-amber-400 text-black font-bold px-2.5 py-1 rounded-lg"
                    >
                      Desbloquear
                    </button>
                  </div>
                ) : (
                  <div className="absolute bottom-2 right-2 z-10 w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                  </div>
                )}

                {/* Duration Badge */}
                <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-slate-300 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{item.duration}</span>
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Unboxed Metadata (Zero-pill compliance) */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
                    <span className="font-semibold text-white">{club.shortName}</span>
                    <span>·</span>
                    <span>{item.tag}</span>
                  </div>

                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </h4>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{item.views.toLocaleString()} vistas</span>
                  </span>
                  <span className="text-emerald-400 font-medium">1080p Master Feed</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* EXCLUSIVE VIDEO PLAYER MODAL */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[#0b101e] border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setActiveVideoModal(null)}
              className="absolute top-3 right-3 z-30 p-1.5 rounded-lg bg-black/60 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Video mockup view */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-t from-slate-950 via-[#07111e] to-slate-950 flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mb-3 animate-pulse">
                  <Play className="w-7 h-7 fill-emerald-400 ml-1" />
                </div>
                <h3 className="font-display font-bold text-white text-base md:text-lg max-w-md">
                  {activeVideoModal.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 font-mono">
                  Reproduciendo en 1080p 60fps · Audio Atmos Cancha
                </p>
              </div>

              {/* Progress bar */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-800">
                <div className="w-2/5 h-full bg-emerald-500" />
              </div>
            </div>

            <div className="p-4 bg-[#0d1424]">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <span className="text-emerald-400 font-semibold">{activeVideoModal.tag}</span>
                <span>·</span>
                <span>{activeVideoModal.duration}</span>
              </div>
              <p className="text-xs text-slate-300">{activeVideoModal.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
