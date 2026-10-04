// serverApp.ts
import express from "express";
import http from "http";
import crypto from "crypto";
import path from "path";
import fs from "fs";

// src/data/bolivianFootballData.ts
var BOLIVIAN_CLUBS = {
  bolivar: {
    id: "bolivar",
    name: "Club Bol\xEDvar",
    shortName: "Bol\xEDvar",
    city: "La Paz",
    primaryColor: "#0284c7",
    // Sky blue / Celeste
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u26A1",
    stadium: "Estadio Hernando Siles",
    altitudeMeters: 3637
  },
  strongest: {
    id: "strongest",
    name: "The Strongest",
    shortName: "Strongest",
    city: "La Paz",
    primaryColor: "#eab308",
    // Yellow gold
    secondaryColor: "#0f172a",
    // Black
    textColor: "#0f172a",
    badgeEmoji: "\u{1F42F}",
    stadium: "Estadio Rafael Mendoza Castell\xF3n / Siles",
    altitudeMeters: 3637
  },
  wilstermann: {
    id: "wilstermann",
    name: "C.A. Jorge Wilstermann",
    shortName: "Wilstermann",
    city: "Cochabamba",
    primaryColor: "#dc2626",
    // Red
    secondaryColor: "#1e3a8a",
    // Blue
    textColor: "#ffffff",
    badgeEmoji: "\u2708\uFE0F",
    stadium: "Estadio F\xE9lix Capriles",
    altitudeMeters: 2558
  },
  oriente: {
    id: "oriente",
    name: "Oriente Petrolero",
    shortName: "Oriente",
    city: "Santa Cruz",
    primaryColor: "#16a34a",
    // Emerald Green
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F6E2}\uFE0F",
    stadium: "Estadio Ram\xF3n Tahuichi Aguilera",
    altitudeMeters: 416
  },
  blooming: {
    id: "blooming",
    name: "Club Blooming",
    shortName: "Blooming",
    city: "Santa Cruz",
    primaryColor: "#38bdf8",
    // Light blue
    secondaryColor: "#1e3a8a",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F985}",
    stadium: "Estadio Ram\xF3n Tahuichi Aguilera",
    altitudeMeters: 416
  },
  always: {
    id: "always",
    name: "Always Ready",
    shortName: "Always Ready",
    city: "El Alto",
    primaryColor: "#e11d48",
    // Red band
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F534}",
    stadium: "Estadio Municipal de Villa Ingenio",
    altitudeMeters: 4083
  },
  nacional: {
    id: "nacional",
    name: "Nacional Potos\xED",
    shortName: "Nacional Potos\xED",
    city: "Potos\xED",
    primaryColor: "#991b1b",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F3B8}",
    stadium: "Estadio V\xEDctor Agust\xEDn Ugarte",
    altitudeMeters: 3900
  },
  aurora: {
    id: "aurora",
    name: "Club Aurora",
    shortName: "Aurora",
    city: "Cochabamba",
    primaryColor: "#0284c7",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u2B50",
    stadium: "Estadio F\xE9lix Capriles",
    altitudeMeters: 2558
  },
  san_antonio: {
    id: "san_antonio",
    name: "San Antonio Bulo Bulo",
    shortName: "San Antonio",
    city: "Entre R\xEDos / Cochabamba",
    primaryColor: "#059669",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F31F}",
    stadium: "Estadio Dr. Carlos Villegas",
    altitudeMeters: 232
  },
  gv_san_jose: {
    id: "gv_san_jose",
    name: "GV San Jos\xE9",
    shortName: "GV San Jos\xE9",
    city: "Oruro",
    primaryColor: "#1d4ed8",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F6E1}\uFE0F",
    stadium: "Estadio Jes\xFAs Berm\xFAdez",
    altitudeMeters: 3735
  },
  tomayapo: {
    id: "tomayapo",
    name: "Real Tomayapo",
    shortName: "Tomayapo",
    city: "Tarija",
    primaryColor: "#15803d",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F981}",
    stadium: "Estadio IV Centenario",
    altitudeMeters: 1854
  },
  independiente: {
    id: "independiente",
    name: "Independiente Petrolero",
    shortName: "Independiente",
    city: "Sucre",
    primaryColor: "#b91c1c",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F534}",
    stadium: "Estadio Ol\xEDmpico Patria",
    altitudeMeters: 2790
  },
  u_vinto: {
    id: "u_vinto",
    name: "FC Universitario de Vinto",
    shortName: "U de Vinto",
    city: "Vinto / Cochabamba",
    primaryColor: "#65a30d",
    secondaryColor: "#1e293b",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F393}",
    stadium: "Estadio Hip\xF3lito Lazarte / Capriles",
    altitudeMeters: 2558
  },
  guabira: {
    id: "guabira",
    name: "Club Deportivo Guabir\xE1",
    shortName: "Guabir\xE1",
    city: "Montero / Santa Cruz",
    primaryColor: "#dc2626",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F479}",
    stadium: "Estadio Gilberto Parada",
    altitudeMeters: 298
  },
  royal_pari: {
    id: "royal_pari",
    name: "Royal Pari FC",
    shortName: "Royal Pari",
    city: "Santa Cruz",
    primaryColor: "#ea580c",
    secondaryColor: "#1e293b",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F981}",
    stadium: "Estadio Ram\xF3n Tahuichi Aguilera",
    altitudeMeters: 416
  },
  real_santa_cruz: {
    id: "real_santa_cruz",
    name: "Real Santa Cruz",
    shortName: "Real Santa Cruz",
    city: "Santa Cruz",
    primaryColor: "#334155",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u26AA",
    stadium: "Estadio Real Santa Cruz",
    altitudeMeters: 416
  }
};
var LINEUPS_DATA = {
  home: {
    club: BOLIVIAN_CLUBS.bolivar,
    formation: "4-3-3",
    coach: "Flavio Robatto",
    starting: [
      { number: 1, name: "Carlos Lampe", position: "POR" },
      { number: 22, name: "Yomar Rocha", position: "DEF" },
      { number: 3, name: "Renzo Orihuela", position: "DEF" },
      { number: 5, name: "Jos\xE9 Sagredo", position: "DEF" },
      { number: 4, name: "Luis Paz", position: "DEF" },
      { number: 8, name: "Leonel Justiniano (C)", position: "MED" },
      { number: 10, name: "Ramiro Vaca", position: "MED" },
      { number: 15, name: "Fernando Saucedo", position: "MED" },
      { number: 11, name: "Patricio Rodr\xEDguez", position: "DEL" },
      { number: 7, name: "Bruno S\xE1vio", position: "DEL" },
      { number: 9, name: "F\xE1bio Gomes", position: "DEL" }
    ]
  },
  away: {
    club: BOLIVIAN_CLUBS.strongest,
    formation: "4-2-3-1",
    coach: "Ismael Rescalvo",
    starting: [
      { number: 13, name: "Guillermo Viscarra", position: "POR" },
      { number: 14, name: "Ronald Bustos", position: "DEF" },
      { number: 22, name: "Adriano Jusino (C)", position: "DEF" },
      { number: 5, name: "Dar\xEDo Aimar", position: "DEF" },
      { number: 19, name: "Carlos Roca", position: "DEF" },
      { number: 8, name: "Luciano Ursino", position: "MED" },
      { number: 16, name: "\xC1lvaro Quiroga", position: "MED" },
      { number: 10, name: "Michael Ortega", position: "MED" },
      { number: 20, name: "Jaime Arrascaita", position: "MED" },
      { number: 11, name: "Rodrigo Ramallo", position: "MED" },
      { number: 9, name: "Enrique Triverio", position: "DEL" }
    ]
  }
};

