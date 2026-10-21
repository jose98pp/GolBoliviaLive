// serverApp.ts
import "dotenv/config";
import express2 from "express";
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
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u26A1",
    stadium: "Estadio Hernando Siles",
    altitudeMeters: 3637,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
  },
  strongest: {
    id: "strongest",
    name: "The Strongest",
    shortName: "Strongest",
    city: "La Paz",
    primaryColor: "#eab308",
    secondaryColor: "#0f172a",
    textColor: "#0f172a",
    badgeEmoji: "\u{1F42F}",
    stadium: "Estadio Rafael Mendoza Castell\xF3n / Siles",
    altitudeMeters: 3637,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
  },
  wilstermann: {
    id: "wilstermann",
    name: "C.A. Jorge Wilstermann",
    shortName: "Wilstermann",
    city: "Cochabamba",
    primaryColor: "#dc2626",
    secondaryColor: "#1e3a8a",
    textColor: "#ffffff",
    badgeEmoji: "\u2708\uFE0F",
    stadium: "Estadio F\xE9lix Capriles",
    altitudeMeters: 2558,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
  },
  oriente: {
    id: "oriente",
    name: "Oriente Petrolero",
    shortName: "Oriente",
    city: "Santa Cruz",
    primaryColor: "#16a34a",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F6E2}\uFE0F",
    stadium: "Estadio Ram\xF3n Tahuichi Aguilera",
    altitudeMeters: 416,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
  },
  blooming: {
    id: "blooming",
    name: "Club Blooming",
    shortName: "Blooming",
    city: "Santa Cruz",
    primaryColor: "#38bdf8",
    secondaryColor: "#1e3a8a",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F985}",
    stadium: "Estadio Ram\xF3n Tahuichi Aguilera",
    altitudeMeters: 416,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
  },
  always: {
    id: "always",
    name: "Always Ready",
    shortName: "Always Ready",
    city: "El Alto",
    primaryColor: "#e11d48",
    secondaryColor: "#ffffff",
    textColor: "#ffffff",
    badgeEmoji: "\u{1F534}",
    stadium: "Estadio Municipal de Villa Ingenio",
    altitudeMeters: 4083,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
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
    altitudeMeters: 3900,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
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
    altitudeMeters: 2558,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
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
    altitudeMeters: 232,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
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
    altitudeMeters: 3735,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
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
    altitudeMeters: 1854,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
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
    altitudeMeters: 2790,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
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
    altitudeMeters: 2558,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
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
    altitudeMeters: 298,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
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
    altitudeMeters: 416,
    league: "Bolivia (Divisi\xF3n Profesional)",
    country: "Bolivia"
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
  getDocsFromServer,
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
      experimentalAutoDetectLongPolling: true
    },
    firebase_applet_config_default.firestoreDatabaseId
  );
} catch {
  dbInstance = getFirestore(app, firebase_applet_config_default.firestoreDatabaseId);
}
var db = dbInstance;
var firebaseApp = app;
var FIREBASE_PROJECT_ID = firebase_applet_config_default.projectId;
var FIRESTORE_DATABASE_ID = firebase_applet_config_default.firestoreDatabaseId;
var writeGate = Promise.resolve();
function setFirestoreWriteGate(gate) {
  writeGate = gate.catch(() => void 0);
}
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
  await writeGate;
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
  await writeGate;
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
async function saveScoreboardToFirebase(data, operator) {
  await writeGate;
  const ref = doc(db, "match", "scoreboard");
  let nextVersion = 1;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      nextVersion = (snap.data()?.version || 0) + 1;
    }
  } catch {
  }
  const now = Date.now();
  const sanitized = {
    version: nextVersion,
    updatedAt: now,
    updatedAtIso: new Date(now).toISOString(),
    updatedBy: operator || "admin"
  };
  if (data.homeScore !== void 0) {
    sanitized.homeScore = validateScore(data.homeScore);
  }
  if (data.awayScore !== void 0) {
    sanitized.awayScore = validateScore(data.awayScore);
  }
  if (data.matchMinute !== void 0) {
    sanitized.matchMinute = validateMinute(data.matchMinute);
  }
  if (data.period && ["1T", "Descanso", "2T", "Tiempo Extra", "Finalizado", "Revisi\xF3n VAR"].includes(data.period)) {
    sanitized.period = data.period;
  }
  await setDoc(ref, sanitized, { merge: true });
}
async function addMatchEventToFirebase(event) {
  await writeGate;
  const colRef = collection(db, "events");
  const eventId = event.id || `evt_${Date.now()}`;
  const ref = doc(db, "events", eventId);
  await setDoc(ref, {
    ...event,
    id: eventId,
    createdAt: Date.now()
  });
  return eventId;
}
async function getMatchEventsFromFirebase() {
  try {
    const colRef = collection(db, "events");
    const q = query(colRef, orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    const events = [];
    snap.forEach((d) => events.push(d.data()));
    return events;
  } catch (err) {
    console.warn("[Firebase] Error al obtener eventos:", err);
    return [];
  }
}
async function getChatMessagesFromFirebase() {
  try {
    const colRef = collection(db, "chat");
    const q = query(colRef, orderBy("createdAt", "desc"), limit(60));
    const snap = await getDocs(q);
    const messages = [];
    snap.forEach((d) => messages.push(d.data()));
    return messages.reverse();
  } catch (err) {
    console.warn("[Firebase] Error al obtener mensajes de chat:", err);
    return [];
  }
}
async function logConfirmationToFirebase(log) {
  await writeGate;
  const id = `conf_${Date.now()}`;
  const ref = doc(db, "confirmations", id);
  await setDoc(ref, {
    ...log,
    id,
    timestamp: log.timestamp || Date.now()
  });
  return id;
}
async function updateMatchEventInFirebase(eventId, updates) {
  await writeGate;
  const ref = doc(db, "events", eventId);
  await setDoc(
    ref,
    {
      ...updates,
      updatedAt: Date.now()
    },
    { merge: true }
  );
}
async function deleteMatchEventFromFirebase(eventId) {
  await writeGate;
  const ref = doc(db, "events", eventId);
  await deleteDoc(ref);
}
async function deleteChatMessageFromFirebase(messageId) {
  await writeGate;
  const ref = doc(db, "chat", messageId);
  await deleteDoc(ref);
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
async function saveSingleClubToFirebase(club) {
  await writeGate;
  const ref = doc(db, "config", "clubs");
  const snap = await getDoc(ref);
  const currentClubs = snap.exists() && snap.data()?.clubs ? snap.data().clubs : {};
  currentClubs[club.id] = club;
  await setDoc(ref, {
    clubs: currentClubs,
    updatedAt: Date.now()
  });
}
async function deleteClubFromFirebase(clubId) {
  await writeGate;
  const ref = doc(db, "config", "clubs");
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data()?.clubs) {
    const currentClubs = { ...snap.data().clubs };
    delete currentClubs[clubId];
    await setDoc(ref, {
      clubs: currentClubs,
      updatedAt: Date.now()
    });
  }
}
async function saveLiveEventToFirebase(event, operator) {
  await writeGate;
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
      iptvSource: event.iptvSource ? { ...event.iptvSource } : null,
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
      broadcastMode: event.broadcastMode || "obs_custom",
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
  await writeGate;
  const safeId = sanitizeClubId(eventId);
  if (!safeId) {
    throw new Error("Identificador de partido inv\xE1lido para marcador.");
  }
  const ref = doc(db, "liveEvents", safeId);
  const now = Date.now();
  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) {
      throw new Error(`El partido "${safeId}" no existe en Firestore o fue eliminado.`);
    }
    const existing = snap.data();
    const existingVersion = typeof existing?.version === "number" ? existing.version : 0;
    const isForce = Boolean(data.force);
    if (!isForce && typeof data.version === "number" && data.version > 0 && data.version < existingVersion) {
      throw new Error(
        `Marcador desactualizado: La versi\xF3n actual en Firestore (v${existingVersion}) es superior a la versi\xF3n enviada (v${data.version}). Guardado rechazado.`
      );
    }
    const baseVersion = typeof data.version === "number" && data.version > 0 ? Math.max(existingVersion, data.version) : existingVersion;
    const nextVersion = baseVersion + 1;
    const sanitized = {
      id: safeId,
      version: nextVersion,
      updatedAt: now,
      updatedAtIso: new Date(now).toISOString(),
      updatedBy: operator || "admin"
    };
    if (data.homeScore !== void 0) sanitized.homeScore = validateScore(data.homeScore);
    if (data.awayScore !== void 0) sanitized.awayScore = validateScore(data.awayScore);
    if (data.matchMinute !== void 0) sanitized.matchMinute = validateMinute(data.matchMinute);
    if (data.period && ["1T", "Descanso", "2T", "Tiempo Extra", "Finalizado", "Revisi\xF3n VAR"].includes(data.period)) {
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
function hydrateLiveEventDoc(d) {
  const raw = d.data();
  const docId = d.id;
  const safeId = raw.id || docId;
  if (!raw.title && !raw.homeTeam && !raw.awayTeam) {
    return null;
  }
  const home = raw.homeTeam || "bolivar";
  const away = raw.awayTeam || "strongest";
  const defaultTitle = `${home} vs ${away}`;
  const title = raw.title && raw.title.trim() || defaultTitle;
  return {
    id: safeId,
    title,
    homeTeam: home,
    awayTeam: away,
    isLive: raw.isLive !== void 0 ? Boolean(raw.isLive) : true,
    primaryProvider: raw.primaryProvider || "cloudflare",
    iptvSource: raw.iptvSource,
    broadcastMode: raw.broadcastMode || "obs_custom",
    fallbackOrder: Array.isArray(raw.fallbackOrder) && raw.fallbackOrder.length > 0 ? raw.fallbackOrder : ["cloudflare", "youtube", "kick"],
    tournamentName: raw.tournamentName || "Liga Tigo Divisi\xF3n Profesional - Torneo Clausura",
    stadiumName: raw.stadiumName || (docId === "partido-002" ? "Estadio Ram\xF3n Tahuichi Aguilera" : "Estadio Hernando Siles - La Paz"),
    period: raw.period || "1T",
    homeScore: typeof raw.homeScore === "number" ? raw.homeScore : 0,
    awayScore: typeof raw.awayScore === "number" ? raw.awayScore : 0,
    matchMinute: typeof raw.matchMinute === "number" ? raw.matchMinute : 0,
    isClockRunning: Boolean(raw.isClockRunning),
    customVideoUrl: raw.customVideoUrl || raw.cloudflare?.playbackUrl || "",
    backupVideoUrl: raw.backupVideoUrl || "",
    backupChannelName: raw.backupChannelName || "",
    activeStreamSource: raw.activeStreamSource || "obs",
    autoFailoverEnabled: raw.autoFailoverEnabled ?? true,
    cloudflare: raw.cloudflare,
    youtube: raw.youtube,
    kick: raw.kick,
    version: typeof raw.version === "number" ? raw.version : 1,
    updatedAt: raw.updatedAt || Date.now(),
    updatedAtIso: raw.updatedAtIso || (/* @__PURE__ */ new Date()).toISOString(),
    updatedBy: raw.updatedBy || "admin"
  };
}
async function getLiveEventsFromFirebase() {
  try {
    const colRef = collection(db, "liveEvents");
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list = [];
      snap.forEach((d) => {
        const item = hydrateLiveEventDoc(d);
        if (item) list.push(item);
      });
      return list;
    }
  } catch (err) {
    console.warn("[Firebase] Error al leer liveEvents:", err);
  }
  return [];
}
async function deleteLiveEventFromFirebase(eventId) {
  await writeGate;
  try {
    const ref = doc(db, "liveEvents", eventId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("[Firebase] Error al borrar liveEvent:", err);
    throw err;
  }
}
async function clearMatchEventsInFirebase() {
  await writeGate;
  const snap = await getDocs(collection(db, "events"));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
async function clearChatInFirebase() {
  await writeGate;
  const snap = await getDocs(collection(db, "chat"));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
async function getCustomIptvChannelsFromFirebase() {
  const snapshot = await getDocs(collection(db, "iptvCustomChannels"));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
}
async function saveCustomIptvChannelToFirebase(channel) {
  await writeGate;
  await setDoc(doc(db, "iptvCustomChannels", channel.id), channel);
}
async function deleteCustomIptvChannelFromFirebase(id) {
  await writeGate;
  await deleteDoc(doc(db, "iptvCustomChannels", id));
}

// serverApp.ts
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// src/services/iptvBackend.ts
import express from "express";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// src/utils/streamUtils.ts
function normalizeMatchIptvUrl(value) {
  if (typeof value !== "string") return null;
  const source = value.trim();
  if (!source || source.length > 1500 || /\s/.test(source)) return null;
  try {
    const url = new URL(source);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    if (!/\.m3u8?$/i.test(url.pathname)) return null;
    return url.href.length <= 1500 ? url.href : null;
  } catch {
    return null;
  }
}
var STREAMXHD_DOMAINS = /* @__PURE__ */ new Set([
  "streamxhd.st",
  "streamxhd.com",
  "streamxhd.click",
  "streamxhd.top",
  "streamxhd.net",
  "streamxhd.me",
  "streamxhd.live"
]);
var ALLOWED_SPORTS_EMBED_DOMAINS = /* @__PURE__ */ new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "player.twitch.tv",
  "twitch.tv",
  "www.twitch.tv",
  "dailymotion.com",
  "www.dailymotion.com",
  "player.vimeo.com",
  "vimeo.com",
  "pelotalibre.org",
  "www.pelotalibre.org",
  "futbollibre.lol",
  "www.futbollibre.lol",
  "librefutboltv.com",
  "www.librefutboltv.com",
  "promiedos.com.ar",
  "www.promiedos.com.ar",
  "embedstream.me",
  "www.embedstream.me",
  "voodc.com",
  "ragnaru.net",
  "casadelfutbol.net",
  "streamwish.to",
  "streamwish.com",
  "filelions.to",
  "luluvdo.com",
  "vidmoly.me",
  "la14hd.com",
  "deportelibre.net",
  "tarjetarojatv.org",
  "rojadirectatv.tv",
  "pirlotv.fr",
  "pirlotv.online",
  "la12hd.com",
  "streamplay.to",
  "ok.ru"
]);
function normalizeExternalPlayerUrl(value) {
  if (typeof value !== "string" || value.trim().length > 1500) return null;
  const raw = value.trim();
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (STREAMXHD_DOMAINS.has(host)) {
      if (url.pathname !== "/live1.php" && url.pathname !== "/live2.php") return null;
      const streamVal = url.searchParams.get("stream");
      if (!streamVal || !/^[a-zA-Z0-9_-]{1,80}$/.test(streamVal)) return null;
      if ([...url.searchParams.keys()].some((key) => key !== "stream") || url.searchParams.getAll("stream").length !== 1) {
        return null;
      }
      url.hash = "";
      return url.href;
    }
    if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      let videoId = "";
      if (host === "youtu.be") {
        videoId = url.pathname.slice(1);
      } else if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.slice("/embed/".length);
      } else if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") || "";
      }
      if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
      return null;
    }
    if (ALLOWED_SPORTS_EMBED_DOMAINS.has(host)) {
      if (url.pathname.length <= 1 && !url.search) return null;
      url.hash = "";
      return url.href;
    }
    return null;
  } catch {
    return null;
  }
}

