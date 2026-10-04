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
  X,
  Crown,
  QrCode,
  Smartphone,
  ChevronRight,
  Zap,
  ArrowRight
} from 'lucide-react';
import { ExclusiveContent } from '../types/football';
import { EXCLUSIVE_ITEMS, BOLIVIAN_CLUBS } from '../data/bolivianFootballData';
import { useClubs } from '../hooks/useClubs';
import { VipSubscriptionModal, VipPlan } from './VipSubscriptionModal';

interface ExclusiveClubZoneProps {
  isVipMember: boolean;
  toggleVipMembership: (forcedState?: boolean) => void;
}

export const ExclusiveClubZone: React.FC<ExclusiveClubZoneProps> = ({
  isVipMember,
  toggleVipMembership,
}) => {
  const [selectedClubFilter, setSelectedClubFilter] = useState<string>('all');
  const [activeVideoModal, setActiveVideoModal] = useState<ExclusiveContent | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const { clubs } = useClubs();

  const filteredContent = EXCLUSIVE_ITEMS.filter((item) => {
    if (selectedClubFilter === 'all') return true;
    return item.clubId === selectedClubFilter;
  });

  const handleOpenVideo = (item: ExclusiveContent) => {
    if (item.isLocked && !isVipMember) {
      // Prompt VIP Subscription Modal with Bolivian payment gateways
      setIsSubscriptionModalOpen(true);
      return;
    }
    setActiveVideoModal(item);
  };

  const handleActivateVipFromModal = () => {
    toggleVipMembership(true);
  };

  return (
    <div className="bg-[#0a0f1d] border border-slate-800/80 rounded-2xl p-4 md:p-6 shadow-xl">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#11192e] via-[#0d1628] to-[#16223b] border border-slate-700/60 rounded-xl p-5 mb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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

        {/* VIP Pass status / Subscription trigger button */}
        <button
          onClick={() => {
            if (isVipMember) {
              toggleVipMembership(false); // Toggle option
            } else {
              setIsSubscriptionModalOpen(true);
            }
          }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg whitespace-nowrap ${
            isVipMember
              ? 'bg-amber-500 text-black shadow-amber-500/30 hover:bg-amber-400'
              : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-amber-950/60 hover:brightness-110 active:scale-95'
          }`}
        >
          {isVipMember ? (
            <>
              <ShieldCheck className="w-4 h-4 text-black" />
              <span>Socio VIP Activo (Pase Total)</span>
            </>
          ) : (
            <>
              <Crown className="w-4 h-4 text-black" />
              <span>Suscribirme por Tigo Money / QR Simple</span>
            </>
          )}
        </button>
      </div>

      {/* PROMINENT SUBSCRIPTION / REVENUE GENERATION CARD */}
      {!isVipMember ? (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#121c33] via-[#0b1324] to-[#070d18] border-2 border-amber-500/50 shadow-2xl relative overflow-hidden">
          {/* Ambient golden lighting */}
          <div className="absolute -top-16 -right-16 w-52 h-52 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Planes de Suscripción VIP
                </span>
                <span className="text-slate-400 text-xs">·</span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" />
                  QR Simple Bancos & Tigo Money
                </span>
              </div>

              <h3 className="font-display font-black text-base sm:text-lg text-white">
                Desbloquea Todo el Contenido Premium de la División Profesional
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed">
                Elige tu plan y paga en bolivianos al instante con <strong>QR Simple (cualquier banco de Bolivia)</strong> o billetera móvil <strong>Tigo Money</strong>. Accede a vestuarios exclusivos, entrevistas sin censura y transmisiones 1080p sin cortes publicitarios.
              </p>

              {/* Perks list */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Cámaras vestuarios</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Tomas con Dron HD</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Sin anuncios molestos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Insignia dorada en Chat</span>
                </div>
              </div>
            </div>

            {/* Quick Action Box */}
            <div className="bg-[#060a14] border border-amber-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0 shadow-inner">
              <div className="text-center sm:text-left">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Planes desde:</div>
                <div className="font-mono text-xl sm:text-2xl font-black text-amber-400">
                  15 Bs <span className="text-xs font-normal text-slate-400">/ pase</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-bold">O 35 Bs mensual</div>
              </div>

              <button
                onClick={() => setIsSubscriptionModalOpen(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-amber-950/60 transition-all cursor-pointer active:scale-95"
              >
                <span>VER PASARELA DE PAGO</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* VIP ACTIVE RECOGNITION CARD */
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-[#0d1627] to-emerald-950/30 border border-amber-500/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm">¡Membresía Socio VIP Activa!</h4>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Desbloqueado
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Tienes acceso total a todas las cámaras de vestuario, dron de estadios y transmisiones 1080p de todos los clubes de la Liga.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSubscriptionModalOpen(true)}
            className="hidden sm:flex text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 transition-colors cursor-pointer"
          >
            Detalles del Pase
          </button>
        </div>
      )}

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
        {Object.values(clubs).map((c) => (
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
          const club = clubs[item.clubId] || BOLIVIAN_CLUBS[item.clubId] || clubs.bolivar || BOLIVIAN_CLUBS.bolivar;
          const isItemLocked = item.isLocked && !isVipMember;

          return (
            <div
              key={item.id}
              onClick={() => handleOpenVideo(item)}
              className={`group bg-[#0d1424] border rounded-xl overflow-hidden transition-all duration-200 flex flex-col cursor-pointer ${
                isItemLocked
                  ? 'border-slate-800 hover:border-amber-500/50 opacity-90 hover:shadow-lg hover:shadow-amber-950/20'
                  : 'border-slate-800/90 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-950/20'
              }`}
            >
              {/* Media Thumbnail Container */}
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
                  <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-3 z-20">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-1.5 shadow-md shadow-amber-950/50">
                      <Lock className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-amber-300">Exclusivo Socios VIP</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSubscriptionModalOpen(true);
                      }}
                      className="mt-2 text-[10px] bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black px-3 py-1.5 rounded-lg shadow-md cursor-pointer transition-transform active:scale-95"
                    >
                      Desbloquear con Tigo / QR
                    </button>
                  </div>
                ) : (
                  <div className="absolute bottom-2 right-2 z-10 w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-4 h-4 fill-black ml-0.5" />
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
                  Reproduciendo en 1080p 60fps · Audio Cancha Atmos
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

      {/* BOLIVIAN VIP PAYMENT MODAL (TIGO MONEY & QR SIMPLE) */}
      <VipSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onActivateVip={handleActivateVipFromModal}
        isVipMember={isVipMember}
      />
    </div>
  );
};
