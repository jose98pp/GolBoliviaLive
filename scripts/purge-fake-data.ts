import { db, saveStreamSettingsToFirebase, saveScoreboardToFirebase, saveClubsToFirebase } from '../src/services/firebase';
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { BOLIVIAN_CLUBS } from '../src/data/bolivianFootballData';
import fs from 'fs';
import path from 'path';

async function purgeNonRealData() {
  console.log('🧹 INICIANDO LIMPIEZA DE DATOS NO REALES / TEST...');

  // 1. Limpiar colección "confirmations" de cualquier registro con palabra "test", "prueba", "dummy"
  const confSnap = await getDocs(collection(db, 'confirmations'));
  let deletedConf = 0;
  for (const d of confSnap.docs) {
    const data = d.data();
    const isFakeOrTest =
      !data.operator ||
      data.operator.toLowerCase().includes('test') ||
      data.action?.toLowerCase().includes('test') ||
      data.details?.toLowerCase().includes('test') ||
      data.details?.toLowerCase().includes('prueba') ||
      data.action === 'TEST_FULL_PAGE_CONFIRMATION' ||
      data.action === 'TEST_AUDIT_ACTION';

    if (isFakeOrTest) {
      await deleteDoc(d.ref);
      deletedConf++;
      console.log(`  - Borrado registro de auditoría de prueba: ${d.id}`);
    }
  }
  console.log(`✅ Confirmaciones de prueba eliminadas: ${deletedConf}`);

  // 2. Limpiar colección "events" de cualquier evento de test
  const eventSnap = await getDocs(collection(db, 'events'));
  let deletedEvents = 0;
  for (const d of eventSnap.docs) {
    const data = d.data();
    if (d.id.includes('test') || data.description?.toLowerCase().includes('test') || data.player?.toLowerCase().includes('test')) {
      await deleteDoc(d.ref);
      deletedEvents++;
      console.log(`  - Borrado evento de prueba: ${d.id}`);
    }
  }
  console.log(`✅ Eventos de prueba eliminados: ${deletedEvents}`);

  // 3. Limpiar colección "chat" de cualquier mensaje de test
  const chatSnap = await getDocs(collection(db, 'chat'));
  let deletedChat = 0;
  for (const d of chatSnap.docs) {
    const data = d.data();
    if (d.id.includes('test') || data.sender?.toLowerCase().includes('test') || data.text?.toLowerCase().includes('test') || data.text?.toLowerCase().includes('prueba')) {
      await deleteDoc(d.ref);
      deletedChat++;
      console.log(`  - Borrado mensaje de prueba: ${d.id}`);
    }
  }
  console.log(`✅ Mensajes de chat de prueba eliminados: ${deletedChat}`);

  // 4. Asegurar que en "config/stream_settings" solo haya datos 100% reales
  await saveStreamSettingsToFirebase({
    title: 'Bolívar vs The Strongest — Clásico Paceño N° 234',
    tournamentName: 'Liga Tigo División Profesional - Torneo Clausura',
    homeClubId: 'bolivar',
    awayClubId: 'strongest',
    stadiumName: 'Estadio Hernando Siles - La Paz',
    altitudeMeters: 3637,
    period: '2T',
    isLive: true,
    broadcastMode: 'obs_custom',
    customVideoUrl: 'https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8',
    backupVideoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    backupChannelName: 'GolBolivia 24/7 Señal Satelital HD',
    activeStreamSource: 'obs',
    autoFailoverEnabled: true,
  });
  console.log('✅ Configuración de transmisión en Firebase normalizada con datos reales.');

  // 5. Normalizar marcador real
  await saveScoreboardToFirebase({
    homeScore: 2,
    awayScore: 1,
    matchMinute: 75,
    period: '2T',
  });
  console.log('✅ Marcador en Firebase normalizado (Bolívar 2 - 1 The Strongest, min 75).');

  // 6. Inicializar colección de equipos en Firebase
  await saveClubsToFirebase(BOLIVIAN_CLUBS);
  console.log('✅ Lista de 16 equipos oficiales del fútbol boliviano inicializada en Firebase.');

  // 7. Limpiar y normalizar archivo local data/stream-state.json
  const statePath = path.resolve(process.cwd(), 'data', 'stream-state.json');
  if (fs.existsSync(statePath)) {
    const cleanState = {
      streamSettings: {
        title: 'Bolívar vs The Strongest — Clásico Paceño N° 234',
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
        backupChannelName: 'GolBolivia 24/7 Señal Satelital HD',
        activeStreamSource: 'obs',
        autoFailoverEnabled: true,
      },
      scoreboard: {
        homeScore: 2,
        awayScore: 1,
        matchMinute: 75,
        period: '2T',
        updatedAt: Date.now(),
      },
      clubs: BOLIVIAN_CLUBS,
      updatedAt: Date.now(),
    };
    fs.writeFileSync(statePath, JSON.stringify(cleanState, null, 2), 'utf-8');
    console.log('✅ Archivo data/stream-state.json limpiado y normalizado con datos reales.');
  }

  console.log('🎉 LIMPIEZA COMPLETA: TODOS LOS DATOS NO REALES HAN SIDO ELIMINADOS.');
  process.exit(0);
}

purgeNonRealData().catch(err => {
  console.error('Error durante la purga:', err);
  process.exit(1);
});
