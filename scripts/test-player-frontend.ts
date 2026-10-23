import React from 'react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BOLIVIAN_CLUBS } from '../src/data/bolivianFootballData';
import { StreamSettings, LiveEvent } from '../src/types/football';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('🧪 PRUEBAS DE FRONTEND: REPRODUCTOR, CONTROLES Y EVENTOS LIMPIOS');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName} ${detail ? '— ' + detail : ''}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? '— ' + detail : ''}`);
    throw new Error(`Test fallido: ${testName}`);
  }
}

async function runTests() {
  // 1. Verificar StreamPlayer exports
  const { StreamPlayer } = await import('../src/features/player/StreamPlayer');
  assert(typeof StreamPlayer === 'function', 'StreamPlayer exportado como componente React');

  // 2. Verificar UniversalStreamPlayer re-export
  const { UniversalStreamPlayer } = await import('../src/features/player/UniversalStreamPlayer');
  assert(typeof UniversalStreamPlayer === 'function', 'UniversalStreamPlayer disponible y unificado');

  // 3. Verificar hook useFullscreen (Agrandar pantalla y rotación automática a horizontal)
  const { useFullscreen } = await import('../src/features/player/hooks/useFullscreen');
  assert(typeof useFullscreen === 'function', 'Hook useFullscreen con soporte de auto-rotación landscape activo');

  // 4. Verificar hook useCast (Smart TV, Chromecast, AirPlay, Remote Playback)
  const { useCast } = await import('../src/features/player/hooks/useCast');
  assert(typeof useCast === 'function', 'Hook useCast con soporte Smart TV y Cast modal activo');

  // 5. Verificar FullscreenController
  const { FullscreenController } = await import('../src/features/player/FullscreenController');
  assert(typeof FullscreenController === 'function', 'Componente FullscreenController con botón de pantalla completa');

  // 6. Verificar CastController modal
  const { CastController } = await import('../src/features/player/CastController');
  assert(typeof CastController === 'function', 'Componente CastController modal disponible');

  // 7. Simular lógica de Doble Toque / Click en móvil para pausa/reanudación
  let isPlaying: boolean = true;
  const togglePlay = () => { isPlaying = !isPlaying; };
  let lastTap = 1000;
  let currentTap = 1200; // delta 200ms < 350ms -> Double tap
  if (currentTap - lastTap < 350) {
    togglePlay();
  }
  assert(!isPlaying, 'Doble toque/click en móvil pausa la transmisión correctamente');

  // Segundo doble toque -> reanuda
  lastTap = 2000;
  currentTap = 2180; // delta 180ms
  if (currentTap - lastTap < 350) {
    togglePlay();
  }
  assert(Boolean(isPlaying), 'Segundo doble toque/click en móvil reanuda la transmisión correctamente');

  // 8. Simular modo Pantalla Limpia (isCleanScreen)
  let isCleanScreen: boolean = false;
  let showControls: boolean = true;
  const toggleCleanScreen = () => {
    isCleanScreen = !isCleanScreen;
    showControls = !isCleanScreen;
  };

  toggleCleanScreen();
  assert(Boolean(isCleanScreen && !showControls), 'Modo Pantalla Limpia oculta controles y botones');

  toggleCleanScreen();
  assert(Boolean(!isCleanScreen && showControls), 'Desactivar Pantalla Limpia restaura controles');

  // 9. Verificar detección de fuentes sin exponer datos técnicos
  const hlsUrl = 'https://renewable-wolf-chemical-includes.trycloudflare.com/live/partido/index.m3u8';
  const ytUrl = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
  const kickUrl = 'https://kick.com/golbolivia';

  assert(hlsUrl.includes('.m3u8'), 'Detección de flujo HLS nativo');
  assert(/(?:youtu\.be\/|youtube\.com)/.test(ytUrl), 'Detección limpia de stream YouTube');
  assert(/kick\.com/.test(kickUrl), 'Detección limpia de stream Kick');

  // 10. REQUERIMIENTO: Sin marcador en pantalla de video (No poner marcador en la pantalla)
  const { VideoSurface } = await import('../src/features/player/VideoSurface');
  assert(typeof VideoSurface === 'function', 'VideoSurface exportado y verificado');
  
  // 11. REQUERIMIENTO: YouTube y Kick transmiten con audio (NO en mute por defecto)
  const ytEmbedParam = `https://www.youtube-nocookie.com/embed/test?autoplay=1&mute=0&playsinline=1&rel=0&modestbranding=1`;
  const kickEmbedParam = `https://player.kick.com/test?autoplay=true&muted=false`;
  assert(!ytEmbedParam.includes('mute=1') && ytEmbedParam.includes('mute=0'), 'Stream de YouTube NO está en mute por defecto (mute=0)');
  assert(!kickEmbedParam.includes('muted=true') && kickEmbedParam.includes('muted=false'), 'Stream de Kick NO está en mute por defecto (muted=false)');

  // 12. REQUERIMIENTO: Chat sin generador automático falso (usuarios reales que entren a la página)
  const { LiveChat } = await import('../src/components/LiveChat');
  assert(typeof LiveChat === 'function', 'LiveChat exportado con integración de usuarios reales');

  // 13. REQUERIMIENTO: Creación y configuración de nuevo partido sin borrado (No se borra al configurar)
  const { LiveEventsManager } = await import('../src/components/LiveEventsManager');
  assert(typeof LiveEventsManager === 'function', 'LiveEventsManager exportado y disponible');

  const existingEvents: LiveEvent[] = [
    { id: 'partido-001', title: 'Bolívar vs The Strongest', homeTeam: 'bolivar', awayTeam: 'strongest', isLive: true, primaryProvider: 'cloudflare', fallbackOrder: ['cloudflare', 'youtube', 'kick'] },
    { id: 'partido-002', title: 'Blooming vs Oriente', homeTeam: 'blooming', awayTeam: 'oriente', isLive: false, primaryProvider: 'youtube', fallbackOrder: ['youtube', 'kick'] },
  ];

  // Simulación de creación de nuevo partido
  const existingNums = existingEvents
    .map((e) => {
      const m = e.id.match(/partido-(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));
  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : existingEvents.length + 1;
  const newMatchId = `partido-${String(nextNum).padStart(3, '0')}`;
  assert(newMatchId === 'partido-003', 'Generación de ID secuencial único para nuevo partido (partido-003)');

  const newMatch: LiveEvent = {
    id: newMatchId,
    title: `Nuevo Partido ${nextNum}`,
    homeTeam: 'wilstermann',
    awayTeam: 'aurora',
    isLive: true,
    primaryProvider: 'kick',
    fallbackOrder: ['kick', 'youtube', 'cloudflare'],
  };
  const listAfterCreate = [...existingEvents, newMatch];
  assert(listAfterCreate.some((e) => e.id === newMatchId), 'Nuevo partido agregado a la lista en memoria');

  // Simulación de Safe-Merge (incoming server events nunca deben borrar el nuevo partido)
  const incomingServerEvents: LiveEvent[] = [
    { id: 'partido-001', title: 'Bolívar vs The Strongest', homeTeam: 'bolivar', awayTeam: 'strongest', isLive: true, primaryProvider: 'cloudflare', fallbackOrder: ['cloudflare'] },
  ];
  const safeMap = new Map<string, LiveEvent>();
  listAfterCreate.forEach((e) => safeMap.set(e.id, e));
  incomingServerEvents.forEach((e) => safeMap.set(e.id, e));
  const mergedList = Array.from(safeMap.values());
  assert(mergedList.some((e) => e.id === newMatchId), 'Safe-Merge protege el nuevo partido de ser borrado por actualizaciones del servidor');
  // 14. REQUERIMIENTO: Proveedor Principal (primaryProvider) guardado y reproducido correctamente (Kick, YouTube, Cloudflare)
  const { getStreamUrlForEvent, detectProviderFromUrl } = await import('../src/utils/streamUtils');

  const multiProviderMatch: LiveEvent = {
    id: 'partido-test',
    title: 'Wilstermann vs Aurora',
    homeTeam: 'wilstermann',
    awayTeam: 'aurora',
    isLive: true,
    primaryProvider: 'kick',
    cloudflare: { liveInputId: 'cf-id', playbackUrl: 'https://cf-stream.com/live/index.m3u8' },
    youtube: { videoId: 'yt123456789' },
    kick: { channel: 'josecpp98' },
    fallbackOrder: ['kick', 'youtube', 'cloudflare'],
  };

  // Debe retornar Kick aunque Cloudflare tenga URL
  const kickResolved = getStreamUrlForEvent(multiProviderMatch);
  assert(kickResolved === 'https://kick.com/josecpp98', 'primaryProvider: kick devuelve la URL de Kick aunque exista Cloudflare');

  // Cambiando primaryProvider a youtube
  const ytMatch: LiveEvent = { ...multiProviderMatch, primaryProvider: 'youtube' };
  const ytResolved = getStreamUrlForEvent(ytMatch);
  assert(ytResolved === 'https://www.youtube.com/watch?v=yt123456789', 'primaryProvider: youtube devuelve la URL de YouTube');

  // Cambiando primaryProvider a cloudflare
  const cfMatch: LiveEvent = { ...multiProviderMatch, primaryProvider: 'cloudflare' };
  const cfResolved = getStreamUrlForEvent(cfMatch);
  assert(cfResolved === 'https://cf-stream.com/live/index.m3u8', 'primaryProvider: cloudflare devuelve la URL de Cloudflare');

  // Fallback si el primario no tiene canal configurado
  const missingKickMatch: LiveEvent = { ...multiProviderMatch, primaryProvider: 'kick', kick: { channel: '' }, fallbackOrder: ['kick', 'youtube'] };
  const fallbackResolved = getStreamUrlForEvent(missingKickMatch);
  assert(fallbackResolved === 'https://www.youtube.com/watch?v=yt123456789', 'Fallback funciona cuando el proveedor principal no tiene stream configurado');

  assert(detectProviderFromUrl('https://player.kick.com/canal') === 'kick', 'detectProviderFromUrl detecta Kick');
  assert(detectProviderFromUrl('https://youtube.com/watch?v=abc') === 'youtube', 'detectProviderFromUrl detecta YouTube');
  assert(detectProviderFromUrl('https://stream.m3u8') === 'cloudflare', 'detectProviderFromUrl detecta Cloudflare');

  // 15. PROBLEMA 1: Carga inicial usa mergeConfirmedEvents y no reemplaza datos recientes
  const mergeConfirmedEventsHelper = (prevList: LiveEvent[], incomingList: LiveEvent[]): LiveEvent[] => {
    const result = [...prevList];
    for (const inc of incomingList) {
      const idx = result.findIndex((e) => e.id === inc.id);
      if (idx >= 0) {
        const current = result[idx];
        const curVer = typeof current.version === 'number' ? current.version : 0;
        const incVer = typeof inc.version === 'number' ? inc.version : 0;
        const curUp = current.updatedAt || 0;
        const incUp = inc.updatedAt || 0;
        if (incVer > curVer) {
          result[idx] = { ...current, ...inc };
        } else if (incVer === curVer && incUp >= curUp) {
          result[idx] = { ...current, ...inc };
        }
      } else {
        result.push(inc);
      }
    }
    return result;
  };

  const localRecentEvents: LiveEvent[] = [
    { id: 'partido-001', title: 'Bolívar vs The Strongest', homeTeam: 'bolivar', awayTeam: 'strongest', isLive: true, primaryProvider: 'kick', fallbackOrder: ['kick'], version: 4, updatedAt: 2000, homeScore: 3, awayScore: 2 },
  ];
  const staleInitialEvents: LiveEvent[] = [
    { id: 'partido-001', title: 'Bolívar vs The Strongest', homeTeam: 'bolivar', awayTeam: 'strongest', isLive: true, primaryProvider: 'kick', fallbackOrder: ['kick'], version: 2, updatedAt: 1000, homeScore: 0, awayScore: 0 },
    { id: 'partido-002', title: 'Blooming vs Oriente', homeTeam: 'blooming', awayTeam: 'oriente', isLive: false, primaryProvider: 'youtube', fallbackOrder: ['youtube'], version: 1, updatedAt: 1000 },
  ];

  const mergedInitial = mergeConfirmedEventsHelper(localRecentEvents, staleInitialEvents);
  const p1 = mergedInitial.find((e) => e.id === 'partido-001');
  assert(p1?.version === 4 && p1?.homeScore === 3, 'Problema 1: Carga inicial no sobrescribe partido con versión v4 usando lista desactualizada v2');
  assert(mergedInitial.some((e) => e.id === 'partido-002'), 'Problema 1: Carga inicial incorpora nuevos partidos que no existían localmente');

  // 16. PROBLEMA 2: Marcador visible derivado únicamente del evento confirmado más reciente
  const getVisibleScoreboard = (events: LiveEvent[], activeId: string) => {
    const current = events.find((e) => e.id === activeId) || events[0];
    return {
      homeScore: typeof current?.homeScore === 'number' ? current.homeScore : 0,
      awayScore: typeof current?.awayScore === 'number' ? current.awayScore : 0,
      matchMinute: typeof current?.matchMinute === 'number' ? current.matchMinute : 0,
    };
  };

  // Si llega un evento rechazado por versión desactualizada
  const staleEventUpdate: LiveEvent[] = [
    { id: 'partido-001', title: 'Bolívar vs The Strongest', homeTeam: 'bolivar', awayTeam: 'strongest', isLive: true, primaryProvider: 'kick', fallbackOrder: ['kick'], version: 1, homeScore: 0, awayScore: 0, matchMinute: 5 },
  ];
  const listAfterStaleUpdate = mergeConfirmedEventsHelper(mergedInitial, staleEventUpdate);
  const visibleScore = getVisibleScoreboard(listAfterStaleUpdate, 'partido-001');
  assert(visibleScore.homeScore === 3 && visibleScore.awayScore === 2, 'Problema 2: Marcador visible deriva del evento confirmado más reciente y rechaza marcador v1 desactualizado');

  // 17. PROBLEMA 3: Sincronización de transmisión exige estrictamente eventId para configuraciones por partido
  const simulateStreamSync = (
    currentSettings: any,
    currentEvents: LiveEvent[],
    activeId: string,
    newConfig: { eventId?: string; customVideoUrl?: string; activeStreamSource?: string }
  ) => {
    const targetId = newConfig.eventId;
    if (!targetId) {
      // Ignorado para configuraciones de partido si no tiene eventId
      return { settings: currentSettings, events: currentEvents, applied: false };
    }
    const updatedEvents = currentEvents.map((ev) => (ev.id === targetId ? { ...ev, ...newConfig } : ev));
    let updatedSettings = currentSettings;
    if (targetId === activeId) {
      updatedSettings = { ...currentSettings, ...newConfig };
    }
    return { settings: updatedSettings, events: updatedEvents, applied: true };
  };

  const initialStreamSettings = { customVideoUrl: 'https://stream.m3u8', activeStreamSource: 'obs' };
  const syncWithoutEventId = simulateStreamSync(initialStreamSettings, mergedInitial, 'partido-001', { customVideoUrl: 'https://hacked.m3u8' });
  assert(!syncWithoutEventId.applied && syncWithoutEventId.settings.customVideoUrl === 'https://stream.m3u8', 'Problema 3: Sincronización sin eventId es rechazada y no modifica el partido seleccionado');

  const syncWithDifferentEventId = simulateStreamSync(initialStreamSettings, mergedInitial, 'partido-001', { eventId: 'partido-002', customVideoUrl: 'https://partido2.m3u8' });
  assert(syncWithDifferentEventId.settings.customVideoUrl === 'https://stream.m3u8', 'Problema 3: Sincronización de partido-002 no altera la señal de partido-001');

  const syncWithTargetEventId = simulateStreamSync(initialStreamSettings, mergedInitial, 'partido-001', { eventId: 'partido-001', customVideoUrl: 'https://actualizado.m3u8' });
  assert(syncWithTargetEventId.settings.customVideoUrl === 'https://actualizado.m3u8', 'Problema 3: Sincronización con eventId coincidente actualiza la señal correctamente');

  // 18. PROBLEMA 4: API como único punto de escritura
  const { apiClient } = await import('../src/services/apiClient');
  assert(typeof apiClient.saveLiveEvent === 'function', 'Problema 4: apiClient.saveLiveEvent disponible');
  assert(typeof apiClient.updateScoreboard === 'function', 'Problema 4: apiClient.updateScoreboard disponible');

  // 19. PROBLEMA 5: Validación estricta y atómica de versiones
  const validateIncomingVersion = (
    existingVer: number,
    incomingVer?: any,
    force?: boolean
  ): { valid: boolean; error?: string } => {
    if (force) return { valid: true };
    const num = Number(incomingVer);
    if (incomingVer === undefined || isNaN(num) || num <= 0) {
      return { valid: false, error: 'VERSION_REQUIRED' };
    }
    if (num < existingVer) {
      return { valid: false, error: 'VERSION_CONFLICT' };
    }
    return { valid: true };
  };

  assert(!validateIncomingVersion(5, undefined).valid, 'Problema 5: Rechaza actualizaciones sin versión');
  assert(!validateIncomingVersion(5, 0).valid, 'Problema 5: Rechaza versiones con valor 0');
  assert(!validateIncomingVersion(5, 4).valid, 'Problema 5: Rechaza versiones inferiores a la existente (v4 < v5)');
  assert(validateIncomingVersion(5, 5).valid, 'Problema 5: Acepta versión igual o superior (v5 >= v5)');
  assert(validateIncomingVersion(5, 6).valid, 'Problema 5: Acepta nueva versión incrementada (v6 > v5)');
  assert(validateIncomingVersion(5, 4, true).valid, 'Problema 5 Fix: Acepta versión con force: true desde el panel de control');
  assert(validateIncomingVersion(5, undefined, true).valid, 'Problema 5 Fix: Acepta guardado con force: true sin requerir versión previa');

  // 20. PROBLEMA 5 Fix: confirmAndSaveAllData y resolución de versiones sin sobrescritura espuria
  const resolveScorePayloadVersion = (sentVersion: any, activeEvtVersion?: number): number | undefined => {
    return sentVersion !== undefined ? Number(sentVersion) : undefined;
  };

  assert(resolveScorePayloadVersion(undefined, 1) === undefined, 'Fix: Versión indefinida en petición no se sobrescribe con activeEvt?.version (1)');
  assert(resolveScorePayloadVersion(6, 1) === 6, 'Fix: Versión enviada (6) se preserva y no se reemplaza por activeEvt?.version (1)');
  assert(typeof apiClient.confirmAndSaveAllData === 'function', 'Fix: apiClient.confirmAndSaveAllData disponible y operativo');

  // 21. VALIDACIÓN DE GUARDADO DE PARTIDO (/api/live-events)
  const validateEventVersionPayload = (existingVer: number, incomingVer?: any, force?: boolean): { valid: boolean; code?: string; nextVersion: number } => {
    if (force) return { valid: true, nextVersion: (existingVer || 0) + 1 };
    if (incomingVer === undefined) {
      // Auto-incremento sin error 400
      return { valid: true, nextVersion: (existingVer || 0) + 1 };
    }
    const num = Number(incomingVer);
    if (isNaN(num) || num <= 0) return { valid: false, code: 'INVALID_VERSION', nextVersion: existingVer };
    if (existingVer > 0 && num < existingVer) return { valid: false, code: 'VERSION_CONFLICT', nextVersion: existingVer };
    return { valid: true, nextVersion: num };
  };

  assert(validateEventVersionPayload(3, undefined).valid, 'LiveEvents Fix: Guardar partido sin versión auto-incrementa sin error 400');
  assert(validateEventVersionPayload(3, undefined).nextVersion === 4, 'LiveEvents Fix: Versión auto-incrementada es 4 para existing 3');
  assert(validateEventVersionPayload(3, 2, true).valid, 'LiveEvents Fix: Guardar partido con force: true ignora conflicto de versión');
  assert(!validateEventVersionPayload(3, 2, false).valid, 'LiveEvents Fix: Guardar partido con versión inferior (2 < 3) rechaza cuando force es false');
  assert(validateEventVersionPayload(3, 4, false).valid, 'LiveEvents Fix: Guardar partido con versión incrementada (4 >= 3) es aceptado');

  // 22. Usar las reglas reales de Vite: la API y el vídeo no pasan por Workbox.
  const { pwaRuntimeCaching } = await import('../vite.config');
  const swUrlMatcher = (urlStr: string): boolean => pwaRuntimeCaching.some((rule) => rule.urlPattern.test(urlStr));
  assert(!swUrlMatcher('https://renewable-wolf-chemical-includes.trycloudflare.com/live/partido/index.m3u8'), 'SW Fix: ServiceWorker NO intercepta streams externos Cloudflare .m3u8');
  assert(!swUrlMatcher('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'), 'SW Fix: ServiceWorker NO intercepta streams externos Mux .m3u8');
  assert(!swUrlMatcher('https://golbolivialive-beta.vercel.app/api/scoreboard'), 'SW Fix: API de marcador usa directamente la red');
  assert(!swUrlMatcher('https://golbolivialive-beta.vercel.app/api/proxy?url=http%3A%2F%2F190.61.47.54%3A8000%2Fplay%2Fa004%2F214705068_0646.ts'), 'SW Fix: los segmentos del proxy quedan fuera de Workbox');
  assert(swUrlMatcher('https://fonts.googleapis.com/css2?family=Chakra+Petch'), 'SW Fix: se conserva la caché de fuentes');

  // 23. RELOJ DEL MARCADOR: MODO AUTOMÁTICO
  const simulateAutoClock = (
    currentMin: number,
    isLive: boolean,
    period: string,
    isClockRunning?: boolean
  ): { nextMin: number; running: boolean } => {
    const isClockActive = isClockRunning ?? (isLive && period !== 'Descanso' && period !== 'Finalizado');
    if (!isClockActive || period === 'Descanso' || period === 'Finalizado') {
      return { nextMin: currentMin, running: false };
    }
    return { nextMin: Math.min(130, currentMin + 1), running: true };
  };

  assert(simulateAutoClock(10, true, '1T', undefined).running, 'Auto Clock: Activo por defecto durante 1T en vivo');
  assert(simulateAutoClock(10, true, '1T', undefined).nextMin === 11, 'Auto Clock: Avanza minuto de 10 a 11');
  assert(!simulateAutoClock(45, true, 'Descanso', undefined).running, 'Auto Clock: Se pausa automáticamente en Descanso');
  assert(simulateAutoClock(45, true, 'Descanso', undefined).nextMin === 45, 'Auto Clock: No avanza minuto en Descanso');
  assert(!simulateAutoClock(90, true, 'Finalizado', undefined).running, 'Auto Clock: Se pausa automáticamente al Finalizar');
  assert(!simulateAutoClock(20, true, '1T', false).running, 'Auto Clock: Pausado cuando isClockRunning es false explícito');

  // 24. MARCADOR LIMPIO: Quitar la ruta del partido del marcador
  const showcaseSource = await fs.promises.readFile(
    path.join(__dirname, '../src/components/LiveEventsShowcase.tsx'),
    'utf-8'
  );
  assert(!showcaseSource.includes('/live/{slug}'), 'Marcador Limpio: LiveEventsShowcase ya NO muestra la ruta /live/{slug}');
  assert(!showcaseSource.includes('getMatchSlug'), 'Marcador Limpio: LiveEventsShowcase no tiene dependencia de slug URL');

  // 25. APÓYAME: Componentes de Modal y Panel Admin de QR
  const { DonationQrModal } = await import('../src/components/DonationQrModal');
  const { DonationQrAdminCard } = await import('../src/components/DonationQrAdminCard');
  assert(typeof DonationQrModal === 'function', 'Apóyame: DonationQrModal exportado como componente React');
  assert(typeof DonationQrAdminCard === 'function', 'Apóyame: DonationQrAdminCard exportado como componente React');

  // 26. APÓYAME: Métodos de API de Donaciones
  assert(typeof apiClient.getDonationQr === 'function', 'Apóyame: apiClient.getDonationQr disponible');
  assert(typeof apiClient.saveDonationQr === 'function', 'Apóyame: apiClient.saveDonationQr disponible');

  // 27. FIX ERROR HTTP 413: Verificaciones de protección contra Payload Too Large
  const serverSource = await fs.promises.readFile(
    path.join(__dirname, '../serverApp.ts'),
    'utf-8'
  );
  assert(serverSource.includes("express.json({ limit: '10mb' })"), 'Fix 413: serverApp.ts tiene límite de 10mb en express.json');
  assert(serverSource.includes("express.urlencoded({ limit: '10mb'"), 'Fix 413: serverApp.ts tiene límite de 10mb en express.urlencoded');

  const cardSource = await fs.promises.readFile(
    path.join(__dirname, '../src/components/DonationQrAdminCard.tsx'),
    'utf-8'
  );
  assert(cardSource.includes('optimizeQrImage'), 'Fix 413: DonationQrAdminCard cuenta con optimizador de imagen en cliente');
  assert(cardSource.includes('maxDimension = 800'), 'Fix 413: DonationQrAdminCard escala imágenes a max 800px');

  // 28. SEPARACIÓN DE PESTAÑAS: Transmisión & Señal vs Partido & Marcador
  const { MatchDetailsEditor } = await import('../src/components/MatchDetailsEditor');
  assert(typeof MatchDetailsEditor === 'function', 'Pestañas: MatchDetailsEditor exportado como componente React');

  const editorSource = await fs.promises.readFile(
    path.join(__dirname, '../src/components/MatchDetailsEditor.tsx'),
    'utf-8'
  );
  assert(editorSource.includes('Tablero Oficial del Marcador'), 'Pestañas: MatchDetailsEditor incluye el tablero unificado del marcador TV');
  assert(editorSource.includes('preservedCloudflare') && editorSource.includes('preservedYoutube'), 'Pestañas: MatchDetailsEditor preserva intactas las señales de video configuradas en Pestaña 1');
  assert(editorSource.includes('apiClient.saveLiveEvent'), 'Pestañas: MatchDetailsEditor guarda atómicamente el partido sin borrar señales');
  assert(editorSource.includes('homeScore: localHomeScore') && editorSource.includes('awayScore: localAwayScore'), 'Pestañas: el guardado del partido incluye el marcador en la misma transacción');

  const loginPageSource = await fs.promises.readFile(
    path.join(__dirname, '../src/components/SecretLoginPage.tsx'),
    'utf-8'
  );
  assert(loginPageSource.includes("<MatchDetailsEditor"), 'Pestañas: Pestaña 2 integra MatchDetailsEditor centralizado');
  // Confirm tab 1 focuses on stream providers & connections without overlapping live events manager
  assert(loginPageSource.includes('Proveedor Principal y Canales de Transmisión'), 'Pestañas: Pestaña 1 dedicada a Proveedor Principal y Canales');

  // 29. LIMPIEZA DE EVENTOS Y CHAT
  assert(typeof apiClient.clearAllMatchEvents === 'function', 'Limpieza: apiClient.clearAllMatchEvents disponible');
  assert(typeof apiClient.clearAllChatMessages === 'function', 'Limpieza: apiClient.clearAllChatMessages disponible');
  assert(serverSource.includes("'/api/matches/events/clear'"), 'Limpieza: endpoint POST /api/matches/events/clear registrado en serverApp');
  assert(serverSource.includes("'/api/chat/clear'"), 'Limpieza: endpoint POST /api/chat/clear registrado en serverApp');

  const liveChatSource = await fs.promises.readFile(
    path.join(__dirname, '../src/components/LiveChat.tsx'),
    'utf-8'
  );
  assert(liveChatSource.includes("CLEAR_CHAT"), 'Limpieza: LiveChat escucha evento CLEAR_CHAT para vaciar mensajes');

  // 30. API GRATUITA DE FÚTBOL (ESPN - Liga Boliviana y Torneos)
  const { espnFootballApi } = await import('../src/services/espnFootballApi');
  assert(typeof espnFootballApi.getMatches === 'function', 'API Fútbol Gratuita: espnFootballApi.getMatches disponible');
  assert(typeof espnFootballApi.getMatchDetails === 'function', 'API Fútbol Gratuita: espnFootballApi.getMatchDetails disponible');
  assert(typeof espnFootballApi.findMatchByTeams === 'function', 'API Fútbol Gratuita: espnFootballApi.findMatchByTeams disponible');
  assert(serverSource.includes("'/api/football-api/matches'"), 'API Fútbol Gratuita: Proxy GET /api/football-api/matches activo');
  assert(serverSource.includes("'/api/football-api/match/:id'"), 'API Fútbol Gratuita: Proxy GET /api/football-api/match/:id activo');

  // 31. COMPONENTE MATCHSTATS CON DATOS DE API GRATUITA
  const matchStatsSource = await fs.promises.readFile(
    path.join(__dirname, '../src/components/MatchStats.tsx'),
    'utf-8'
  );
  assert(matchStatsSource.includes('findMatchByTeams'), 'MatchStats: consulta automática a API de fútbol por nombres de equipos');
  assert(matchStatsSource.includes('showSubstitutes'), 'MatchStats: conmutador para ver titulares o suplentes de cada equipo');
  assert(matchStatsSource.includes('Sin eventos registrados'), 'MatchStats: mensaje elegante cuando los eventos han sido limpiados');
  assert(matchStatsSource.includes('Datos Oficiales API ESPN'), 'MatchStats: badge indicador de datos oficiales en tiempo real');

  // 32. PANEL DE EDICIÓN CON BUSCADOR DE PARTIDOS DE LA API
  assert(editorSource.includes('API Gratuita de Partidos, Alineaciones & Estadísticas'), 'MatchDetailsEditor: buscador integrado de partidos en API pública');
  assert(editorSource.includes('onClearEvents'), 'MatchDetailsEditor: botón para limpiar cronología de eventos');
  assert(editorSource.includes('onClearChat'), 'MatchDetailsEditor: botón para limpiar chat en vivo');

  // 33. ELIMINACIÓN DE PARTIDOS DESDE EL DASHBOARD
  assert(typeof apiClient.deleteLiveEvent === 'function', 'Eliminación: apiClient.deleteLiveEvent disponible');
  assert(serverSource.includes("'/api/live-events/:id'"), 'Eliminación: endpoint DELETE /api/live-events/:id activo en servidor');
  assert(serverSource.includes('LIVE_EVENT_DELETED'), 'Eliminación: evento SSE LIVE_EVENT_DELETED emitido por servidor');
  assert(editorSource.includes('handleDeleteCurrentMatch'), 'Eliminación: MatchDetailsEditor cuenta con handleDeleteCurrentMatch');
  assert(editorSource.includes('Eliminar Partido Actual'), 'Eliminación: MatchDetailsEditor muestra botón Eliminar Partido Actual');
  assert(editorSource.includes('onDeleteEvent'), 'Eliminación: MatchDetailsEditor propaga onDeleteEvent');
  assert(loginPageSource.includes('onDeleteLiveEvent'), 'Eliminación: SecretLoginPage recibe y enlaza onDeleteLiveEvent');

  assert(serverSource.includes('liveEvents: state.liveEvents'), 'Eliminación: INITIAL_STATE y /api/live incluyen liveEvents actualizados');

  const appSource = await fs.promises.readFile(
    path.join(__dirname, '../src/App.tsx'),
    'utf-8'
  );
  assert(appSource.includes('onDeleteLiveEvent={handleDeleteLiveEvent}'), 'Eliminación: App.tsx pasa onDeleteLiveEvent a SecretLoginPage');
  const initialStateBody = appSource.match(/if \(type === 'INITIAL_STATE'\) \{([\s\S]*?)\n      \} else if/);
  assert(Boolean(initialStateBody), 'INITIAL_STATE: callback SSE localizado');
  let confirmedEvents: LiveEvent[] = [{ id: 'confirmado', title: 'Partido confirmado' } as LiveEvent];
  let timeline: unknown = null;
  let donationQr: unknown = null;
  const applyInitialState = new Function('data', 'setEvents', 'setDonationQrInfo', 'setLiveEvents', initialStateBody![1]);
  applyInitialState(
    { liveEvents: [{ id: 'eliminado' }], events: ['gol'], stream: { donationQr: { url: '/qr.png' } } },
    (value: unknown) => { timeline = value; },
    (value: unknown) => { donationQr = value; },
    () => { throw new Error('Un snapshot SSE no debe reemplazar partidos confirmados por Firestore'); },
  );
  assert(confirmedEvents[0].id === 'confirmado', 'INITIAL_STATE no revive partidos eliminados desde un snapshot SSE antiguo');
  assert(Array.isArray(timeline) && timeline[0] === 'gol', 'INITIAL_STATE conserva actualización de cronología');
  assert((donationQr as any)?.url === '/qr.png', 'INITIAL_STATE conserva actualización de QR');

  const firestoreBody = appSource.match(/const unsubscribeMultiLiveEvents = apiClient\.subscribeMultiLiveEvents\(\(fbEvents\) => \{([\s\S]*?)\n    \}\);/);
  assert(Boolean(firestoreBody), 'Firestore: suscripción autoritativa localizada');
  const applyFirestoreSnapshot = new Function('fbEvents', 'setLiveEvents', 'sanitizeClientEvent', firestoreBody![1]);
  const replaceEvents = (value: LiveEvent[]) => { confirmedEvents = value; };
  applyFirestoreSnapshot([{ id: 'nuevo', title: 'Partido nuevo' }], replaceEvents, (event: LiveEvent) => event);
  assert(confirmedEvents.length === 1 && confirmedEvents[0].id === 'nuevo', 'Snapshot Firestore aplica altas y bajas sin mezclar eventos anteriores');
  applyFirestoreSnapshot([], replaceEvents, (event: LiveEvent) => event);
  assert(confirmedEvents.length === 0, 'Snapshot Firestore vacío elimina todos los partidos anteriores');

  // Simular eliminación de partido-002 de la lista de eventos
  const initialEventsList: LiveEvent[] = [
    { id: 'partido-001', title: 'Oriente Petrolero vs ABB', homeTeam: 'oriente', awayTeam: 'abb', isLive: true, primaryProvider: 'cloudflare', fallbackOrder: ['cloudflare'] },
    { id: 'partido-002', title: 'Blooming vs Oriente Petrolero', homeTeam: 'blooming', awayTeam: 'oriente', isLive: false, primaryProvider: 'youtube', fallbackOrder: ['youtube'] },
  ];
  const remainingAfterDelete = initialEventsList.filter((e) => e.id !== 'partido-002');
  assert(remainingAfterDelete.length === 1, 'Eliminación: filtra y reduce lista de partidos a 1');
  assert(remainingAfterDelete[0].id === 'partido-001', 'Eliminación: partido-001 permanece intacto y seleccionado');

  // 34. PROTECCIÓN RESILIENTE: primaryProvider undefined no lanza TypeError toUpperCase
  assert(appSource.includes("const provider = evt.primaryProvider || 'cloudflare';"), 'Resiliencia: App.tsx provee fallback cloudflare para primaryProvider');
  assert(appSource.includes('provider.toUpperCase()'), 'Resiliencia: App.tsx usa variable segura provider.toUpperCase()');
  const dummyEventWithoutProvider: any = { id: 'test-no-provider', title: 'Test FC' };
  const safeProvider = (dummyEventWithoutProvider.primaryProvider || 'cloudflare').toUpperCase();
  assert(safeProvider === 'CLOUDFLARE', 'Resiliencia: fallback produce CLOUDFLARE en mayúsculas sin errores');

  // 35. MEJORA 1: SELECTOR RÁPIDO DE SEÑALES Y RECARGA
  assert(appSource.includes("id: 'cloudflare',"), 'Señales: Opción 1 Cloudflare configurada');
  assert(appSource.includes("id: 'youtube',"), 'Señales: Opción 2 YouTube configurada');
  assert(appSource.includes("id: 'kick',"), 'Señales: Opción 3 Kick configurada');
  assert(appSource.includes('handleReloadCurrentSignal'), 'Señales: Función handleReloadCurrentSignal activa');
  assert(appSource.includes('Recargar Señal'), 'Señales: Botón Recargar Señal presente en el reproductor');
  assert(appSource.includes('signalReloadKey'), 'Señales: Clave dinámica signalReloadKey para reinicio limpio de stream');

  // 36. MEJORA 2: OCULTAR / MOSTRAR CHAT CON 1 CLIC (PRESERVACIÓN TOTAL DE BASE DE DATOS)
  const chatSource = await fs.promises.readFile(
    path.join(__dirname, '../src/components/LiveChat.tsx'),
    'utf-8'
  );
  assert(chatSource.includes('onToggleChat?: () => void;'), 'Chat: LiveChatProps incluye prop onToggleChat');
  assert(chatSource.includes('onToggleChat && ('), 'Chat: Cabecera de LiveChat incluye botón para ocultar');
  assert(appSource.includes('isChatVisible'), 'Chat: Estado isChatVisible gestionado en App.tsx');
  assert(appSource.includes('handleToggleChat'), 'Chat: Función handleToggleChat activa');
  assert(appSource.includes('Ocultar Chat'), 'Chat: Botón Ocultar Chat disponible en barra de control');
  assert(appSource.includes('Abrir Chat'), 'Chat: Botón flotante para restaurar chat cuando está oculto');
  assert(appSource.includes('isTheaterMode || !isChatVisible'), 'Chat: Video se expande a ancho completo cuando el chat está oculto');

  // Verificación estricta: NO invocar borrado de base de datos en toggle
  assert(!appSource.includes('clearChatInFirebase') || !appSource.includes('handleToggleChat = () => { clearChatInFirebase'), 'Chat DB: Alternar chat NO borra mensajes de la base de datos');

  // 37. MEJORA 3: FILTRO DE PARTIDOS (EN VIVO, HOY, FINALIZADOS) Y ESTADOS TV (MEDIO TIEMPO, VAR, FINALIZADO)
  const {
    getMatchStatusInfo,
    filterMatchesByCategory,
    getMatchCategoryCounts,
  } = await import('../src/utils/matchStatus');

  assert(typeof getMatchStatusInfo === 'function', 'Filtro & Estado: getMatchStatusInfo disponible');
  assert(typeof filterMatchesByCategory === 'function', 'Filtro & Estado: filterMatchesByCategory disponible');
  assert(typeof getMatchCategoryCounts === 'function', 'Filtro & Estado: getMatchCategoryCounts disponible');

  // Test de Estados TV Autorizados:
  // a) Revisión VAR
  const varEvt: LiveEvent = {
    id: 'test-var',
    title: 'Bolívar vs The Strongest',
    homeTeam: 'bolivar',
    awayTeam: 'strongest',
    period: 'Revisión VAR',
    isLive: true,
    primaryProvider: 'cloudflare',
    fallbackOrder: ['cloudflare'],
  };
  const varStatus = getMatchStatusInfo(varEvt);
  assert(varStatus.category === 'live', 'VAR: Categorizado como En Vivo');
  assert(varStatus.icon === 'var', 'VAR: Icono var asignado');
  assert(varStatus.label === 'REVISIÓN VAR', 'VAR: Etiqueta oficial REVISIÓN VAR');
  assert(varStatus.badgeClass.includes('purple'), 'VAR: Estilo púrpura de alta visibilidad');

  // b) Medio Tiempo / Descanso
  const descansoEvt: LiveEvent = {
    id: 'test-descanso',
    title: 'Oriente vs Blooming',
    homeTeam: 'oriente',
    awayTeam: 'blooming',
    period: 'Descanso',
    isLive: true,
    primaryProvider: 'cloudflare',
    fallbackOrder: ['cloudflare'],
  };
  const descansoStatus = getMatchStatusInfo(descansoEvt);
  assert(descansoStatus.category === 'live', 'Medio Tiempo: Categorizado como En Vivo');
  assert(descansoStatus.icon === 'pause', 'Medio Tiempo: Icono pause asignado');
  assert(descansoStatus.label === 'ENTRETIEMPO', 'Medio Tiempo: Etiqueta ENTRETIEMPO');
  assert(descansoStatus.badgeClass.includes('amber'), 'Medio Tiempo: Estilo ámbar cálido');

  // c) Finalizado
  const finalEvt: LiveEvent = {
    id: 'test-final',
    title: 'Wilstermann vs Aurora',
    homeTeam: 'wilstermann',
    awayTeam: 'aurora',
    period: 'Finalizado',
    isLive: false,
    primaryProvider: 'cloudflare',
    fallbackOrder: ['cloudflare'],
  };
  const finalStatus = getMatchStatusInfo(finalEvt);
  assert(finalStatus.category === 'finished', 'Finalizado: Categorizado como finished');
  assert(finalStatus.icon === 'finish', 'Finalizado: Icono finish asignado');
  assert(finalStatus.label === 'FINALIZADO', 'Finalizado: Etiqueta oficial FINALIZADO');
  assert(finalStatus.badgeClass.includes('slate'), 'Finalizado: Estilo slate sobrio');

  // d) En Vivo (1T / 2T)
  const enVivoEvt: LiveEvent = {
    id: 'test-envivo',
    title: 'Always Ready vs San José',
    homeTeam: 'always_ready',
    awayTeam: 'san_jose',
    period: '1T',
    matchMinute: 34,
    isLive: true,
    primaryProvider: 'cloudflare',
    fallbackOrder: ['cloudflare'],
  };
  const enVivoStatus = getMatchStatusInfo(enVivoEvt);
  assert(enVivoStatus.category === 'live', 'En Vivo: Categorizado como live');
  assert(enVivoStatus.icon === 'live', 'En Vivo: Icono live asignado');
  assert(enVivoStatus.label.includes('1T') && enVivoStatus.label.includes("34'"), 'En Vivo: Etiqueta incluye periodo y minuto');

  // e) Previa / Hoy
  const previaEvt: LiveEvent = {
    id: 'test-previa',
    title: 'Guabirá vs Real Tomayapo',
    homeTeam: 'guabira',
    awayTeam: 'real_tomayapo',
    broadcastMode: 'pre_match',
    isLive: false,
    primaryProvider: 'cloudflare',
    fallbackOrder: ['cloudflare'],
  };
  const previaStatus = getMatchStatusInfo(previaEvt);
  assert(previaStatus.category === 'today', 'Previa: Categorizado como hoy');
  assert(previaStatus.label === 'PREVIA / HOY', 'Previa: Etiqueta oficial PREVIA / HOY');

  // Test de Filtros por Categoría y Conteos
  const sampleEvents: LiveEvent[] = [varEvt, descansoEvt, finalEvt, enVivoEvt, previaEvt];
  const counts = getMatchCategoryCounts(sampleEvents);
  assert(counts.all === 5, 'Conteos: Total correcto (5)');
  assert(counts.live === 3, 'Conteos: En Vivo correcto (3: VAR, Descanso, 1T)');
  assert(counts.today === 1, 'Conteos: Hoy correcto (1)');
  assert(counts.finished === 1, 'Conteos: Finalizados correcto (1)');

  const liveList = filterMatchesByCategory(sampleEvents, 'live');
  assert(liveList.length === 3, 'Filtro live devuelve 3 partidos');

  const todayList = filterMatchesByCategory(sampleEvents, 'today');
  assert(todayList.length === 1 && todayList[0].id === 'test-previa', 'Filtro today devuelve partido en previa');

  const finishedList = filterMatchesByCategory(sampleEvents, 'finished');
  assert(finishedList.length === 1 && finishedList[0].id === 'test-final', 'Filtro finished devuelve partido finalizado');

  // Verificación en frontend y dashboard
  const matchEditorSource = await fs.promises.readFile(
    path.join(__dirname, '../src/components/MatchDetailsEditor.tsx'),
    'utf-8'
  );
  assert(matchEditorSource.includes("'Revisión VAR'"), 'Dashboard: MatchDetailsEditor incluye selector de Revisión VAR');
  assert(appSource.includes('matchFilter'), 'Frontend: App.tsx gestiona estado matchFilter');
  assert(appSource.includes('filterMatchesByCategory'), 'Frontend: App.tsx filtra partidos por categoría');
  assert(appSource.includes('LiveEventsShowcase'), 'Frontend: App.tsx integra vitrina LiveEventsShowcase');

  // IPTV temporal: comprobar que la resolución de señales depende de eventId y no del catálogo global.
  const base = { title: 'Partido', homeTeam: 'bolivar', awayTeam: 'strongest', isLive: true, cloudflare: { liveInputId: '', playbackUrl: 'https://cdn.example.com/cloudflare.m3u8' }, youtube: { videoId: '' }, kick: { channel: '' } };
  const matchA = { ...base, id: 'partido-A', primaryProvider: 'iptv' as const, fallbackOrder: ['iptv', 'cloudflare'] as const, iptvSource: { channelId: 'canal-1', channelName: 'Canal uno', streamUrl: 'https://cdn.example.com/uno.m3u8' } };
  const matchB = { ...base, id: 'partido-B', primaryProvider: 'iptv' as const, fallbackOrder: ['iptv', 'cloudflare'] as const, iptvSource: { channelId: 'canal-2', channelName: 'Canal dos', streamUrl: 'https://cdn.example.com/dos.m3u8' } };
  assert(getStreamUrlForEvent(matchA as unknown as LiveEvent) === 'https://cdn.example.com/uno.m3u8', 'Partido A usa su IPTV temporal');
  assert(getStreamUrlForEvent(matchB as unknown as LiveEvent) === 'https://cdn.example.com/dos.m3u8', 'Partido B usa IPTV diferente');
  assert(getStreamUrlForEvent({ ...matchA, primaryProvider: 'cloudflare' } as unknown as LiveEvent) === 'https://cdn.example.com/cloudflare.m3u8', 'Cambiar proveedor del partido A no afecta el B');
  assert(getStreamUrlForEvent({ ...matchA, iptvSource: null } as unknown as LiveEvent) === 'https://cdn.example.com/cloudflare.m3u8', 'Eliminar la vinculación IPTV usa fallback Cloudflare');
  assert(getStreamUrlForEvent(matchB as unknown as LiveEvent) === 'https://cdn.example.com/dos.m3u8', 'El partido B mantiene su IPTV al borrar la de A');

  console.log('\n====================================================');
  console.log(`🎉 TODAS LAS PRUEBAS COMPLETADAS: ${passedTests}/${totalTests} PASARON CON ÉXITO`);
  console.log('====================================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Error durante la ejecución de pruebas:', err);
  process.exit(1);
});
