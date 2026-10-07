import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Firestore,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { StreamSettings, MatchEvent, ChatMessage, LivePoll, Club, LiveEvent, StreamProvider } from '../types/football';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore with custom databaseId
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = dbInstance;
export const firebaseApp = app;
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;

/**
 * VALIDATION & BOUNDS LIMITS FOR FIRESTORE SYNCHRONIZATION
 */
export const CLUB_ID_REGEX = /^[a-z0-9_-]{2,32}$/;

export function sanitizeClubId(raw?: string): string {
  if (!raw) return '';
  return raw.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
}

export function validateScore(score: any, defaultValue = 0): number {
  if (typeof score !== 'number' || isNaN(score)) {
    const parsed = parseInt(String(score), 10);
    if (isNaN(parsed)) return defaultValue;
    return Math.max(0, Math.min(50, parsed));
  }
  return Math.max(0, Math.min(50, Math.round(score)));
}

export function validateMinute(minute: any, defaultValue = 0): number {
  if (typeof minute !== 'number' || isNaN(minute)) {
    const parsed = parseInt(String(minute), 10);
    if (isNaN(parsed)) return defaultValue;
    return Math.max(0, Math.min(130, parsed));
  }
  return Math.max(0, Math.min(130, Math.round(minute)));
}

/**
 * 1. STREAM SETTINGS & M3U8 SIGNALS
 */
export async function saveStreamSettingsToFirebase(settings: Partial<StreamSettings>): Promise<void> {
  const ref = doc(db, 'config', 'stream_settings');
  const payload: any = {
    ...settings,
    updatedAt: Date.now(),
  };
  if (settings.homeClubId) payload.homeClubId = sanitizeClubId(settings.homeClubId);
  if (settings.awayClubId) payload.awayClubId = sanitizeClubId(settings.awayClubId);
  if (settings.title) payload.title = settings.title.trim().slice(0, 120);
  if (settings.tournamentName) payload.tournamentName = settings.tournamentName.trim().slice(0, 80);
  if (settings.stadiumName) payload.stadiumName = settings.stadiumName.trim().slice(0, 80);
  if (settings.altitudeMeters !== undefined) {
    payload.altitudeMeters = Math.max(0, Math.min(6000, Number(settings.altitudeMeters) || 0));
  }
  await setDoc(ref, payload, { merge: true });
}

export async function getStreamSettingsFromFirebase(): Promise<Partial<StreamSettings> | null> {
  try {
    const ref = doc(db, 'config', 'stream_settings');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as Partial<StreamSettings>;
    }
  } catch (err) {
    console.warn('[Firebase] Error al leer configuración de transmisión:', err);
  }
  return null;
}

