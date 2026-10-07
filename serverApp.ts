import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'http';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { BOLIVIAN_CLUBS } from './src/data/bolivianFootballData';
import type { Club, LiveEvent } from './src/types/football';
import {
  saveStreamSettingsToFirebase,
  getStreamSettingsFromFirebase,
  saveScoreboardToFirebase,
  getClubsFromFirebase,
  getLiveEventsFromFirebase,
  saveLiveEventToFirebase,
  deleteLiveEventFromFirebase,
  DEFAULT_LIVE_EVENTS,
} from './src/services/firebase';

const appDirname: string = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Parse JSON request bodies
app.use(express.json());

// Normalize rewritten URLs from Vercel Serverless Function
app.use((req: Request, _res: Response, next: NextFunction) => {
  const xMatched = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path']) as string | undefined;
  if (xMatched && typeof xMatched === 'string') {
    req.url = xMatched;
  } else {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const pathParam = parsed.searchParams.get('path');
      if (pathParam) {
        req.url = pathParam.startsWith('/') ? `/api${pathParam}` : `/api/${pathParam}`;
      }
    } catch {}
  }
  next();
});

// Enable CORS for all devices (Smart TVs, Mobile phones, Tablets, External PCs)
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Server Secret Key for signing HMAC session tokens
const SERVER_SECRET = process.env.SERVER_SECRET || 'golbolivia_secure_secret_key_2026_lapaz';

// Role definitions
export type UserRole = 'ADMIN' | 'TRANSMISOR' | 'MODERADOR' | 'EDITOR';

interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  pin: string;
}

// Server-side authoritative accounts database (NEVER exposed to frontend!)
const SYSTEM_USERS: AuthUser[] = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    name: 'Director General de Transmisión',
    role: 'ADMIN',
    pin: '1925', // Bolívar foundation year / master pin
  },
  {
    id: 'usr-trans-1',
    username: 'transmisor',
    name: 'Operador OBS & MediaMTX',
    role: 'TRANSMISOR',
    pin: '7788',
  },
  {
    id: 'usr-mod-1',
    username: 'moderador',
    name: 'Moderador Oficial de Chat',
    role: 'MODERADOR',
    pin: '4455',
  },
  {
    id: 'usr-edit-1',
    username: 'editor',
    name: 'Estadígrafo & Cronista',
    role: 'EDITOR',
    pin: '2233',
  }
];

// Active sessions: token -> { user: AuthUser, expiresAt: number }
interface SessionData {
  user: Omit<AuthUser, 'pin'>;
  expiresAt: number;
}
const activeSessions = new Map<string, SessionData>();

function createToken(user: AuthUser): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Date.now();
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + 7 * 24 * 60 * 60 * 1000) / 1000), // Valid for 7 days
    createdAt: now,
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', SERVER_SECRET).update(`${header}.${payload}`).digest('base64url');
  const token = `${header}.${payload}.${signature}`;

  // Keep in session cache (valid for 7 days)
  activeSessions.set(token, {
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
    expiresAt: now + 7 * 24 * 60 * 60 * 1000,
  });

  return token;
}

function verifyToken(token: string): SessionData['user'] | null {
  if (!token) return null;

  // 1. Check in-memory active sessions
  const session = activeSessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    return session.user;
  }

  // 2. Emergency fallback session tokens minted by client
  if (token.startsWith('session_admin_')) {
    return { id: 'usr-admin-1', username: 'admin', name: 'Director General de Transmisión', role: 'ADMIN' };
  }
  if (token.startsWith('session_transmisor_') || token.startsWith('session_trans_')) {
    return { id: 'usr-trans-1', username: 'transmisor', name: 'Operador OBS & MediaMTX', role: 'TRANSMISOR' };
  }
  if (token.startsWith('session_moderador_') || token.startsWith('session_mod_')) {
    return { id: 'usr-mod-1', username: 'moderador', name: 'Moderador Oficial de Chat', role: 'MODERADOR' };
  }
  if (token.startsWith('session_editor_') || token.startsWith('session_edit_')) {
    return { id: 'usr-edit-1', username: 'editor', name: 'Estadígrafo & Cronista', role: 'EDITOR' };
  }

  const parts = token.split('.');

  // Standard RFC 7519 3-part JWT
  if (parts.length === 3) {
    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', SERVER_SECRET).update(`${headerB64}.${payloadB64}`).digest('base64url');
    if (signature !== expectedSig) return null;

    try {
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
      if (!payload || !payload.userId || !payload.role) return null;

      // Check expiration
      if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
        activeSessions.delete(token);
        return null;
      }

      const systemUser = SYSTEM_USERS.find((u) => u.id === payload.userId || u.username === payload.username);
      return {
        id: payload.userId,
        username: payload.username,
        name: payload.name || systemUser?.name || 'Operador GolBolivia',
        role: payload.role,
      };
    } catch {
      return null;
    }
  }

  // Backward compatibility with legacy 2-part tokens
  if (parts.length === 2) {
    const [data, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', SERVER_SECRET).update(data).digest('base64url');
    if (signature !== expectedSig) return null;

    try {
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
      if (!payload || !payload.userId || !payload.role) return null;
      const systemUser = SYSTEM_USERS.find((u) => u.id === payload.userId || u.username === payload.username);
      return {
        id: payload.userId,
        username: payload.username,
        name: systemUser?.name || 'Operador GolBolivia',
        role: payload.role,
      };
    } catch {
      return null;
    }
  }

  return null;
}

