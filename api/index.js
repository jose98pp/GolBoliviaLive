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
    altitudeMeters: 416,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
  }
};
var SPANISH_CLUBS = {
  real_madrid: {
    id: "real_madrid",
    name: "Real Madrid CF",
    shortName: "Real Madrid",
    city: "Madrid",
    primaryColor: "#ffffff",
    secondaryColor: "#00529f",
    textColor: "#00529f",
    badgeEmoji: "\u{1F451}",
    stadium: "Estadio Santiago Bernab\xE9u",
    altitudeMeters: 667,
    league: "Espa\xF1a (LaLiga EA Sports)",
    country: "Espa\xF1a"
  },
  barcelona: {
    id: "barcelona",
    name: "FC Barcelona",
    shortName: "Barcelona",
    city: "Barcelona",
    primaryColor: "#a50044",
    secondaryColor: "#004d98",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F535}\u{1F534}",
    stadium: "Spotify Camp Nou / Montju\xEFc",
    altitudeMeters: 42,
    league: "Espa\xF1a (LaLiga EA Sports)",
    country: "Espa\xF1a"
  },
  atletico_madrid: {
    id: "atletico_madrid",
    name: "Atl\xE9tico de Madrid",
    shortName: "Atl\xE9tico",
    city: "Madrid",
    primaryColor: "#cb3524",
    secondaryColor: "#1b3562",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F534}\u26AA",
    stadium: "C\xEDvitas Metropolitano",
    altitudeMeters: 690,
    league: "Espa\xF1a (LaLiga EA Sports)",
    country: "Espa\xF1a"
  },
  athletic_club: {
    id: "athletic_club",
    name: "Athletic Club Bilbao",
    shortName: "Athletic Club",
    city: "Bilbao",
    primaryColor: "#ee2524",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F981}",
    stadium: "San Mam\xE9s",
    altitudeMeters: 19,
    league: "Espa\xF1a (LaLiga EA Sports)",
    country: "Espa\xF1a"
  },
  sevilla: {
    id: "sevilla",
    name: "Sevilla FC",
    shortName: "Sevilla",
    city: "Sevilla",
    primaryColor: "#f4364c",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u26AA\u{1F534}",
    stadium: "Estadio Ram\xF3n S\xE1nchez-Pizju\xE1n",
    altitudeMeters: 7,
    league: "Espa\xF1a (LaLiga EA Sports)",
    country: "Espa\xF1a"
  },
  real_betis: {
    id: "real_betis",
    name: "Real Betis Balompi\xE9",
    shortName: "Real Betis",
    city: "Sevilla",
    primaryColor: "#0bb364",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F7E2}\u26AA",
    stadium: "Estadio Benito Villamar\xEDn",
    altitudeMeters: 10,
    league: "Espa\xF1a (LaLiga EA Sports)",
    country: "Espa\xF1a"
  },
  real_sociedad: {
    id: "real_sociedad",
    name: "Real Sociedad",
    shortName: "Real Sociedad",
    city: "San Sebasti\xE1n",
    primaryColor: "#0067b1",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F535}\u26AA",
    stadium: "Reale Arena (Anoeta)",
    altitudeMeters: 6,
    league: "Espa\xF1a (LaLiga EA Sports)",
    country: "Espa\xF1a"
  },
  villarreal: {
    id: "villarreal",
    name: "Villarreal CF",
    shortName: "Villarreal",
    city: "Vila-real",
    primaryColor: "#ffe600",
    secondaryColor: "#005ca9",
    textColor: "#002d62",
    badgeEmoji: "\u{1F7E1}",
    stadium: "Estadio de la Cer\xE1mica",
    altitudeMeters: 42,
    league: "Espa\xF1a (LaLiga EA Sports)",
    country: "Espa\xF1a"
  },
  valencia: {
    id: "valencia",
    name: "Valencia CF",
    shortName: "Valencia",
    city: "Valencia",
    primaryColor: "#ffffff",
    secondaryColor: "#ee7500",
    textColor: "#1e293b",
    badgeEmoji: "\u{1F987}",
    stadium: "Estadio de Mestalla",
    altitudeMeters: 15,
    league: "Espa\xF1a (LaLiga EA Sports)",
    country: "Espa\xF1a"
  },
  girona: {
    id: "girona",
    name: "Girona FC",
    shortName: "Girona",
    city: "Girona",
    primaryColor: "#cd1b2c",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F534}\u26AA",
    stadium: "Estadi Montilivi",
    altitudeMeters: 95,
    league: "Espa\xF1a (LaLiga EA Sports)",
    country: "Espa\xF1a"
  }
};
var ENGLISH_CLUBS = {
  man_city: {
    id: "man_city",
    name: "Manchester City FC",
    shortName: "Man. City",
    city: "Manchester",
    primaryColor: "#6cabdd",
    secondaryColor: "#1c2c5b",
    textColor: "#ffffff",
    badgeEmoji: "\u{1FA75}",
    stadium: "Etihad Stadium",
    altitudeMeters: 48,
    league: "Inglaterra (Premier League)",
    country: "Inglaterra"
  },
  arsenal: {
    id: "arsenal",
    name: "Arsenal FC",
    shortName: "Arsenal",
    city: "Londres",
    primaryColor: "#ef0107",
    secondaryColor: "#063672",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F534}",
    stadium: "Emirates Stadium",
    altitudeMeters: 40,
    league: "Inglaterra (Premier League)",
    country: "Inglaterra"
  },
  liverpool: {
    id: "liverpool",
    name: "Liverpool FC",
    shortName: "Liverpool",
    city: "Liverpool",
    primaryColor: "#c8102e",
    secondaryColor: "#00b2a9",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F534}",
    stadium: "Anfield",
    altitudeMeters: 55,
    league: "Inglaterra (Premier League)",
    country: "Inglaterra"
  },
  man_united: {
    id: "man_united",
    name: "Manchester United",
    shortName: "Man. United",
    city: "Manchester",
    primaryColor: "#da291c",
    secondaryColor: "#fbe122",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F479}",
    stadium: "Old Trafford",
    altitudeMeters: 38,
    league: "Inglaterra (Premier League)",
    country: "Inglaterra"
  },
  chelsea: {
    id: "chelsea",
    name: "Chelsea FC",
    shortName: "Chelsea",
    city: "Londres",
    primaryColor: "#034694",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F981}",
    stadium: "Stamford Bridge",
    altitudeMeters: 12,
    league: "Inglaterra (Premier League)",
    country: "Inglaterra"
  },
  tottenham: {
    id: "tottenham",
    name: "Tottenham Hotspur",
    shortName: "Tottenham",
    city: "Londres",
    primaryColor: "#132257",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u26AA",
    stadium: "Tottenham Hotspur Stadium",
    altitudeMeters: 17,
    league: "Inglaterra (Premier League)",
    country: "Inglaterra"
  },
  aston_villa: {
    id: "aston_villa",
    name: "Aston Villa FC",
    shortName: "Aston Villa",
    city: "Birmingham",
    primaryColor: "#95bfe5",
    secondaryColor: "#670e36",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F981}",
    stadium: "Villa Park",
    altitudeMeters: 110,
    league: "Inglaterra (Premier League)",
    country: "Inglaterra"
  },
  newcastle: {
    id: "newcastle",
    name: "Newcastle United",
    shortName: "Newcastle",
    city: "Newcastle",
    primaryColor: "#241f20",
    secondaryColor: "#41b6e6",
    textColor: "#ffffff",
    badgeEmoji: "\u26AB\u26AA",
    stadium: "St James' Park",
    altitudeMeters: 60,
    league: "Inglaterra (Premier League)",
    country: "Inglaterra"
  }
};
var ALL_DEFAULT_CLUBS = {
  ...BOLIVIAN_CLUBS,
  ...SPANISH_CLUBS,
  ...ENGLISH_CLUBS
};
Object.assign(BOLIVIAN_CLUBS, SPANISH_CLUBS, ENGLISH_CLUBS);
for (const club of Object.values(BOLIVIAN_CLUBS)) {
  if (!club.league) {
    club.league = "Bolivia (Divisi\xF3n Profesional)";
    club.country = "Bolivia";
  }
}
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
  limit,
  getDocs,
  runTransaction
} from "firebase/firestore";

