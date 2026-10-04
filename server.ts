import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Parse JSON request bodies
app.use(express.json());

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
  const payload = {
    userId: user.id,
    role: user.role,
    username: user.username,
    nonce: crypto.randomBytes(16).toString('hex'),
    createdAt: Date.now(),
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SERVER_SECRET).update(data).digest('base64url');
  const token = `${data}.${signature}`;

  // Session valid for 24 hours
  activeSessions.set(token, {
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  return token;
}

function verifyToken(token: string): SessionData['user'] | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SERVER_SECRET).update(data).digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (!payload || !payload.userId || !payload.role || !payload.createdAt) {
      return null;
    }
    // Token valid for 24h
    if (Date.now() - payload.createdAt > 24 * 60 * 60 * 1000) {
      activeSessions.delete(token);
      return null;
    }

    let session = activeSessions.get(token);
    if (!session) {
      const systemUser = SYSTEM_USERS.find((u) => u.id === payload.userId || u.username === payload.username);
      session = {
        user: {
          id: payload.userId,
          username: payload.username,
          name: systemUser?.name || (payload.username === 'admin' ? 'Director General de Transmisión' : 'Operador OBS & MediaMTX'),
          role: payload.role,
        },
        expiresAt: payload.createdAt + 24 * 60 * 60 * 1000,
      };
      activeSessions.set(token, session);
    }

    return session.user;
  } catch {
    return null;
  }
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
}

const state: AppState = {
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
    customVideoUrl: 'https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8',
    chatMode: 'all',
    officialAnnouncement: 'Transmisión Oficial en HD para toda Bolivia por GolBolivia TV.',
    broadcastMode: 'obs_custom',
    overlayScoreboardVisible: true,
    lowLatencyMode: true,
    backupVideoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
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
// PERSISTENT STORAGE FOR ALL DEVICES
// ==========================================
const DATA_DIR = path.resolve(__dirname, 'data');
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
        console.log(`[GolBolivia Backend] Estado persistido cargado con éxito desde ${STATE_FILE}`);
        console.log(`[GolBolivia Backend] Señal activa: ${state.streamSettings.customVideoUrl || '(simulación)'}`);
      }
    }
  } catch (err) {
    console.error('[GolBolivia Backend] Error al cargar estado persistido:', err);
  }
}

function persistState(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const dataToSave = {
      streamSettings: state.streamSettings,
      scoreboard: state.scoreboard,
      updatedAt: Date.now(),
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    console.log('[GolBolivia Backend] Configuración de transmisión persistida en disco para todos los dispositivos.');
  } catch (err) {
    console.error('[GolBolivia Backend] Error al guardar estado en disco:', err);
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
setInterval(purgeExpiredViewers, 10000);

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
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { pin, username } = req.body;
  if (!pin) {
    res.status(400).json({ error: 'PIN o clave requerida' });
    return;
  }

  const cleanPin = String(pin).trim();
  const cleanUsername = username ? String(username).trim().toLowerCase() : '';

  // Look for match by username & PIN or by PIN alone
  const matchedUser = SYSTEM_USERS.find((u) => {
    if (cleanUsername) {
      return u.username.toLowerCase() === cleanUsername && u.pin === cleanPin;
    }
    return u.pin === cleanPin;
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
app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});

// 3. Auth Logout
app.post('/api/auth/logout', authenticate, (req: Request, res: Response) => {
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
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);

  // Send initial snapshot with sanitized public stream payload
  res.write(`event: INITIAL_STATE\ndata: ${JSON.stringify({
    stream: getPublicStreamPayload(),
    streamSettings: getPublicStreamPayload(),
    scoreboard: state.scoreboard,
    matchStats: state.matchStats,
    events: state.events,
    viewersCount: Math.max(14820, viewerSessions.size),
  })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 5. Public Live State API: Only returns public, sanitized data (NO streamKey or rtmpServer)
app.get('/api/live', (_req: Request, res: Response) => {
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
    viewersCount: Math.max(14820, viewerSessions.size),
    serverTimestamp: Date.now(),
  });
});

// 6. Public Streams Metadata API (NO streamKey)
app.get('/api/streams', (_req: Request, res: Response) => {
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
  '/api/streams/private-ingest',
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
  '/api/streams',
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
  '/api/streams/failover',
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

// 7. Scoreboard API (Admin, Transmisor, or Editor required to update)
app.get('/api/scoreboard', (_req: Request, res: Response) => {
  res.json({ scoreboard: state.scoreboard });
});

app.post(
  '/api/scoreboard',
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
app.get('/api/matches', (_req: Request, res: Response) => {
  res.json({
    scoreboard: state.scoreboard,
    matchStats: state.matchStats,
    events: state.events,
  });
});

app.post(
  '/api/matches/events',
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

// 9. Chat API
app.get('/api/chat', (_req: Request, res: Response) => {
  res.json({ messages: state.chatMessages });
});

app.post('/api/chat', (req: Request, res: Response) => {
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
  '/api/chat/:id',
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
app.get('/api/viewers', (_req: Request, res: Response) => {
  res.json({
    activeRealSessions: viewerSessions.size,
    broadcastViewerCount: Math.max(14820, viewerSessions.size),
  });
});

app.post('/api/viewers/heartbeat', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    viewerSessions.set(sessionId, Date.now());
  }
  res.json({ ok: true, activeViewers: Math.max(14820, viewerSessions.size) });
});

// ==========================================
// VITE DEV MIDDLEWARE OR PRODUCTION STATIC
// ==========================================
async function startServer() {
  if (!isProduction) {
    // Dynamic import of createServer from Vite
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false, // HMR disabled in AI Studio container environment to eliminate WebSocket connection errors
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    // Fallback for SPA routing in development
    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      const url = req.originalUrl;
      // Do not serve HTML for API endpoints, internal vite modules or asset files
      if (
        url.startsWith('/api') ||
        url.startsWith('/@') ||
        url.startsWith('/node_modules') ||
        url.startsWith('/src') ||
        /\.[a-zA-Z0-9]+(\?.*)?$/.test(url)
      ) {
        return next();
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        if (vite) {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  if (!process.env.VERCEL) {
    server.listen(PORT, () => {
      console.log(`[GolBolivia Backend] Servidor ejecutándose en http://0.0.0.0:${PORT}`);
      console.log(`[GolBolivia Backend] Endpoints API listos: /api/live, /api/auth/login, /api/scoreboard, /api/streams, /api/events`);
    });
  }
}

startServer();

export { app };
export default app;