export function subscribeStreamSettingsFirebase(
  callback: (settings: Partial<StreamSettings>) => void
): () => void {
  try {
    const ref = doc(db, 'config', 'stream_settings');
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as Partial<StreamSettings>);
        }
      },
      (error) => {
        console.warn('[Firebase] Error en snapshot de transmisión:', error);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * 2. SCOREBOARD & MATCH TIME
 */
export async function saveScoreboardToFirebase(data: {
  homeScore?: number;
  awayScore?: number;
  matchMinute?: number;
  period?: string;
}): Promise<void> {
  const ref = doc(db, 'match', 'scoreboard');
  const sanitized: any = {
    updatedAt: Date.now(),
  };
  if (data.homeScore !== undefined) {
    sanitized.homeScore = validateScore(data.homeScore);
  }
  if (data.awayScore !== undefined) {
    sanitized.awayScore = validateScore(data.awayScore);
  }
  if (data.matchMinute !== undefined) {
    sanitized.matchMinute = validateMinute(data.matchMinute);
  }
  if (data.period && ['1T', 'Descanso', '2T', 'Tiempo Extra', 'Finalizado'].includes(data.period)) {
    sanitized.period = data.period;
  }
  await setDoc(ref, sanitized, { merge: true });
}

export function subscribeScoreboardFirebase(
  callback: (data: { homeScore: number; awayScore: number; matchMinute: number; period: string }) => void
): () => void {
  try {
    const ref = doc(db, 'match', 'scoreboard');
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as any);
        }
      },
      (error) => {
        console.warn('[Firebase] Error en snapshot de marcador:', error);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * 3. MATCH EVENTS TIMELINE
 */
export async function addMatchEventToFirebase(event: Omit<MatchEvent, 'id'> & { id?: string }): Promise<string> {
  const colRef = collection(db, 'events');
  const eventId = event.id || `evt_${Date.now()}`;
  const ref = doc(db, 'events', eventId);
  await setDoc(ref, {
    ...event,
    id: eventId,
    createdAt: Date.now(),
  });
  return eventId;
}

export function subscribeMatchEventsFirebase(
  callback: (events: MatchEvent[]) => void
): () => void {
  try {
    const colRef = collection(db, 'events');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snap) => {
        const events: MatchEvent[] = [];
        snap.forEach((d) => events.push(d.data() as MatchEvent));
        callback(events);
      },
      (error) => {
        console.warn('[Firebase] Error en snapshot de eventos:', error);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * 4. LIVE CHAT
 */
export async function sendChatMessageToFirebase(message: Omit<ChatMessage, 'id'>): Promise<string> {
  const colRef = collection(db, 'chat');
  const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ref = doc(db, 'chat', id);
  await setDoc(ref, {
    ...message,
    id,
    createdAt: Date.now(),
  });
  return id;
}

export function subscribeChatMessagesFirebase(
  callback: (messages: ChatMessage[]) => void
): () => void {
  try {
    const colRef = collection(db, 'chat');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(60));
    return onSnapshot(
      q,
      (snap) => {
        const list: ChatMessage[] = [];
        snap.forEach((d) => list.push(d.data() as ChatMessage));
        // Sort chronologically for chat
        list.reverse();
        callback(list);
      },
      (error) => {
        console.warn('[Firebase] Error en snapshot de chat:', error);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * 5. LIVE POLL
 */
export async function savePollToFirebase(poll: LivePoll): Promise<void> {
  const ref = doc(db, 'polls', 'current');
  await setDoc(ref, {
    ...poll,
    updatedAt: Date.now(),
  });
}

export function subscribePollFirebase(callback: (poll: LivePoll) => void): () => void {
  try {
    const ref = doc(db, 'polls', 'current');
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as LivePoll);
        }
      },
      (error) => {
        console.warn('[Firebase] Error en snapshot de encuesta:', error);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * 6. CONFIRMATION LOGS & AUDIT ("para la confirmación y guardar los datos")
 */
export interface ConfirmationLog {
  id?: string;
  action: string;
  operator: string;
  role: string;
  details: string;
  payload?: any;
  timestamp: number;
}

export async function logConfirmationToFirebase(log: ConfirmationLog): Promise<string> {
  const id = `conf_${Date.now()}`;
  const ref = doc(db, 'confirmations', id);
  await setDoc(ref, {
    ...log,
    id,
    timestamp: log.timestamp || Date.now(),
  });
  return id;
}

export function subscribeConfirmationLogsFirebase(
  callback: (logs: ConfirmationLog[]) => void
): () => void {
  try {
    const colRef = collection(db, 'confirmations');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(20));
    return onSnapshot(
      q,
      (snap) => {
        const logs: ConfirmationLog[] = [];
        snap.forEach((d) => logs.push(d.data() as ConfirmationLog));
        callback(logs);
      },
      (error) => {
        console.warn('[Firebase] Error en snapshot de confirmaciones:', error);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * 7. UPDATE & DELETE OPERATIONS (CLOUDFIRESTORE CRUD)
 */
export async function updateMatchEventInFirebase(
  eventId: string,
  updates: Partial<MatchEvent>
): Promise<void> {
  const ref = doc(db, 'events', eventId);
  await setDoc(
    ref,
    {
      ...updates,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

export async function deleteMatchEventFromFirebase(eventId: string): Promise<void> {
  const ref = doc(db, 'events', eventId);
  await deleteDoc(ref);
}

export async function deleteChatMessageFromFirebase(messageId: string): Promise<void> {
  const ref = doc(db, 'chat', messageId);
  await deleteDoc(ref);
}

export async function deleteConfirmationLogFromFirebase(confirmId: string): Promise<void> {
  const ref = doc(db, 'confirmations', confirmId);
  await deleteDoc(ref);
}

export async function deletePollFromFirebase(): Promise<void> {
  const ref = doc(db, 'polls', 'current');
  await deleteDoc(ref);
}

export async function resetStreamSettingsInFirebase(): Promise<void> {
  const ref = doc(db, 'config', 'stream_settings');
  await setDoc(ref, {
    customVideoUrl: '',
    backupVideoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    activeStreamSource: 'obs',
    backupChannelName: 'GolBolivia 24/7 Señal HD',
    autoFailoverEnabled: true,
    isLive: true,
    broadcastMode: 'obs_custom',
    title: 'Bolívar vs The Strongest — Fecha 22 Torneo Clausura',
    updatedAt: Date.now(),
  });
}

/**
 * 8. CUSTOMIZABLE CLUBS & TEAMS MANAGEMENT (CLOUDFIRESTORE CRUD)
 */
export async function saveClubsToFirebase(clubs: Record<string, Club>): Promise<void> {
  const ref = doc(db, 'config', 'clubs');
  await setDoc(ref, {
    clubs,
    updatedAt: Date.now(),
  });
}

export async function getClubsFromFirebase(): Promise<Record<string, Club> | null> {
  try {
    const ref = doc(db, 'config', 'clubs');
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data()?.clubs) {
      return snap.data()?.clubs as Record<string, Club>;
    }
  } catch (err) {
    console.warn('[Firebase] Error al cargar equipos desde Firestore:', err);
  }
  return null;
}

export function subscribeClubsFirebase(
  callback: (clubs: Record<string, Club>) => void
): () => void {
  try {
    const ref = doc(db, 'config', 'clubs');
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists() && snap.data()?.clubs) {
          callback(snap.data()?.clubs as Record<string, Club>);
        }
      },
      (error) => {
        console.warn('[Firebase] Error en snapshot de clubes:', error);
      }
    );
  } catch {
    return () => {};
  }
}

export async function saveSingleClubToFirebase(club: Club): Promise<void> {
  const ref = doc(db, 'config', 'clubs');
  const snap = await getDoc(ref);
  const currentClubs = snap.exists() && snap.data()?.clubs ? snap.data().clubs : {};
  currentClubs[club.id] = club;
  await setDoc(ref, {
    clubs: currentClubs,
    updatedAt: Date.now(),
  });
}

export async function deleteClubFromFirebase(clubId: string): Promise<void> {
  const ref = doc(db, 'config', 'clubs');
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data()?.clubs) {
    const currentClubs = { ...snap.data().clubs };
    delete currentClubs[clubId];
    await setDoc(ref, {
      clubs: currentClubs,
      updatedAt: Date.now(),
    });
  }
}

/**
 * 9. PURGE NON-REAL / TEST CONFIRMATIONS
 */
export async function purgeTestConfirmations(): Promise<void> {
  try {
    const colRef = collection(db, 'confirmations');
    const q = query(colRef);
    const snap = await getDoc(doc(db, 'confirmations', 'dummy_never_exists')).catch(() => null);
    // Delete documents that contain test actions
    // Use onSnapshot or query to find docs
    const querySnapshot = await import('firebase/firestore').then(m => m.getDocs(colRef));
    for (const d of querySnapshot.docs) {
      const data = d.data();
      if (
        data.action?.includes('TEST') ||
        data.details?.includes('Prueba') ||
        data.operator?.includes('Test')
      ) {
        await deleteDoc(d.ref);
      }
    }
  } catch (err) {
    console.warn('[Firebase] Error al purgar confirmaciones de prueba:', err);
  }
}

/**
 * 10. MULTI-PROVIDER LIVE EVENTS (Paso 9 & 10: Cloudflare, YouTube, Kick)
 */
export const DEFAULT_LIVE_EVENTS: LiveEvent[] = [
  {
    id: 'partido-001',
    title: 'Bolívar vs The Strongest',
    homeTeam: 'bolivar',
    awayTeam: 'strongest',
    isLive: true,
    primaryProvider: 'cloudflare',
    cloudflare: {
      liveInputId: 'fc815c43232145e69e7e59cba627d3fa',
      playbackUrl: 'https://renewable-wolf-chemical-includes.trycloudflare.com/live/partido/index.m3u8',
    },
    youtube: {
      videoId: 'jfKfPfyJRdk',
    },
    kick: {
      channel: 'golbolivia',
    },
    fallbackOrder: ['cloudflare', 'youtube', 'kick'],
    tournamentName: 'Liga Tigo División Profesional - Torneo Clausura',
    stadiumName: 'Estadio Olímpico Hernando Siles - La Paz',
    period: '2T',
    homeScore: 2,
    awayScore: 1,
    matchMinute: 75,
  },
  {
    id: 'partido-002',
    title: 'Blooming vs Oriente',
    homeTeam: 'blooming',
    awayTeam: 'oriente',
    isLive: true,
    primaryProvider: 'youtube',
    youtube: {
      videoId: '5qap5aO4i9A',
    },
    kick: {
      channel: 'golbolivia',
    },
    fallbackOrder: ['youtube', 'kick'],
    tournamentName: 'Clásico Cruceño - Fecha 22',
    stadiumName: 'Estadio Ramón Tahuichi Aguilera - Santa Cruz',
    period: '1T',
    homeScore: 1,
    awayScore: 1,
    matchMinute: 38,
  },
];

export async function saveLiveEventToFirebase(event: LiveEvent): Promise<void> {
  const safeId = sanitizeClubId(event.id) || 'partido-001';
  const ref = doc(db, 'liveEvents', safeId);
  const home = sanitizeClubId(event.homeTeam) || 'bolivar';
  const away = sanitizeClubId(event.awayTeam) || 'strongest';

  // Guarantee no secret keys ever get stored or transmitted here
  const safePayload: LiveEvent = {
    id: safeId,
    title: (event.title || 'Partido en Vivo').trim().slice(0, 120),
    homeTeam: home,
    awayTeam: away === home ? `${away}_alt` : away,
    isLive: Boolean(event.isLive),
    primaryProvider: event.primaryProvider,
    cloudflare: event.cloudflare ? {
      liveInputId: event.cloudflare.liveInputId,
      playbackUrl: event.cloudflare.playbackUrl,
    } : undefined,
    youtube: event.youtube ? {
      videoId: event.youtube.videoId,
    } : undefined,
    kick: event.kick ? {
      channel: event.kick.channel,
    } : undefined,
    fallbackOrder: event.fallbackOrder,
    tournamentName: event.tournamentName ? event.tournamentName.trim().slice(0, 80) : undefined,
    stadiumName: event.stadiumName ? event.stadiumName.trim().slice(0, 80) : undefined,
    period: event.period,
    homeScore: event.homeScore !== undefined ? validateScore(event.homeScore) : undefined,
    awayScore: event.awayScore !== undefined ? validateScore(event.awayScore) : undefined,
    matchMinute: event.matchMinute !== undefined ? validateMinute(event.matchMinute) : undefined,
  };
  await setDoc(ref, { ...safePayload, updatedAt: Date.now() }, { merge: true });
}

export async function getLiveEventsFromFirebase(): Promise<LiveEvent[]> {
  try {
    const colRef = collection(db, 'liveEvents');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list: LiveEvent[] = [];
      snap.forEach((d) => list.push(d.data() as LiveEvent));
      return list;
    }
  } catch (err) {
    console.warn('[Firebase] Error al leer liveEvents:', err);
  }
  return DEFAULT_LIVE_EVENTS;
}

export function subscribeLiveEventsFirebase(
  callback: (events: LiveEvent[]) => void
): () => void {
  try {
    const colRef = collection(db, 'liveEvents');
    return onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          const list: LiveEvent[] = [];
          snap.forEach((d) => list.push(d.data() as LiveEvent));
          callback(list);
        }
      },
      (err) => {
        console.warn('[Firebase] Error en snapshot de liveEvents:', err);
      }
    );
  } catch {
    return () => {};
  }
}

export async function deleteLiveEventFromFirebase(eventId: string): Promise<void> {
  try {
    const ref = doc(db, 'liveEvents', eventId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('[Firebase] Error al borrar liveEvent:', err);
  }
}

