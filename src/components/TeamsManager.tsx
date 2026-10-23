import { groupClubsByLeague } from '../data/bolivianFootballData';
import { FOOTBALL_LEAGUES, clubLeague, clubNameKey } from '../data/footballLeagues';
import { normalizeCrestUrl } from '../utils/clubCrests';
import { ClubCrest } from './ClubCrest';
import React, { useState } from 'react';
import { Club } from '../types/football';
import { SPANISH_CLUBS, ENGLISH_CLUBS } from '../data/bolivianFootballData';
import { Shield, Plus, Edit2, Trash2, CheckCircle2, AlertTriangle, X, Search, Sparkles, MapPin, Compass, Globe2, Download } from 'lucide-react';

interface TeamsManagerProps {
  clubs: Record<string, Club>;
  onSaveClub: (club: Club) => Promise<any>;
  onDeleteClub: (clubId: string) => Promise<any>;
  currentHomeClubId?: string;
  currentAwayClubId?: string;
}

const EMOJI_OPTIONS = ['⚽', '⚡', '🐯', '🦅', '✈️', '🛢️', '🔴', '🎸', '🏁', '🦁', '🛡️', '🐂', '👑', '🐺', '🌟', '🏆', '🔥', '⚔️', '🔵🔴', '⚪🔴', '🩵', '⚫⚪'];

