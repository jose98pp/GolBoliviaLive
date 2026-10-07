import React, { useState, useEffect, useRef } from 'react';
import { LiveEvent, StreamProvider } from '../types/football';
import { BOLIVIAN_CLUBS } from '../data/bolivianFootballData';
import { useClubs } from '../hooks/useClubs';
import { apiClient } from '../services/apiClient';
import { DEFAULT_LIVE_EVENTS, sanitizeClubId, validateScore, validateMinute, CLUB_ID_REGEX } from '../services/firebase';
import {
  Zap,
  Tv,
  Radio,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowRight,
  Flame,
  AlertCircle,
} from 'lucide-react';

export interface LiveEventsManagerProps {
  onEventSelected?: (event: LiveEvent) => void;
  activeEventId?: string;
}

export const LiveEventsManager: React.FC<LiveEventsManagerProps> = ({
  onEventSelected,
  activeEventId,
}) => {
  const { clubs } = useClubs();
  const [events, setEvents] = useState<LiveEvent[]>(() => {
    try {
      const saved = localStorage.getItem('golbolivia_live_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_LIVE_EVENTS;
  });
  const [selectedId, setSelectedId] = useState<string>(activeEventId || 'partido-001');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form edit state for currently selected event
  const currentEvent = events.find((e) => e.id === selectedId) || events[0] || DEFAULT_LIVE_EVENTS[0];

  const [formData, setFormData] = useState<LiveEvent>({ ...currentEvent });
  const prevSelectedIdRef = useRef(selectedId);
  const isDirtyRef = useRef(false);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Sync selectedId when parent activeEventId prop changes
  useEffect(() => {
    if (activeEventId && activeEventId !== selectedId) {
      const match = events.find((e) => e.id === activeEventId);
      if (match) {
        setSelectedId(activeEventId);
        setFormData({ ...match });
        isDirtyRef.current = false;
        prevSelectedIdRef.current = activeEventId;
      }
    }
  }, [activeEventId]);

  // Sync formData when selected event changes, protecting user edits
  useEffect(() => {
    if (prevSelectedIdRef.current !== selectedId) {
      prevSelectedIdRef.current = selectedId;
      isDirtyRef.current = false;
      const found = events.find((e) => e.id === selectedId);
      if (found) {
        setFormData({ ...found });
      }
    } else if (!isDirtyRef.current) {
      const found = events.find((e) => e.id === selectedId);
      if (found) {
        setFormData((prev) => ({ ...found, ...prev }));
      }
    }
  }, [selectedId, events]);

  // Load and subscribe from Firebase & API with safe merge (never erase newly created matches)
  useEffect(() => {
    const mergeEvents = (incoming: LiveEvent[]) => {
      if (!incoming || !Array.isArray(incoming) || incoming.length === 0) return;
      setEvents((prev) => {
        const map = new Map<string, LiveEvent>();
        // 1. Preserve all existing local matches (including newly created ones)
        prev.forEach((e) => map.set(e.id, e));
        // 2. Merge incoming authoritative matches
        incoming.forEach((e) => {
          // If the match is currently being edited by user, protect local edits
          if (isDirtyRef.current && formDataRef.current && formDataRef.current.id === e.id) {
            map.set(e.id, formDataRef.current);
          } else {
            map.set(e.id, e);
          }
        });
        const merged = Array.from(map.values());
        try {
          localStorage.setItem('golbolivia_live_events', JSON.stringify(merged));
        } catch {}
        return merged;
      });
    };

    apiClient.getLiveEvents().then(mergeEvents).catch(() => {});
    const unsubscribe = apiClient.subscribeMultiLiveEvents(mergeEvents);

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSelectEvent = (id: string) => {
    // If previous match had unsaved edits, keep them in events state so they aren't lost
    if (isDirtyRef.current && formDataRef.current) {
      setEvents((prev) => {
        const updated = prev.map((e) => (e.id === formDataRef.current.id ? { ...formDataRef.current } : e));
        try { localStorage.setItem('golbolivia_live_events', JSON.stringify(updated)); } catch {}
        return updated;
      });
    }

    setSelectedId(id);
    const ev = events.find((e) => e.id === id);
    if (ev) {
      setFormData({ ...ev });
      isDirtyRef.current = false;
      if (onEventSelected) onEventSelected(ev);
    }
  };

  const handleCreateNewEvent = async () => {
    // Generate guaranteed unique, sequential match ID
    const existingNums = events
      .map((e) => {
        const m = e.id.match(/partido-(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : events.length + 1;
    const newId = `partido-${String(nextNum).padStart(3, '0')}`;

    const newEv: LiveEvent = {
      id: newId,
      title: `Nuevo Partido ${nextNum}`,
      homeTeam: 'bolivar',
      awayTeam: 'strongest',
      isLive: true,
      primaryProvider: 'cloudflare',
      cloudflare: {
        liveInputId: '',
        playbackUrl: '',
      },
      youtube: {
        videoId: '',
      },
      kick: {
        channel: '',
      },
      fallbackOrder: ['cloudflare', 'youtube', 'kick'],
      tournamentName: 'División Profesional de Bolivia',
      stadiumName: 'Estadio Olímpico Hernando Siles',
      period: '1T',
      homeScore: 0,
      awayScore: 0,
      matchMinute: 0,
    };

    // 1. Immediately add to local events & select it
    const updated = [...events, newEv];
    setEvents(updated);
    setSelectedId(newId);
    setFormData(newEv);
    isDirtyRef.current = false;
    prevSelectedIdRef.current = newId;

    // 2. Persist to localStorage immediately
    try {
      localStorage.setItem('golbolivia_live_events', JSON.stringify(updated));
    } catch {}

    // 3. Immediately notify parent (SecretLoginPage and App) of the newly created match
    if (onEventSelected) {
      onEventSelected(newEv);
    }

    setSaveSuccessMessage(`¡Partido "${newEv.title}" creado con éxito! Puedes configurar la señal y detalles.`);
    setTimeout(() => setSaveSuccessMessage(null), 4000);

    // 4. Save to backend and Firebase in background so it permanently exists
    try {
      await apiClient.saveLiveEvent(newEv);
    } catch (err) {
      console.warn('Error al persistir nuevo evento en backend:', err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (events.length <= 1) {
      alert('Debe existir al menos un partido configurado.');
      return;
    }
    if (!confirm(`¿Estás seguro de eliminar el partido "${formData.title}"?`)) return;

    await apiClient.deleteLiveEvent(id);
    const remaining = events.filter((e) => e.id !== id);
    setEvents(remaining);
    setSelectedId(remaining[0].id);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    const cleanTitle = (formData.title || '').trim();
    const cleanHome = sanitizeClubId(formData.homeTeam);
    const cleanAway = sanitizeClubId(formData.awayTeam);
    const cleanTournament = (formData.tournamentName || '').trim();
    const cleanStadium = (formData.stadiumName || '').trim();

    // Type and range validations
    if (!cleanTitle || cleanTitle.length < 3 || cleanTitle.length > 120) {
      setErrorMessage('El título del partido debe tener entre 3 y 120 caracteres.');
      return;
    }

    if (!CLUB_ID_REGEX.test(cleanHome)) {
      setErrorMessage('ID del equipo local inválido. Debe contener entre 2 y 32 caracteres (solo minúsculas, números y guiones).');
      return;
    }

    if (!CLUB_ID_REGEX.test(cleanAway)) {
      setErrorMessage('ID del equipo visitante inválido. Debe contener entre 2 y 32 caracteres (solo minúsculas, números y guiones).');
      return;
    }

    if (cleanHome === cleanAway) {
      setErrorMessage('El equipo local y el equipo visitante no pueden ser el mismo club. Selecciona dos clubes distintos.');
      return;
    }

    const homeScoreVal = validateScore(formData.homeScore, 0);
    const awayScoreVal = validateScore(formData.awayScore, 0);
    const minuteVal = validateMinute(formData.matchMinute, 0);

    setIsSaving(true);

    try {
      // Ensure no stream keys ever exist
      const sanitized: LiveEvent = {
        id: formData.id,
        title: cleanTitle,
        homeTeam: cleanHome,
        awayTeam: cleanAway,
        isLive: formData.isLive,
        primaryProvider: formData.primaryProvider,
        cloudflare: {
          liveInputId: formData.cloudflare?.liveInputId?.trim() || '',
          playbackUrl: formData.cloudflare?.playbackUrl?.trim() || '',
        },
        youtube: {
          videoId: formData.youtube?.videoId?.trim() || '',
        },
        kick: {
          channel: formData.kick?.channel?.trim() || '',
        },
        fallbackOrder: formData.fallbackOrder || ['cloudflare', 'youtube', 'kick'],
        tournamentName: cleanTournament ? cleanTournament.slice(0, 80) : undefined,
        stadiumName: cleanStadium ? cleanStadium.slice(0, 80) : undefined,
        period: formData.period || '1T',
        homeScore: homeScoreVal,
        awayScore: awayScoreVal,
        matchMinute: minuteVal,
      };

      await apiClient.saveLiveEvent(sanitized);

      isDirtyRef.current = false;
      setEvents((prev) => {
        const idx = prev.findIndex((ev) => ev.id === sanitized.id);
        const updated = idx >= 0
          ? prev.map((ev) => (ev.id === sanitized.id ? sanitized : ev))
          : [...prev, sanitized];
        try {
          localStorage.setItem('golbolivia_live_events', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setSaveSuccessMessage(`¡Partido "${sanitized.title}" guardado y sincronizado con éxito!`);
      if (onEventSelected) onEventSelected(sanitized);

      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage('Error al guardar partido: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSaving(false);
    }
  };

  // Reordering fallback order helper
  const handleToggleFallbackItem = (provider: StreamProvider) => {
    const current = [...(formData.fallbackOrder || [])];
    const index = current.indexOf(provider);
    if (index === -1) {
      current.push(provider);
    } else if (current.length > 1) {
      // Rotate position
      const item = current.splice(index, 1)[0];
      current.push(item);
    }
    setFormData((prev) => ({ ...prev, fallbackOrder: current }));
  };

  return (
    <div className="bg-[#0b1222] border-2 border-sky-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6">
      {/* Header with security banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <h2 className="text-base sm:text-lg font-bold text-white font-display">
              Gestión Multi-Partido y Fuentes Universales (Cloudflare · YouTube · Kick)
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Transmisiones independientes con fuentes Cloudflare Stream, YouTube y Kick, con orden de respaldo automático.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateNewEvent}
          className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Partido</span>
        </button>
      </div>

      {/* Security notice (Paso 9: Y jamás pondría aquí Stream Keys) */}
      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-3.5 py-2 flex items-center gap-2.5 text-xs text-emerald-300">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Arquitectura Segura:</strong> Las Stream Keys NUNCA se guardan en el objeto LiveEvent ni viajan al navegador. Solo se manejan IDs públicos, URLs de reproducción HLS, Video IDs y canales de Kick.
        </span>
      </div>

      {/* Match selector pill list (Paso 10: partido-001 Bolívar vs The Strongest, partido-002 Blooming vs Oriente) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {events.map((evt) => {
          const isSelected = evt.id === selectedId;
          const providerIcon =
            evt.primaryProvider === 'cloudflare' ? '⚡' : evt.primaryProvider === 'youtube' ? '🔴' : '🟢';

          return (
            <button
              key={evt.id}
              type="button"
              onClick={() => handleSelectEvent(evt.id)}
              className={`px-3.5 py-2 rounded-xl border text-xs flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-sky-950/80 text-white border-sky-400 shadow-lg shadow-sky-950/50 ring-1 ring-sky-400 font-bold'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${evt.isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{evt.title}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 font-mono text-sky-300 uppercase">
                {providerIcon} {evt.primaryProvider}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Match Edit Form */}
      <form onSubmit={handleSave} className="space-y-5 bg-[#070b16] border border-slate-800 p-4 sm:p-5 rounded-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
              ID: {formData.id}
            </span>
            <span className="text-xs text-slate-400">· Editando configuración del partido</span>
          </div>

          {events.length > 1 && (
            <button
              type="button"
              onClick={() => handleDeleteEvent(formData.id)}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition"
              title="Eliminar partido"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>
          )}
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Row 1: Title and Live Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Título del Partido</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                isDirtyRef.current = true;
                setFormData({ ...formData, title: e.target.value });
              }}
              placeholder="Ej: Bolívar vs The Strongest - Clásico Paceño"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div className="sm:col-span-4 flex items-end">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 w-full">
              <input
                type="checkbox"
                checked={formData.isLive}
                onChange={(e) => {
                  isDirtyRef.current = true;
                  setFormData({ ...formData, isLive: e.target.checked });
                }}
                className="w-4 h-4 text-emerald-500 rounded bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-white">
                {formData.isLive ? '🔴 Transmisión EN VIVO' : '⚪ Transmisión Finalizada'}
              </span>
            </label>
          </div>
        </div>

        {/* Row 2: Teams & Tournament */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Equipo Local</label>
            <select
              value={formData.homeTeam}
              onChange={(e) => {
                isDirtyRef.current = true;
                setFormData({ ...formData, homeTeam: e.target.value });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              {Object.values(clubs).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.badgeEmoji} {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Equipo Visitante</label>
            <select
              value={formData.awayTeam}
              onChange={(e) => {
                isDirtyRef.current = true;
                setFormData({ ...formData, awayTeam: e.target.value });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              {Object.values(clubs).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.badgeEmoji} {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Torneo</label>
            <input
              type="text"
              value={formData.tournamentName || ''}
              onChange={(e) => {
                isDirtyRef.current = true;
                setFormData({ ...formData, tournamentName: e.target.value });
              }}
              placeholder="División Profesional de Bolivia"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Row 2.5: Marcador y Minuto en Vivo con Validación de Límites */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
          <span className="text-xs font-bold text-amber-400 block">Marcador y Minuto del Partido</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Goles Local (0 - 50)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={formData.homeScore ?? 0}
                onChange={(e) => {
                  isDirtyRef.current = true;
                  const v = parseInt(e.target.value, 10);
                  setFormData({ ...formData, homeScore: isNaN(v) ? 0 : Math.max(0, Math.min(50, v)) });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Goles Visitante (0 - 50)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={formData.awayScore ?? 0}
                onChange={(e) => {
                  isDirtyRef.current = true;
                  const v = parseInt(e.target.value, 10);
                  setFormData({ ...formData, awayScore: isNaN(v) ? 0 : Math.max(0, Math.min(50, v)) });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Minuto Oficial (0 - 130)</label>
              <input
                type="number"
                min={0}
                max={130}
                value={formData.matchMinute ?? 0}
                onChange={(e) => {
                  isDirtyRef.current = true;
                  const v = parseInt(e.target.value, 10);
                  setFormData({ ...formData, matchMinute: isNaN(v) ? 0 : Math.max(0, Math.min(130, v)) });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Tiempo / Período</label>
              <select
                value={formData.period || '1T'}
                onChange={(e) => {
                  isDirtyRef.current = true;
                  setFormData({ ...formData, period: e.target.value as any });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="1T">1T (Primer Tiempo)</option>
                <option value="Descanso">Descanso / Halftime</option>
                <option value="2T">2T (Segundo Tiempo)</option>
                <option value="Tiempo Extra">Tiempo Extra</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 3: Primary Provider Selection (Paso 9) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Proveedor Principal de Transmisión (primaryProvider)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Cloudflare */}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, primaryProvider: 'cloudflare' })}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                formData.primaryProvider === 'cloudflare'
                  ? 'bg-sky-950/80 border-sky-400 ring-1 ring-sky-400 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Cloudflare Stream</div>
                <div className="text-[11px] text-slate-400">Live Input ID o señal HLS .m3u8</div>
              </div>
            </button>

            {/* YouTube */}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, primaryProvider: 'youtube' })}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                formData.primaryProvider === 'youtube'
                  ? 'bg-red-950/80 border-red-400 ring-1 ring-red-400 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">YouTube Live</div>
                <div className="text-[11px] text-slate-400">Embebido con videoId oficial</div>
              </div>
            </button>

            {/* Kick (Paso 8) */}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, primaryProvider: 'kick' })}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                formData.primaryProvider === 'kick'
                  ? 'bg-emerald-950/80 border-emerald-400 ring-1 ring-emerald-400 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-5 h-5 text-[#53fc18] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Kick Streaming</div>
                <div className="text-[11px] text-slate-400">Player embebido con canal Kick</div>
              </div>
            </button>
          </div>
        </div>

        {/* Row 4: Provider Details Configuration */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <span>Configuración de Fuentes para este Partido</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cloudflare Details */}
            <div className="space-y-2 p-3 bg-slate-950/80 border border-sky-950 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span>Cloudflare Stream</span>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">Live Input ID</label>
                <input
                  type="text"
                  value={formData.cloudflare?.liveInputId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cloudflare: {
                        ...(formData.cloudflare || { playbackUrl: '' }),
                        liveInputId: e.target.value,
                      },
                    })
                  }
                  placeholder="fc815c43232145e69e7e59cba627d3fa"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">Playback URL (.m3u8)</label>
                <input
                  type="url"
                  value={formData.cloudflare?.playbackUrl || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cloudflare: {
                        ...(formData.cloudflare || { liveInputId: '' }),
                        playbackUrl: e.target.value,
                      },
                    })
                  }
                  placeholder="https://.../live/partido/index.m3u8"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* YouTube Details */}
            <div className="space-y-2 p-3 bg-slate-950/80 border border-red-950 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-300">
                <Tv className="w-3.5 h-3.5 text-red-400" />
                <span>YouTube Live</span>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">Video ID</label>
                <input
                  type="text"
                  value={formData.youtube?.videoId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      youtube: {
                        videoId: e.target.value,
                      },
                    })
                  }
                  placeholder="jfKfPfyJRdk o 5qap5aO4i9A"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                El ID de 11 caracteres que aparece al final de youtube.com/watch?v=XXXX
              </p>
            </div>

            {/* Kick Details (Paso 8) */}
            <div className="sm:col-span-2 space-y-2 p-3 bg-slate-950/80 border border-emerald-950 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#53fc18]">
                <Radio className="w-3.5 h-3.5 text-[#53fc18]" />
                <span>Kick Streaming</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] text-slate-400 mb-0.5">Canal / Usuario de Kick</label>
                  <div className="flex items-center">
                    <span className="bg-slate-800 border border-r-0 border-slate-700 rounded-l px-2.5 py-1.5 text-xs text-slate-400">
                      player.kick.com/
                    </span>
                    <input
                      type="text"
                      value={formData.kick?.channel || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          kick: {
                            channel: e.target.value,
                          },
                        })
                      }
                      placeholder="golbolivia"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-r px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Kick documenta oficialmente: <code className="text-[#53fc18] font-mono">&lt;iframe src=&quot;https://player.kick.com/TU_USUARIO&quot; allowfullscreen&gt;&lt;/iframe&gt;</code> con autoplay y muted.
              </p>
            </div>
          </div>
        </div>

        {/* Row 5: Fallback Order (fallbackOrder: StreamProvider[]) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Orden de Respaldo Automático (fallbackOrder) · Clic para rotar orden
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {(formData.fallbackOrder || ['cloudflare', 'youtube', 'kick']).map((provider, i) => (
              <button
                key={provider}
                type="button"
                onClick={() => handleToggleFallbackItem(provider)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-sky-400 text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                title="Clic para cambiar prioridad"
              >
                <span className="text-amber-400 font-bold">{i + 1}.</span>
                <span className="capitalize">{provider}</span>
                {i < (formData.fallbackOrder?.length || 0) - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-500 ml-1" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {saveSuccessMessage ? (
            <div className="text-xs text-emerald-300 flex items-center gap-1.5 font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{saveSuccessMessage}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">
              Todos los cambios se persisten de inmediato en Google Firebase Firestore y servidor.
            </span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-sky-400 to-sky-500 hover:from-sky-400 hover:to-sky-300 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-950/80 transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4 text-black" />}
            <span>{isSaving ? 'GUARDANDO...' : 'GUARDAR PARTIDO EN FIREBASE'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