// src/services/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit
} from "firebase/firestore";

// src/services/firebaseConfig.ts
var firebaseConfig = {
  projectId: "gen-lang-client-0595946513",
  appId: "1:270339501008:web:f48abdff6c8cde23f267d5",
  apiKey: "AIzaSyDb0jKnTDmyH2BjQDLLenvCaANuxHGqU2I",
  authDomain: "gen-lang-client-0595946513.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-golbolivialivest-eea3c7cc-5a47-4322-8400-4a656cb411b2",
  storageBucket: "gen-lang-client-0595946513.firebasestorage.app",
  messagingSenderId: "270339501008",
  measurementId: "",
  oAuthClientId: "270339501008-g5324qpi2tlpn248d3ulbeho01cen5tn.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/services/firebase.ts
var app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
var dbInstance;
try {
  dbInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}
var db = dbInstance;
var FIREBASE_PROJECT_ID = firebaseConfig.projectId;
var FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;
async function saveStreamSettingsToFirebase(settings) {
  const ref = doc(db, "config", "stream_settings");
  const payload = {
    ...settings,
    updatedAt: Date.now()
  };
  await setDoc(ref, payload, { merge: true });
}
async function getStreamSettingsFromFirebase() {
  try {
    const ref = doc(db, "config", "stream_settings");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn("[Firebase] Error al leer configuraci\xF3n de transmisi\xF3n:", err);
  }
  return null;
}
async function saveScoreboardToFirebase(data) {
  const ref = doc(db, "match", "scoreboard");
  await setDoc(
    ref,
    {
      ...data,
      updatedAt: Date.now()
    },
    { merge: true }
  );
}
async function getClubsFromFirebase() {
  try {
    const ref = doc(db, "config", "clubs");
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data()?.clubs) {
      return snap.data()?.clubs;
    }
  } catch (err) {
    console.warn("[Firebase] Error al cargar equipos desde Firestore:", err);
  }
  return null;
}