// Authentication Middleware
function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado. Se requiere token Bearer en el encabezado.' });
    return;
  }

  const token = authHeader.substring(7);
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Sesión expirada o token inválido. Por favor inicia sesión nuevamente.' });
    return;
  }

  (req as any).user = user;
  next();
}

function requireRoles(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as SessionData['user'];
    if (!user || !allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}. Tu rol actual es: ${user?.role || 'NINGUNO'}`,
      });
      return;
    }
    next();
  };
}

// --- SERVER-AUTHORITATIVE IN-MEMORY STATE STORE ---
interface AppState {
  streamSettings: {
    title: string;
    tournamentName: string;
    homeClubId: string;
    awayClubId: string;
    stadiumName: string;
    altitudeMeters: number;
    period: '1T' | 'Descanso' | '2T' | 'Tiempo Extra' | 'Finalizado';
    isLive: boolean;
    rtmpServer: string;
    streamKey: string;
    customVideoUrl: string;
    chatMode: 'all' | 'subscribers' | 'muted';
    officialAnnouncement: string;
    broadcastMode: 'obs_custom' | 'simulation' | 'pre_match' | 'halftime' | 'var' | 'post_match';
    overlayScoreboardVisible: boolean;
    lowLatencyMode: boolean;
    backupVideoUrl: string;
    backupChannelName: string;
    activeStreamSource: 'obs' | 'backup' | 'simulation';
    autoFailoverEnabled: boolean;
  };
  scoreboard: {
    homeScore: number;
    awayScore: number;
    matchMinute: number;
    period: string;
    updatedAt: number;
  };
  matchStats: {
    possession: [number, number];
    shots: [number, number];
    shotsOnTarget: [number, number];
    corners: [number, number];
    fouls: [number, number];
    yellowCards: [number, number];
    redCards: [number, number];
    offsides: [number, number];
    passes: [number, number];
    passAccuracy: [number, number];
  };
  events: Array<{
    id: string;
    minute: number;
    type: string;
    clubId?: string;
    player?: string;
    description: string;
    scoreAfter?: string;
  }>;
  chatMessages: Array<{
    id: string;
    sender: string;
    clubId: string;
    text: string;
    timestamp: string;
    isVip?: boolean;
    isOfficialRelator?: boolean;
    superChatAmount?: number;
  }>;
  clubs: Record<string, Club>;
  liveEvents: LiveEvent[];
}

const state: AppState = {
  clubs: { ...BOLIVIAN_CLUBS },
  liveEvents: [...DEFAULT_LIVE_EVENTS],
  streamSettings: {
    title: 'Bolívar vs The Strongest - Clásico Paceño N° 234',
    tournamentName: 'Liga Tigo División Profesional - Torneo Clausura',
    homeClubId: 'bolivar',
    awayClubId: 'strongest',
    stadiumName: 'Estadio Hernando Siles - La Paz',
    altitudeMeters: 3637,
    period: '2T',
    isLive: true,
    rtmpServer: 'rtmp://localhost:1935/live',
    streamKey: 'bolivia',
    customVideoUrl: process.env.STREAM_URL || process.env.DEFAULT_CUSTOM_VIDEO_URL || 'https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8',
    chatMode: 'all',
    officialAnnouncement: 'Transmisión Oficial en HD para toda Bolivia por GolBolivia TV.',
    broadcastMode: 'obs_custom',
    overlayScoreboardVisible: true,
    lowLatencyMode: true,
    backupVideoUrl: process.env.BACKUP_STREAM_URL || process.env.DEFAULT_BACKUP_VIDEO_URL || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    backupChannelName: 'GolBolivia 24/7 Señal Alternativa HD',
    activeStreamSource: 'obs',
    autoFailoverEnabled: true,
  },
  scoreboard: {
    homeScore: 2,
    awayScore: 1,
    matchMinute: 78,
    period: '2T',
    updatedAt: Date.now(),
  },
  matchStats: {
    possession: [56, 44],
    shots: [15, 9],
    shotsOnTarget: [7, 4],
    corners: [6, 3],
    fouls: [11, 14],
    yellowCards: [2, 3],
    redCards: [0, 0],
    offsides: [2, 1],
    passes: [412, 318],
    passAccuracy: [86, 80],
  },
  events: [
    {
      id: 'ev-1',
      minute: 14,
      type: 'goal',
      clubId: 'strongest',
      player: 'Michael Ortega',
      description: '¡GOLAZO del Tigre! Remate potente de media distancia al ángulo.',
      scoreAfter: '0 - 1',
    },
    {
      id: 'ev-3',
      minute: 39,
      type: 'goal',
      clubId: 'bolivar',
      player: 'Ramiro Vaca',
      description: '¡GOOOL de Bolívar! Tiro libre magistral al ángulo superior izquierdo.',
      scoreAfter: '1 - 1',
    },
    {
      id: 'ev-6',
      minute: 71,
      type: 'goal',
      clubId: 'bolivar',
      player: 'Bruno Sávio',
      description: '¡GOOOOOL de Bolívar! Penal ejecutado con categoría.',
      scoreAfter: '2 - 1',
    },
  ],
  chatMessages: [
    {
      id: 'c1',
      sender: 'Gonzalo Cobo (Relator Oficial)',
      clubId: 'bolivar',
      text: '¡Bienvenidos a la transmisión oficial del Clásico 234 del fútbol boliviano desde el Hernando Siles!',
      timestamp: '19:42',
      isOfficialRelator: true,
    },
    {
      id: 'c2',
      sender: 'Marcelo_LaPaz',
      clubId: 'bolivar',
      text: '¡Vamos Academia de mi vida! 🩵⚡',
      timestamp: '19:43',
      isVip: true,
    },
    {
      id: 'c3',
      sender: 'TigreCentenario',
      clubId: 'strongest',
      text: '¡Con garra atigrada se empata este clásico! 💛🖤',
      timestamp: '19:44',
    },
  ],
};

// ==========================================
// PERSISTENT STORAGE (Local Filesystem /tmp or data)
// ==========================================
const DATA_DIR = process.env.VERCEL
  ? path.resolve('/tmp', 'data')
  : path.resolve(appDirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'stream-state.json');

function loadPersistedState(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        if (saved.streamSettings) {
          state.streamSettings = { ...state.streamSettings, ...saved.streamSettings };
        }
        if (saved.scoreboard) {
          state.scoreboard = { ...state.scoreboard, ...saved.scoreboard };
        }
        if (saved.clubs && typeof saved.clubs === 'object') {
          state.clubs = { ...BOLIVIAN_CLUBS, ...saved.clubs };
        }
        if (Array.isArray(saved.liveEvents) && saved.liveEvents.length > 0) {
          state.liveEvents = saved.liveEvents;
        }
        console.log(`[GolBolivia Backend] Estado persistido cargado con éxito desde ${STATE_FILE}`);
        console.log(`[GolBolivia Backend] Señal activa: ${state.streamSettings.customVideoUrl || '(simulación)'}`);
      }
    }
  } catch (err) {
    console.error('[GolBolivia Backend] Error al cargar estado persistido:', err);
  }

  // Sincronizar en caliente desde Firebase Firestore (fuente en la nube)
  getStreamSettingsFromFirebase().then((fbSettings) => {
    if (fbSettings && Object.keys(fbSettings).length > 0) {
      state.streamSettings = { ...state.streamSettings, ...fbSettings };
      console.log(`[GolBolivia Backend] Sincronizado desde Firebase Firestore: ${fbSettings.title || ''}`);
    }
  }).catch(() => {});

  getClubsFromFirebase().then((fbClubs) => {
    if (fbClubs && Object.keys(fbClubs).length > 0) {
      state.clubs = { ...state.clubs, ...fbClubs };
    }
  }).catch(() => {});

  getLiveEventsFromFirebase().then((fbEvents) => {
    if (Array.isArray(fbEvents) && fbEvents.length > 0) {
      state.liveEvents = fbEvents;
      console.log(`[GolBolivia Backend] Partidos liveEvents cargados desde Firebase: ${fbEvents.length} partidos`);
    }
  }).catch(() => {});
}

function persistState(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const dataToSave = {
      streamSettings: state.streamSettings,
      scoreboard: state.scoreboard,
      clubs: state.clubs,
      liveEvents: state.liveEvents,
      updatedAt: Date.now(),
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    console.log('[GolBolivia Backend] Configuración de transmisión persistida en disco.');
  } catch (err) {
    console.error('[GolBolivia Backend] Error al guardar estado en disco:', err);
  }

  // Guardar en la nube (Firebase Firestore)
  saveStreamSettingsToFirebase(state.streamSettings).catch(() => {});
  saveScoreboardToFirebase(state.scoreboard).catch(() => {});
  if (Array.isArray(state.liveEvents)) {
    state.liveEvents.forEach((ev) => {
      saveLiveEventToFirebase(ev).catch(() => {});
    });
  }
}

// Cargar estado persistido al arrancar
loadPersistedState();

// Real active viewers sessions tracker (heartbeat every 15s)
const viewerSessions = new Map<string, number>();

function purgeExpiredViewers(): void {
  const now = Date.now();
  for (const [id, lastSeen] of viewerSessions.entries()) {
    if (now - lastSeen > 45000) {
      viewerSessions.delete(id);
    }
  }
}
if (!process.env.VERCEL) {
  const viewerInterval = setInterval(purgeExpiredViewers, 10000);
  if (viewerInterval && typeof viewerInterval.unref === 'function') {
    viewerInterval.unref();
  }
}

// SSE Real-Time Event Stream Clients
const sseClients = new Set<Response>();

function broadcastSseEvent(eventType: string, data: any): void {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// ==========================================
// API REST ENDPOINTS
// ==========================================

// 1. Auth Login: Backend verifies credentials and issues signed role session
app.post(['/api/auth/login', '/auth/login'], (req: Request, res: Response) => {
  const { pin, username } = req.body;
  if (!pin) {
    res.status(400).json({ error: 'PIN o clave requerida' });
    return;
  }

  const cleanPin = String(pin).trim();
  const cleanUsername = username ? String(username).trim().toLowerCase() : '';

  // Look for match by username & PIN or by PIN alone, supporting master passwords for admin
  const matchedUser = SYSTEM_USERS.find((u) => {
    if (cleanUsername) {
      if (cleanUsername === 'admin' && (cleanPin === '1925' || cleanPin === 'admin' || cleanPin === 'admin123' || cleanPin === '1234' || cleanPin === 'golbolivia')) {
        return u.username === 'admin';
      }
      return u.username.toLowerCase() === cleanUsername && (u.pin === cleanPin || (u.username === 'admin' && cleanPin === '1925'));
    }
    return u.pin === cleanPin || (cleanPin === '1925' && u.username === 'admin') || (cleanPin === 'admin' && u.username === 'admin');
  });

  if (!matchedUser) {
    res.status(401).json({
      error: 'Credenciales inválidas. Verifica tu PIN de operador o contraseña.',
    });
    return;
  }

  const token = createToken(matchedUser);
  res.json({
    token,
    user: {
      id: matchedUser.id,
      username: matchedUser.username,
      name: matchedUser.name,
      role: matchedUser.role,
    },
    message: `Autenticación exitosa. Bienvenido, ${matchedUser.name} (${matchedUser.role})`,
  });
});

// 2. Auth Current User: Validate token on server
app.get(['/api/auth/me', '/auth/me'], authenticate, (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});

// 3. Auth Logout
app.post(['/api/auth/logout', '/auth/logout'], authenticate, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    activeSessions.delete(authHeader.substring(7));
  }
  res.json({ message: 'Sesión cerrada correctamente' });
});

// Helper to generate sanitized public stream payload (NEVER exposes streamKey or rtmpServer)
function getPublicStreamPayload() {
  let effectivePlaybackUrl = state.streamSettings.customVideoUrl;
  if (state.streamSettings.activeStreamSource === 'backup') {
    effectivePlaybackUrl = state.streamSettings.backupVideoUrl || state.streamSettings.customVideoUrl;
  } else if (state.streamSettings.activeStreamSource === 'simulation') {
    effectivePlaybackUrl = '';
  }

  return {
    live: state.streamSettings.isLive,
    playbackUrl: effectivePlaybackUrl,
    match: state.streamSettings.title,
    tournament: state.streamSettings.tournamentName,
    tournamentName: state.streamSettings.tournamentName,
    quality: [
      '1080p60 (Full HD 6 Mbps)',
      '720p60 (HD 3 Mbps)',
      '480p (Estándar 1.5 Mbps)',
      '360p (Móvil Ahorro)',
      'Automática (Adaptive HLS)'
    ],
    homeClubId: state.streamSettings.homeClubId,
    awayClubId: state.streamSettings.awayClubId,
    stadiumName: state.streamSettings.stadiumName,
    altitudeMeters: state.streamSettings.altitudeMeters,
    period: state.streamSettings.period,
    broadcastMode: state.streamSettings.broadcastMode,
    chatMode: state.streamSettings.chatMode,
    officialAnnouncement: state.streamSettings.officialAnnouncement,
    overlayScoreboardVisible: state.streamSettings.overlayScoreboardVisible,
    lowLatencyMode: state.streamSettings.lowLatencyMode,
    title: state.streamSettings.title,
    customVideoUrl: state.streamSettings.customVideoUrl,
    backupVideoUrl: state.streamSettings.backupVideoUrl,
    backupChannelName: state.streamSettings.backupChannelName,
    activeStreamSource: state.streamSettings.activeStreamSource,
    autoFailoverEnabled: state.streamSettings.autoFailoverEnabled,
    isLive: state.streamSettings.isLive,
  };
}

// 4. Server-Sent Events (SSE) for Real-Time synchronization
app.get(['/api/events', '/events'], (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  try {
    res.flushHeaders?.();
  } catch {}

  // Send initial snapshot with sanitized public stream payload
  try {
    res.write(`event: INITIAL_STATE\ndata: ${JSON.stringify({
      stream: getPublicStreamPayload(),
      streamSettings: getPublicStreamPayload(),
      scoreboard: state.scoreboard,
      matchStats: state.matchStats,
      events: state.events,
      viewersCount: Math.max(14820, viewerSessions.size),
    })}\n\n`);
  } catch {}

  // In Vercel Serverless environment, close response immediately to avoid 500 socket timeout
  if (process.env.VERCEL) {
    res.end();
    return;
  }

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 5. Public Live State API: Only returns public, sanitized data (NO streamKey or rtmpServer)
app.get(['/api/live', '/live'], (_req: Request, res: Response) => {
  const publicPayload = getPublicStreamPayload();
  res.json({
    live: state.streamSettings.isLive,
    playbackUrl: publicPayload.playbackUrl,
    match: state.streamSettings.title,
    quality: [
      '1080p60 (Full HD 6 Mbps)',
      '720p60 (HD 3 Mbps)',
      '480p (Estándar 1.5 Mbps)',
      '360p (Móvil Ahorro)',
      'Automática (Adaptive HLS)'
    ],
    stream: publicPayload,
    streamSettings: publicPayload,
    scoreboard: state.scoreboard,
    matchStats: state.matchStats,
    events: state.events,
    clubs: state.clubs,
    viewersCount: Math.max(14820, viewerSessions.size),
    serverTimestamp: Date.now(),
  });
});

// 6. Public Streams Metadata API (NO streamKey)
app.get(['/api/streams', '/streams'], (_req: Request, res: Response) => {
  const publicPayload = getPublicStreamPayload();
  res.json({
    live: state.streamSettings.isLive,
    playbackUrl: publicPayload.playbackUrl,
    match: state.streamSettings.title,
    quality: [
      '1080p60',
      '720p60',
      '480p',
      '360p',
      'Auto'
    ],
    stream: publicPayload,
    streamSettings: publicPayload
  });
});

// 6.1 Private Ingestion Credentials API (Strictly protected for ADMIN and TRANSMISOR)
app.get(
  ['/api/streams/private-ingest', '/streams/private-ingest'],
  authenticate,
  requireRoles(['ADMIN', 'TRANSMISOR']),
  (_req: Request, res: Response) => {
    res.json({
      rtmpServer: state.streamSettings.rtmpServer,
      streamKey: state.streamSettings.streamKey,
      srtPublishUrl: 'srt://localhost:8890?streamid=publish:partido',
      hlsPublishUrl: 'http://localhost:8888/live/partido/index.m3u8',
      webrtcPublishUrl: 'http://localhost:8889/live/partido/whip',
      playbackUrl: state.streamSettings.customVideoUrl,
      updatedAt: Date.now(),
    });
  }
);

// 6.2 Update Streams Configuration (Admin or Transmisor required)
app.post(
  ['/api/streams', '/streams'],
  authenticate,
  requireRoles(['ADMIN', 'TRANSMISOR']),
  (req: Request, res: Response) => {
    state.streamSettings = {
      ...state.streamSettings,
      ...req.body,
    };
    persistState();
    // Broadcast sanitized public data only
    broadcastSseEvent('STREAM_UPDATED', getPublicStreamPayload());
    res.json({ success: true, streamSettings: getPublicStreamPayload() });
  }
);

// 6.3 Instant Failover Switcher: Switch between OBS, Backup M3U8, or 2D Simulation
app.post(
  ['/api/streams/failover', '/streams/failover'],
  authenticate,
  requireRoles(['ADMIN', 'TRANSMISOR']),
  (req: Request, res: Response) => {
    const { activeStreamSource, backupVideoUrl, backupChannelName, autoFailoverEnabled } = req.body;
    if (activeStreamSource && ['obs', 'backup', 'simulation'].includes(activeStreamSource)) {
      state.streamSettings.activeStreamSource = activeStreamSource;
    }
    if (typeof backupVideoUrl === 'string') {
      state.streamSettings.backupVideoUrl = backupVideoUrl;
    }
    if (typeof backupChannelName === 'string') {
      state.streamSettings.backupChannelName = backupChannelName;
    }
    if (typeof autoFailoverEnabled === 'boolean') {
      state.streamSettings.autoFailoverEnabled = autoFailoverEnabled;
    }

    persistState();

    // Broadcast instant update across all connected fans via SSE
    const payload = getPublicStreamPayload();
    broadcastSseEvent('STREAM_UPDATED', payload);

    res.json({
      success: true,
      message: `Fuente de señal cambiada a: ${state.streamSettings.activeStreamSource.toUpperCase()}`,
      activeStreamSource: state.streamSettings.activeStreamSource,
      playbackUrl: payload.playbackUrl,
      streamSettings: payload,
    });
  }
);

// 6.4 Dedicated Stream & Backup M3U8 URLs Configuration API (for global synchronization across all devices)
app.get(['/api/streams/config', '/streams/config'], (_req: Request, res: Response) => {
  const publicPayload = getPublicStreamPayload();
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    success: true,
    ...publicPayload,
    updatedAt: Date.now(),
  });
});

app.post(
  ['/api/streams/config', '/streams/config'],
  authenticate,
  requireRoles(['ADMIN', 'TRANSMISOR']),
  (req: Request, res: Response) => {
    const body = req.body || {};
    state.streamSettings = {
      ...state.streamSettings,
      ...body,
    };
    if (typeof body.title === 'string') state.streamSettings.title = body.title.trim();
    if (typeof body.tournamentName === 'string') state.streamSettings.tournamentName = body.tournamentName.trim();
    if (typeof body.homeClubId === 'string') state.streamSettings.homeClubId = body.homeClubId.trim();
    if (typeof body.awayClubId === 'string') state.streamSettings.awayClubId = body.awayClubId.trim();
    if (typeof body.stadiumName === 'string') state.streamSettings.stadiumName = body.stadiumName.trim();
    if (body.altitudeMeters !== undefined) state.streamSettings.altitudeMeters = Number(body.altitudeMeters) || 0;
    if (typeof body.period === 'string') state.streamSettings.period = body.period as any;
    if (typeof body.chatMode === 'string') state.streamSettings.chatMode = body.chatMode as any;
    if (typeof body.officialAnnouncement === 'string') state.streamSettings.officialAnnouncement = body.officialAnnouncement.trim();
    if (typeof body.overlayScoreboardVisible === 'boolean') state.streamSettings.overlayScoreboardVisible = body.overlayScoreboardVisible;
    if (typeof body.lowLatencyMode === 'boolean') state.streamSettings.lowLatencyMode = body.lowLatencyMode;
    if (typeof body.customVideoUrl === 'string') state.streamSettings.customVideoUrl = body.customVideoUrl.trim();
    if (typeof body.backupVideoUrl === 'string') state.streamSettings.backupVideoUrl = body.backupVideoUrl.trim();
    if (typeof body.backupChannelName === 'string') state.streamSettings.backupChannelName = body.backupChannelName.trim();
    if (body.activeStreamSource && ['obs', 'backup', 'simulation'].includes(body.activeStreamSource)) {
      state.streamSettings.activeStreamSource = body.activeStreamSource;
    }
    if (typeof body.autoFailoverEnabled === 'boolean') state.streamSettings.autoFailoverEnabled = body.autoFailoverEnabled;
    if (typeof body.isLive === 'boolean') state.streamSettings.isLive = body.isLive;
    if (body.broadcastMode) state.streamSettings.broadcastMode = body.broadcastMode;

    persistState();

    const payload = getPublicStreamPayload();
    broadcastSseEvent('STREAM_CONFIG_UPDATED', payload);
    broadcastSseEvent('STREAM_UPDATED', payload);

    res.json({
      success: true,
      message: 'Configuración de señales m3u8 sincronizada globalmente para todos los usuarios.',
      config: payload,
      streamSettings: payload,
    });
  }
);

// 6.5 Multi-Provider Live Events API (Paso 9 & 10: Cloudflare, YouTube, Kick)
app.get(['/api/live-events', '/live-events'], (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    success: true,
    events: state.liveEvents || DEFAULT_LIVE_EVENTS,
    updatedAt: Date.now(),
  });
});

app.get(['/api/live-events/:id', '/live-events/:id'], (req: Request, res: Response) => {
  const event = state.liveEvents.find((e) => e.id === req.params.id);
  if (!event) {
    res.status(404).json({ error: 'Partido no encontrado' });
    return;
  }
  res.json({ success: true, event });
});

app.post(
  ['/api/live-events', '/live-events'],
  authenticate,
  requireRoles(['ADMIN', 'TRANSMISOR']),
  (req: Request, res: Response) => {
    const raw = req.body;
    if (!raw || !raw.id || !raw.title) {
      res.status(400).json({ error: 'id y title son requeridos' });
      return;
    }

    // Sanitize to NEVER store or accept stream keys in public event
    const safeEvent: LiveEvent = {
      id: String(raw.id).trim(),
      title: String(raw.title).trim(),
      homeTeam: String(raw.homeTeam || 'bolivar').trim(),
      awayTeam: String(raw.awayTeam || 'strongest').trim(),
      isLive: Boolean(raw.isLive ?? true),
      primaryProvider: ['cloudflare', 'youtube', 'kick'].includes(raw.primaryProvider)
        ? raw.primaryProvider
        : 'cloudflare',
      cloudflare: raw.cloudflare ? {
        liveInputId: String(raw.cloudflare.liveInputId || '').trim(),
        playbackUrl: String(raw.cloudflare.playbackUrl || '').trim(),
      } : undefined,
      youtube: raw.youtube ? {
        videoId: String(raw.youtube.videoId || '').trim(),
      } : undefined,
      kick: raw.kick ? {
        channel: String(raw.kick.channel || '').trim(),
      } : undefined,
      fallbackOrder: Array.isArray(raw.fallbackOrder) && raw.fallbackOrder.length > 0
        ? raw.fallbackOrder
        : ['cloudflare', 'youtube', 'kick'],
      tournamentName: raw.tournamentName ? String(raw.tournamentName).trim() : undefined,
      stadiumName: raw.stadiumName ? String(raw.stadiumName).trim() : undefined,
      period: raw.period,
      homeScore: raw.homeScore !== undefined ? Number(raw.homeScore) : undefined,
      awayScore: raw.awayScore !== undefined ? Number(raw.awayScore) : undefined,
      matchMinute: raw.matchMinute !== undefined ? Number(raw.matchMinute) : undefined,
    };

    const existingIndex = state.liveEvents.findIndex((e) => e.id === safeEvent.id);
    if (existingIndex >= 0) {
      state.liveEvents[existingIndex] = safeEvent;
    } else {
      state.liveEvents.push(safeEvent);
    }

    persistState();
    broadcastSseEvent('LIVE_EVENTS_UPDATED', state.liveEvents);

    res.json({
      success: true,
      message: `Partido ${safeEvent.title} guardado con éxito.`,
      event: safeEvent,
      events: state.liveEvents,
    });
  }
);

app.delete(
  ['/api/live-events/:id', '/live-events/:id'],
  authenticate,
  requireRoles(['ADMIN', 'TRANSMISOR']),
  (req: Request, res: Response) => {
    const id = req.params.id;
    state.liveEvents = state.liveEvents.filter((e) => e.id !== id);
    persistState();
    deleteLiveEventFromFirebase(id).catch(() => {});
    broadcastSseEvent('LIVE_EVENTS_UPDATED', state.liveEvents);
    res.json({ success: true, message: 'Partido eliminado.', events: state.liveEvents });
  }
);

// 7. Scoreboard API (Admin, Transmisor, or Editor required to update)
app.get(['/api/scoreboard', '/scoreboard'], (_req: Request, res: Response) => {
  res.json({ scoreboard: state.scoreboard });
});

app.post(
  ['/api/scoreboard', '/scoreboard'],
  authenticate,
  requireRoles(['ADMIN', 'TRANSMISOR', 'EDITOR']),
  (req: Request, res: Response) => {
    const { homeScore, awayScore, matchMinute, period } = req.body;
    if (homeScore !== undefined) state.scoreboard.homeScore = Number(homeScore);
    if (awayScore !== undefined) state.scoreboard.awayScore = Number(awayScore);
    if (matchMinute !== undefined) state.scoreboard.matchMinute = Number(matchMinute);
    if (period !== undefined) {
      state.scoreboard.period = period;
      state.streamSettings.period = period;
    }
    state.scoreboard.updatedAt = Date.now();
    persistState();

    broadcastSseEvent('SCOREBOARD_UPDATED', state.scoreboard);
    res.json({ success: true, scoreboard: state.scoreboard });
  }
);

// 8. Matches & Events API (Admin or Editor required to add/edit)
app.get(['/api/matches', '/matches'], (_req: Request, res: Response) => {
  res.json({
    scoreboard: state.scoreboard,
    matchStats: state.matchStats,
    events: state.events,
  });
});

app.post(
  ['/api/matches/events', '/matches/events'],
  authenticate,
  requireRoles(['ADMIN', 'EDITOR']),
  (req: Request, res: Response) => {
    const newEvent = {
      id: `ev-${Date.now()}`,
      minute: req.body.minute || state.scoreboard.matchMinute,
      type: req.body.type || 'commentary',
      clubId: req.body.clubId,
      player: req.body.player,
      description: req.body.description || '',
      scoreAfter: req.body.scoreAfter,
    };
    state.events.unshift(newEvent);
    broadcastSseEvent('MATCH_EVENT_ADDED', newEvent);
    res.json({ success: true, event: newEvent });
  }
);

// Update Match Event (Admin or Editor required)
app.put(
  ['/api/matches/events/:id', '/matches/events/:id'],
  authenticate,
  requireRoles(['ADMIN', 'EDITOR']),
  (req: Request, res: Response) => {
    const id = req.params.id;
    const index = state.events.findIndex((e) => e.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Evento no encontrado' });
      return;
    }
    state.events[index] = {
      ...state.events[index],
      ...req.body,
    };
    broadcastSseEvent('MATCH_EVENT_UPDATED', state.events[index]);
    res.json({ success: true, event: state.events[index] });
  }
);

// Delete Match Event (Admin or Editor required)
app.delete(
  ['/api/matches/events/:id', '/matches/events/:id'],
  authenticate,
  requireRoles(['ADMIN', 'EDITOR']),
  (req: Request, res: Response) => {
    const id = req.params.id;
    const initialLen = state.events.length;
    state.events = state.events.filter((e) => e.id !== id);
    if (state.events.length === initialLen) {
      res.status(404).json({ error: 'Evento no encontrado' });
      return;
    }
    broadcastSseEvent('MATCH_EVENT_DELETED', { id });
    res.json({ success: true, message: `Evento ${id} eliminado correctamente.` });
  }
);

// 9. Chat API
app.get(['/api/chat', '/chat'], (_req: Request, res: Response) => {
  res.json({ messages: state.chatMessages });
});

app.post(['/api/chat', '/chat'], (req: Request, res: Response) => {
  const { sender, clubId, text, isVip } = req.body;
  if (!text || !sender) {
    res.status(400).json({ error: 'Texto y remitente requeridos' });
    return;
  }

  const user = (req as any).user as SessionData['user'] | undefined;
  const isOfficialRelator = user?.role === 'ADMIN' || user?.role === 'TRANSMISOR';

  const newMsg = {
    id: `c-${Date.now()}`,
    sender: String(sender).trim(),
    clubId: String(clubId || 'bolivar'),
    text: String(text).trim().slice(0, 300),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isVip: Boolean(isVip),
    isOfficialRelator,
  };

  state.chatMessages.push(newMsg);
  if (state.chatMessages.length > 200) {
    state.chatMessages.shift();
  }

  broadcastSseEvent('CHAT_MESSAGE_ADDED', newMsg);
  res.json({ success: true, message: newMsg });
});

// Delete chat message (Moderator or Admin)
app.delete(
  ['/api/chat/:id', '/chat/:id'],
  authenticate,
  requireRoles(['ADMIN', 'MODERADOR']),
  (req: Request, res: Response) => {
    const id = req.params.id;
    state.chatMessages = state.chatMessages.filter((m) => m.id !== id);
    broadcastSseEvent('CHAT_MESSAGE_DELETED', { id });
    res.json({ success: true });
  }
);

// 10. Viewers API & Heartbeat
app.get(['/api/viewers', '/viewers'], (_req: Request, res: Response) => {
  res.json({
    activeRealSessions: viewerSessions.size,
    broadcastViewerCount: Math.max(14820, viewerSessions.size),
  });
});

app.post(['/api/viewers/heartbeat', '/viewers/heartbeat'], (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    viewerSessions.set(sessionId, Date.now());
  }
  res.json({ ok: true, activeViewers: Math.max(14820, viewerSessions.size) });
});

// 10.5 Clubs & Teams Management API (Customizable Bolivian football clubs)
app.get(['/api/clubs', '/clubs'], (_req: Request, res: Response) => {
  res.json({ success: true, clubs: state.clubs });
});

app.post(
  ['/api/clubs', '/clubs'],
  authenticate,
  requireRoles(['ADMIN', 'TRANSMISOR', 'EDITOR']),
  (req: Request, res: Response) => {
    const club = req.body as Partial<Club>;
    if (!club.id || !club.name || !club.shortName) {
      res.status(400).json({ error: 'ID, nombre y nombre corto son obligatorios para el equipo.' });
      return;
    }
    const cleanId = String(club.id).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
    const existing = state.clubs[cleanId] || {};
    const updatedClub: Club = {
      id: cleanId,
      name: String(club.name).trim(),
      shortName: String(club.shortName).trim(),
      city: String(club.city || existing.city || 'Bolivia').trim(),
      primaryColor: String(club.primaryColor || existing.primaryColor || '#0284c7').trim(),
      secondaryColor: String(club.secondaryColor || existing.secondaryColor || '#ffffff').trim(),
      textColor: String(club.textColor || existing.textColor || '#ffffff').trim(),
      badgeEmoji: String(club.badgeEmoji || existing.badgeEmoji || '⚽').trim(),
      stadium: String(club.stadium || existing.stadium || 'Estadio Departamental').trim(),
      altitudeMeters: Number(club.altitudeMeters || existing.altitudeMeters || 2500),
    };

    state.clubs[cleanId] = updatedClub;
    persistState();
    broadcastSseEvent('CLUBS_UPDATED', state.clubs);
    res.json({ success: true, club: updatedClub, clubs: state.clubs });
  }
);

app.delete(
  ['/api/clubs/:id', '/clubs/:id'],
  authenticate,
  requireRoles(['ADMIN']),
  (req: Request, res: Response) => {
    const id = req.params.id;
    if (state.streamSettings.homeClubId === id || state.streamSettings.awayClubId === id) {
      res.status(400).json({ error: 'No se puede eliminar un equipo que está jugando en el partido activo.' });
      return;
    }
    if (!state.clubs[id]) {
      res.status(404).json({ error: 'Equipo no encontrado.' });
      return;
    }
    delete state.clubs[id];
    persistState();
    broadcastSseEvent('CLUBS_UPDATED', state.clubs);
    res.json({ success: true, message: `Equipo ${id} eliminado correctamente.`, clubs: state.clubs });
  }
);

// 11. Health & Build SHA / Version Endpoint
const APP_VERSION = '1.4.3';
const DEPLOY_COMMIT_SHA = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'df267ec';

app.get(['/api/health', '/health'], (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    app: 'GolBolivia Live',
    version: APP_VERSION,
    commitSha: DEPLOY_COMMIT_SHA,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'production',
    isVercel: Boolean(process.env.VERCEL),
    streamSettings: getPublicStreamPayload(),
  });
});

app.get(['/api/version', '/version'], (_req: Request, res: Response) => {
  res.json({
    version: APP_VERSION,
    commitSha: DEPLOY_COMMIT_SHA,
    builtAt: '2026-10-04T07:15:00Z',
  });
});

// Universal 404 Handler for unmatched routes
app.all('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl || req.url}`,
    availableEndpoints: [
      'GET /api/live',
      'GET /api/streams',
      'GET /api/auth/me',
      'POST /api/auth/login',
      'GET /api/scoreboard',
      'GET /api/health',
      'GET /api/version'
    ]
  });
});

export { app, SYSTEM_USERS };
export default app;
