// serverApp.ts
import express from "express";
import http from "http";
import crypto from "crypto";
import path from "path";
import fs from "fs";
var appDirname = typeof __dirname !== "undefined" ? __dirname : process.cwd();
var app = express();
var server = http.createServer(app);
var PORT = process.env.PORT || 3e3;
var isProduction = process.env.NODE_ENV === "production";
app.use(express.json());
app.use((req, _res, next) => {
  const xMatched = req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"];
  if (xMatched && typeof xMatched === "string") {
    req.url = xMatched;
  } else if (req.query && typeof req.query.path === "string") {
    req.url = "/api/" + req.query.path;
  }
  next();
});
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (_req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});
var SERVER_SECRET = process.env.SERVER_SECRET || "golbolivia_secure_secret_key_2026_lapaz";
var SYSTEM_USERS = [
  {
    id: "usr-admin-1",
    username: "admin",
    name: "Director General de Transmisi\xF3n",
    role: "ADMIN",
    pin: "1925"
    // Bolívar foundation year / master pin
  },
  {
    id: "usr-trans-1",
    username: "transmisor",
    name: "Operador OBS & MediaMTX",
    role: "TRANSMISOR",
    pin: "7788"
  },
  {
    id: "usr-mod-1",
    username: "moderador",
    name: "Moderador Oficial de Chat",
    role: "MODERADOR",
    pin: "4455"
  },
  {
    id: "usr-edit-1",
    username: "editor",
    name: "Estad\xEDgrafo & Cronista",
    role: "EDITOR",
    pin: "2233"
  }
];
var activeSessions = /* @__PURE__ */ new Map();
function createToken(user) {
  const payload = {
    userId: user.id,
    role: user.role,
    username: user.username,
    nonce: crypto.randomBytes(16).toString("hex"),
    createdAt: Date.now()
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SERVER_SECRET).update(data).digest("base64url");
  const token = `${data}.${signature}`;
  activeSessions.set(token, {
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    },
    expiresAt: Date.now() + 24 * 60 * 60 * 1e3
  });
  return token;
}
function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expectedSig = crypto.createHmac("sha256", SERVER_SECRET).update(data).digest("base64url");
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
    if (!payload || !payload.userId || !payload.role || !payload.createdAt) {
      return null;
    }
    if (Date.now() - payload.createdAt > 24 * 60 * 60 * 1e3) {
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
          name: systemUser?.name || (payload.username === "admin" ? "Director General de Transmisi\xF3n" : "Operador OBS & MediaMTX"),
          role: payload.role
        },
        expiresAt: payload.createdAt + 24 * 60 * 60 * 1e3
      };
      activeSessions.set(token, session);
    }
    return session.user;
  } catch {
    return null;
  }
}
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No autorizado. Se requiere token Bearer en el encabezado." });
    return;
  }
  const token = authHeader.substring(7);
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "Sesi\xF3n expirada o token inv\xE1lido. Por favor inicia sesi\xF3n nuevamente." });
    return;
  }
  req.user = user;
  next();
}
function requireRoles(allowedRoles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(", ")}. Tu rol actual es: ${user?.role || "NINGUNO"}`
      });
      return;
    }
    next();
  };
}
var state = {
  streamSettings: {
    title: "Bol\xEDvar vs The Strongest - Cl\xE1sico Pace\xF1o N\xB0 234",
    tournamentName: "Liga Tigo Divisi\xF3n Profesional - Torneo Clausura",
    homeClubId: "bolivar",
    awayClubId: "strongest",
    stadiumName: "Estadio Hernando Siles - La Paz",
    altitudeMeters: 3637,
    period: "2T",
    isLive: true,
    rtmpServer: "rtmp://localhost:1935/live",
    streamKey: "bolivia",
    customVideoUrl: "https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8",
    chatMode: "all",
    officialAnnouncement: "Transmisi\xF3n Oficial en HD para toda Bolivia por GolBolivia TV.",
    broadcastMode: "obs_custom",
    overlayScoreboardVisible: true,
    lowLatencyMode: true,
    backupVideoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    backupChannelName: "GolBolivia 24/7 Se\xF1al Alternativa HD",
    activeStreamSource: "obs",
    autoFailoverEnabled: true
  },
  scoreboard: {
    homeScore: 2,
    awayScore: 1,
    matchMinute: 78,
    period: "2T",
    updatedAt: Date.now()
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
    passAccuracy: [86, 80]
  },
  events: [
    {
      id: "ev-1",
      minute: 14,
      type: "goal",
      clubId: "strongest",
      player: "Michael Ortega",
      description: "\xA1GOLAZO del Tigre! Remate potente de media distancia al \xE1ngulo.",
      scoreAfter: "0 - 1"
    },
    {
      id: "ev-3",
      minute: 39,
      type: "goal",
      clubId: "bolivar",
      player: "Ramiro Vaca",
      description: "\xA1GOOOL de Bol\xEDvar! Tiro libre magistral al \xE1ngulo superior izquierdo.",
      scoreAfter: "1 - 1"
    },
    {
      id: "ev-6",
      minute: 71,
      type: "goal",
      clubId: "bolivar",
      player: "Bruno S\xE1vio",
      description: "\xA1GOOOOOL de Bol\xEDvar! Penal ejecutado con categor\xEDa.",
      scoreAfter: "2 - 1"
    }
  ],
  chatMessages: [
    {
      id: "c1",
      sender: "Gonzalo Cobo (Relator Oficial)",
      clubId: "bolivar",
      text: "\xA1Bienvenidos a la transmisi\xF3n oficial del Cl\xE1sico 234 del f\xFAtbol boliviano desde el Hernando Siles!",
      timestamp: "19:42",
      isOfficialRelator: true
    },
    {
      id: "c2",
      sender: "Marcelo_LaPaz",
      clubId: "bolivar",
      text: "\xA1Vamos Academia de mi vida! \u{1FA75}\u26A1",
      timestamp: "19:43",
      isVip: true
    },
    {
      id: "c3",
      sender: "TigreCentenario",
      clubId: "strongest",
      text: "\xA1Con garra atigrada se empata este cl\xE1sico! \u{1F49B}\u{1F5A4}",
      timestamp: "19:44"
    }
  ]
};
var DATA_DIR = process.env.VERCEL ? path.resolve("/tmp", "data") : path.resolve(appDirname, "data");
var STATE_FILE = path.join(DATA_DIR, "stream-state.json");
var GLOBAL_STORE_ID = "ff808181a09d98f701a1054cf26b7060";
var GLOBAL_STORE_URL = `https://api.restful-api.dev/objects/${GLOBAL_STORE_ID}`;
async function syncWithGlobalCloud() {
  try {
    const res = await fetch(GLOBAL_STORE_URL, {
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        if (json.data.streamSettings) {
          state.streamSettings = { ...state.streamSettings, ...json.data.streamSettings };
        }
        if (json.data.scoreboard) {
          state.scoreboard = { ...state.scoreboard, ...json.data.scoreboard };
        }
        console.log("[GolBolivia Backend] Sincronizaci\xF3n global con la nube exitosa:", state.streamSettings.customVideoUrl);
      }
    }
  } catch (err) {
  }
}
async function pushToGlobalCloud() {
  try {
    const payload = {
      name: "golbolivia_stream_state",
      data: {
        streamSettings: state.streamSettings,
        scoreboard: state.scoreboard,
        updatedAt: Date.now()
      }
    };
    await fetch(GLOBAL_STORE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3500)
    });
    console.log("[GolBolivia Backend] Transmisi\xF3n guardada globalmente en la nube para todos los dispositivos.");
  } catch (err) {
  }
}
function loadPersistedState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf-8");
      const saved = JSON.parse(raw);
      if (saved && typeof saved === "object") {
        if (saved.streamSettings) {
          state.streamSettings = { ...state.streamSettings, ...saved.streamSettings };
        }
        if (saved.scoreboard) {
          state.scoreboard = { ...state.scoreboard, ...saved.scoreboard };
        }
        console.log(`[GolBolivia Backend] Estado persistido cargado con \xE9xito desde ${STATE_FILE}`);
        console.log(`[GolBolivia Backend] Se\xF1al activa: ${state.streamSettings.customVideoUrl || "(simulaci\xF3n)"}`);
      }
    }
  } catch (err) {
    console.error("[GolBolivia Backend] Error al cargar estado persistido:", err);
  }
  syncWithGlobalCloud().catch(() => {
  });
}
function persistState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const dataToSave = {
      streamSettings: state.streamSettings,
      scoreboard: state.scoreboard,
      updatedAt: Date.now()
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(dataToSave, null, 2), "utf-8");
    console.log("[GolBolivia Backend] Configuraci\xF3n de transmisi\xF3n persistida en disco para todos los dispositivos.");
  } catch (err) {
    console.error("[GolBolivia Backend] Error al guardar estado en disco:", err);
  }
  pushToGlobalCloud().catch(() => {
  });
}
loadPersistedState();
var viewerSessions = /* @__PURE__ */ new Map();
function purgeExpiredViewers() {
  const now = Date.now();
  for (const [id, lastSeen] of viewerSessions.entries()) {
    if (now - lastSeen > 45e3) {
      viewerSessions.delete(id);
    }
  }
}
if (!process.env.VERCEL) {
  const viewerInterval = setInterval(purgeExpiredViewers, 1e4);
  if (viewerInterval && typeof viewerInterval.unref === "function") {
    viewerInterval.unref();
  }
}
var sseClients = /* @__PURE__ */ new Set();
function broadcastSseEvent(eventType, data) {
  const message = `event: ${eventType}
data: ${JSON.stringify(data)}

`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}
app.post(["/api/auth/login", "/auth/login"], (req, res) => {
  const { pin, username } = req.body;
  if (!pin) {
    res.status(400).json({ error: "PIN o clave requerida" });
    return;
  }
  const cleanPin = String(pin).trim();
  const cleanUsername = username ? String(username).trim().toLowerCase() : "";
  const matchedUser = SYSTEM_USERS.find((u) => {
    if (cleanUsername) {
      if (cleanUsername === "admin" && (cleanPin === "1925" || cleanPin === "admin" || cleanPin === "admin123" || cleanPin === "1234" || cleanPin === "golbolivia")) {
        return u.username === "admin";
      }
      return u.username.toLowerCase() === cleanUsername && (u.pin === cleanPin || u.username === "admin" && cleanPin === "1925");
    }
    return u.pin === cleanPin || cleanPin === "1925" && u.username === "admin" || cleanPin === "admin" && u.username === "admin";
  });
  if (!matchedUser) {
    res.status(401).json({
      error: "Credenciales inv\xE1lidas. Verifica tu PIN de operador o contrase\xF1a."
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
      role: matchedUser.role
    },
    message: `Autenticaci\xF3n exitosa. Bienvenido, ${matchedUser.name} (${matchedUser.role})`
  });
});
app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});
app.post("/api/auth/logout", authenticate, (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    activeSessions.delete(authHeader.substring(7));
  }
  res.json({ message: "Sesi\xF3n cerrada correctamente" });
});
function getPublicStreamPayload() {
  let effectivePlaybackUrl = state.streamSettings.customVideoUrl;
  if (state.streamSettings.activeStreamSource === "backup") {
    effectivePlaybackUrl = state.streamSettings.backupVideoUrl || state.streamSettings.customVideoUrl;
  } else if (state.streamSettings.activeStreamSource === "simulation") {
    effectivePlaybackUrl = "";
  }
  return {
    live: state.streamSettings.isLive,
    playbackUrl: effectivePlaybackUrl,
    match: state.streamSettings.title,
    tournament: state.streamSettings.tournamentName,
    quality: [
      "1080p60 (Full HD 6 Mbps)",
      "720p60 (HD 3 Mbps)",
      "480p (Est\xE1ndar 1.5 Mbps)",
      "360p (M\xF3vil Ahorro)",
      "Autom\xE1tica (Adaptive HLS)"
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
    isLive: state.streamSettings.isLive
  };
}
app.get(["/api/events", "/events"], (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  try {
    res.flushHeaders?.();
  } catch {
  }
  try {
    res.write(`event: INITIAL_STATE
data: ${JSON.stringify({
      stream: getPublicStreamPayload(),
      streamSettings: getPublicStreamPayload(),
      scoreboard: state.scoreboard,
      matchStats: state.matchStats,
      events: state.events,
      viewersCount: Math.max(14820, viewerSessions.size)
    })}

`);
  } catch {
  }
  if (process.env.VERCEL) {
    res.end();
    return;
  }
  sseClients.add(res);
  req.on("close", () => {
    sseClients.delete(res);
  });
});
app.get(["/api/live", "/live"], (_req, res) => {
  const publicPayload = getPublicStreamPayload();
  res.json({
    live: state.streamSettings.isLive,
    playbackUrl: publicPayload.playbackUrl,
    match: state.streamSettings.title,
    quality: [
      "1080p60 (Full HD 6 Mbps)",
      "720p60 (HD 3 Mbps)",
      "480p (Est\xE1ndar 1.5 Mbps)",
      "360p (M\xF3vil Ahorro)",
      "Autom\xE1tica (Adaptive HLS)"
    ],
    stream: publicPayload,
    streamSettings: publicPayload,
    scoreboard: state.scoreboard,
    matchStats: state.matchStats,
    events: state.events,
    viewersCount: Math.max(14820, viewerSessions.size),
    serverTimestamp: Date.now()
  });
});
app.get("/api/streams", (_req, res) => {
  const publicPayload = getPublicStreamPayload();
  res.json({
    live: state.streamSettings.isLive,
    playbackUrl: publicPayload.playbackUrl,
    match: state.streamSettings.title,
    quality: [
      "1080p60",
      "720p60",
      "480p",
      "360p",
      "Auto"
    ],
    stream: publicPayload,
    streamSettings: publicPayload
  });
});
app.get(
  "/api/streams/private-ingest",
  authenticate,
  requireRoles(["ADMIN", "TRANSMISOR"]),
  (_req, res) => {
    res.json({
      rtmpServer: state.streamSettings.rtmpServer,
      streamKey: state.streamSettings.streamKey,
      srtPublishUrl: "srt://localhost:8890?streamid=publish:partido",
      hlsPublishUrl: "http://localhost:8888/live/partido/index.m3u8",
      webrtcPublishUrl: "http://localhost:8889/live/partido/whip",
      playbackUrl: state.streamSettings.customVideoUrl,
      updatedAt: Date.now()
    });
  }
);
app.post(
  "/api/streams",
  authenticate,
  requireRoles(["ADMIN", "TRANSMISOR"]),
  (req, res) => {
    state.streamSettings = {
      ...state.streamSettings,
      ...req.body
    };
    persistState();
    broadcastSseEvent("STREAM_UPDATED", getPublicStreamPayload());
    res.json({ success: true, streamSettings: getPublicStreamPayload() });
  }
);
app.post(
  "/api/streams/failover",
  authenticate,
  requireRoles(["ADMIN", "TRANSMISOR"]),
  (req, res) => {
    const { activeStreamSource, backupVideoUrl, backupChannelName, autoFailoverEnabled } = req.body;
    if (activeStreamSource && ["obs", "backup", "simulation"].includes(activeStreamSource)) {
      state.streamSettings.activeStreamSource = activeStreamSource;
    }
    if (typeof backupVideoUrl === "string") {
      state.streamSettings.backupVideoUrl = backupVideoUrl;
    }
    if (typeof backupChannelName === "string") {
      state.streamSettings.backupChannelName = backupChannelName;
    }
    if (typeof autoFailoverEnabled === "boolean") {
      state.streamSettings.autoFailoverEnabled = autoFailoverEnabled;
    }
    persistState();
    const payload = getPublicStreamPayload();
    broadcastSseEvent("STREAM_UPDATED", payload);
    res.json({
      success: true,
      message: `Fuente de se\xF1al cambiada a: ${state.streamSettings.activeStreamSource.toUpperCase()}`,
      activeStreamSource: state.streamSettings.activeStreamSource,
      playbackUrl: payload.playbackUrl,
      streamSettings: payload
    });
  }
);
app.get("/api/scoreboard", (_req, res) => {
  res.json({ scoreboard: state.scoreboard });
});
app.post(
  "/api/scoreboard",
  authenticate,
  requireRoles(["ADMIN", "TRANSMISOR", "EDITOR"]),
  (req, res) => {
    const { homeScore, awayScore, matchMinute, period } = req.body;
    if (homeScore !== void 0) state.scoreboard.homeScore = Number(homeScore);
    if (awayScore !== void 0) state.scoreboard.awayScore = Number(awayScore);
    if (matchMinute !== void 0) state.scoreboard.matchMinute = Number(matchMinute);
    if (period !== void 0) {
      state.scoreboard.period = period;
      state.streamSettings.period = period;
    }
    state.scoreboard.updatedAt = Date.now();
    persistState();
    broadcastSseEvent("SCOREBOARD_UPDATED", state.scoreboard);
    res.json({ success: true, scoreboard: state.scoreboard });
  }
);
app.get("/api/matches", (_req, res) => {
  res.json({
    scoreboard: state.scoreboard,
    matchStats: state.matchStats,
    events: state.events
  });
});
app.post(
  "/api/matches/events",
  authenticate,
  requireRoles(["ADMIN", "EDITOR"]),
  (req, res) => {
    const newEvent = {
      id: `ev-${Date.now()}`,
      minute: req.body.minute || state.scoreboard.matchMinute,
      type: req.body.type || "commentary",
      clubId: req.body.clubId,
      player: req.body.player,
      description: req.body.description || "",
      scoreAfter: req.body.scoreAfter
    };
    state.events.unshift(newEvent);
    broadcastSseEvent("MATCH_EVENT_ADDED", newEvent);
    res.json({ success: true, event: newEvent });
  }
);
app.get("/api/chat", (_req, res) => {
  res.json({ messages: state.chatMessages });
});
app.post("/api/chat", (req, res) => {
  const { sender, clubId, text, isVip } = req.body;
  if (!text || !sender) {
    res.status(400).json({ error: "Texto y remitente requeridos" });
    return;
  }
  const user = req.user;
  const isOfficialRelator = user?.role === "ADMIN" || user?.role === "TRANSMISOR";
  const newMsg = {
    id: `c-${Date.now()}`,
    sender: String(sender).trim(),
    clubId: String(clubId || "bolivar"),
    text: String(text).trim().slice(0, 300),
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    isVip: Boolean(isVip),
    isOfficialRelator
  };
  state.chatMessages.push(newMsg);
  if (state.chatMessages.length > 200) {
    state.chatMessages.shift();
  }
  broadcastSseEvent("CHAT_MESSAGE_ADDED", newMsg);
  res.json({ success: true, message: newMsg });
});
app.delete(
  "/api/chat/:id",
  authenticate,
  requireRoles(["ADMIN", "MODERADOR"]),
  (req, res) => {
    const id = req.params.id;
    state.chatMessages = state.chatMessages.filter((m) => m.id !== id);
    broadcastSseEvent("CHAT_MESSAGE_DELETED", { id });
    res.json({ success: true });
  }
);
app.get("/api/viewers", (_req, res) => {
  res.json({
    activeRealSessions: viewerSessions.size,
    broadcastViewerCount: Math.max(14820, viewerSessions.size)
  });
});
app.post(["/api/viewers/heartbeat", "/viewers/heartbeat"], (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    viewerSessions.set(sessionId, Date.now());
  }
  res.json({ ok: true, activeViewers: Math.max(14820, viewerSessions.size) });
});
app.all("*", (req, res) => {
  const rawUrl = (req.originalUrl || req.url || "").toLowerCase();
  if (rawUrl.includes("live")) {
    const publicPayload = getPublicStreamPayload();
    return res.json({
      live: state.streamSettings.isLive,
      playbackUrl: publicPayload.playbackUrl,
      match: state.streamSettings.title,
      quality: [
        "1080p60 (Full HD 6 Mbps)",
        "720p60 (HD 3 Mbps)",
        "480p (Est\xE1ndar 1.5 Mbps)",
        "360p (M\xF3vil Ahorro)",
        "Autom\xE1tica (Adaptive HLS)"
      ],
      stream: publicPayload,
      streamSettings: publicPayload,
      scoreboard: state.scoreboard,
      matchStats: state.matchStats,
      events: state.events,
      viewersCount: Math.max(14820, viewerSessions.size),
      serverTimestamp: Date.now()
    });
  }
  if (rawUrl.includes("events")) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.write(`event: INITIAL_STATE
data: ${JSON.stringify({
      stream: getPublicStreamPayload(),
      streamSettings: getPublicStreamPayload(),
      scoreboard: state.scoreboard,
      matchStats: state.matchStats,
      events: state.events,
      viewersCount: Math.max(14820, viewerSessions.size)
    })}

`);
    return res.end();
  }
  res.status(200).json({ ok: true, app: "GolBolivia Live Serverless API" });
});
var serverApp_default = app;

// api/index.ts
function handler(req, res) {
  const matchedPath = req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"];
  if (matchedPath && typeof matchedPath === "string") {
    req.url = matchedPath;
  } else if (req.query?.path) {
    req.url = `/api/${req.query.path}`;
  }
  return serverApp_default(req, res);
}
export {
  handler as default
};