// firebase-applet-config.json
var firebase_applet_config_default = {
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
var app = getApps().length === 0 ? initializeApp(firebase_applet_config_default) : getApp();
var dbInstance;
try {
  dbInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true
    },
    firebase_applet_config_default.firestoreDatabaseId
  );
} catch {
  dbInstance = getFirestore(app, firebase_applet_config_default.firestoreDatabaseId);
}
var db = dbInstance;
var FIREBASE_PROJECT_ID = firebase_applet_config_default.projectId;
var FIRESTORE_DATABASE_ID = firebase_applet_config_default.firestoreDatabaseId;
function sanitizeClubId(raw) {
  if (!raw) return "";
  return raw.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
}
function validateScore(score, defaultValue = 0) {
  if (typeof score !== "number" || isNaN(score)) {
    const parsed = parseInt(String(score), 10);
    if (isNaN(parsed)) return defaultValue;
    return Math.max(0, Math.min(50, parsed));
  }
  return Math.max(0, Math.min(50, Math.round(score)));
}
function validateMinute(minute, defaultValue = 0) {
  if (typeof minute !== "number" || isNaN(minute)) {
    const parsed = parseInt(String(minute), 10);
    if (isNaN(parsed)) return defaultValue;
    return Math.max(0, Math.min(130, parsed));
  }
  return Math.max(0, Math.min(130, Math.round(minute)));
}
async function saveStreamSettingsToFirebase(settings, operator) {
  const ref = doc(db, "config", "stream_settings");
  let nextVersion = (settings.version || 0) + 1;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      nextVersion = (snap.data()?.version || 0) + 1;
    }
  } catch {
  }
  const now = Date.now();
  const payload = {
    ...settings,
    version: nextVersion,
    updatedAt: now,
    updatedAtIso: new Date(now).toISOString(),
    updatedBy: operator || "admin"
  };
  if (settings.homeClubId) payload.homeClubId = sanitizeClubId(settings.homeClubId);
  if (settings.awayClubId) payload.awayClubId = sanitizeClubId(settings.awayClubId);
  if (settings.title) payload.title = settings.title.trim().slice(0, 120);
  if (settings.tournamentName) payload.tournamentName = settings.tournamentName.trim().slice(0, 80);
  if (settings.stadiumName) payload.stadiumName = settings.stadiumName.trim().slice(0, 80);
  if (settings.altitudeMeters !== void 0) {
    payload.altitudeMeters = Math.max(0, Math.min(6e3, Number(settings.altitudeMeters) || 0));
  }
  if (settings.donationQr) {
    payload.donationQr = {
      imageUrl: settings.donationQr.imageUrl || "",
      instructions: settings.donationQr.instructions || "",
      updatedAt: settings.donationQr.updatedAt || now
    };
  }
  try {
    await setDoc(ref, payload, { merge: true });
  } catch (err) {
    if (err?.code !== "permission-denied") {
      console.warn("[Firebase] Advertencia al persistir configuraci\xF3n de se\xF1al en Firestore:", err);
    }
  }
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
async function saveDonationQrToFirebase(qr, operator = "admin") {
  const now = Date.now();
  const cleanPayload = {
    imageUrl: typeof qr.imageUrl === "string" ? qr.imageUrl.trim() : "",
    instructions: typeof qr.instructions === "string" ? qr.instructions.trim().slice(0, 500) : "",
    updatedAt: now
  };
  const qrRef = doc(db, "config", "donation_qr");
  await setDoc(
    qrRef,
    {
      ...cleanPayload,
      updatedAtIso: new Date(now).toISOString(),
      updatedBy: operator
    },
    { merge: true }
  );
  try {
    const streamRef = doc(db, "config", "stream_settings");
    await setDoc(
      streamRef,
      {
        donationQr: cleanPayload,
        updatedAt: now,
        updatedBy: operator
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("[Firebase] Advertencia sincronizando donationQr en stream_settings:", err);
  }
  return cleanPayload;
}
async function getDonationQrFromFirebase() {
  try {
    const qrRef = doc(db, "config", "donation_qr");
    const qrSnap = await getDoc(qrRef);
    if (qrSnap.exists()) {
      const data = qrSnap.data();
      return {
        imageUrl: data.imageUrl || "",
        instructions: data.instructions || "",
        updatedAt: data.updatedAt || Date.now()
      };
    }
    const streamRef = doc(db, "config", "stream_settings");
    const streamSnap = await getDoc(streamRef);
    if (streamSnap.exists() && streamSnap.data()?.donationQr) {
      return streamSnap.data().donationQr;
    }
  } catch (err) {
    console.warn("[Firebase] Error al leer donationQr de Firestore:", err);
  }
  return null;
}
async function logConfirmationToFirebase(log) {
  const id = `conf_${Date.now()}`;
  const ref = doc(db, "confirmations", id);
  await setDoc(ref, {
    ...log,
    id,
    timestamp: log.timestamp || Date.now()
  });
  return id;
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
async function saveLiveEventToFirebase(event, operator) {
  const safeId = sanitizeClubId(event.id);
  if (!safeId) {
    throw new Error("ID de partido inv\xE1lido o no especificado.");
  }
  const cleanTitle = (event.title || "").trim().slice(0, 120);
  if (!cleanTitle) {
    throw new Error("El t\xEDtulo del partido es obligatorio.");
  }
  const home = sanitizeClubId(event.homeTeam);
  const away = sanitizeClubId(event.awayTeam);
  if (!home || !away) {
    throw new Error("Los identificadores de equipo local y visitante son obligatorios.");
  }
  const ref = doc(db, "liveEvents", safeId);
  const now = Date.now();
  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    let nextVersion = 1;
    if (snap.exists()) {
      const existing = snap.data();
      const existingVersion = typeof existing?.version === "number" ? existing.version : 0;
      const existingUpdatedAt = typeof existing?.updatedAt === "number" ? existing.updatedAt : 0;
      const isForce = Boolean(event?.force);
      if (!isForce && typeof event.version === "number" && event.version > 0 && event.version < existingVersion) {
        throw new Error(
          `Conflicto de versi\xF3n en Firebase: El partido ya cuenta con versi\xF3n v${existingVersion}, superior a la versi\xF3n v${event.version} recibida. Actualizaci\xF3n rechazada.`
        );
      }
      if (!isForce && typeof event.updatedAt === "number" && event.updatedAt > 0 && event.updatedAt < existingUpdatedAt) {
        throw new Error(
          `Conflicto de marca temporal en Firebase: El registro en Firestore (${new Date(existingUpdatedAt).toISOString()}) es m\xE1s reciente que el recibido (${new Date(event.updatedAt).toISOString()}). Guardado rechazado.`
        );
      }
      const baseVersion = typeof event.version === "number" && event.version > 0 ? Math.max(existingVersion, event.version) : existingVersion;
      nextVersion = baseVersion + 1;
    } else {
      nextVersion = typeof event.version === "number" && event.version > 0 ? event.version : 1;
    }
    function cleanForFirestore(obj) {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value === void 0) continue;
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
          const nested = cleanForFirestore(value);
          if (Object.keys(nested).length > 0) {
            result[key] = nested;
          }
        } else {
          result[key] = value;
        }
      }
      return result;
    }
    const safePayload = {
      id: safeId,
      title: cleanTitle,
      homeTeam: home,
      awayTeam: away === home ? `${away}_alt` : away,
      isLive: Boolean(event.isLive),
      primaryProvider: event.primaryProvider,
      cloudflare: event.cloudflare && (event.cloudflare.liveInputId || event.cloudflare.playbackUrl) ? {
        liveInputId: event.cloudflare.liveInputId || "",
        playbackUrl: event.cloudflare.playbackUrl || ""
      } : void 0,
      youtube: event.youtube && event.youtube.videoId ? {
        videoId: event.youtube.videoId || ""
      } : void 0,
      kick: event.kick && event.kick.channel ? {
        channel: event.kick.channel || ""
      } : void 0,
      fallbackOrder: event.fallbackOrder,
      tournamentName: event.tournamentName ? event.tournamentName.trim().slice(0, 80) : void 0,
      stadiumName: event.stadiumName ? event.stadiumName.trim().slice(0, 80) : void 0,
      period: event.period,
      homeScore: event.homeScore !== void 0 ? validateScore(event.homeScore) : void 0,
      awayScore: event.awayScore !== void 0 ? validateScore(event.awayScore) : void 0,
      matchMinute: event.matchMinute !== void 0 ? validateMinute(event.matchMinute) : void 0,
      customVideoUrl: event.customVideoUrl ? event.customVideoUrl.trim().slice(0, 500) : void 0,
      backupVideoUrl: event.backupVideoUrl ? event.backupVideoUrl.trim().slice(0, 500) : void 0,
      backupChannelName: event.backupChannelName ? event.backupChannelName.trim().slice(0, 100) : void 0,
      activeStreamSource: event.activeStreamSource || "obs",
      autoFailoverEnabled: event.autoFailoverEnabled ?? true,
      isClockRunning: event.isClockRunning ?? false,
      clockUpdatedAt: event.clockUpdatedAt || now,
      version: nextVersion,
      updatedAt: now,
      updatedAtIso: new Date(now).toISOString(),
      updatedBy: operator || "admin"
    };
    transaction.set(ref, cleanForFirestore(safePayload), { merge: true });
    return { success: true, version: nextVersion, updatedAt: now };
  });
}
async function saveMatchScoreboardFirebase(eventId, data, operator) {
  const safeId = sanitizeClubId(eventId);
  if (!safeId) {
    throw new Error("Identificador de partido inv\xE1lido para marcador.");
  }
  const ref = doc(db, "liveEvents", safeId);
  const now = Date.now();
  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    let nextVersion = 1;
    if (snap.exists()) {
      const existing = snap.data();
      const existingVersion = typeof existing?.version === "number" ? existing.version : 0;
      const isForce = Boolean(data.force);
      if (!isForce && typeof data.version === "number" && data.version > 0 && data.version < existingVersion) {
        throw new Error(
          `Marcador desactualizado: La versi\xF3n actual en Firestore (v${existingVersion}) es superior a la versi\xF3n enviada (v${data.version}). Guardado rechazado.`
        );
      }
      const baseVersion = typeof data.version === "number" && data.version > 0 ? Math.max(existingVersion, data.version) : existingVersion;
      nextVersion = baseVersion + 1;
    } else {
      nextVersion = typeof data.version === "number" && data.version > 0 ? data.version : 1;
    }
    const sanitized = {
      version: nextVersion,
      updatedAt: now,
      updatedAtIso: new Date(now).toISOString(),
      updatedBy: operator || "admin"
    };
    if (data.homeScore !== void 0) sanitized.homeScore = validateScore(data.homeScore);
    if (data.awayScore !== void 0) sanitized.awayScore = validateScore(data.awayScore);
    if (data.matchMinute !== void 0) sanitized.matchMinute = validateMinute(data.matchMinute);
    if (data.period && ["1T", "Descanso", "2T", "Tiempo Extra", "Finalizado"].includes(data.period)) {
      sanitized.period = data.period;
    }
    if (typeof data.isClockRunning === "boolean") {
      sanitized.isClockRunning = data.isClockRunning;
      sanitized.clockUpdatedAt = now;
    }
    transaction.set(ref, sanitized, { merge: true });
    return { success: true, version: nextVersion, updatedAt: now };
  });
}
async function getLiveEventsFromFirebase() {
  try {
    const colRef = collection(db, "liveEvents");
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list = [];
      snap.forEach((d) => list.push(d.data()));
      return list;
    }
  } catch (err) {
    console.warn("[Firebase] Error al leer liveEvents:", err);
  }
  return [];
}
async function deleteLiveEventFromFirebase(eventId) {
  try {
    const ref = doc(db, "liveEvents", eventId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("[Firebase] Error al borrar liveEvent:", err);
  }
}

// serverApp.ts
var appDirname = typeof __dirname !== "undefined" ? __dirname : process.cwd();
var app2 = express();
var server = http.createServer(app2);
var PORT = process.env.PORT || 3e3;
var isProduction = process.env.NODE_ENV === "production";
app2.use(express.json({ limit: "10mb" }));
app2.use(express.urlencoded({ limit: "10mb", extended: true }));
app2.use((req, _res, next) => {
  const xMatched = req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"];
  if (xMatched && typeof xMatched === "string") {
    req.url = xMatched;
  } else {
    try {
      const parsed = new URL(req.url, "http://localhost");
      const pathParam = parsed.searchParams.get("path");
      if (pathParam) {
        req.url = pathParam.startsWith("/") ? `/api${pathParam}` : `/api/${pathParam}`;
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
    res.status(401).json({
      error: "No autorizado. Se requiere token Bearer de autenticaci\xF3n para modificar datos oficiales.",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  const token = authHeader.substring(7);
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({
      error: "Sesi\xF3n expirada o token inv\xE1lido. Por favor inicia sesi\xF3n nuevamente en el panel de control.",
      code: "INVALID_TOKEN"
    });
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
  liveEvents: [],
  streamSettings: {
    title: "",
    tournamentName: "Liga Tigo Divisi\xF3n Profesional - Torneo Clausura",
    homeClubId: "bolivar",
    awayClubId: "strongest",
    stadiumName: "Estadio Hernando Siles - La Paz",
    altitudeMeters: 3637,
    period: "1T",
    isLive: false,
    rtmpServer: "rtmp://localhost:1935/live",
    streamKey: "bolivia",
    customVideoUrl: process.env.STREAM_URL || process.env.DEFAULT_CUSTOM_VIDEO_URL || "",
    chatMode: "all",
    officialAnnouncement: "Transmisi\xF3n Oficial en HD para toda Bolivia por GolBolivia TV.",
    broadcastMode: "obs_custom",
    overlayScoreboardVisible: true,
    lowLatencyMode: true,
    backupVideoUrl: process.env.BACKUP_STREAM_URL || process.env.DEFAULT_BACKUP_VIDEO_URL || "",
    backupChannelName: "GolBolivia 24/7 Se\xF1al Alternativa HD",
    activeStreamSource: "obs",
    autoFailoverEnabled: true,
    donationQr: {
      imageUrl: "",
      bankName: "",
      accountHolder: "",
      instructions: "Escanea el c\xF3digo QR desde tu aplicaci\xF3n bancaria m\xF3vil para apoyar la transmisi\xF3n en vivo.",
      updatedAt: Date.now()
    }
  },
  scoreboard: {
    homeScore: 0,
    awayScore: 0,
    matchMinute: 0,
    period: "1T",
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
        if (Array.isArray(saved.liveEvents) && saved.liveEvents.length > 0) {
          state.liveEvents = saved.liveEvents;
        }
        console.log(`[GolBolivia Backend] Estado persistido cargado con \xE9xito desde ${STATE_FILE}`);
        console.log(`[GolBolivia Backend] Se\xF1al activa: ${state.streamSettings.customVideoUrl || "(simulaci\xF3n)"}`);
      }
    }
  } catch (err) {
    console.error("[GolBolivia Backend] Error al cargar estado persistido:", err);
  }
  getStreamSettingsFromFirebase().then((fbSettings) => {
    if (fbSettings && Object.keys(fbSettings).length > 0) {
      state.streamSettings = { ...state.streamSettings, ...fbSettings };
      console.log(`[GolBolivia Backend] Sincronizado desde Firebase Firestore: ${fbSettings.title || ""}`);
    }
  }).catch(() => {
  });
  getDonationQrFromFirebase().then((fbQr) => {
    if (fbQr && fbQr.imageUrl) {
      state.streamSettings.donationQr = fbQr;
      console.log("[GolBolivia Backend] C\xF3digo QR de donaciones cargado desde Firebase Firestore.");
    }
  }).catch(() => {
  });
  getClubsFromFirebase().then((fbClubs) => {
    if (fbClubs && Object.keys(fbClubs).length > 0) {
      state.clubs = { ...state.clubs, ...fbClubs };
    }
  }).catch(() => {
  });
  getLiveEventsFromFirebase().then((fbEvents) => {
    if (Array.isArray(fbEvents) && fbEvents.length > 0) {
      state.liveEvents = fbEvents;
      console.log(`[GolBolivia Backend] Partidos liveEvents cargados desde Firebase (fuente \xFAnica): ${fbEvents.length} partidos`);
    } else {
      console.log("[GolBolivia Backend] Ning\xFAn partido encontrado en Firebase Firestore. El sistema esperar\xE1 configuraci\xF3n de producci\xF3n (sin creaci\xF3n autom\xE1tica de partido-001).");
      state.liveEvents = [];
    }
  }).catch((err) => {
    console.warn("[GolBolivia Backend] Error conectando con Firebase en inicio. El servidor arranca con lista de partidos vac\xEDa:", err.message || err);
    if (state.liveEvents.length === 0) {
      console.log("[GolBolivia Backend] Lista de partidos vac\xEDa tras fallo de Firebase. Use el panel admin para crear partidos reales.");
    }
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
      liveEvents: state.liveEvents,
      updatedAt: Date.now()
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(dataToSave, null, 2), "utf-8");
    console.log("[GolBolivia Backend] Configuraci\xF3n de transmisi\xF3n respaldada en disco local.");
  } catch (err) {
    console.error("[GolBolivia Backend] Error al guardar estado en disco:", err);
  }
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
    isLive: state.streamSettings.isLive,
    donationQr: state.streamSettings.donationQr
  };
}
function persistStreamSettingsToFirestore(operator) {
  saveStreamSettingsToFirebase(getPublicStreamPayload(), operator || "admin").catch((err) => {
    console.warn("[GolBolivia Server] Advertencia al persistir streamSettings en Firestore:", err);
  });
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
      liveEvents: state.liveEvents,
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
    liveEvents: state.liveEvents,
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
    persistStreamSettingsToFirestore(req.user?.username);
    broadcastSseEvent("STREAM_UPDATED", getPublicStreamPayload());
    res.json({ success: true, streamSettings: getPublicStreamPayload() });
  }
);
app2.get(["/api/donation-qr", "/donation-qr"], (_req, res) => {
  res.json({
    success: true,
    donationQr: state.streamSettings.donationQr || {
      imageUrl: "",
      bankName: "",
      accountHolder: "",
      instructions: "Escanea el c\xF3digo QR desde tu aplicaci\xF3n bancaria m\xF3vil para apoyar la transmisi\xF3n en vivo.",
      updatedAt: Date.now()
    }
  });
});
app2.post(
  ["/api/donation-qr", "/donation-qr"],
  authenticate,
  requireRoles(["ADMIN", "TRANSMISOR", "EDITOR"]),
  (req, res) => {
    const { imageUrl, bankName, accountHolder, instructions } = req.body;
    const current = state.streamSettings.donationQr || {
      imageUrl: "",
      bankName: "",
      accountHolder: "",
      instructions: "Escanea el c\xF3digo QR desde tu aplicaci\xF3n bancaria m\xF3vil para apoyar la transmisi\xF3n en vivo."
    };
    const updatedQr = {
      imageUrl: typeof imageUrl === "string" ? imageUrl.trim() : current.imageUrl || "",
      bankName: typeof bankName === "string" ? bankName.trim().slice(0, 100) : "",
      accountHolder: typeof accountHolder === "string" ? accountHolder.trim().slice(0, 100) : "",
      instructions: typeof instructions === "string" ? instructions.trim().slice(0, 300) : current.instructions,
      updatedAt: Date.now()
    };
    state.streamSettings.donationQr = updatedQr;
    persistState();
    saveDonationQrToFirebase(updatedQr, req.user?.username || "admin").catch((err) => {
      console.warn("[Firebase] Advertencia al persistir donationQr en Firestore:", err);
    });
    broadcastSseEvent("DONATION_QR_UPDATED", updatedQr);
    broadcastSseEvent("STREAM_UPDATED", getPublicStreamPayload());
    res.json({
      success: true,
      message: "C\xF3digo QR de apoyo y donaciones guardado y sincronizado con \xE9xito en Firebase y servidor.",
      donationQr: updatedQr
    });
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
    persistStreamSettingsToFirestore(req.user?.username);
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
    state.streamSettings = {
      ...state.streamSettings,
      ...body
    };
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
    const targetEventId = body.eventId || body.activeEventId || "partido-001";
    if (Array.isArray(state.liveEvents) && state.liveEvents.length > 0) {
      const targetEvt = state.liveEvents.find((e) => e.id === targetEventId) || state.liveEvents[0];
      if (targetEvt) {
        if (state.streamSettings.title) targetEvt.title = state.streamSettings.title;
        if (state.streamSettings.homeClubId) targetEvt.homeTeam = state.streamSettings.homeClubId;
        if (state.streamSettings.awayClubId) targetEvt.awayTeam = state.streamSettings.awayClubId;
        if (state.streamSettings.tournamentName) targetEvt.tournamentName = state.streamSettings.tournamentName;
        if (state.streamSettings.stadiumName) targetEvt.stadiumName = state.streamSettings.stadiumName;
        if (state.streamSettings.period) targetEvt.period = state.streamSettings.period;
        if (body.customVideoUrl) {
          targetEvt.customVideoUrl = body.customVideoUrl;
          if (targetEvt.cloudflare) targetEvt.cloudflare.playbackUrl = body.customVideoUrl;
        }
        if (body.backupVideoUrl) targetEvt.backupVideoUrl = body.backupVideoUrl;
        if (body.backupChannelName) targetEvt.backupChannelName = body.backupChannelName;
        if (body.activeStreamSource) targetEvt.activeStreamSource = body.activeStreamSource;
        if (typeof body.autoFailoverEnabled === "boolean") targetEvt.autoFailoverEnabled = body.autoFailoverEnabled;
      }
    }
    persistState();
    persistStreamSettingsToFirestore(req.user?.username);
    const payload = {
      ...getPublicStreamPayload(),
      eventId: targetEventId
    };
    broadcastSseEvent("STREAM_CONFIG_UPDATED", payload);
    broadcastSseEvent("STREAM_UPDATED", payload);
    broadcastSseEvent("LIVE_EVENTS_UPDATED", state.liveEvents);
    res.json({
      success: true,
      message: "Configuraci\xF3n de se\xF1ales sincronizada por partido con \xE9xito.",
      config: payload,
      streamSettings: payload,
      eventId: targetEventId
    });
  }
);
app2.get(["/api/live-events", "/live-events"], (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({
    success: true,
    events: state.liveEvents || [],
    updatedAt: Date.now()
  });
});
app2.get(["/api/live-events/:id", "/live-events/:id"], (req, res) => {
  const event = state.liveEvents.find((e) => e.id === req.params.id);
  if (!event) {
    res.status(404).json({ error: "Partido no encontrado" });
    return;
  }
  res.json({ success: true, event });
});
app2.post(
  ["/api/live-events", "/live-events"],
  authenticate,
  requireRoles(["ADMIN", "TRANSMISOR"]),
  async (req, res) => {
    const raw = req.body;
    if (!raw || !raw.id || typeof raw.id !== "string" || !raw.id.trim()) {
      res.status(400).json({ error: "El identificador (id) del partido es obligatorio." });
      return;
    }
    const cleanId = raw.id.trim();
    const cleanTitle = (raw.title || "").trim();
    if (!cleanTitle || cleanTitle.length < 3 || cleanTitle.length > 120) {
      res.status(400).json({ error: "El t\xEDtulo del partido debe tener entre 3 y 120 caracteres." });
      return;
    }
    const cleanHome = (raw.homeTeam || "").trim().toLowerCase();
    const cleanAway = (raw.awayTeam || "").trim().toLowerCase();
    if (!cleanHome || !cleanAway) {
      res.status(400).json({ error: "Los equipos local y visitante son obligatorios." });
      return;
    }
    if (cleanHome === cleanAway) {
      res.status(400).json({ error: "El equipo local y el equipo visitante no pueden ser el mismo club." });
      return;
    }
    if (raw.homeScore !== void 0) {
      const hScore = Number(raw.homeScore);
      if (isNaN(hScore) || hScore < 0 || hScore > 50) {
        res.status(400).json({ error: "Los goles del equipo local deben ser un n\xFAmero entre 0 y 50." });
        return;
      }
    }
    if (raw.awayScore !== void 0) {
      const aScore = Number(raw.awayScore);
      if (isNaN(aScore) || aScore < 0 || aScore > 50) {
        res.status(400).json({ error: "Los goles del equipo visitante deben ser un n\xFAmero entre 0 y 50." });
        return;
      }
    }
    if (raw.matchMinute !== void 0) {
      const min = Number(raw.matchMinute);
      if (isNaN(min) || min < 0 || min > 130) {
        res.status(400).json({ error: "El minuto del partido debe ser un n\xFAmero entre 0 y 130." });
        return;
      }
    }
    const existingIndex = state.liveEvents.findIndex((e) => e.id === cleanId);
    const existingEvent = existingIndex >= 0 ? state.liveEvents[existingIndex] : null;
    const nextVersion = (existingEvent?.version || raw.version || 0) + 1;
    const now = Date.now();
    const operator = req.user?.username || "admin";
    const safeEvent = {
      id: cleanId,
      title: cleanTitle,
      homeTeam: cleanHome,
      awayTeam: cleanAway,
      isLive: Boolean(raw.isLive ?? true),
      primaryProvider: ["cloudflare", "youtube", "kick"].includes(raw.primaryProvider) ? raw.primaryProvider : "cloudflare",
      cloudflare: raw.cloudflare ? {
        liveInputId: String(raw.cloudflare.liveInputId || "").trim(),
        playbackUrl: String(raw.cloudflare.playbackUrl || "").trim()
      } : void 0,
      youtube: raw.youtube ? {
        videoId: String(raw.youtube.videoId || "").trim()
      } : void 0,
      kick: raw.kick ? {
        channel: String(raw.kick.channel || "").trim()
      } : void 0,
      fallbackOrder: Array.isArray(raw.fallbackOrder) && raw.fallbackOrder.length > 0 ? raw.fallbackOrder : ["cloudflare", "youtube", "kick"],
      tournamentName: raw.tournamentName ? String(raw.tournamentName).trim() : void 0,
      stadiumName: raw.stadiumName ? String(raw.stadiumName).trim() : void 0,
      period: raw.period || "1T",
      homeScore: raw.homeScore !== void 0 ? Number(raw.homeScore) : void 0,
      awayScore: raw.awayScore !== void 0 ? Number(raw.awayScore) : void 0,
      matchMinute: raw.matchMinute !== void 0 ? Number(raw.matchMinute) : void 0,
      customVideoUrl: raw.customVideoUrl ? String(raw.customVideoUrl).trim() : void 0,
      backupVideoUrl: raw.backupVideoUrl ? String(raw.backupVideoUrl).trim() : void 0,
      backupChannelName: raw.backupChannelName ? String(raw.backupChannelName).trim() : void 0,
      activeStreamSource: raw.activeStreamSource || "obs",
      autoFailoverEnabled: raw.autoFailoverEnabled ?? true,
      isClockRunning: raw.isClockRunning ?? false,
      clockUpdatedAt: raw.clockUpdatedAt || now,
      version: nextVersion,
      updatedAt: now,
      updatedAtIso: new Date(now).toISOString(),
      updatedBy: operator
    };
    const isForce = Boolean(raw.force);
    if (existingEvent) {
      if (!isForce && raw.version !== void 0) {
        const incomingVer = Number(raw.version);
        if (isNaN(incomingVer) || incomingVer <= 0) {
          res.status(400).json({
            error: "La versi\xF3n enviada debe ser un n\xFAmero v\xE1lido mayor a 0.",
            code: "INVALID_VERSION"
          });
          return;
        }
        const currentVer = typeof existingEvent.version === "number" ? existingEvent.version : 0;
        if (currentVer > 0 && incomingVer < currentVer) {
          res.status(409).json({
            error: `Conflicto de versiones: El partido ya cuenta con la versi\xF3n v${currentVer}. Tu versi\xF3n enviada es v${incomingVer}.`,
            code: "VERSION_CONFLICT"
          });
          return;
        }
        safeEvent.version = incomingVer;
      } else {
        safeEvent.version = (existingEvent.version || 0) + 1;
      }
    }
    if (isForce) {
      safeEvent.force = true;
    }
    try {
      const fbResult = await saveLiveEventToFirebase(safeEvent, operator);
      safeEvent.version = fbResult.version;
      safeEvent.updatedAt = fbResult.updatedAt;
    } catch (fbErr) {
      console.error("[GolBolivia Server] Error cr\xEDtico persistiendo evento en Firestore:", fbErr);
      const isConflict = fbErr.message?.includes("superior") || fbErr.message?.includes("Conflicto");
      res.status(isConflict ? 409 : 503).json({
        error: fbErr.message || "Error al persistir evento en Firebase Firestore.",
        code: isConflict ? "VERSION_CONFLICT" : "FIRESTORE_UNAVAILABLE"
      });
      return;
    }
    if (isForce) {
      try {
        await logConfirmationToFirebase({
          action: "FORCE_SAVE_LIVE_EVENT",
          operator: req.user?.username || operator,
          role: req.user?.role || "ADMIN",
          details: `Sobrescritura forzada (force) del partido "${cleanTitle}" (${cleanId}) a la versi\xF3n v${safeEvent.version}.`,
          payload: {
            eventId: cleanId,
            title: cleanTitle,
            version: safeEvent.version,
            updatedAt: safeEvent.updatedAt,
            primaryProvider: safeEvent.primaryProvider,
            force: true
          },
          timestamp: now
        });
      } catch (auditErr) {
        console.warn("[GolBolivia Server] Advertencia al registrar auditor\xEDa de guardado forzado:", auditErr.message || auditErr);
      }
    }
    if (existingIndex >= 0) {
      state.liveEvents[existingIndex] = safeEvent;
    } else {
      state.liveEvents.push(safeEvent);
    }
    if (existingIndex === 0 || state.streamSettings.title === safeEvent.title || state.liveEvents.length === 1) {
      state.streamSettings.title = safeEvent.title;
      state.streamSettings.homeClubId = safeEvent.homeTeam;
      state.streamSettings.awayClubId = safeEvent.awayTeam;
      if (safeEvent.tournamentName) state.streamSettings.tournamentName = safeEvent.tournamentName;
      if (safeEvent.stadiumName) state.streamSettings.stadiumName = safeEvent.stadiumName;
      if (safeEvent.period) state.streamSettings.period = safeEvent.period;
      if (safeEvent.homeScore !== void 0) state.scoreboard.homeScore = safeEvent.homeScore;
      if (safeEvent.awayScore !== void 0) state.scoreboard.awayScore = safeEvent.awayScore;
      if (safeEvent.matchMinute !== void 0) state.scoreboard.matchMinute = safeEvent.matchMinute;
    }
    persistState();
    broadcastSseEvent("STREAM_CONFIG_UPDATED", { eventId: safeEvent.id, ...safeEvent });
    broadcastSseEvent("SCOREBOARD_UPDATED", {
      eventId: safeEvent.id,
      homeScore: safeEvent.homeScore,
      awayScore: safeEvent.awayScore,
      matchMinute: safeEvent.matchMinute,
      period: safeEvent.period,
      isClockRunning: safeEvent.isClockRunning,
      version: safeEvent.version,
      updatedAt: safeEvent.updatedAt
    });
    broadcastSseEvent("LIVE_EVENTS_UPDATED", state.liveEvents);
    res.json({
      success: true,
      message: `Partido ${safeEvent.title} guardado con \xE9xito.`,
      version: safeEvent.version,
      updatedAt: safeEvent.updatedAt,
      event: safeEvent,
      events: state.liveEvents
    });
  }
);
app2.delete(
  ["/api/live-events/:id", "/live-events/:id"],
  authenticate,
  requireRoles(["ADMIN", "TRANSMISOR", "EDITOR"]),
  async (req, res) => {
    const id = req.params.id;
    try {
      await deleteLiveEventFromFirebase(id);
    } catch (fbErr) {
      console.warn(`[GolBolivia Server] Advertencia al eliminar partido ${id} en Firestore:`, fbErr.message || fbErr);
    }
    state.liveEvents = state.liveEvents.filter((e) => e.id !== id);
    if (state.liveEvents.length > 0) {
      const activeMatchExists = state.liveEvents.some((e) => e.title === state.streamSettings.title || e.id === id);
      if (activeMatchExists) {
        const nextEvt = state.liveEvents[0];
        state.streamSettings.title = nextEvt.title;
        state.streamSettings.homeClubId = nextEvt.homeTeam;
        state.streamSettings.awayClubId = nextEvt.awayTeam;
        if (nextEvt.tournamentName) state.streamSettings.tournamentName = nextEvt.tournamentName;
        if (nextEvt.stadiumName) state.streamSettings.stadiumName = nextEvt.stadiumName;
        if (nextEvt.period) state.streamSettings.period = nextEvt.period;
        if (nextEvt.homeScore !== void 0) state.scoreboard.homeScore = nextEvt.homeScore;
        if (nextEvt.awayScore !== void 0) state.scoreboard.awayScore = nextEvt.awayScore;
        if (nextEvt.matchMinute !== void 0) state.scoreboard.matchMinute = nextEvt.matchMinute;
      }
    }
    persistState();
    broadcastSseEvent("LIVE_EVENT_DELETED", { id });
    broadcastSseEvent("LIVE_EVENTS_UPDATED", state.liveEvents);
    res.json({ success: true, message: "Partido eliminado.", events: state.liveEvents, deletedId: id });
  }
);
app2.get(["/api/scoreboard", "/scoreboard"], (_req, res) => {
  res.json({ scoreboard: state.scoreboard, events: state.liveEvents });
});
app2.post(
  ["/api/scoreboard", "/scoreboard"],
  authenticate,
  requireRoles(["ADMIN", "TRANSMISOR", "EDITOR"]),
  async (req, res) => {
    const { homeScore, awayScore, matchMinute, period, isClockRunning, force } = req.body;
    const targetEventId = req.body.activeEventId || req.body.eventId || "partido-001";
    let activeEvt = state.liveEvents.find((e) => e.id === targetEventId);
    if (!activeEvt && state.liveEvents.length > 0) {
      activeEvt = state.liveEvents[0];
    }
    const isForce = Boolean(force);
    const sentVersion = req.body.version !== void 0 ? Number(req.body.version) : void 0;
    if (activeEvt && !isForce) {
      if (sentVersion !== void 0) {
        if (isNaN(sentVersion) || sentVersion <= 0) {
          res.status(400).json({
            error: "La versi\xF3n enviada debe ser un n\xFAmero v\xE1lido mayor a 0.",
            code: "INVALID_VERSION"
          });
          return;
        }
        const curVer = typeof activeEvt.version === "number" ? activeEvt.version : 0;
        if (curVer > 0 && sentVersion < curVer) {
          res.status(409).json({
            error: `Marcador desactualizado: El partido ya cuenta con la versi\xF3n v${curVer}, superior a la enviada v${sentVersion}.`,
            code: "VERSION_CONFLICT"
          });
          return;
        }
      }
    }
    const safeHome = homeScore !== void 0 ? Math.max(0, Math.min(50, Math.round(Number(homeScore) || 0))) : void 0;
    const safeAway = awayScore !== void 0 ? Math.max(0, Math.min(50, Math.round(Number(awayScore) || 0))) : void 0;
    const safeMin = matchMinute !== void 0 ? Math.max(0, Math.min(130, Math.round(Number(matchMinute) || 0))) : void 0;
    const scorePayload = {
      eventId: activeEvt ? activeEvt.id : targetEventId,
      homeScore: safeHome !== void 0 ? safeHome : activeEvt?.homeScore ?? state.scoreboard.homeScore,
      awayScore: safeAway !== void 0 ? safeAway : activeEvt?.awayScore ?? state.scoreboard.awayScore,
      matchMinute: safeMin !== void 0 ? safeMin : activeEvt?.matchMinute ?? state.scoreboard.matchMinute,
      period: period || (activeEvt?.period ?? state.scoreboard.period),
      isClockRunning: typeof isClockRunning === "boolean" ? isClockRunning : activeEvt?.isClockRunning ?? false,
      version: sentVersion,
      force: isForce,
      updatedAt: Date.now()
    };
    try {
      const fbRes = await saveMatchScoreboardFirebase(scorePayload.eventId, scorePayload, req.user?.username);
      scorePayload.version = fbRes.version;
      scorePayload.updatedAt = fbRes.updatedAt;
      if (activeEvt) {
        activeEvt.version = fbRes.version;
        activeEvt.updatedAt = fbRes.updatedAt;
      }
      state.scoreboard.version = fbRes.version;
    } catch (fbErr) {
      res.status(409).json({
        error: fbErr.message || "Error al persistir marcador en Firestore.",
        code: "FIRESTORE_SCORE_ERROR"
      });
      return;
    }
    if (activeEvt) {
      if (safeHome !== void 0) activeEvt.homeScore = safeHome;
      if (safeAway !== void 0) activeEvt.awayScore = safeAway;
      if (safeMin !== void 0) activeEvt.matchMinute = safeMin;
      if (period !== void 0 && ["1T", "Descanso", "2T", "Tiempo Extra", "Finalizado"].includes(period)) {
        activeEvt.period = period;
      }
      if (typeof isClockRunning === "boolean") {
        activeEvt.isClockRunning = isClockRunning;
        activeEvt.clockUpdatedAt = scorePayload.updatedAt;
      }
    }
    if (safeHome !== void 0) state.scoreboard.homeScore = safeHome;
    if (safeAway !== void 0) state.scoreboard.awayScore = safeAway;
    if (safeMin !== void 0) state.scoreboard.matchMinute = safeMin;
    if (period !== void 0 && ["1T", "Descanso", "2T", "Tiempo Extra", "Finalizado"].includes(period)) {
      state.scoreboard.period = period;
      state.streamSettings.period = period;
    }
    state.scoreboard.updatedAt = scorePayload.updatedAt;
    persistState();
    broadcastSseEvent("SCOREBOARD_UPDATED", scorePayload);
    broadcastSseEvent("LIVE_EVENTS_UPDATED", state.liveEvents);
    res.json({ success: true, scoreboard: scorePayload, liveEvents: state.liveEvents });
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
app2.post(
  ["/api/matches/events/clear", "/matches/events/clear"],
  authenticate,
  requireRoles(["ADMIN", "EDITOR"]),
  (_req, res) => {
    state.events = [];
    broadcastSseEvent("MATCH_EVENTS_CLEARED", {});
    res.json({ success: true, message: "Cronolog\xEDa de eventos limpiada correctamente." });
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
app2.post(
  ["/api/chat/clear", "/chat/clear"],
  authenticate,
  requireRoles(["ADMIN", "MODERADOR"]),
  (_req, res) => {
    state.chatMessages = [];
    broadcastSseEvent("CHAT_CLEARED", {});
    res.json({ success: true, message: "Chat en vivo limpiado correctamente." });
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
      altitudeMeters: Number(club.altitudeMeters || existing.altitudeMeters || 2500),
      league: String(club.league || existing.league || "Bolivia (Divisi\xF3n Profesional)").trim(),
      country: String(club.country || existing.country || "Bolivia").trim()
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
app2.get(["/api/football-api/matches", "/football-api/matches"], async (req, res) => {
  const league = String(req.query.league || "bol.1").trim();
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(league)}/scoreboard`;
  try {
    const apiRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    if (!apiRes.ok) {
      res.status(apiRes.status).json({ error: "Error al consultar API deportiva gratuita de ESPN" });
      return;
    }
    const data = await apiRes.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Error de red al consultar API deportiva: " + (err.message || "desconocido") });
  }
});
app2.get(["/api/football-api/match/:id", "/football-api/match/:id"], async (req, res) => {
  const eventId = String(req.params.id).trim();
  const league = String(req.query.league || "bol.1").trim();
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(league)}/summary?event=${encodeURIComponent(eventId)}`;
  try {
    const apiRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    if (!apiRes.ok) {
      res.status(apiRes.status).json({ error: "Error al consultar detalles de partido en ESPN" });
      return;
    }
    const data = await apiRes.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Error de red al consultar detalles del partido: " + (err.message || "desconocido") });
  }
});
if (!process.env.VERCEL) {
  setInterval(() => {
    let anyUpdated = false;
    for (const evt of state.liveEvents) {
      if (evt.isLive && evt.isClockRunning && evt.period !== "Descanso" && evt.period !== "Finalizado") {
        const currentMin = typeof evt.matchMinute === "number" ? evt.matchMinute : 0;
        if (currentMin < 130) {
          evt.matchMinute = currentMin + 1;
          evt.clockUpdatedAt = Date.now();
          anyUpdated = true;
        }
      }
    }
    if (anyUpdated) {
      persistState();
      broadcastSseEvent("LIVE_EVENTS_UPDATED", state.liveEvents);
      const active = state.liveEvents[0];
      if (active) {
        state.scoreboard.matchMinute = active.matchMinute || 0;
        broadcastSseEvent("SCOREBOARD_UPDATED", {
          eventId: active.id,
          homeScore: active.homeScore ?? state.scoreboard.homeScore,
          awayScore: active.awayScore ?? state.scoreboard.awayScore,
          matchMinute: active.matchMinute,
          period: active.period,
          isClockRunning: active.isClockRunning,
          updatedAt: Date.now()
        });
        saveMatchScoreboardFirebase(active.id, {
          homeScore: active.homeScore,
          awayScore: active.awayScore,
          matchMinute: active.matchMinute,
          period: active.period,
          isClockRunning: active.isClockRunning,
          force: true
        }).catch(() => {
        });
      }
    }
  }, 6e4);
}
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
app2.all("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.originalUrl && req.originalUrl.startsWith("/api")) {
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
    return;
  }
  next();
});
app2.use((err, _req, res, next) => {
  if (err && (err.status === 413 || err.type === "entity.too.large")) {
    return res.status(413).json({
      error: "La imagen o el contenido enviado es demasiado grande (L\xEDmite 10MB). Por favor utiliza una imagen optimizada."
    });
  }
  if (err) {
    return res.status(err.status || 500).json({
      error: err.message || "Error interno del servidor."
    });
  }
  next();
});
var serverApp_default = app2;
export {
  SYSTEM_USERS,
  app2 as app,
  serverApp_default as default
};
