import {
  db,
  saveStreamSettingsToFirebase,
  getStreamSettingsFromFirebase,
  saveScoreboardToFirebase,
  addMatchEventToFirebase,
  updateMatchEventInFirebase,
  deleteMatchEventFromFirebase,
  sendChatMessageToFirebase,
  deleteChatMessageFromFirebase,
  logConfirmationToFirebase,
  deleteConfirmationLogFromFirebase,
  resetStreamSettingsInFirebase,
} from '../src/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import http from 'http';
import handler from '../api/index';

// Helper for backend HTTP requests
function backendRequest(url: string, method = 'GET', headers: Record<string, string> = {}, body: any = null): Promise<{ status: number; data: any }> {
  return new Promise((resolve) => {
    const req = new http.IncomingMessage(null as any);
    req.url = url;
    req.method = method;
    req.headers = { ...headers };
    if (body) {
      (req as any).body = body;
    }
    let statusCode = 200;
    const res: any = {
      setHeader: () => {},
      writeHead: (code: number) => { statusCode = code; },
      status: (code: number) => { statusCode = code; return res; },
      json: (obj: any) => { resolve({ status: statusCode, data: obj }); },
      send: (str: any) => { resolve({ status: statusCode, data: str }); },
      end: (str: any) => { resolve({ status: statusCode, data: str }); },
      header: () => {},
    };
    try {
      (handler as any)(req as any, res as any);
    } catch (e: any) {
      resolve({ status: 500, data: { error: e.message } });
    }
  });
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🏁 INICIANDO PRUEBAS COMPLETAS DE DATOS (CRUD):');
  console.log('   NUBE FIREBASE FIRESTORE + BACKEND EXPRESS/API');
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
      throw new Error(`Prueba fallida: ${testName}`);
    }
  }

  // ----------------------------------------------------
  // FASE 1: PRUEBAS EN LA NUBE (FIREBASE CLOUD FIRESTORE)
  // ----------------------------------------------------
  console.log('📦 FASE 1: Nube Firebase Firestore (ai-studio-golbolivialivest-eea3c7cc-5a47-4322-8400-4a656cb411b2)');

  // 1.1 Crear y Editar Stream Settings en Firebase
  const testStreamId = `test_stream_${Date.now()}`;
  await saveStreamSettingsToFirebase({
    title: 'Clásico Boliviano — Edición Test Cloud',
    customVideoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    backupVideoUrl: 'https://test-streams.mux.dev/backup/index.m3u8',
    activeStreamSource: 'obs',
    isLive: true,
  });
  const savedSettings = await getStreamSettingsFromFirebase();
  assert(savedSettings?.title === 'Clásico Boliviano — Edición Test Cloud', 'Firebase: Crear configuración de transmisión');

  // 1.2 Editar configuración existente en Firebase
  await saveStreamSettingsToFirebase({
    activeStreamSource: 'backup',
    backupChannelName: 'GolBolivia Satélite Respaldo HD',
  });
  const updatedSettings = await getStreamSettingsFromFirebase();
  assert(updatedSettings?.activeStreamSource === 'backup', 'Firebase: Editar fuente de transmisión (conmutación a respaldo)');
  assert(updatedSettings?.backupChannelName === 'GolBolivia Satélite Respaldo HD', 'Firebase: Editar canal alternativo');

  // 1.3 Marcador en Firebase
  await saveScoreboardToFirebase({
    homeScore: 3,
    awayScore: 2,
    matchMinute: 88,
    period: '2T',
  });
  const snapScore = await getDoc(doc(db, 'match', 'scoreboard'));
  assert(snapScore.exists() && snapScore.data()?.homeScore === 3 && snapScore.data()?.matchMinute === 88, 'Firebase: Guardar y editar marcador');

  // 1.4 Crear Evento en Firebase
  const testEventId = `test_evt_${Date.now()}`;
  await addMatchEventToFirebase({
    id: testEventId,
    minute: 45,
    type: 'goal',
    clubId: 'bolivar',
    player: 'Ramiro Vaca',
    description: 'Golazo de tiro libre',
    scoreAfter: '1 - 0',
  });
  let eventSnap = await getDoc(doc(db, 'events', testEventId));
  assert(eventSnap.exists() && eventSnap.data()?.player === 'Ramiro Vaca', 'Firebase: Crear evento del partido');

  // 1.5 Editar Evento en Firebase
  await updateMatchEventInFirebase(testEventId, {
    description: 'Golazo de tiro libre al ángulo derecho (Corregido VAR)',
    minute: 46,
  });
  eventSnap = await getDoc(doc(db, 'events', testEventId));
  assert(eventSnap.data()?.minute === 46 && eventSnap.data()?.description.includes('VAR'), 'Firebase: Editar/Actualizar evento del partido');

  // 1.6 Borrar Evento en Firebase
  await deleteMatchEventFromFirebase(testEventId);
  eventSnap = await getDoc(doc(db, 'events', testEventId));
  assert(!eventSnap.exists(), 'Firebase: Borrar evento del partido (confirmado eliminado)');

  // 1.7 Crear y Borrar Mensaje de Chat en Firebase
  const testMsgId = await sendChatMessageToFirebase({
    sender: 'HinchaTest',
    clubId: 'strongest',
    text: 'Mensaje temporal de prueba para borrado',
    timestamp: '20:30',
    isVip: false,
  });
  let chatSnap = await getDoc(doc(db, 'chat', testMsgId));
  assert(chatSnap.exists(), 'Firebase: Crear mensaje de chat');

  await deleteChatMessageFromFirebase(testMsgId);
  chatSnap = await getDoc(doc(db, 'chat', testMsgId));
  assert(!chatSnap.exists(), 'Firebase: Borrar mensaje de chat (moderación confirmada)');

  // 1.8 Crear y Borrar Registro de Confirmación en Firebase
  const testConfId = await logConfirmationToFirebase({
    action: 'TEST_AUDIT_ACTION',
    operator: 'Operador Test',
    role: 'ADMIN',
    details: 'Prueba de log de confirmación para borrado',
    timestamp: Date.now(),
  });
  let confSnap = await getDoc(doc(db, 'confirmations', testConfId));
  assert(confSnap.exists(), 'Firebase: Crear registro de confirmación y auditoría');

  await deleteConfirmationLogFromFirebase(testConfId);
  confSnap = await getDoc(doc(db, 'confirmations', testConfId));
  assert(!confSnap.exists(), 'Firebase: Borrar registro de confirmación (purga confirmada)');

  console.log('\n----------------------------------------------------');
  console.log('💻 FASE 2: Backend Node.js / Express');
  console.log('----------------------------------------------------');

  // 2.1 Login como ADMIN para obtener token de sesión
  const loginRes = await backendRequest('/api/auth/login', 'POST', { 'content-type': 'application/json' }, { username: 'admin', pin: '1925' });
  assert(loginRes.status === 200 && Boolean(loginRes.data.token), 'Backend: Autenticación de Administrador (PIN)');
  const adminToken = loginRes.data.token;
  const authHeaders = { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' };

  // 2.2 Leer configuración de streams en backend
  const streamConfigGet = await backendRequest('/api/streams/config');
  assert(streamConfigGet.status === 200 && streamConfigGet.data.success, 'Backend: GET /api/streams/config');

  // 2.3 Editar configuración de streams y señales m3u8 en backend
  const streamConfigPost = await backendRequest('/api/streams/config', 'POST', authHeaders, {
    customVideoUrl: 'https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8',
    backupVideoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    activeStreamSource: 'backup',
    backupChannelName: 'GolBolivia Respaldo HD 24/7',
  });
  assert(streamConfigPost.status === 200, 'Backend: POST /api/streams/config (Editar URLs m3u8 y conmutación)');

  // 2.4 Editar marcador en backend
  const scoreRes = await backendRequest('/api/scoreboard', 'POST', authHeaders, {
    homeScore: 2,
    awayScore: 2,
    matchMinute: 90,
    period: '2T',
  });
  assert(scoreRes.status === 200 && scoreRes.data.scoreboard.homeScore === 2, 'Backend: POST /api/scoreboard (Editar marcador)');

  // 2.5 Crear Evento en Backend
  const newEvtRes = await backendRequest('/api/matches/events', 'POST', authHeaders, {
    minute: 90,
    type: 'goal',
    clubId: 'strongest',
    player: 'Michael Ortega',
    description: 'Empate agónico en el minuto 90',
    scoreAfter: '2 - 2',
  });
  assert(newEvtRes.status === 200 && Boolean(newEvtRes.data.event?.id), 'Backend: POST /api/matches/events (Crear evento)');
  const createdEvtId = newEvtRes.data.event.id;

  // 2.6 Editar Evento en Backend (PUT)
  const putEvtRes = await backendRequest(`/api/matches/events/${createdEvtId}`, 'PUT', authHeaders, {
    description: 'Empate agónico en el minuto 90+2 tras tiro de esquina (Editado)',
    minute: 92,
  });
  assert(putEvtRes.status === 200 && putEvtRes.data.event.minute === 92, 'Backend: PUT /api/matches/events/:id (Editar evento)');

  // 2.7 Borrar Evento en Backend (DELETE)
  const delEvtRes = await backendRequest(`/api/matches/events/${createdEvtId}`, 'DELETE', authHeaders);
  assert(delEvtRes.status === 200 && delEvtRes.data.success, 'Backend: DELETE /api/matches/events/:id (Borrar evento)');

  // Verificar que ya no existe (404 al intentar borrar nuevamente)
  const delAgainRes = await backendRequest(`/api/matches/events/${createdEvtId}`, 'DELETE', authHeaders);
  assert(delAgainRes.status === 404, 'Backend: Verificación de borrado (404 al buscar evento borrado)');

  // 2.8 Enviar y Borrar Mensaje de Chat en Backend
  const chatPost = await backendRequest('/api/chat', 'POST', { 'content-type': 'application/json' }, {
    sender: 'ModeradorTest',
    clubId: 'bolivar',
    text: 'Mensaje de prueba para eliminación de moderación',
  });
  assert(chatPost.status === 200 && Boolean(chatPost.data.message?.id), 'Backend: POST /api/chat (Enviar mensaje)');
  const chatMsgId = chatPost.data.message.id;

  const chatDel = await backendRequest(`/api/chat/${chatMsgId}`, 'DELETE', authHeaders);
  assert(chatDel.status === 200 && chatDel.data.success, 'Backend: DELETE /api/chat/:id (Borrar mensaje de chat)');

  // 2.9 Conmutar señal en tiempo real (Failover Switcher)
  const failoverRes = await backendRequest('/api/streams/failover', 'POST', authHeaders, {
    activeStreamSource: 'obs',
    backupChannelName: 'GolBolivia Señal HD Primaria',
  });
  assert(failoverRes.status === 200 && failoverRes.data.activeStreamSource === 'obs', 'Backend: POST /api/streams/failover (Conmutar a OBS)');

  console.log('\n----------------------------------------------------');
  console.log('🔄 FASE 3: Sincronización Conjunta (Nube + Backend)');
  console.log('----------------------------------------------------');

  // 3.1 Probar confirmación y persistencia simultánea de toda la página
  const syncSettings = {
    title: 'Bolívar vs The Strongest — Clásico Paceño N° 234',
    customVideoUrl: 'https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8',
    backupVideoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    activeStreamSource: 'obs' as const,
    backupChannelName: 'GolBolivia 24/7 Señal Satelital HD',
    isLive: true,
  };
  const syncScore = {
    homeScore: 2,
    awayScore: 1,
    matchMinute: 75,
    period: '2T',
  };

  // Guardar en nube
  await saveStreamSettingsToFirebase(syncSettings);
  await saveScoreboardToFirebase(syncScore);

  // Guardar en backend
  await backendRequest('/api/streams/config', 'POST', authHeaders, syncSettings);
  await backendRequest('/api/scoreboard', 'POST', authHeaders, syncScore);

  // Registrar confirmación de auditoría
  const auditId = await logConfirmationToFirebase({
    action: 'TEST_FULL_PAGE_CONFIRMATION',
    operator: 'Director Técnico de Transmisión',
    role: 'ADMIN',
    details: 'Prueba exitosa de confirmación sincronizada Nube + Backend',
    payload: { syncSettings, syncScore },
    timestamp: Date.now(),
  });

  // Verificar que la nube tiene los datos exactos
  const cloudSettingsCheck = await getStreamSettingsFromFirebase();
  const cloudScoreCheck = await getDoc(doc(db, 'match', 'scoreboard'));
  assert(cloudSettingsCheck?.title === syncSettings.title, 'Sincronización: Título verificado en Firebase');
  assert(cloudScoreCheck.data()?.homeScore === 2 && cloudScoreCheck.data()?.awayScore === 1, 'Sincronización: Marcador verificado en Firebase');

  // Verificar que el backend tiene los datos exactos
  const backendCheck = await backendRequest('/api/live');
  assert(backendCheck.data.match === syncSettings.title, 'Sincronización: Título verificado en Backend');
  assert(backendCheck.data.scoreboard.homeScore === 2, 'Sincronización: Marcador verificado en Backend');

  // Limpiar log de auditoría de prueba
  await deleteConfirmationLogFromFirebase(auditId);
  const auditCleanSnap = await getDoc(doc(db, 'confirmations', auditId));
  assert(!auditCleanSnap.exists(), 'Sincronización: Limpieza y borrado de log de prueba verificado');

  console.log('\n====================================================');
  console.log(`🎉 RESULTADOS: ${passedTests}/${totalTests} PRUEBAS EXITOSAS (100% OK)`);
  console.log('   - Edición y guardado en la nube Firebase Firestore: FUNCIONANDO');
  console.log('   - Borrado de datos en la nube Firebase Firestore: FUNCIONANDO');
  console.log('   - Edición y guardado en Backend Express: FUNCIONANDO');
  console.log('   - Borrado de datos en Backend Express: FUNCIONANDO');
  console.log('   - Sincronización cruzada Nube + Backend: FUNCIONANDO');
  console.log('====================================================\n');

  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('Error durante la ejecución de pruebas:', err);
  process.exit(1);
});