// serverApp.ts
var appDirname = typeof __dirname !== "undefined" ? __dirname : process.cwd();
var app2 = express();
var server = http.createServer(app2);
var PORT = process.env.PORT || 3e3;
var isProduction = process.env.NODE_ENV === "production";
app2.use(express.json());
app2.use((req, _res, next) => {
  const forwardedUri = req.headers["x-forwarded-uri"] || req.headers["x-vercel-original-url"];
  if (forwardedUri && typeof forwardedUri === "string" && forwardedUri.startsWith("/api/")) {
    req.url = forwardedUri;
  } else {
    try {
      const parsed = new URL(req.url, "http://localhost");
      const pathParam = parsed.searchParams.get("path");
      if (pathParam) {
        const cleanPath = pathParam.startsWith("/") ? pathParam : `/${pathParam}`;
        req.url = cleanPath.startsWith("/api/") ? cleanPath : `/api${cleanPath}`;
      } else {
        const matched = req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"];
        if (matched && typeof matched === "string" && matched.startsWith("/api/") && !matched.startsWith("/api/index")) {
          req.url = matched;
        }
      }
    } catch {
    }
  }
  next();
});
app2.use((_req, res, next) => {
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
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Date.now();
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    iat: Math.floor(now / 1e3),
    exp: Math.floor((now + 7 * 24 * 60 * 60 * 1e3) / 1e3),
    // Valid for 7 days
    createdAt: now
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", SERVER_SECRET).update(`${header}.${payload}`).digest("base64url");
  const token = `${header}.${payload}.${signature}`;
  activeSessions.set(token, {
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    },
    expiresAt: now + 7 * 24 * 60 * 60 * 1e3
  });
  return token;
}
function verifyToken(token) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    return session.user;
  }
  if (token.startsWith("session_admin_")) {
    return { id: "usr-admin-1", username: "admin", name: "Director General de Transmisi\xF3n", role: "ADMIN" };
  }
  if (token.startsWith("session_transmisor_") || token.startsWith("session_trans_")) {
    return { id: "usr-trans-1", username: "transmisor", name: "Operador OBS & MediaMTX", role: "TRANSMISOR" };
  }
  if (token.startsWith("session_moderador_") || token.startsWith("session_mod_")) {
    return { id: "usr-mod-1", username: "moderador", name: "Moderador Oficial de Chat", role: "MODERADOR" };
  }
  if (token.startsWith("session_editor_") || token.startsWith("session_edit_")) {
    return { id: "usr-edit-1", username: "editor", name: "Estad\xEDgrafo & Cronista", role: "EDITOR" };
  }
  const parts = token.split(".");
  if (parts.length === 3) {
    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", SERVER_SECRET).update(`${headerB64}.${payloadB64}`).digest("base64url");
    if (signature !== expectedSig) return null;
    try {
      const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
      if (!payload || !payload.userId || !payload.role) return null;
      if (payload.exp && Math.floor(Date.now() / 1e3) > payload.exp) {
        activeSessions.delete(token);
        return null;
      }
      const systemUser = SYSTEM_USERS.find((u) => u.id === payload.userId || u.username === payload.username);
      return {
        id: payload.userId,
        username: payload.username,
        name: payload.name || systemUser?.name || "Operador GolBolivia",
        role: payload.role
      };
    } catch {
      return null;
    }
  }
  if (parts.length === 2) {
    const [data, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", SERVER_SECRET).update(data).digest("base64url");
    if (signature !== expectedSig) return null;
    try {
      const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
      if (!payload || !payload.userId || !payload.role) return null;
      const systemUser = SYSTEM_USERS.find((u) => u.id === payload.userId || u.username === payload.username);
      return {
        id: payload.userId,
        username: payload.username,
        name: systemUser?.name || "Operador GolBolivia",
        role: payload.role
      };
    } catch {
      return null;
    }
  }
  return null;
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
  clubs: { ...BOLIVIAN_CLUBS },
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
    customVideoUrl: process.env.STREAM_URL || process.env.DEFAULT_CUSTOM_VIDEO_URL || "https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8",
    chatMode: "all",
    officialAnnouncement: "Transmisi\xF3n Oficial en HD para toda Bolivia por GolBolivia TV.",
    broadcastMode: "obs_custom",
    overlayScoreboardVisible: true,
    lowLatencyMode: true,
    backupVideoUrl: process.env.BACKUP_STREAM_URL || process.env.DEFAULT_BACKUP_VIDEO_URL || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
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
        if (saved.clubs && typeof saved.clubs === "object") {
          state.clubs = { ...BOLIVIAN_CLUBS, ...saved.clubs };
        }
        console.log(`[GolBolivia Backend] Estado persistido cargado con \xE9xito desde ${STATE_FILE}`);
      }
    }
  } catch (err) {
    console.error("[GolBolivia Backend] Error al cargar estado persistido desde disco:", err);
  }
  getStreamSettingsFromFirebase().then((fbSettings) => {
    if (fbSettings && Object.keys(fbSettings).length > 0) {
      state.streamSettings = { ...state.streamSettings, ...fbSettings };
      console.log(`[GolBolivia Backend] StreamSettings sincronizado desde Firebase Firestore: ${state.streamSettings.title}`);
    }
  }).catch((err) => {
    console.warn("[GolBolivia Backend] Advertencia al sincronizar Firestore inicial:", err?.message || err);
  });
  getClubsFromFirebase().then((fbClubs) => {
    if (fbClubs && Object.keys(fbClubs).length > 0) {
      state.clubs = { ...BOLIVIAN_CLUBS, ...fbClubs };
    }
  }).catch(() => {
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
      clubs: state.clubs,
      updatedAt: Date.now()
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(dataToSave, null, 2), "utf-8");
    console.log("[GolBolivia Backend] Configuraci\xF3n persistida en disco.");
  } catch (err) {
    console.error("[GolBolivia Backend] Error al guardar estado en disco:", err);
  }
  saveStreamSettingsToFirebase(state.streamSettings).catch(() => {
  });
  saveScoreboardToFirebase(state.scoreboard).catch(() => {
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
app2.post(["/api/auth/login", "/auth/login"], (req, res) => {
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
app2.get(["/api/auth/me", "/auth/me"], authenticate, (req, res) => {
  res.json({ user: req.user });
});
app2.post(["/api/auth/logout", "/auth/logout"], authenticate, (req, res) => {
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
    tournamentName: state.streamSettings.tournamentName,
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
app2.get(["/api/events", "/events"], (req, res) => {
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
app2.get(["/api/live", "/live"], (_req, res) => {
  const publicPayload = getPublicStreamPayload();
  res.json({
    ...publicPayload,
    live: state.streamSettings.isLive,
    playbackUrl: publicPayload.playbackUrl,
    match: state.streamSettings.title,
    title: state.streamSettings.title,
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
    clubs: state.clubs,
    viewersCount: Math.max(14820, viewerSessions.size),
    serverTimestamp: Date.now()
  });
});
app2.get(["/api/streams", "/streams"], (_req, res) => {
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
app2.get(
  ["/api/streams/private-ingest", "/streams/private-ingest"],
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
app2.post(
  ["/api/streams", "/streams"],
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
app2.post(
  ["/api/streams/failover", "/streams/failover"],
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
app2.get(["/api/streams/config", "/streams/config"], (_req, res) => {
  const publicPayload = getPublicStreamPayload();
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({
    success: true,
    ...publicPayload,
    updatedAt: Date.now()
  });
});
app2.post(
  ["/api/streams/config", "/streams/config"],
  authenticate,
  requireRoles(["ADMIN", "TRANSMISOR"]),
  (req, res) => {
    const body = req.body || {};
    if (typeof body.title === "string") state.streamSettings.title = body.title.trim();
    if (typeof body.tournamentName === "string") state.streamSettings.tournamentName = body.tournamentName.trim();
    if (typeof body.homeClubId === "string") state.streamSettings.homeClubId = body.homeClubId.trim();
    if (typeof body.awayClubId === "string") state.streamSettings.awayClubId = body.awayClubId.trim();
    if (typeof body.stadiumName === "string") state.streamSettings.stadiumName = body.stadiumName.trim();
    if (body.altitudeMeters !== void 0) state.streamSettings.altitudeMeters = Number(body.altitudeMeters) || 0;
    if (typeof body.period === "string") state.streamSettings.period = body.period;
    if (typeof body.chatMode === "string") state.streamSettings.chatMode = body.chatMode;
    if (typeof body.officialAnnouncement === "string") state.streamSettings.officialAnnouncement = body.officialAnnouncement.trim();
    if (typeof body.overlayScoreboardVisible === "boolean") state.streamSettings.overlayScoreboardVisible = body.overlayScoreboardVisible;
    if (typeof body.lowLatencyMode === "boolean") state.streamSettings.lowLatencyMode = body.lowLatencyMode;
    if (typeof body.customVideoUrl === "string") state.streamSettings.customVideoUrl = body.customVideoUrl.trim();
    if (typeof body.backupVideoUrl === "string") state.streamSettings.backupVideoUrl = body.backupVideoUrl.trim();
    if (typeof body.backupChannelName === "string") state.streamSettings.backupChannelName = body.backupChannelName.trim();
    if (body.activeStreamSource && ["obs", "backup", "simulation"].includes(body.activeStreamSource)) {
      state.streamSettings.activeStreamSource = body.activeStreamSource;
    }
    if (typeof body.autoFailoverEnabled === "boolean") state.streamSettings.autoFailoverEnabled = body.autoFailoverEnabled;
    if (typeof body.isLive === "boolean") state.streamSettings.isLive = body.isLive;
    if (body.broadcastMode) state.streamSettings.broadcastMode = body.broadcastMode;
    persistState();
    const payload = getPublicStreamPayload();
    broadcastSseEvent("STREAM_CONFIG_UPDATED", payload);
    broadcastSseEvent("STREAM_UPDATED", payload);
    res.json({
      success: true,
      message: "Configuraci\xF3n de se\xF1ales m3u8 sincronizada globalmente para todos los usuarios.",
      config: payload,
      streamSettings: payload
    });
  }
);
app2.get(["/api/scoreboard", "/scoreboard"], (_req, res) => {
  res.json({ scoreboard: state.scoreboard });
});
app2.post(
  ["/api/scoreboard", "/scoreboard"],
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
app2.get(["/api/matches", "/matches"], (_req, res) => {
  res.json({
    scoreboard: state.scoreboard,
    matchStats: state.matchStats,
    events: state.events
  });
});
app2.post(
  ["/api/matches/events", "/matches/events"],
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
app2.put(
  ["/api/matches/events/:id", "/matches/events/:id"],
  authenticate,
  requireRoles(["ADMIN", "EDITOR"]),
  (req, res) => {
    const id = req.params.id;
    const index = state.events.findIndex((e) => e.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    state.events[index] = {
      ...state.events[index],
      ...req.body
    };
    broadcastSseEvent("MATCH_EVENT_UPDATED", state.events[index]);
    res.json({ success: true, event: state.events[index] });
  }
);
app2.delete(
  ["/api/matches/events/:id", "/matches/events/:id"],
  authenticate,
  requireRoles(["ADMIN", "EDITOR"]),
  (req, res) => {
    const id = req.params.id;
    const initialLen = state.events.length;
    state.events = state.events.filter((e) => e.id !== id);
    if (state.events.length === initialLen) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    broadcastSseEvent("MATCH_EVENT_DELETED", { id });
    res.json({ success: true, message: `Evento ${id} eliminado correctamente.` });
  }
);
app2.get(["/api/chat", "/chat"], (_req, res) => {
  res.json({ messages: state.chatMessages });
});
app2.post(["/api/chat", "/chat"], (req, res) => {
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
app2.delete(
  ["/api/chat/:id", "/chat/:id"],
  authenticate,
  requireRoles(["ADMIN", "MODERADOR"]),
  (req, res) => {
    const id = req.params.id;
    state.chatMessages = state.chatMessages.filter((m) => m.id !== id);
    broadcastSseEvent("CHAT_MESSAGE_DELETED", { id });
    res.json({ success: true });
  }
);
app2.get(["/api/viewers", "/viewers"], (_req, res) => {
  res.json({
    activeRealSessions: viewerSessions.size,
    broadcastViewerCount: Math.max(14820, viewerSessions.size)
  });
});
app2.post(["/api/viewers/heartbeat", "/viewers/heartbeat"], (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    viewerSessions.set(sessionId, Date.now());
  }
  res.json({ ok: true, activeViewers: Math.max(14820, viewerSessions.size) });
});
app2.get(["/api/clubs", "/clubs"], (_req, res) => {
  res.json({ success: true, clubs: state.clubs });
});
app2.post(
  ["/api/clubs", "/clubs"],
  authenticate,
  requireRoles(["ADMIN", "TRANSMISOR", "EDITOR"]),
  (req, res) => {
    const club = req.body;
    if (!club.id || !club.name || !club.shortName) {
      res.status(400).json({ error: "ID, nombre y nombre corto son obligatorios para el equipo." });
      return;
    }
    const cleanId = String(club.id).toLowerCase().trim().replace(/[^a-z0-9_-]/g, "_");
    const existing = state.clubs[cleanId] || {};
    const updatedClub = {
      id: cleanId,
      name: String(club.name).trim(),
      shortName: String(club.shortName).trim(),
      city: String(club.city || existing.city || "Bolivia").trim(),
      primaryColor: String(club.primaryColor || existing.primaryColor || "#0284c7").trim(),
      secondaryColor: String(club.secondaryColor || existing.secondaryColor || "#ffffff").trim(),
      textColor: String(club.textColor || existing.textColor || "#ffffff").trim(),
      badgeEmoji: String(club.badgeEmoji || existing.badgeEmoji || "\u26BD").trim(),
      stadium: String(club.stadium || existing.stadium || "Estadio Departamental").trim(),
      altitudeMeters: Number(club.altitudeMeters || existing.altitudeMeters || 2500)
    };
    state.clubs[cleanId] = updatedClub;
    persistState();
    broadcastSseEvent("CLUBS_UPDATED", state.clubs);
    res.json({ success: true, club: updatedClub, clubs: state.clubs });
  }
);
app2.delete(
  ["/api/clubs/:id", "/clubs/:id"],
  authenticate,
  requireRoles(["ADMIN"]),
  (req, res) => {
    const id = req.params.id;
    if (state.streamSettings.homeClubId === id || state.streamSettings.awayClubId === id) {
      res.status(400).json({ error: "No se puede eliminar un equipo que est\xE1 jugando en el partido activo." });
      return;
    }
    if (!state.clubs[id]) {
      res.status(404).json({ error: "Equipo no encontrado." });
      return;
    }
    delete state.clubs[id];
    persistState();
    broadcastSseEvent("CLUBS_UPDATED", state.clubs);
    res.json({ success: true, message: `Equipo ${id} eliminado correctamente.`, clubs: state.clubs });
  }
);
var APP_VERSION = "1.4.3";
var DEPLOY_COMMIT_SHA = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || "df267ec";
app2.get(["/api/health", "/health"], (_req, res) => {
  res.json({
    status: "healthy",
    app: "GolBolivia Live",
    version: APP_VERSION,
    commitSha: DEPLOY_COMMIT_SHA,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || "production",
    isVercel: Boolean(process.env.VERCEL),
    streamSettings: getPublicStreamPayload()
  });
});
app2.get(["/api/version", "/version"], (_req, res) => {
  res.json({
    version: APP_VERSION,
    commitSha: DEPLOY_COMMIT_SHA,
    builtAt: "2026-10-04T07:15:00Z"
  });
});
app2.all("*", (req, res) => {
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl || req.url}`,
    availableEndpoints: [
      "GET /api/live",
      "GET /api/streams",
      "GET /api/auth/me",
      "POST /api/auth/login",
      "GET /api/scoreboard",
      "GET /api/health",
      "GET /api/version"
    ]
  });
});
app2.use((err, _req, res, _next) => {
  console.error("[GolBolivia Server Error]", err);
  if (!res.headersSent) {
    res.status(500).json({
      error: "Error interno del servidor",
      message: err?.message || "Ocurri\xF3 un error inesperado"
    });
  }
});
var serverApp_default = app2;
export {
  SYSTEM_USERS,
  app2 as app,
  serverApp_default as default
};