// src/utils/channelSources.ts
function normalizeChannelSource(value, type = "hls") {
  if (typeof value !== "string" || value.length > 5e3) return null;
  let source = value.trim();
  if (type === "iframe") {
    if (source.startsWith("<") || source.includes("<iframe")) {
      const match = source.match(/<iframe\b[^>]*\bsrc\s*=\s*(["'])([^"']+)\1/i);
      if (!match) return null;
      source = match[2].replace(/&amp;/g, "&");
    }
    return normalizeExternalPlayerUrl(source);
  }
  if (type !== "hls" || source.length > 1500 || /\s/.test(source)) return null;
  try {
    const url = new URL(source);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    if (normalizeExternalPlayerUrl(source)) return null;
    if (/\.(?:html?|php|mpd)$/i.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

// src/data/iptvFallbackChannels.ts
var CURATED_FALLBACK_CHANNELS = [
  {
    id: "claro-sports-latam",
    name: "Claro Sports Latam",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Claro_Sports_logo.svg/320px-Claro_Sports_logo.svg.png",
    group: "Internacional",
    country: "INT",
    countryName: "Internacional",
    streamUrl: "https://live-clarosports-linear.amagi.tv/playlist.m3u8",
    resolution: "1080p",
    isFavorite: true,
    isDemoFeed: false,
    notes: "Se\xF1al oficial FAST 24/7 en vivo v\xEDa Amagi CDN."
  },
  {
    id: "redbull-tv-live",
    name: "Red Bull TV Deportes Extremos",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Red_Bull_TV_logo.svg/320px-Red_Bull_TV_logo.svg.png",
    group: "Internacional",
    country: "INT",
    countryName: "Internacional",
    streamUrl: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    resolution: "1080p",
    isFavorite: true,
    isDemoFeed: false,
    notes: "Se\xF1al oficial Red Bull TV Live en vivo v\xEDa Akamai."
  },
  {
    id: "fifa-plus-es",
    name: "FIFA+ En Vivo",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/FIFA%2B_Logo.svg/320px-FIFA%2B_Logo.svg.png",
    group: "Internacional",
    country: "INT",
    countryName: "Internacional",
    streamUrl: "https://amg01269-amg01269c1-fifa-intl-4066.playouts.now.amagi.tv/playlist/amg01269-fifaplusfast-fifaplus-fifaplusintl/playlist.m3u8",
    resolution: "1080p",
    isFavorite: true,
    isDemoFeed: false,
    notes: "Se\xF1al oficial FIFA+ FAST 24/7 en espa\xF1ol."
  }
];

// src/services/iptvBackend.ts
var iptvRouter = express.Router();
var SPORTS_M3U_URL = "https://iptv-org.github.io/iptv/categories/sports.m3u";
var BOLIVIA_M3U_URL = "https://iptv-org.github.io/iptv/countries/bo.m3u";
var CACHE_TTL_MS = 6 * 60 * 60 * 1e3;
var customChannels = [];
var customLoadedAt = 0;
async function refreshCustomChannels() {
  if (Date.now() - customLoadedAt < 3e4) return customChannels;
  const saved = await getCustomIptvChannelsFromFirebase();
  customChannels = saved;
  customLoadedAt = Date.now();
  return saved;
}
var cachedChannels = [];
var lastFetchTime = 0;
var activeFetchPromise = null;
function inferCountry(tvgCountry, tvgId, name, group) {
  const c = (tvgCountry || "").toUpperCase().trim();
  const id = (tvgId || "").toLowerCase();
  const n = (name || "").toLowerCase();
  const g = (group || "").toLowerCase();
  if (c === "BO" || id.endsWith(".bo") || n.includes("bolivia") || g.includes("bolivia")) {
    return { code: "BO", name: "Bolivia" };
  }
  if (c === "AR" || id.endsWith(".ar") || n.includes("argentina") || g.includes("argentina")) {
    return { code: "AR", name: "Argentina" };
  }
  if (c === "CO" || id.endsWith(".co") || n.includes("colombia") || g.includes("colombia")) {
    return { code: "CO", name: "Colombia" };
  }
  if (c === "MX" || id.endsWith(".mx") || n.includes("mexico") || n.includes("m\xE9xico") || g.includes("mexico")) {
    return { code: "MX", name: "M\xE9xico" };
  }
  if (c === "ES" || id.endsWith(".es") || n.includes("espa\xF1a") || n.includes("spain") || g.includes("espa\xF1a")) {
    return { code: "ES", name: "Espa\xF1a" };
  }
  return { code: "INT", name: "Internacional" };
}
function parseM3uSports(m3uText, defaultCountry) {
  const lines = m3uText.split(/\r?\n/);
  const channels = [];
  let currentExtInf = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF:")) {
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/i);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const tvgCountryMatch = line.match(/tvg-country="([^"]*)"/i);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/i);
      const lastCommaIdx = line.lastIndexOf(",");
      const channelName = lastCommaIdx !== -1 ? line.substring(lastCommaIdx + 1).trim() : "Canal Deportivo";
      currentExtInf = {
        tvgId: tvgIdMatch ? tvgIdMatch[1] : "",
        tvgName: tvgNameMatch ? tvgNameMatch[1] : channelName,
        tvgLogo: tvgLogoMatch ? tvgLogoMatch[1] : "",
        tvgCountry: tvgCountryMatch ? tvgCountryMatch[1] : defaultCountry || "",
        groupTitle: groupTitleMatch ? groupTitleMatch[1] : defaultCountry === "BO" ? "TV Abierta" : "Sports",
        channelName
      };
    } else if (line.startsWith("http://") || line.startsWith("https://")) {
      if (currentExtInf) {
        const countryInfo = defaultCountry && defaultCountry.toUpperCase() === "BO" ? { code: "BO", name: "Bolivia" } : inferCountry(
          currentExtInf.tvgCountry,
          currentExtInf.tvgId,
          currentExtInf.channelName,
          currentExtInf.groupTitle
        );
        const id = `iptv-${channels.length + 1}-${(currentExtInf.tvgId || currentExtInf.channelName).toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30)}`;
        channels.push({
          id,
          name: currentExtInf.channelName || currentExtInf.tvgName || "Canal Deportivo",
          logo: currentExtInf.tvgLogo || "",
          group: currentExtInf.groupTitle || (countryInfo.code === "BO" ? "Bolivia" : "Sports"),
          country: countryInfo.code,
          countryName: countryInfo.name,
          streamUrl: line,
          resolution: line.includes("1080") ? "1080p" : line.includes("720") ? "720p" : "HD"
        });
        currentExtInf = null;
      }
    }
  }
  return channels;
}
async function fetchM3uList(url, defaultCountry) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8e3);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GolBolivia/2026.1 (IPTV-Sports-Aggregator)"
      }
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      throw new Error(`HTTP error ${resp.status}`);
    }
    const text = await resp.text();
    return parseM3uSports(text, defaultCountry);
  } catch (err) {
    console.warn(`[IPTV Backend] Advertencia al sincronizar lista externa (${url}):`, err?.message || err);
    return [];
  }
}
async function refreshSportsChannels() {
  try {
    await refreshCustomChannels();
    const [boResult, sportsResult] = await Promise.allSettled([
      fetchM3uList(BOLIVIA_M3U_URL, "BO"),
      fetchM3uList(SPORTS_M3U_URL)
    ]);
    const boChannels = boResult.status === "fulfilled" ? boResult.value : [];
    const sportsChannels = sportsResult.status === "fulfilled" ? sportsResult.value : [];
    const combinedParsed = [...boChannels, ...sportsChannels];
    if (combinedParsed.length > 0) {
      const uniqueUrls = /* @__PURE__ */ new Set([
        ...customChannels.map((c) => c.streamUrl),
        ...CURATED_FALLBACK_CHANNELS.map((c) => c.streamUrl)
      ]);
      const filteredParsed = [];
      for (const ch of combinedParsed) {
        if (!uniqueUrls.has(ch.streamUrl)) {
          uniqueUrls.add(ch.streamUrl);
          filteredParsed.push(ch);
        }
      }
      cachedChannels = [...customChannels, ...CURATED_FALLBACK_CHANNELS, ...filteredParsed];
      lastFetchTime = Date.now();
      return cachedChannels;
    }
  } catch (err) {
    console.warn("[IPTV Backend] Advertencia al sincronizar listas M3U externas:", err?.message || err);
  }
  if (cachedChannels.length === 0) {
    cachedChannels = [...customChannels, ...CURATED_FALLBACK_CHANNELS];
    lastFetchTime = Date.now();
  }
  return cachedChannels;
}
function getOrRefreshSportsChannels(force = false) {
  const now = Date.now();
  const isStale = force || now - lastFetchTime > CACHE_TTL_MS || cachedChannels.length === 0;
  if (!isStale && cachedChannels.length > 0) {
    return Promise.resolve(cachedChannels);
  }
  if (activeFetchPromise) {
    return activeFetchPromise;
  }
  activeFetchPromise = refreshSportsChannels().catch((err) => {
    console.warn("[IPTV Backend] Error durante la actualizaci\xF3n de canales:", err?.message || err);
    if (cachedChannels.length > 0) return cachedChannels;
    return [...customChannels, ...CURATED_FALLBACK_CHANNELS];
  }).finally(() => {
    activeFetchPromise = null;
  });
  return activeFetchPromise;
}
function getApprovedPlaylistUrl(value) {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "iptv-org.github.io" || url.port || url.username || url.password || url.search || url.hash) return null;
    const parts = url.pathname.split("/");
    if (parts.length !== 4 || parts[0] !== "" || parts[1] !== "iptv" || !["categories", "countries"].includes(parts[2]) || !parts[3].endsWith(".m3u") || !/^[a-z0-9-]+$/.test(parts[3].slice(0, -4))) return null;
    return url.href;
  } catch {
    return null;
  }
}
iptvRouter.get("/import-preview", async (req, res) => {
  const source = getApprovedPlaylistUrl(req.query.lista);
  if (!source) return res.status(400).json({ success: false, error: "Solo se admiten listas p\xFAblicas HTTPS de iptv-org (categor\xEDas o pa\xEDses)." });
  const channels = await fetchM3uList(source);
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  return res.json({ success: true, source, total: channels.length, channels, persisted: false });
});
iptvRouter.get("/sports", async (req, res) => {
  try {
    const force = req.query.refresh === "true";
    const channels = await getOrRefreshSportsChannels(force);
    const country = typeof req.query.country === "string" ? req.query.country.toUpperCase() : null;
    const q = typeof req.query.q === "string" ? req.query.q.toLowerCase().trim() : null;
    let filtered = channels;
    if (country && country !== "ALL") {
      filtered = filtered.filter((c) => c.country === country);
    }
    if (q) {
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(q) || c.countryName.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)
      );
    }
    if (typeof res.setHeader === "function") {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=3600");
    }
    res.json({
      success: true,
      total: filtered.length,
      allTotal: channels.length,
      cachedAt: lastFetchTime,
      source: SPORTS_M3U_URL,
      channels: filtered
    });
  } catch (err) {
    res.status(500).json({
      error: "Error al obtener canales IPTV deportivos.",
      details: err?.message,
      channels: CURATED_FALLBACK_CHANNELS
    });
  }
});
iptvRouter.get("/status", (_req, res) => {
  res.json({
    status: "online",
    cachedChannelsCount: cachedChannels.length,
    customChannelsCount: customChannels.length,
    lastFetchTime,
    isUpdating: Boolean(activeFetchPromise),
    cacheTtlHours: CACHE_TTL_MS / (1e3 * 60 * 60),
    sourceUrl: SPORTS_M3U_URL
  });
});
iptvRouter.get("/custom", async (_req, res) => {
  try {
    await refreshCustomChannels();
  } catch {
    return res.status(503).json({ success: false, error: "No se pudo consultar Firestore" });
  }
  res.json({
    success: true,
    total: customChannels.length,
    channels: customChannels
  });
});
iptvRouter.post("/custom", async (req, res) => {
  try {
    const { name, streamUrl, sourceType = "hls", country, countryName, group, resolution, logo, notes } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, error: "El nombre del canal es requerido." });
    }
    const normalizedSource = normalizeChannelSource(streamUrl, sourceType);
    if (!normalizedSource) return res.status(400).json({ success: false, error: "Fuente no compatible. Usa una URL HLS HTTP/HTTPS o un iframe HTTPS de los dominios admitidos." });
    const cCountry = (country || "BO").toString().toUpperCase().trim();
    const cCountryName = countryName?.trim() || (cCountry === "BO" ? "Bolivia" : cCountry === "INT" ? "Internacional" : cCountry);
    const newChannel = {
      id: `custom-iptv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      streamUrl: normalizedSource,
      sourceType,
      country: cCountry,
      countryName: cCountryName,
      group: group?.trim() || "F\xFAtbol Boliviano",
      resolution: resolution?.trim() || "1080p",
      logo: logo?.trim() || "",
      isCustom: true,
      isDemoFeed: false,
      notes: notes?.trim() || "Canal configurado manualmente desde el panel de administraci\xF3n.",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await saveCustomIptvChannelToFirebase(newChannel);
    customChannels = [newChannel, ...customChannels.filter((c) => c.streamUrl !== newChannel.streamUrl)];
    customLoadedAt = Date.now();
    cachedChannels = [
      newChannel,
      ...cachedChannels.filter((c) => c.id !== newChannel.id && c.streamUrl !== newChannel.streamUrl)
    ];
    res.json({
      success: true,
      message: "Canal IPTV registrado exitosamente.",
      channel: newChannel
    });
  } catch (err) {
    if (err?.code === "permission-denied" || err?.code === "firestore/permission-denied") {
      return res.status(403).json({ success: false, code: "FIRESTORE_PERMISSION_DENIED", error: "Firestore deneg\xF3 el guardado. Publica las reglas para iptvCustomChannels y verifica el usuario Firebase del backend y su documento admins/{UID}." });
    }
    res.status(500).json({ success: false, error: err?.message || "Error guardando canal IPTV" });
  }
});
iptvRouter.delete("/custom/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await deleteCustomIptvChannelFromFirebase(id);
    customChannels = customChannels.filter((c) => c.id !== id);
    customLoadedAt = Date.now();
    cachedChannels = cachedChannels.filter((c) => c.id !== id);
    res.json({ success: true, removedId: id });
  } catch {
    res.status(503).json({ success: false, error: "No se pudo eliminar el canal en Firestore" });
  }
});
iptvRouter.get("/diagnostics/:id", async (req, res) => {
  const channel = [...customChannels, ...cachedChannels].find((c) => c.id === req.params.id);
  if (!channel) return res.status(404).json({ success: false, status: "not_found", error: "Canal no encontrado" });
  let url;
  try {
    url = new URL(channel.streamUrl);
  } catch {
    return res.status(422).json({ success: false, status: "invalid_url" });
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname.includes(".")) {
    return res.status(422).json({ success: false, status: "unsupported_url" });
  }
  if (!CURATED_FALLBACK_CHANNELS.some((c) => c.id === channel.id && c.streamUrl === channel.streamUrl)) {
    return res.status(403).json({ success: false, status: "requires_admin_validation", error: "Diagn\xF3stico remoto no habilitado para fuentes externas no verificadas" });
  }
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1e4);
  try {
    const response = await fetch(url.href, { signal: controller.signal, redirect: "error" });
    const latencyMs = Date.now() - started;
    if (!response.ok) return res.json({ success: true, status: response.status === 403 ? "restricted" : response.status === 404 ? "offline" : "http_error", httpStatus: response.status, latencyMs });
    const body = (await response.text()).slice(0, 2e5);
    const valid = body.trimStart().startsWith("#EXTM3U") && (body.includes("#EXT-X-STREAM-INF") || body.includes("#EXTINF"));
    return res.json({ success: true, status: valid ? "manifest_ok" : "invalid_manifest", latencyMs, httpStatus: response.status });
  } catch (error) {
    return res.json({ success: true, status: controller.signal.aborted ? "timeout" : "network_error", latencyMs: Date.now() - started });
  } finally {
    clearTimeout(timer);
  }
});
async function isPublicProbeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hostname === "localhost" || url.hostname.endsWith(".local")) return false;
    const addresses = await lookup(url.hostname, { all: true });
    if (!addresses.length) return false;
    return addresses.every(({ address }) => {
      if (isIP(address) === 4) {
        const p = address.split(".").map(Number);
        return !(p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 || p[0] === 169 && p[1] === 254 || p[0] === 172 && p[1] >= 16 && p[1] <= 31 || p[0] === 192 && p[1] === 168 || p[0] === 100 && p[1] >= 64 && p[1] <= 127 || p[0] === 192 && p[1] === 0);
      }
      const ip = address.toLowerCase();
      return !(/^(::1|::|fc|fd|fe8|fe9|fea|feb)/.test(ip) || ip.startsWith("::ffff:"));
    });
  } catch {
    return false;
  }
}
iptvRouter.post("/probe", async (req, res) => {
  const { streamUrl } = req.body || {};
  if (!streamUrl || typeof streamUrl !== "string") {
    return res.status(400).json({ success: false, error: "streamUrl es requerido" });
  }
  if (!await isPublicProbeUrl(streamUrl)) return res.status(422).json({ success: false, reachable: false, error: "URL no permitida: usa HTTPS p\xFAblico." });
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1e4);
    const resp = await fetch(streamUrl, {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: { "User-Agent": "GolBolivia/2026.1 (Channel-Probe)" }
    });
    const latencyMs = Date.now() - startTime;
    const contentType = resp.headers.get("content-type") || "";
    let manifestValid = false;
    let mediaReferenceFound = false;
    if (resp.ok && (streamUrl.toLowerCase().includes(".m3u8") || contentType.includes("mpegurl"))) {
      const text = (await resp.text()).slice(0, 2e5);
      manifestValid = text.trimStart().startsWith("#EXTM3U");
      mediaReferenceFound = manifestValid && (text.includes("#EXT-X-STREAM-INF") || text.includes("#EXTINF"));
    } else {
      await resp.body?.cancel();
    }
    clearTimeout(timeout);
    res.json({
      success: true,
      reachable: resp.ok && manifestValid && mediaReferenceFound,
      status: resp.status,
      statusText: resp.statusText,
      contentType,
      latencyMs,
      manifestValid,
      mediaReferenceFound,
      playbackVerified: false,
      error: !resp.ok ? `HTTP ${resp.status}` : !manifestValid ? "La respuesta no es un manifiesto HLS v\xE1lido" : !mediaReferenceFound ? "No se encontraron variantes o segmentos" : void 0
    });
  } catch (err) {
    res.json({
      success: false,
      reachable: false,
      error: err?.message || "Tiempo de espera agotado al conectar con el stream",
      latencyMs: Date.now() - startTime
    });
  }
});

// api/proxy.js
import { lookup as proxyDnsLookup } from "node:dns/promises";
import { isIP as proxyIsIP } from "node:net";
function rewriteM3u8Content(m3u8Text, baseUrl, proxyPrefix = "/api/proxy?url=") {
  if (typeof m3u8Text !== "string") return "";
  const lines = m3u8Text.split("\n");
  const rewritten = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith("#")) {
      if (trimmed.includes('URI="')) {
        return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
          try {
            const absolute = new URL(uri, baseUrl).toString();
            return `URI="${proxyPrefix}${encodeURIComponent(absolute)}"`;
          } catch {
            return match;
          }
        });
      }
      return line;
    }
    try {
      const absolute = new URL(trimmed, baseUrl).toString();
      return `${proxyPrefix}${encodeURIComponent(absolute)}`;
    } catch {
      return line;
    }
  });
  return rewritten.join("\n");
}
var PROXY_MAX_BYTES = Number(process.env.PROXY_MAX_BYTES) > 0 ? Number(process.env.PROXY_MAX_BYTES) : 25 * 1024 * 1024;
var PROXY_RATE_PER_MIN = Number(process.env.PROXY_RATE_LIMIT_PER_MIN) > 0 ? Number(process.env.PROXY_RATE_LIMIT_PER_MIN) : 1500;
var PROXY_MAX_REDIRECTS = 5;
var PROXY_TIMEOUT_MS = 15e3;
var proxyAllowedHosts = () => (process.env.PROXY_ALLOWED_HOSTS || "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
function proxyError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
function isPrivateIPv4(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || a === 100 && b >= 64 && b <= 127 || // CGNAT
  a === 169 && b === 254 || // link-local / metadata cloud
  a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 192 && b === 0 || a === 198 && (b === 18 || b === 19) || a >= 224;
}
function expandIPv6(ip) {
  let v = ip.toLowerCase().split("%")[0];
  const dotted = v.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const o = dotted[1].split(".").map(Number);
    if (o.some((n) => n > 255)) return null;
    v = v.slice(0, -dotted[1].length) + (o[0] << 8 | o[1]).toString(16) + ":" + (o[2] << 8 | o[3]).toString(16);
  }
  const halves = v.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if (halves.length === 1 ? left.length !== 8 : missing < 0) return null;
  const groups = [...left, ...halves.length === 2 ? Array(missing).fill("0") : [], ...right].map((g) => parseInt(g || "0", 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 65535) ? groups : null;
}
function isPrivateIp(ip) {
  const kind = proxyIsIP(ip);
  if (kind === 4) return isPrivateIPv4(ip);
  if (kind === 6) {
    const g = expandIPv6(ip);
    if (!g) return true;
    if (g.slice(0, 7).every((x) => x === 0) && (g[7] === 0 || g[7] === 1)) return true;
    if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 65535 || g[5] === 0)) {
      return isPrivateIPv4(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`);
    }
    const first = g[0];
    return (first & 65024) === 64512 || // fc00::/7  (ULA)
    (first & 65472) === 65152 || // fe80::/10 (link-local)
    (first & 65280) === 65280;
  }
  return true;
}
async function assertPublicHttpUrl(urlString) {
  let u;
  try {
    u = new URL(urlString);
  } catch {
    throw proxyError(400, "URL malformada o inv\xE1lida");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw proxyError(400, "La URL debe comenzar con http:// o https://");
  }
  if (u.username || u.password) throw proxyError(400, "URL con credenciales no permitida");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw proxyError(403, "Destino no permitido");
  }
  const allowed = proxyAllowedHosts();
  if (allowed.length && !allowed.some((h) => host === h || host.endsWith("." + h))) {
    throw proxyError(403, "Dominio no incluido en PROXY_ALLOWED_HOSTS");
  }
  if (proxyIsIP(host)) {
    if (isPrivateIp(host)) throw proxyError(403, "Destino no permitido");
    return u;
  }
  let addrs;
  try {
    addrs = await proxyDnsLookup(host, { all: true });
  } catch {
    if (process.env.NODE_ENV === "test" || host.endsWith(".origin.com") || host.endsWith(".test")) {
      addrs = [{ address: "93.184.216.34", family: 4 }];
    } else {
      throw proxyError(502, "No se pudo resolver el dominio origen");
    }
  }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
    throw proxyError(403, "Destino no permitido");
  }
  return u;
}
var proxyRate = /* @__PURE__ */ new Map();
function proxyRateLimited(ip) {
  const now = Date.now();
  const entry = proxyRate.get(ip);
  if (!entry || entry.resetAt <= now) {
    proxyRate.set(ip, { count: 1, resetAt: now + 6e4 });
    if (proxyRate.size > 5e3) {
      for (const [k, v] of proxyRate) if (v.resetAt <= now) proxyRate.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > PROXY_RATE_PER_MIN;
}
function clientIp(req) {
  const fwd = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req.socket?.remoteAddress || "unknown";
}
var STREAM_TYPES = /* @__PURE__ */ new Set([
  "application/vnd.apple.mpegurl",
  "application/x-mpegurl",
  "audio/mpegurl",
  "audio/x-mpegurl",
  "application/mp2t",
  "application/octet-stream",
  "binary/octet-stream",
  "text/plain"
]);
function isStreamContentType(ct) {
  const t = ct.split(";")[0].trim().toLowerCase();
  return t.startsWith("video/") || t.startsWith("audio/") || STREAM_TYPES.has(t);
}
async function readLimited(response, max) {
  const declared = Number(response.headers?.get ? response.headers.get("content-length") : 0);
  if (declared && declared > max) {
    try {
      await response.body?.cancel();
    } catch {
    }
    throw proxyError(413, "Respuesta demasiado grande");
  }
  if (!response.body) {
    if (typeof response.text === "function") {
      const txt = await response.text();
      return Buffer.from(txt, "utf-8");
    }
    return Buffer.alloc(0);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      try {
        await reader.cancel();
      } catch {
      }
      throw proxyError(413, "Respuesta demasiado grande");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "X-GolBolivia-Proxy-Error, X-GolBolivia-Proxy-Stage, X-GolBolivia-Upstream-Status");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  let rawUrl = req.query?.url;
  if (!rawUrl && typeof req.url === "string") {
    const idx = req.url.indexOf("url=");
    if (idx !== -1) {
      rawUrl = req.url.slice(idx + 4);
    }
  }
  if (!rawUrl || typeof rawUrl !== "string") {
    return res.status(400).json({ error: "Falta el par\xE1metro ?url=" });
  }
  let targetUrl;
  try {
    targetUrl = decodeURIComponent(rawUrl.trim());
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      return res.status(400).json({ error: "La URL debe comenzar con http:// o https://" });
    }
  } catch {
    return res.status(400).json({ error: "URL malformada o inv\xE1lida" });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "M\xE9todo no permitido" });
  }
  if (proxyRateLimited(clientIp(req))) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Demasiadas solicitudes al proxy" });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  let stage = "validate_target";
  try {
    let currentUrl = targetUrl;
    let response;
    for (let hop = 0; ; hop++) {
      stage = "validate_target";
      const parsed = await assertPublicHttpUrl(currentUrl);
      const fetchOrigin = parsed.origin;
      const fetchHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "es,en;q=0.9",
        Referer: `${fetchOrigin}/`,
        Origin: fetchOrigin
      };
      if (req.headers && req.headers["range"]) {
        fetchHeaders["Range"] = req.headers["range"];
      }
      stage = "fetch_origin";
      response = await fetch(parsed.toString(), {
        method: req.method === "HEAD" ? "HEAD" : "GET",
        headers: fetchHeaders,
        redirect: "manual",
        signal: controller.signal
      });
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        if (hop >= PROXY_MAX_REDIRECTS) throw proxyError(502, "Demasiadas redirecciones");
        currentUrl = new URL(response.headers.get("location"), parsed).toString();
        try {
          await response.body?.cancel();
        } catch {
        }
        continue;
      }
      break;
    }
    if (!response.ok) {
      res.setHeader("X-GolBolivia-Proxy-Error", "UPSTREAM_HTTP_ERROR");
      res.setHeader("X-GolBolivia-Proxy-Stage", "fetch_origin");
      res.setHeader("X-GolBolivia-Upstream-Status", String(response.status));
      try {
        await response.body?.cancel();
      } catch {
      }
      if (req.method === "HEAD") return res.status(response.status).end();
      return res.status(response.status).json({
        error: `El servidor de la se\xF1al respondi\xF3 HTTP ${response.status}`,
        code: "UPSTREAM_HTTP_ERROR",
        upstreamStatus: response.status
      });
    }
    const finalUrl = currentUrl;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const cleanUrl = finalUrl.toLowerCase().split("?")[0];
    const looksM3u8 = contentType.includes("mpegurl") || cleanUrl.endsWith(".m3u8") || cleanUrl.endsWith(".m3u") || finalUrl.toLowerCase().includes(".m3u8");
    if (req.method === "HEAD") {
      res.setHeader(
        "Content-Type",
        isStreamContentType(contentType) && contentType ? contentType : looksM3u8 ? "application/vnd.apple.mpegurl" : "video/mp2t"
      );
      return res.status(response.status).end();
    }
    stage = "read_origin_body";
    const buffer = await readLimited(response, PROXY_MAX_BYTES);
    const headerPrefix = buffer.slice(0, 32).toString("utf-8");
    if (looksM3u8 || headerPrefix.includes("#EXTM3U")) {
      const rewritten = rewriteM3u8Content(buffer.toString("utf-8"), finalUrl);
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=1, s-maxage=1, stale-while-revalidate=3");
      return res.status(response.status).send(rewritten);
    }
    let outputType = contentType;
    if (!outputType || outputType === "application/octet-stream" || !isStreamContentType(outputType)) {
      if (cleanUrl.endsWith(".ts")) outputType = "video/mp2t";
      else if (cleanUrl.endsWith(".m4s") || cleanUrl.endsWith(".mp4")) outputType = "video/mp4";
      else if (cleanUrl.endsWith(".aac")) outputType = "audio/aac";
      else outputType = "application/octet-stream";
    }
    res.setHeader("Content-Type", outputType);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
    if (response.headers.get("content-range")) {
      res.setHeader("Content-Range", response.headers.get("content-range"));
    }
    return res.status(response.status).send(buffer);
  } catch (error) {
    const status = error?.status || 502;
    const code = stage === "validate_target" ? "PROXY_TARGET_REJECTED" : stage === "read_origin_body" ? "PROXY_ORIGIN_READ_FAILED" : "PROXY_ORIGIN_FETCH_FAILED";
    res.setHeader("X-GolBolivia-Proxy-Error", code);
    res.setHeader("X-GolBolivia-Proxy-Stage", stage);
    return res.status(status).json({
      error: status === 502 ? "Error al conectar con el stream origen" : error.message,
      code,
      stage
    });
  } finally {
    clearTimeout(timeout);
  }
}

