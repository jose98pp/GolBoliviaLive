import React, { useState, useEffect } from 'react';
import {
  Trophy,
  MapPin,
  Save,
  CheckCircle2,
  Sparkles,
  ArrowLeftRight,
  Radio,
  FileText,
  Mountain,
  AlertCircle
} from 'lucide-react';
import { StreamSettings } from '../types/football';
import { BOLIVIAN_CLUBS } from '../data/bolivianFootballData';
import { useClubs } from '../hooks/useClubs';
import { apiClient } from '../services/apiClient';

interface MatchDetailsEditorProps {
  streamSettings: StreamSettings;
  onUpdateStreamSettings: (newSettings: Partial<StreamSettings>) => void;
}

const TOURNAMENT_PRESETS = [
  'Liga Tigo División Profesional - Torneo Clausura',
  'Liga Tigo División Profesional - Torneo Apertura',
  'Copa de la División Profesional de Bolivia',
  'Copa Simón Bolívar - Nacional B',
  'Amistoso Internacional FIFA',
  'Copa CONMEBOL Libertadores',
];

export const MatchDetailsEditor: React.FC<MatchDetailsEditorProps> = ({
  streamSettings,
  onUpdateStreamSettings,
}) => {
  const [title, setTitle] = useState(streamSettings.title || '');
  const [tournamentName, setTournamentName] = useState(streamSettings.tournamentName || '');
  const [homeClubId, setHomeClubId] = useState(streamSettings.homeClubId || 'bolivar');
  const [awayClubId, setAwayClubId] = useState(streamSettings.awayClubId || 'strongest');
  const [stadiumName, setStadiumName] = useState(streamSettings.stadiumName || '');
  const [altitudeMeters, setAltitudeMeters] = useState(streamSettings.altitudeMeters || 3637);
  const [officialAnnouncement, setOfficialAnnouncement] = useState(streamSettings.officialAnnouncement || '');
  const [period, setPeriod] = useState(streamSettings.period || '2T');
  const [isLive, setIsLive] = useState(streamSettings.isLive !== false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { clubs } = useClubs();

  // Sync internal state when external props change
  useEffect(() => {
    setTitle(streamSettings.title || '');
    setTournamentName(streamSettings.tournamentName || '');
    setHomeClubId(streamSettings.homeClubId || 'bolivar');
    setAwayClubId(streamSettings.awayClubId || 'strongest');
    setStadiumName(streamSettings.stadiumName || '');
    setAltitudeMeters(streamSettings.altitudeMeters || 3637);
    setOfficialAnnouncement(streamSettings.officialAnnouncement || '');
    setPeriod(streamSettings.period || '2T');
    setIsLive(streamSettings.isLive !== false);
  }, [streamSettings]);

  const handleGenerateTitle = () => {
    const home = clubs[homeClubId]?.name || 'Local';
    const away = clubs[awayClubId]?.name || 'Visitante';
    const generated = `${home} vs ${away} — Fútbol Boliviano en Vivo`;
    setTitle(generated);
  };

  const handleAutofillStadiumFromHomeClub = () => {
    const club = clubs[homeClubId];
    if (club) {
      setStadiumName(`${club.stadium} - ${club.city}`);
      setAltitudeMeters(club.altitudeMeters);
    }
  };

  const handleSwapClubs = () => {
    const tempHome = homeClubId;
    setHomeClubId(awayClubId);
    setAwayClubId(tempHome);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    const payload: Partial<StreamSettings> = {
      title: title.trim(),
      tournamentName: tournamentName.trim(),
      homeClubId,
      awayClubId,
      stadiumName: stadiumName.trim(),
      altitudeMeters: Number(altitudeMeters) || 0,
      officialAnnouncement: officialAnnouncement.trim(),
      period,
      isLive,
    };

    try {
      // 1. Update state in parent and push to backend API
      onUpdateStreamSettings(payload);

      // 2. Direct server call ensuring server persistence
      await apiClient.updateStreamSettings(payload);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar los datos en el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#0b1222] border-2 border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-black font-extrabold shadow-lg shadow-emerald-950/50">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>Editor de Datos de la Página Principal</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                TIEMPO REAL
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Modifica el título, clubes, estadio, torneo y comunicados que ven los espectadores en la web.
            </p>
          </div>
        </div>

        {/* Live sync indicator */}
        <div className="flex items-center gap-2 bg-[#060a14] px-3 py-1.5 rounded-xl border border-slate-700/80">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-slate-300 font-medium">Sincronización SSE Activa</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Match Title & Auto-generator */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Título Oficial del Partido (Encabezado Principal de la Web):</span>
            </label>
            <button
              type="button"
              onClick={handleGenerateTitle}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Generar nombre automático según los equipos seleccionados"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generar con equipos</span>
            </button>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Bolívar vs The Strongest - Clásico Paceño N° 234"
            className="w-full bg-[#060a14] border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            required
          />
        </div>

        {/* Row 2: Tournament Name & Quick Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white block">
            Torneo / Campeonato / Competición:
          </label>
          <input
            type="text"
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            placeholder="Ej: Liga Tigo División Profesional - Torneo Clausura"
            className="w-full bg-[#060a14] border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none"
            required
          />
          {/* Quick presets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] text-slate-500 font-medium">Sugeridos:</span>
            {TOURNAMENT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTournamentName(preset)}
                className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                  tournamentName === preset
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800'
                }`}
              >
                {preset.split(' - ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Clubs Selection (Home vs Away) with Swap button */}
        <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Equipos en Disputa (Clubes Oficiales de Bolivia)</span>
            </span>
            <button
              type="button"
              onClick={handleSwapClubs}
              className="text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
              title="Invertir condición de Local y Visitante"
            >
              <ArrowLeftRight className="w-3 h-3 text-emerald-400" />
              <span>Invertir Local / Visitante</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Home Club */}
            <div>
              <label className="block text-[11px] font-semibold text-sky-400 mb-1">
                Club Local (Anfitrión):
              </label>
              <select
                value={homeClubId}
                onChange={(e) => setHomeClubId(e.target.value)}
                className="w-full bg-[#060a14] border border-sky-500/40 focus:border-sky-400 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
              >
                {Object.values(clubs).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.badgeEmoji} {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Away Club */}
            <div>
              <label className="block text-[11px] font-semibold text-amber-400 mb-1">
                Club Visitante:
              </label>
              <select
                value={awayClubId}
                onChange={(e) => setAwayClubId(e.target.value)}
                className="w-full bg-[#060a14] border border-amber-500/40 focus:border-amber-400 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
              >
                {Object.values(clubs).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.badgeEmoji} {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 4: Stadium, City & Altitude */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Estadio y Sede del Encuentro:</span>
              </label>
              <button
                type="button"
                onClick={handleAutofillStadiumFromHomeClub}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline"
              >
                Usar estadio del local
              </button>
            </div>
            <input
              type="text"
              value={stadiumName}
              onChange={(e) => setStadiumName(e.target.value)}
              placeholder="Ej: Estadio Hernando Siles - La Paz"
              className="w-full bg-[#060a14] border border-slate-750 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Mountain className="w-3.5 h-3.5 text-blue-400" />
              <span>Altitud (m s.n.m.):</span>
            </label>
            <input
              type="number"
              value={altitudeMeters}
              onChange={(e) => setAltitudeMeters(Number(e.target.value))}
              placeholder="3637"
              className="w-full bg-[#060a14] border border-slate-750 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Row 5: Official Announcement Banner */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Comunicado Oficial al Hincha (Aparece como banner superior en vivo):</span>
          </label>
          <input
            type="text"
            value={officialAnnouncement}
            onChange={(e) => setOfficialAnnouncement(e.target.value)}
            placeholder="Ej: Transmisión Oficial en HD para toda Bolivia por GolBolivia TV."
            className="w-full bg-[#060a14] border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none"
          />
        </div>

        {/* Row 6: Match Period & Live status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Período de Juego:
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['1T', 'Descanso', '2T', 'Finalizado'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    period === p
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-950/40'
                      : 'bg-[#060a14] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Estado de la Emisión:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsLive(true)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isLive
                    ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-md shadow-red-950/40'
                    : 'bg-[#060a14] text-slate-500 hover:text-slate-300 border border-slate-800'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
                <span>EN VIVO (AIR)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLive(false)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  !isLive
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'bg-[#060a14] text-slate-500 hover:text-slate-300 border border-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>PAUSADO / OFF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button & Feedback */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 transition-all cursor-pointer active:scale-98"
          >
            <Save className="w-4 h-4 text-black" />
            <span>
              {isSaving ? 'GUARDANDO EN SERVIDOR...' : 'GUARDAR Y APLICAR CAMBIOS EN LA PÁGINA PRINCIPAL'}
            </span>
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-xl text-xs text-emerald-200 flex items-center gap-2 shadow-lg animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>¡Datos guardados con éxito en el servidor!</strong> El título, torneo, clubes, estadio y altitud se han actualizado en tiempo real para todos los hinchas conectados.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-950/90 border border-red-500 rounded-xl text-xs text-red-200 flex items-center gap-2 shadow-lg animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>
    </div>
  );
};