export const TeamsManager: React.FC<TeamsManagerProps> = ({
  clubs,
  onSaveClub,
  onDeleteClub,
  currentHomeClubId = '',
  currentAwayClubId = '',
}) => {
  const [importLeague, setImportLeague] = useState('arg.1');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editingClub, setEditingClub] = useState<Partial<Club> | null>(null);
  const [isNewClub, setIsNewClub] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null);

  const clubList = Object.values(clubs).sort((a, b) => clubLeague(a).localeCompare(clubLeague(b), 'es') || a.name.localeCompare(b.name, 'es'));
  const filteredClubs = clubList.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.stadium.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.league && c.league.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    return selectedLeague === 'all' || clubLeague(c) === selectedLeague;
  });

  const handleBatchImport = async (type: 'espana' | 'inglaterra') => {
    const source = type === 'espana' ? SPANISH_CLUBS : ENGLISH_CLUBS;
    const leagueName = type === 'espana' ? 'LaLiga (España)' : 'Premier League (Inglaterra)';
    setIsSaving(true);
    let count = 0;
    try {
      for (const club of Object.values(source)) {
        await onSaveClub(club);
        count++;
      }
      setFeedback({
        message: `¡Se sincronizaron ${count} equipos de ${leagueName} en el marcador y base de datos con éxito!`,
        type: 'success',
      });
      setSelectedLeague(type === 'espana' ? 'España (LaLiga EA Sports)' : 'Inglaterra (Premier League)');
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Error al importar equipos', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const importOfficialTeams = async () => {
    setIsSaving(true); setFeedback(null);
    try {
      const response = await fetch(`/api/football-api/teams?league=${encodeURIComponent(importLeague)}&current=1`, { signal: AbortSignal.timeout(12000) });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.teams)) throw new Error(data.error || 'No se pudo consultar ESPN.');
      let added = 0;
      for (const team of data.teams) {
        if (!/^\d+$/.test(team.id) || !team.names?.[0]) continue;
        const existing = Object.values(clubs).find(c => c.id === `espn_${team.id}` || team.names.some((name: string) => clubNameKey(name) === clubNameKey(c.name) || clubNameKey(name) === clubNameKey(c.shortName)));
        const league = FOOTBALL_LEAGUES[importLeague];
        const domestic = league.includes(' (');
        await onSaveClub({ ...(existing || { id: `espn_${team.id}`, name: team.names[0], shortName: team.names[1] || team.names[0], city: '', stadium: '', altitudeMeters: 0, primaryColor: '#334155', secondaryColor: '#ffffff', textColor: '#ffffff', badgeEmoji: '' }), logoUrl: existing?.logoUrl || team.logoUrl || '', league: domestic ? league : existing?.league || `Internacionales · ${league}`, country: domestic ? league.split(' (')[0] : existing?.country || '' });
        added++;
      }
      setFeedback({ message: `${added} equipos actualizados desde ESPN. Se conservaron los equipos guardados de otras temporadas.`, type: 'success' });
    } catch (error) { setFeedback({ message: error instanceof Error ? error.message : 'Error al actualizar equipos.', type: 'error' }); }
    finally { setIsSaving(false); }
  };

  const handleOpenNewClub = () => {
    setIsNewClub(true);
    setEditingClub({
      id: '',
      name: '',
      shortName: '',
      city: 'Madrid',
      primaryColor: '#0284c7',
      secondaryColor: '#ffffff',
      textColor: '#ffffff',
      badgeEmoji: '⚽',
      stadium: 'Estadio Departamental',
      altitudeMeters: 600,
      league: 'España (LaLiga EA Sports)',
      country: 'España',
    });
    setIsEditing(true);
  };

  const handleOpenEditClub = (club: Club) => {
    setIsNewClub(false);
    setEditingClub({ ...club });
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClub) return;

    const cleanName = editingClub.name?.trim() || '';
    const cleanShort = editingClub.shortName?.trim() || '';
    const cleanStadium = editingClub.stadium?.trim() || 'Estadio Departamental';
    const alt = Number(editingClub.altitudeMeters);

    if (cleanName.length < 2 || cleanName.length > 60) {
      setFeedback({ message: 'El nombre del club debe tener entre 2 y 60 caracteres.', type: 'error' });
      return;
    }
    if (cleanShort.length < 2 || cleanShort.length > 30) {
      setFeedback({ message: 'El nombre corto debe tener entre 2 y 30 caracteres.', type: 'error' });
      return;
    }
    if (isNaN(alt) || alt < 0 || alt > 6000) {
      setFeedback({ message: 'La altitud debe ser un valor válido entre 0 y 6.000 m s.n.m.', type: 'error' });
      return;
    }

    // Generate clean ID if new
    let id = editingClub.id?.trim().toLowerCase() || '';
    if (isNewClub || !id) {
      id = cleanShort
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 32);
    }

    const clubIdRegex = /^[a-z0-9_-]{2,32}$/;
    if (!clubIdRegex.test(id)) {
      setFeedback({
        message: 'ID de club inválido. Debe contener entre 2 y 32 caracteres (solo minúsculas, números y guiones).',
        type: 'error',
      });
      return;
    }

    if (editingClub.logoUrl?.trim() && !normalizeCrestUrl(editingClub.logoUrl)) {
      setFeedback({ message: 'El escudo debe ser una URL HTTPS válida.', type: 'error' });
      return;
    }
    const payload: Club = {
      id,
      name: cleanName,
      shortName: cleanShort,
      city: editingClub.city?.trim().slice(0, 50) || '',
      primaryColor: editingClub.primaryColor?.trim() || '#0284c7',
      secondaryColor: editingClub.secondaryColor?.trim() || '#ffffff',
      textColor: editingClub.textColor?.trim() || '#ffffff',
      badgeEmoji: editingClub.badgeEmoji?.trim() || '⚽',
      logoUrl: normalizeCrestUrl(editingClub.logoUrl),
      stadium: cleanStadium.slice(0, 80),
      altitudeMeters: Math.max(0, Math.round(alt) || 0),
      league: editingClub.league?.trim() || 'Bolivia (División Profesional)',
      country: editingClub.country?.trim() || '',
    };

    setIsSaving(true);
    try {
      await onSaveClub(payload);
      setFeedback({
        message: `¡Equipo "${payload.name}" guardado exitosamente en Google Firebase Firestore y Servidor!`,
        type: 'success',
      });
      setIsEditing(false);
      setEditingClub(null);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Error al guardar equipo.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!clubToDelete) return;
    setIsSaving(true);
    try {
      await onDeleteClub(clubToDelete.id);
      setFeedback({
        message: `Equipo "${clubToDelete.name}" eliminado de la base de datos.`,
        type: 'success',
      });
      setClubToDelete(null);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Error al eliminar equipo.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[#0a1122] border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
              <span>Gestión de Equipos y Ligas</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-sans font-semibold">
                Multiliga Activa
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Personaliza escudos, colores y estadios de clubes de Bolivia, España (LaLiga) e Inglaterra (Premier League).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Botones de Carga Rápida de Ligas Internacionales */}
          <button
            type="button"
            onClick={() => handleBatchImport('espana')}
            disabled={isSaving}
            className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/70 border border-red-500/40 text-red-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Importar Real Madrid, Barcelona, Atlético, etc."
          >
            <span>🇪🇸</span>
            <span>+ Cargar LaLiga España</span>
          </button>

          <button
            type="button"
            onClick={() => handleBatchImport('inglaterra')}
            disabled={isSaving}
            className="px-3 py-2 rounded-xl bg-sky-950/60 hover:bg-sky-900/70 border border-sky-500/40 text-sky-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Importar Man. City, Arsenal, Liverpool, Man. United, etc."
          >
            <span>🏴󠁧󠁢󠁥󠁮󠁧󠁿</span>
            <span>+ Cargar Premier League</span>
          </button>

          <button
            onClick={handleOpenNewClub}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Equipo</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3">
        <label className="text-sm text-slate-300" htmlFor="official-teams-league">Actualizar equipos oficiales</label>
        <select id="official-teams-league" value={importLeague} onChange={e => setImportLeague(e.target.value)} className="bg-slate-900 text-white border border-slate-700 rounded-lg p-2 max-w-full">{Object.entries(FOOTBALL_LEAGUES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
        <button disabled={isSaving} onClick={importOfficialTeams} className="rounded-lg bg-sky-600 text-white px-3 py-2 text-sm disabled:opacity-50">{isSaving ? 'Actualizando…' : 'Consultar y guardar desde ESPN'}</button>
      </div>

      {/* Selector de Pestañas por Liga */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedLeague('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedLeague === 'all'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-950/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span>Todos los Equipos</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40">
            {clubList.length}
          </span>
        </button>

        {Object.entries(groupClubsByLeague(clubs)).map(([league, teams]) => <button key={league} onClick={() => setSelectedLeague(league)} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border ${selectedLeague === league ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-900 text-slate-300 border-slate-700'}`}>{league} ({teams.length})</button>)}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-red-950/80 border-red-500/50 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por equipo, ciudad o estadio..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Total de equipos: <strong className="text-white">{clubList.length}</strong> (Mostrando {filteredClubs.length})
        </div>
      </div>

      {/* Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClubs.map((club) => {
          const isHomePlaying = club.id === currentHomeClubId;
          const isAwayPlaying = club.id === currentAwayClubId;
          const isPlaying = isHomePlaying || isAwayPlaying;

          return (
            <div
              key={club.id}
              className={`bg-[#0d1527] border rounded-2xl p-4 transition-all relative overflow-hidden flex flex-col justify-between ${
                isPlaying
                  ? 'border-amber-500/60 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/40'
                  : 'border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Active Match Badge */}
              {isPlaying && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>{isHomePlaying ? 'EN VIVO: LOCAL' : 'EN VIVO: VISITANTE'}</span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-3">
                  {/* Emoji / Badge with Club Colors */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/20 shrink-0"
                    style={{ backgroundColor: club.primaryColor, color: club.textColor }}
                  >
                    <ClubCrest club={club} className="w-10 h-10" />
                  </div>

                  <div className="min-w-0 pr-16">
                    <h3 className="font-bold text-sm text-white truncate font-display">
                      {club.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">{club.shortName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {club.city}
                      </span>
                      {clubLeague(club) && (
                        <>
                          <span>•</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium border border-slate-700">
                            {clubLeague(club)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-400 bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/60 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Estadio:</span>
                    <span className="text-slate-300 font-medium truncate max-w-[170px]" title={club.stadium}>
                      {club.stadium}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Altitud:</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {club.altitudeMeters} m s.n.m.
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Colores:</span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                        style={{ backgroundColor: club.primaryColor }}
                        title={`Color Primario: ${club.primaryColor}`}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                        style={{ backgroundColor: club.secondaryColor }}
                        title={`Color Secundario: ${club.secondaryColor}`}
                      />
                      <span className="font-mono text-[10px] text-slate-500">{club.primaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => handleOpenEditClub(club)}
                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Editar</span>
                </button>

                <button
                  onClick={() => setClubToDelete(club)}
                  disabled={isPlaying}
                  className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold flex items-center justify-center gap-1 border border-red-900/50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title={isPlaying ? 'No se puede eliminar un equipo que está jugando en el partido activo' : 'Eliminar equipo'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Eliminar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: EDIT / CREATE CLUB */}
      {isEditing && editingClub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b1224] border border-slate-700 rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    {isNewClub ? 'Agregar Nuevo Equipo' : `Editar ${editingClub.name}`}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Se guardará en Google Firebase Firestore y servidor backend
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nombre Oficial del Club</label>
                  <input
                    type="text"
                    required
                    value={editingClub.name || ''}
                    onChange={(e) => setEditingClub({ ...editingClub, name: e.target.value })}
                    placeholder="Ej. San Antonio Bulo Bulo"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nombre Corto / Apodo</label>
                  <input
                    type="text"
                    required
                    value={editingClub.shortName || ''}
                    onChange={(e) => setEditingClub({ ...editingClub, shortName: e.target.value })}
                    placeholder="Ej. San Antonio"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ciudad o Sede</label>
                  <input
                    type="text"
                    required
                    value={editingClub.city || ''}
                    onChange={(e) => setEditingClub({ ...editingClub, city: e.target.value })}
                    placeholder="Ej. Entre Ríos / Cochabamba"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Identificador Clave (ID)</label>
                  <input
                    type="text"
                    value={editingClub.id || ''}
                    onChange={(e) => setEditingClub({ ...editingClub, id: e.target.value })}
                    disabled={!isNewClub}
                    placeholder="ej. san_antonio (autogenerado)"
                    className="w-full px-3 py-2 bg-slate-900/70 border border-slate-800 rounded-xl text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 disabled:opacity-60 font-mono"
                  />
                </div>
              </div>

              {/* League & Country Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Liga o Competición</label>
                  <select
                    value={editingClub.league || 'España (LaLiga EA Sports)'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const country = val.includes(' (') ? val.split(' (')[0] : '';
                      const alt = editingClub.altitudeMeters || 0;
                      setEditingClub({
                        ...editingClub,
                        league: val,
                        country,
                        altitudeMeters: isNewClub ? alt : (editingClub.altitudeMeters || alt),
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    {Array.from(new Set([...Object.values(FOOTBALL_LEAGUES).filter(name => name.includes(' (')), 'Internacionales · UEFA Champions League', 'Internacionales · Copa CONMEBOL Libertadores', 'Internacionales · Copa CONMEBOL Sudamericana', editingClub.league].filter(Boolean))).map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">País</label>
                  <input
                    type="text"
                    value={editingClub.country || ''}
                    onChange={(e) => setEditingClub({ ...editingClub, country: e.target.value })}
                    placeholder="Ej. España, Inglaterra, Bolivia"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Stadium & Altitude */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estadio Principal</label>
                  <input
                    type="text"
                    required
                    value={editingClub.stadium || ''}
                    onChange={(e) => setEditingClub({ ...editingClub, stadium: e.target.value })}
                    placeholder="Ej. Estadio Dr. Carlos Villegas"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Altitud (metros sobre el nivel del mar)</label>
                  <input
                    type="number"
                    required
                    value={editingClub.altitudeMeters || 2500}
                    onChange={(e) => setEditingClub({ ...editingClub, altitudeMeters: Number(e.target.value) })}
                    placeholder="Ej. 250"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Colors and Emoji */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Color Primario</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingClub.primaryColor || '#0284c7'}
                      onChange={(e) => setEditingClub({ ...editingClub, primaryColor: e.target.value })}
                      className="w-9 h-9 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingClub.primaryColor || '#0284c7'}
                      onChange={(e) => setEditingClub({ ...editingClub, primaryColor: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Color Secundario</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingClub.secondaryColor || '#ffffff'}
                      onChange={(e) => setEditingClub({ ...editingClub, secondaryColor: e.target.value })}
                      className="w-9 h-9 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingClub.secondaryColor || '#ffffff'}
                      onChange={(e) => setEditingClub({ ...editingClub, secondaryColor: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="club-crest-url" className="block text-slate-300 font-semibold mb-1">Imagen del escudo (URL HTTPS)</label>
                  <input id="club-crest-url" type="text" value={editingClub.logoUrl || ''} onChange={e => setEditingClub({ ...editingClub, logoUrl: e.target.value })}
                    placeholder="https://.../escudo.png" className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white" />
                  <p className="mt-1 text-[11px] text-slate-400">Si lo dejas vacío, se usará el escudo disponible del catálogo o las iniciales del equipo.</p>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="pt-2">
                <span className="block text-slate-400 font-semibold text-[11px] mb-1.5">
                  Vista Previa del Escudo y Marcador:
                </span>
                <div
                  className="p-3.5 rounded-xl border border-white/20 flex items-center justify-between"
                  style={{
                    backgroundColor: editingClub.primaryColor || '#0284c7',
                    color: editingClub.textColor || '#ffffff',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl"><ClubCrest club={editingClub} className="w-10 h-10" /></span>
                    <div>
                      <div className="font-black text-sm">{editingClub.name || 'Nombre del Equipo'}</div>
                      <div className="text-[11px] opacity-90">{editingClub.stadium || 'Estadio'} · {editingClub.city || 'Ciudad'}</div>
                    </div>
                  </div>
                  <div className="font-mono font-black text-xl px-3 py-1 bg-black/40 rounded-lg">
                    1
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Equipo en Firebase'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {clubToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1224] border border-red-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">¿Eliminar este equipo?</h3>
                <span className="text-xs text-slate-400">Esta acción removerá el club de la lista global.</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              Estás a punto de eliminar a <strong className="text-white">{clubToDelete.name}</strong> ({clubToDelete.shortName}). Se eliminará tanto de Google Firebase como del servidor.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setClubToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isSaving ? 'Eliminando...' : 'Sí, Eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