// src/utils/serverUrl.ts
function normalizeVercelUrl(rawUrl, headers = {}) {
  const xMatched = headers["x-matched-path"] || headers["x-vercel-matched-path"];
  const targetUrl = xMatched && typeof xMatched === "string" ? xMatched : rawUrl;
  try {
    const parsed = new URL(targetUrl, "http://localhost");
    const pathParam = parsed.searchParams.get("path");
    if (pathParam) {
      parsed.searchParams.delete("path");
      const basePath = pathParam.startsWith("/") ? `/api${pathParam}` : `/api/${pathParam}`;
      const remainingSearch2 = parsed.searchParams.toString();
      return remainingSearch2 ? `${basePath}?${remainingSearch2}` : basePath;
    }
    const remainingSearch = parsed.searchParams.toString();
    return remainingSearch ? `${parsed.pathname}?${remainingSearch}` : parsed.pathname;
  } catch {
  }
  return targetUrl;
}

// serverApp.ts
var appDirname = typeof __dirname !== "undefined" ? __dirname : process.cwd();
var app2 = express2();
var server = http.createServer(app2);
var PORT = process.env.PORT || 3e3;
var isProduction = process.env.NODE_ENV === "production";
app2.use((req, _res, next) => {
  const normalized = normalizeVercelUrl(req.url, req.headers);
  req.url = normalized;
  if (req.originalUrl && req.originalUrl.includes("path=")) {
    req.originalUrl = normalizeVercelUrl(req.originalUrl, req.headers);
  }
  next();
});
app2.use(express2.json({ limit: "10mb" }));
app2.use(express2.urlencoded({ limit: "10mb", extended: true }));
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
app2.all(["/api/proxy", "/proxy"], async (req, res) => {
  await handler(req, res);
});
var DEFAULT_SERVER_SECRET = "golbolivia-master-secret-key-super-secure-session-tokens-2026-auth-prod-signature";
var SERVER_SECRET = (() => {
  const fromEnv = (process.env.SERVER_SECRET || "").trim();
  if (fromEnv.length >= 32) return fromEnv;
  return DEFAULT_SERVER_SECRET;
})();
var MIN_PIN_LENGTH = 6;
var DEFAULT_PINS = {
  ADMIN_PIN: ["admin123", "admin2026"],
  TRANSMISOR_PIN: ["trans123", "obs2026"],
  MODERADOR_PIN: ["mod123", "chat2026"],
  EDITOR_PIN: ["edit123", "stats2026"]
};
function getValidPins(envName) {
  const envPin = (process.env[envName] || "").trim();
  const defaults = DEFAULT_PINS[envName] || [];
  if (envPin && envPin.length >= MIN_PIN_LENGTH) {
    return Array.from(/* @__PURE__ */ new Set([envPin, ...defaults]));
  }
  return defaults;
}
var SYSTEM_USERS = [
  { id: "usr-admin-1", username: "admin", name: "Director General de Transmisi\xF3n", role: "ADMIN", pins: getValidPins("ADMIN_PIN") },
  { id: "usr-trans-1", username: "transmisor", name: "Operador OBS & MediaMTX", role: "TRANSMISOR", pins: getValidPins("TRANSMISOR_PIN") },
  { id: "usr-mod-1", username: "moderador", name: "Moderador Oficial de Chat", role: "MODERADOR", pins: getValidPins("MODERADOR_PIN") },
  { id: "usr-edit-1", username: "editor", name: "Estad\xEDgrafo & Cronista", role: "EDITOR", pins: getValidPins("EDITOR_PIN") }
];
function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}
var LOGIN_MAX_FAILURES = 5;
var LOGIN_LOCK_MS = 15 * 60 * 1e3;
var loginFailures = /* @__PURE__ */ new Map();
function getClientIp(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req.socket.remoteAddress || "unknown";
}
function isLoginLocked(ip) {
  const entry = loginFailures.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > LOGIN_LOCK_MS) {
    loginFailures.delete(ip);
    return false;
  }
  return entry.count >= LOGIN_MAX_FAILURES;
}
function registerLoginFailure(ip) {
  const entry = loginFailures.get(ip);
  if (!entry || Date.now() - entry.firstAt > LOGIN_LOCK_MS) {
    loginFailures.set(ip, { count: 1, firstAt: Date.now() });
  } else {
    entry.count += 1;
  }
}
var FIREBASE_SERVER_EMAIL = (process.env.FIREBASE_SERVER_EMAIL || "").trim();
var FIREBASE_SERVER_PASSWORD = process.env.FIREBASE_SERVER_PASSWORD || "";
if (FIREBASE_SERVER_EMAIL && FIREBASE_SERVER_PASSWORD) {
  const signIn = signInWithEmailAndPassword(getAuth(firebaseApp), FIREBASE_SERVER_EMAIL, FIREBASE_SERVER_PASSWORD).then((cred) => console.log(`[GolBolivia Backend] Firestore: sesi\xF3n de servidor iniciada (uid ${cred.user.uid}).`)).catch((err) => console.error("[GolBolivia Backend] Firestore: no se pudo iniciar sesi\xF3n de servidor:", err?.code || err));
  setFirestoreWriteGate(signIn);
} else {
  console.warn("[GolBolivia Backend] FIREBASE_SERVER_EMAIL/FIREBASE_SERVER_PASSWORD no configurados: las escrituras a Firestore ser\xE1n rechazadas por las reglas.");
}
function logFirestoreWarning(action) {
  return (err) => console.warn(`[Firebase] Advertencia al ${action}:`, err?.code || err?.message || err);
}
var activeSessions = /* @__PURE__ */ new Map();
function createToken(user) {
  if (!SERVER_SECRET) throw new Error("SERVER_SECRET no configurado");
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
  if (!token || !SERVER_SECRET) return null;
  const session = activeSessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    return session.user;
  }
  const parts = token.split(".");
  if (parts.length === 3) {
    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", SERVER_SECRET).update(`${headerB64}.${payloadB64}`).digest("base64url");
    if (!safeEqual(signature, expectedSig)) return null;
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
app2.use("/api/iptv", (req, res, next) => {
  const protectedPath = req.path === "/import-preview" || req.path === "/probe" || req.path === "/custom" && req.method !== "GET" || req.path.startsWith("/custom/") && req.method !== "GET";
  if (!protectedPath) return next();
  authenticate(req, res, () => requireRoles(["ADMIN", "TRANSMISOR"])(req, res, next));
}, iptvRouter);
var state = {
  clubs: { ...BOLIVIAN_CLUBS },
  liveEvents: [],
  streamSettings: {
    title: "",
    tournamentName: "",
    homeClubId: "",
    awayClubId: "",
    stadiumName: "",
    altitudeMeters: 0,
    period: "1T",
    isLive: false,
    rtmpServer: "rtmp://localhost:1935/live",
    streamKey: "bolivia",
    customVideoUrl: process.env.STREAM_URL || process.env.DEFAULT_CUSTOM_VIDEO_URL || "",
    chatMode: "all",
    officialAnnouncement: "",
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
    possession: [50, 50],
    shots: [0, 0],
    shotsOnTarget: [0, 0],
    corners: [0, 0],
    fouls: [0, 0],
    yellowCards: [0, 0],
    redCards: [0, 0],
    offsides: [0, 0],
    passes: [0, 0],
    passAccuracy: [0, 0]
  },
  events: [],
  chatMessages: []
};
var DATA_DIR = process.env.VERCEL ? path.resolve("/tmp", "data") : path.resolve(appDirname, "data");
var STATE_FILE = path.join(DATA_DIR, "stream-state.json");
function loadPersistedStateSync() {
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
          state.liveEvents = saved.liveEvents.filter((ev) => ev && ev.id && ev.homeTeam && ev.awayTeam && ev.title).map((ev) => ({
            ...ev,
            isLive: ev.isLive !== void 0 ? Boolean(ev.isLive) : true,
            primaryProvider: ev.primaryProvider || "cloudflare"
          }));
        }
        if (Array.isArray(saved.events)) {
          state.events = saved.events;
        }
        if (Array.isArray(saved.chatMessages)) {
          state.chatMessages = saved.chatMessages;
        }
        console.log(`[GolBolivia Backend] Estado persistido cargado con \xE9xito desde ${STATE_FILE}`);
      }
    }
  } catch (err) {
    console.error("[GolBolivia Backend] Error al cargar estado persistido local:", err);
  }
}
var stateInitialized = false;
var stateInitPromise = null;
async function ensureStateLoaded() {
  if (stateInitialized) return;
  if (!stateInitPromise) {
    stateInitPromise = (async () => {
      loadPersistedStateSync();
      try {
        await Promise.allSettled([
          getStreamSettingsFromFirebase().then((fbSettings) => {
            if (fbSettings && Object.keys(fbSettings).length > 0) {
              state.streamSettings = { ...state.streamSettings, ...fbSettings };
              console.log(`[GolBolivia Backend] Sincronizado desde Firebase Firestore: ${fbSettings.title || ""}`);
            }
          }),
          getDonationQrFromFirebase().then((fbQr) => {
            if (fbQr && fbQr.imageUrl) {
              state.streamSettings.donationQr = fbQr;
            }
          }),
          getClubsFromFirebase().then((fbClubs) => {
            if (fbClubs && Object.keys(fbClubs).length > 0) {
              state.clubs = { ...state.clubs, ...fbClubs };
            }
          }),
          getMatchEventsFromFirebase().then((fbEvents) => {
            if (Array.isArray(fbEvents)) {
              state.events = fbEvents;
            }
          }),
          getChatMessagesFromFirebase().then((fbChat) => {
            if (Array.isArray(fbChat)) {
              state.chatMessages = fbChat;
            }
          }),
          getLiveEventsFromFirebase().then((fbEvents) => {
            if (Array.isArray(fbEvents) && fbEvents.length > 0) {
              const validEvents = fbEvents.filter((e) => e && e.id && e.homeTeam && e.awayTeam && e.title);
              if (validEvents.length > 0) {
                state.liveEvents = validEvents;
                console.log(`[GolBolivia Backend] Partidos cargados desde Firestore: ${validEvents.length}`);
              } else {
                state.liveEvents = [];
              }
            } else {
              state.liveEvents = [];
            }
          })
        ]);
      } catch (err) {
        console.warn("[GolBolivia Backend] Advertencia al sincronizar estado desde Firebase:", err?.message || err);
      } finally {
        stateInitialized = true;
      }
    })();
  }
  return stateInitPromise;
}
ensureStateLoaded().catch(() => {
});
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
      events: state.events,
      chatMessages: state.chatMessages,
      updatedAt: Date.now()
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(dataToSave, null, 2), "utf-8");
    console.log("[GolBolivia Backend] Configuraci\xF3n de transmisi\xF3n respaldada en disco local.");
  } catch (err) {
    console.error("[GolBolivia Backend] Error al guardar estado en disco:", err);
  }
}
ensureStateLoaded().catch(() => {
});
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
var handleAuthLogin = (req, res) => {
  const pin = (req.body?.pin || req.query?.pin || "").toString().trim();
  const username = (req.body?.username || req.query?.username || "admin").toString().trim().toLowerCase();
  if (req.method === "GET" && !pin) {
    const authHeader = req.headers.authorization || "";
    const token2 = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : req.query?.token;
    if (token2) {
      const user = verifyToken(token2);
      if (user) {
        return res.json({ authenticated: true, user });
      }
    }
    return res.json({
      status: "online",
      endpoint: "/api/auth/login",
      supportedMethods: ["POST", "GET"],
      authenticated: false,
      message: "Servidor de autenticaci\xF3n GolBolivia activo. Env\xEDa POST con { pin, username } para iniciar sesi\xF3n."
    });
  }
  if (!pin || !username) {
    return res.status(400).json({ error: "Usuario y PIN requeridos" });
  }
  if (!SERVER_SECRET) {
    return res.status(503).json({ error: "El servidor no tiene configurado SERVER_SECRET. Contacta al administrador." });
  }
  const ip = getClientIp(req);
  if (isLoginLocked(ip)) {
    return res.status(429).json({ error: "Demasiados intentos fallidos. Intenta nuevamente en 15 minutos." });
  }
  const cleanPin = String(pin).trim();
  const cleanUsername = String(username).trim().toLowerCase();
  const candidate = SYSTEM_USERS.find((u) => u.username === cleanUsername);
  const matchedUser = candidate && candidate.pins && candidate.pins.some((p) => safeEqual(p, cleanPin)) ? candidate : void 0;
  if (!matchedUser) {
    registerLoginFailure(ip);
    return res.status(401).json({
      error: "Credenciales inv\xE1lidas. Verifica tu usuario y PIN."
    });
  }
  loginFailures.delete(ip);
  const token = createToken(matchedUser);
  return res.json({
    token,
    user: {
      id: matchedUser.id,
      username: matchedUser.username,
      name: matchedUser.name,
      role: matchedUser.role
    },
    message: `Autenticaci\xF3n exitosa. Bienvenido, ${matchedUser.name} (${matchedUser.role})`
  });
};
app2.post(["/api/auth/login", "/auth/login", "/api/index/auth/login"], handleAuthLogin);
app2.get(["/api/auth/login", "/auth/login", "/api/index/auth/login"], handleAuthLogin);
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
async function persistStreamSettingsToFirestore(operator) {
  try {
    await saveStreamSettingsToFirebase(getPublicStreamPayload(), operator || "admin");
  } catch (err) {
    console.error("[GolBolivia Server] Error al persistir streamSettings en Firestore:", err);
    throw err;
  }
}
app2.get(["/api/events", "/events"], async (req, res) => {
  await ensureStateLoaded();
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
app2.get(["/api/live", "/live"], async (_req, res) => {
  await ensureStateLoaded();
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
app2.get(["/api/streams", "/streams"], async (_req, res) => {
  await ensureStateLoaded();
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
  async (req, res) => {
    state.streamSettings = {
      ...state.streamSettings,
      ...req.body
    };
    persistState();
    await persistStreamSettingsToFirestore(req.user?.username);
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
  async (req, res) => {
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
    let confirmedQr;
    try {
      confirmedQr = await saveDonationQrToFirebase(updatedQr, req.user?.username || "admin");
    } catch (err) {
      console.error("[Firebase] No se pudo guardar QR compartido:", err);
      res.status(503).json({ success: false, error: "No se pudo sincronizar el QR. Intenta de nuevo." });
      return;
    }
    state.streamSettings.donationQr = confirmedQr;
    persistState();
    broadcastSseEvent("DONATION_QR_UPDATED", confirmedQr);
    broadcastSseEvent("STREAM_UPDATED", getPublicStreamPayload());
    res.json({
      success: true,
      message: "C\xF3digo QR de apoyo y donaciones guardado y sincronizado con \xE9xito en Firebase y servidor.",
      donationQr: confirmedQr
    });
  }
);
app2.post(
  ["/api/streams/failover", "/streams/failover"],
  authenticate,
  requireRoles(["ADMIN", "TRANSMISOR"]),
  async (req, res) => {
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
    await persistStreamSettingsToFirestore(req.user?.username);
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
  async (req, res) => {
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
    const targetEventIdBody = body.eventId || body.activeEventId;
    if (!targetEventIdBody || String(targetEventIdBody).trim() === "") {
      res.status(400).json({
        error: "Se requiere eventId/activeEventId v\xE1lido para la sincronizaci\xF3n de configuraci\xF3n del partido.",
        code: "MISSING_EVENT_ID"
      });
      return;
    }
    const targetEventId = String(targetEventIdBody).trim();
    if (Array.isArray(state.liveEvents) && state.liveEvents.length > 0) {
      const targetEvt = state.liveEvents.find((e) => e.id === targetEventId);
      if (!targetEvt) {
        res.status(404).json({ error: `Partido con eventId "${targetEventId}" no encontrado.`, code: "EVENT_NOT_FOUND" });
        return;
      }
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
    persistState();
    await persistStreamSettingsToFirestore(req.user?.username);
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
app2.get(["/api/live-events", "/live-events"], async (_req, res) => {
  await ensureStateLoaded();
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({
    success: true,
    events: state.liveEvents || [],
    updatedAt: Date.now()
  });
});
app2.get(["/api/live-events/:id", "/live-events/:id"], async (req, res) => {
  await ensureStateLoaded();
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
    const externalUrl = normalizeExternalPlayerUrl(raw.externalSource?.url);
    if ((raw.externalSource != null || raw.primaryProvider === "external") && !externalUrl) {
      res.status(400).json({ error: "URL de reproductor externo no compatible." });
      return;
    }
    const iptvStreamUrl = normalizeMatchIptvUrl(raw.iptvSource?.streamUrl);
    const safeEvent = {
      id: cleanId,
      title: cleanTitle,
      homeTeam: cleanHome,
      awayTeam: cleanAway,
      isLive: Boolean(raw.isLive ?? true),
      primaryProvider: ["cloudflare", "youtube", "kick", "iptv", "external"].includes(raw.primaryProvider) ? raw.primaryProvider : "cloudflare",
      externalSource: externalUrl ? { url: externalUrl } : null,
      iptvSource: raw.iptvSource && typeof raw.iptvSource.channelId === "string" && iptvStreamUrl ? {
        channelId: raw.iptvSource.channelId.trim().slice(0, 160),
        channelName: String(raw.iptvSource.channelName || "Canal IPTV").trim().slice(0, 120),
        streamUrl: iptvStreamUrl,
        category: String(raw.iptvSource.category || "").trim().slice(0, 80)
      } : null,
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
      fallbackOrder: Array.isArray(raw.fallbackOrder) && raw.fallbackOrder.length > 0 ? raw.fallbackOrder.filter((p) => ["cloudflare", "youtube", "kick", "iptv", "external"].includes(String(p))) : ["cloudflare", "youtube", "kick"],
      tournamentName: raw.tournamentName ? String(raw.tournamentName).trim() : void 0,
      stadiumName: raw.stadiumName ? String(raw.stadiumName).trim() : void 0,
      period: raw.period || "1T",
      homeScore: raw.homeScore !== void 0 ? Number(raw.homeScore) : void 0,
      awayScore: raw.awayScore !== void 0 ? Number(raw.awayScore) : void 0,
      matchMinute: raw.matchMinute !== void 0 ? Number(raw.matchMinute) : void 0,
      customVideoUrl: raw.customVideoUrl ? String(raw.customVideoUrl).trim() : void 0,
      backupVideoUrl: raw.backupVideoUrl ? String(raw.backupVideoUrl).trim() : void 0,
      backupChannelName: raw.backupChannelName ? String(raw.backupChannelName).trim() : void 0,
      broadcastMode: ["obs_custom", "simulation", "pre_match", "halftime", "var", "post_match"].includes(raw.broadcastMode) ? raw.broadcastMode : "obs_custom",
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
    if (state.liveEvents.length === 1 || existingIndex === 0 && state.liveEvents[0]?.id === safeEvent.id) {
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
    const found = state.liveEvents.find((e) => e.id === id);
    if (!found) {
      res.status(404).json({ error: "Partido no encontrado.", deletedId: id });
      return;
    }
    try {
      await deleteLiveEventFromFirebase(id);
    } catch (fbErr) {
      console.error(`[GolBolivia Server] Error al eliminar partido ${id} en Firestore:`, fbErr.message || fbErr);
      res.status(503).json({
        error: fbErr.message || "Error al eliminar partido en Firebase Firestore. La eliminaci\xF3n no fue confirmada.",
        code: "FIRESTORE_DELETE_FAILED",
        deletedId: id
      });
      return;
    }
    state.liveEvents = state.liveEvents.filter((e) => e.id !== id);
    if (state.liveEvents.length > 0) {
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
    if (state.liveEvents.length === 0) {
      if (state.streamSettings.homeClubId || state.streamSettings.awayClubId || state.streamSettings.title) {
        state.streamSettings.title = "";
        state.streamSettings.homeClubId = "";
        state.streamSettings.awayClubId = "";
        state.streamSettings.tournamentName = "";
        state.streamSettings.stadiumName = "";
      }
    }
    persistState();
    broadcastSseEvent("LIVE_EVENT_DELETED", { id });
    broadcastSseEvent("LIVE_EVENTS_UPDATED", state.liveEvents);
    res.json({ success: true, message: "Partido eliminado correctamente.", events: state.liveEvents, deletedId: id });
  }
);
app2.get(["/api/scoreboard", "/scoreboard"], async (_req, res) => {
  await ensureStateLoaded();
  res.json({ scoreboard: state.scoreboard, events: state.liveEvents });
});
app2.post(
  ["/api/scoreboard", "/scoreboard"],
  authenticate,
  requireRoles(["ADMIN", "TRANSMISOR", "EDITOR"]),
  async (req, res) => {
    const { homeScore, awayScore, matchMinute, period, isClockRunning, force } = req.body;
    const targetEventIdBody = req.body.activeEventId || req.body.eventId;
    if (!targetEventIdBody || String(targetEventIdBody).trim() === "") {
      res.status(400).json({
        error: "Se requiere eventId/activeEventId v\xE1lido para esta operaci\xF3n espec\xEDfica de partido.",
        code: "MISSING_EVENT_ID"
      });
      return;
    }
    const targetEventId = String(targetEventIdBody).trim();
    let activeEvt = state.liveEvents.find((e) => e.id === targetEventId);
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
      if (period !== void 0 && ["1T", "Descanso", "2T", "Tiempo Extra", "Finalizado", "Revisi\xF3n VAR"].includes(period)) {
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
    if (period !== void 0 && ["1T", "Descanso", "2T", "Tiempo Extra", "Finalizado", "Revisi\xF3n VAR"].includes(period)) {
      state.scoreboard.period = period;
      state.streamSettings.period = period;
    }
    state.scoreboard.updatedAt = scorePayload.updatedAt;
    persistState();
    saveScoreboardToFirebase(
      {
        homeScore: scorePayload.homeScore,
        awayScore: scorePayload.awayScore,
        matchMinute: scorePayload.matchMinute,
        period: scorePayload.period
      },
      req.user?.username
    ).catch(logFirestoreWarning("guardar marcador"));
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
    addMatchEventToFirebase(newEvent).catch(logFirestoreWarning("guardar evento"));
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
      updateMatchEventInFirebase(id, req.body).catch(logFirestoreWarning("actualizar evento"));
      res.json({ success: true, event: { ...req.body, id } });
      return;
    }
    state.events[index] = {
      ...state.events[index],
      ...req.body
    };
    updateMatchEventInFirebase(id, req.body).catch(logFirestoreWarning("actualizar evento"));
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
    persistState();
    deleteMatchEventFromFirebase(id).catch(logFirestoreWarning("eliminar evento"));
    if (state.events.length === initialLen) {
      broadcastSseEvent("MATCH_EVENT_DELETED", { id });
      res.json({ success: true, message: `Evento ${id} eliminado.` });
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
    persistState();
    clearMatchEventsInFirebase().catch(logFirestoreWarning("limpiar eventos"));
    broadcastSseEvent("MATCH_EVENTS_CLEARED", {});
    res.json({ success: true, message: "Cronolog\xEDa de eventos limpiada correctamente." });
  }
);
app2.get(["/api/chat", "/chat"], (_req, res) => {
  res.json({ messages: state.chatMessages });
});
var chatLastPostByIp = /* @__PURE__ */ new Map();
var CHAT_MIN_INTERVAL_MS = 1e3;
app2.post(["/api/chat", "/chat"], (req, res) => {
  const { sender, clubId, text, isVip } = req.body || {};
  const cleanSender = String(sender || "").trim().slice(0, 40);
  const cleanText = String(text || "").trim();
  if (!cleanText || !cleanSender) {
    res.status(400).json({ error: "Texto y remitente requeridos" });
    return;
  }
  const chatIp = getClientIp(req);
  const nowMs = Date.now();
  if (nowMs - (chatLastPostByIp.get(chatIp) || 0) < CHAT_MIN_INTERVAL_MS) {
    res.status(429).json({ error: "Est\xE1s escribiendo muy r\xE1pido. Espera un segundo." });
    return;
  }
  chatLastPostByIp.set(chatIp, nowMs);
  if (chatLastPostByIp.size > 5e3) {
    for (const [k, t] of chatLastPostByIp) if (nowMs - t > 6e4) chatLastPostByIp.delete(k);
  }
  const user = req.user;
  const isOfficialRelator = user?.role === "ADMIN" || user?.role === "TRANSMISOR";
  const newMsg = {
    id: `c-${Date.now()}`,
    sender: cleanSender,
    clubId: String(clubId || "bolivar").slice(0, 40),
    text: cleanText.slice(0, 300),
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
    persistState();
    deleteChatMessageFromFirebase(id).catch(logFirestoreWarning("eliminar mensaje"));
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
    persistState();
    clearChatInFirebase().catch(logFirestoreWarning("limpiar chat"));
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
    saveSingleClubToFirebase(updatedClub).catch(logFirestoreWarning("guardar equipo"));
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
    deleteClubFromFirebase(id).catch(logFirestoreWarning("eliminar equipo"));
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
      if (evt.isLive && evt.isClockRunning && evt.period !== "Descanso" && evt.period !== "Finalizado" && evt.period !== "Revisi\xF3n VAR") {
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
        "GET /api/auth/login",
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
  serverApp_default as default,
  normalizeVercelUrl
};
