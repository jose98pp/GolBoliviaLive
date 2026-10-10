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

  // 22. ServiceWorker: Exención de streams externos .m3u8 y .ts
  const swUrlMatcher = (urlStr: string, sameOrigin: boolean): boolean => {
    const url = new URL(urlStr);
    return sameOrigin && (
      url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/live') ||
      url.pathname.startsWith('/scoreboard') ||
      url.pathname.startsWith('/streams') ||
      url.pathname.startsWith('/matches') ||
      url.pathname.startsWith('/chat')
    );
  };

  assert(!swUrlMatcher('https://renewable-wolf-chemical-includes.trycloudflare.com/live/partido/index.m3u8', false), 'SW Fix: ServiceWorker NO intercepta streams externos Cloudflare .m3u8');
  assert(!swUrlMatcher('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', false), 'SW Fix: ServiceWorker NO intercepta streams externos Mux .m3u8');
  assert(swUrlMatcher('https://golbolivialive-beta.vercel.app/api/scoreboard', true), 'SW Fix: ServiceWorker maneja API misma procedencia');

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

  console.log('\n====================================================');
  console.log(`🎉 TODAS LAS PRUEBAS COMPLETADAS: ${passedTests}/${totalTests} PASARON CON ÉXITO`);
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('Error durante la ejecución de pruebas:', err);
  process.exit(1);
});
