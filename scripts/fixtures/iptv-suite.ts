import { persistenceCalls, failNextSaveForTest, getCustomIptvChannelsFromFirebase } from './iptv-persistence';
import { normalizeVercelUrl } from '../../src/utils/serverUrl';
import {
  getOrRefreshSportsChannels,
  resetIptvCacheForTest,
  setCachedChannelsForTest,
  resetCustomChannelsForTest,
  setCustomChannelsForTest,
  getCustomChannelsForTest,
  CURATED_FALLBACK_CHANNELS,
  iptvRouter,
  parseM3uSports,
  mergeChannelCatalog,
} from '../../src/services/iptvBackend';
import { iptvService } from '../../src/services/iptvService';
import type { IptvChannel } from '../../src/types/iptv';
import proxyHandler, { rewriteM3u8Content } from '../../api/proxy.js';
import { getProxiedStreamUrl } from '../../src/utils/streamUtils';

console.log('====================================================');
console.log('🧪 PRUEBAS AUTOMATIZADAS DE IPTV Y NORMALIZACIÓN VERCEL');
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

async function runAllIptvTests() {
  // ── 1. Pruebas de Normalización de URLs de Vercel ──
  console.log('--- 1. Pruebas de normalización de URLs Vercel ---');

  const testUrl1 = normalizeVercelUrl('/api/index?path=iptv/sports');
  assert(testUrl1 === '/api/iptv/sports', 'Normaliza ?path=iptv/sports a /api/iptv/sports', testUrl1);

  const testUrl2 = normalizeVercelUrl('/api/index?path=/iptv/status');
  assert(testUrl2 === '/api/iptv/status', 'Normaliza ?path=/iptv/status con barra inicial a /api/iptv/status', testUrl2);

  const testUrl3 = normalizeVercelUrl('/api/index?path=iptv/sports&country=BO&q=bolivia');
  assert(
    testUrl3 === '/api/iptv/sports?country=BO&q=bolivia',
    'Preserva query params al normalizar ?path=iptv/sports&country=BO&q=bolivia',
    testUrl3
  );

  const testUrl4 = normalizeVercelUrl('/api/index?path=live', {
    'x-matched-path': '/api/iptv/sports',
  });
  assert(
    testUrl4 === '/api/iptv/sports',
    'Prioriza x-matched-path de Vercel para enrutar a /api/iptv/sports',
    testUrl4
  );

  const testUrl5 = normalizeVercelUrl('/api/index?path=live', {
    'x-vercel-matched-path': '/api/iptv/status',
  });
  assert(
    testUrl5 === '/api/iptv/status',
    'Prioriza x-vercel-matched-path de Vercel para enrutar a /api/iptv/status',
    testUrl5
  );

  const testUrl6 = normalizeVercelUrl('/api/iptv/sports?country=AR');
  assert(testUrl6 === '/api/iptv/sports?country=AR', 'Mantiene URLs directas sin alterarlas', testUrl6);

  // ── 2. Pruebas de Rutas del Router IPTV en Memoria ──
  console.log('\n--- 2. Pruebas de endpoints /api/iptv/status y /api/iptv/sports ---');

  // Inicializar estado de prueba para canales
  resetIptvCacheForTest();
  setCachedChannelsForTest(CURATED_FALLBACK_CHANNELS);

  // Simular llamada a GET /status
  let statusResult: any = null;
  const mockReqStatus: any = {};
  const mockResStatus: any = {
    json: (data: any) => { statusResult = data; },
  };

  // Buscar handler de /status
  const statusLayer: any = (iptvRouter as any).stack.find((layer: any) => layer.route?.path === '/status');
  assert(Boolean(statusLayer), 'Ruta /status registrada en iptvRouter');
  statusLayer?.route?.stack[0]?.handle(mockReqStatus, mockResStatus, () => {});

  assert(statusResult?.status === 'online', 'Status devuelve estado online');
  assert(
    statusResult?.cachedChannelsCount === CURATED_FALLBACK_CHANNELS.length,
    'Status devuelve conteo de canales en caché',
    `Canales: ${statusResult?.cachedChannelsCount}`
  );
  assert(statusResult?.isUpdating === false, 'Status reporta isUpdating = false cuando no hay fetch en curso');

  // Simular llamada a GET /sports
  let sportsResult: any = null;
  const mockReqSports: any = { query: {} };
  const mockResSports: any = {
    json: (data: any) => { sportsResult = data; },
    status: () => mockResSports,
  };

  const sportsLayer: any = (iptvRouter as any).stack.find((layer: any) => layer.route?.path === '/sports');
  assert(Boolean(sportsLayer), 'Ruta /sports registrada en iptvRouter');
  await sportsLayer?.route?.stack[0]?.handle(mockReqSports, mockResSports, () => {});

  assert(sportsResult?.success === true, 'GET /sports responde exitosamente');
  assert(sportsResult?.total === CURATED_FALLBACK_CHANNELS.length, 'GET /sports devuelve el total correcto');
  assert(sportsResult?.allTotal === CURATED_FALLBACK_CHANNELS.length, 'GET /sports allTotal coincide con el catálogo');

  // Filtrado por país en backend
  let boliviaSportsResult: any = null;
  const mockReqBo: any = { query: { country: 'BO' } };
  const mockResBo: any = {
    json: (data: any) => { boliviaSportsResult = data; },
    status: () => mockResBo,
  };
  await sportsLayer?.route?.stack[0]?.handle(mockReqBo, mockResBo, () => {});

  assert(boliviaSportsResult?.success === true, 'GET /sports?country=BO responde exitosamente');
  assert(
    boliviaSportsResult?.channels.every((c: IptvChannel) => c.country === 'BO'),
    'Todos los canales filtrados corresponden a Bolivia (BO)'
  );
  assert(
    boliviaSportsResult?.allTotal === CURATED_FALLBACK_CHANNELS.length,
    'allTotal conserva el total del catálogo general tras filtro de país'
  );

  // ── 3. Pruebas de Espera y Deduplicación Concurrente de Promesa M3U ──
  console.log('\n--- 3. Pruebas de deduplicación de promesa entre solicitudes concurrentes ---');

  resetIptvCacheForTest();
  // Lanzar 5 solicitudes simultáneas a getOrRefreshSportsChannels
  const p1 = getOrRefreshSportsChannels();
  const p2 = getOrRefreshSportsChannels();
  const p3 = getOrRefreshSportsChannels();
  const p4 = getOrRefreshSportsChannels();
  const p5 = getOrRefreshSportsChannels();

  // Verificar que p1 y p2 sean exactamente la misma instancia de promesa
  assert(p1 === p2, 'p1 y p2 comparten exactamente la misma instancia de Promise');
  assert(p2 === p3, 'p2 y p3 comparten la misma Promise compartida');
  assert(p3 === p4 && p4 === p5, 'Todas las solicitudes concurrentes (p1-p5) comparten la misma promesa');

  const results = await Promise.all([p1, p2, p3, p4, p5]);
  assert(results[0].length > 0, 'La promesa compartida se resolvió con canales');
  assert(results[0] === results[1], 'Todos los consumidores concurrentes recibieron los mismos datos resueltos');

  // ── 4. Pruebas de Caché Frontend: No contaminación por búsquedas filtradas ──
  console.log('\n--- 4. Pruebas de frontend: catálogo completo en caché sin contaminación ---');

  // Simular mock de localStorage
  const localStorageMock: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => localStorageMock[key] || null,
    setItem: (key: string, val: string) => { localStorageMock[key] = val; },
    removeItem: (key: string) => { delete localStorageMock[key]; },
    clear: () => { Object.keys(localStorageMock).forEach((k) => delete localStorageMock[k]); },
  };

  // Mock de fetch en frontend que simula /api/iptv/sports
  const sampleCatalog: IptvChannel[] = [
    {
      id: 'bo-red-uno',
      name: 'Red Uno Deportes Bolivia',
      logo: '',
      group: 'Bolivia',
      country: 'BO',
      countryName: 'Bolivia',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    },
    {
      id: 'ar-tyc',
      name: 'TyC Sports Argentina',
      logo: '',
      group: 'Argentina',
      country: 'AR',
      countryName: 'Argentina',
      streamUrl: 'https://cspan1-lh.akamaihd.net/i/cspan1_1@305949/master.m3u8',
    },
    {
      id: 'int-claro',
      name: 'Claro Sports Latam',
      logo: '',
      group: 'Internacional',
      country: 'INT',
      countryName: 'Internacional',
      streamUrl: 'https://live-clarosports-linear.amagi.tv/playlist.m3u8',
    },
  ];

  let fetchCallUrl = '';
  (globalThis as any).fetch = async (url: string) => {
    fetchCallUrl = url;
    return {
      ok: true,
      json: async () => ({
        success: true,
        total: sampleCatalog.length,
        allTotal: sampleCatalog.length,
        channels: sampleCatalog,
      }),
    };
  };

  // Limpiar caché previa
  iptvService.clearCache();
  assert(iptvService.getMemoryCache() === null, 'La caché en memoria inicia limpia (null)');

  // Primera consulta con filtro estricto por país: Bolivia
  const boFiltered = await iptvService.getChannels({ country: 'BO', query: 'bolivia' });

  assert(
    fetchCallUrl === '/api/iptv/sports',
    'La solicitud a red solicita el catálogo completo (/api/iptv/sports) sin parámetros de filtro',
    fetchCallUrl
  );
  assert(
    boFiltered.length === 1 && boFiltered[0].id === 'bo-red-uno',
    'El resultado devuelto al llamador está filtrado únicamente para Bolivia',
    `Canal: ${boFiltered[0]?.name}`
  );

  // Comprobar que memoryCache contiene el catálogo COMPLETO y NO solo los canales de Bolivia
  const cachedFullCatalog = iptvService.getMemoryCache();
  assert(
    cachedFullCatalog !== null && cachedFullCatalog.length === 3,
    'La caché en memoria guardó el catálogo COMPLETO (3 canales) y no fue contaminada por el filtro',
    `Canales en memoria: ${cachedFullCatalog?.length}`
  );

  // Segunda consulta pidiendo TODOS los canales (country = 'ALL')
  fetchCallUrl = ''; // Reiniciar para asegurar que NO se hace fetch a red
  const allFromCache = await iptvService.getChannels({ country: 'ALL' });

  assert(fetchCallUrl === '', 'La segunda consulta NO hace petición a red (usó la caché global)');
  assert(
    allFromCache.length === 3,
    'La segunda consulta devuelve todos los canales (Bolivia, Argentina, Internacional) correctamente',
    `Total devuelto: ${allFromCache.length}`
  );

  // ── 5. Verificación de URLs Reales y Metadatos de Señales ──
  console.log('\n--- 5. Verificación de URLs de streaming reales y señales de prueba ---');

  const realFastChannels = CURATED_FALLBACK_CHANNELS.filter((c) => c.isDemoFeed === false);
  const demoFallbackChannels = CURATED_FALLBACK_CHANNELS.filter((c) => c.isDemoFeed === true);

  assert(realFastChannels.length >= 3, `Identificadas ${realFastChannels.length} señales oficiales FAST 24/7`);
  assert(
    realFastChannels.some((c) => c.id === 'claro-sports-latam' && c.streamUrl.includes('amagi.tv')),
    'Metadatos de Claro Sports apuntan a Amagi (sin comprobar conectividad)'
  );
  assert(
    realFastChannels.some((c) => c.id === 'redbull-tv-live' && c.streamUrl.includes('akamaized.net')),
    'Metadatos de Red Bull TV apuntan a Akamai (sin comprobar conectividad)'
  );
  assert(
    realFastChannels.some((c) => c.id === 'fifa-plus-es' && c.streamUrl.includes('fifaplus')),
    'Metadatos de FIFA+ apuntan a Amagi (sin comprobar conectividad)'
  );

  assert(
    demoFallbackChannels.every((c) => typeof c.notes === 'string' && c.notes.length > 0),
    'Todos los canales diagnósticos de respaldo están debidamente documentados y etiquetados'
  );

  // ── 6. Pruebas de Canales IPTV Cargados desde el Dashboard ──
  console.log('\n--- 6. Pruebas de canales IPTV personalizados cargados desde el dashboard ---');

  resetCustomChannelsForTest();

  // 6.1 Registrar canal personalizado vía POST /api/iptv/custom
  const customLayer: any = (iptvRouter as any).stack.find(
    (layer: any) => layer.route?.path === '/custom' && layer.route?.methods?.post
  );
  assert(Boolean(customLayer), 'Endpoint POST /api/iptv/custom registrado en iptvRouter');

  let postCustomRes: any = null;
  const mockReqPostCustom: any = {
    body: {
      name: 'Tigo Sports 1 Bolivia HD Test',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      country: 'BO',
      countryName: 'Bolivia',
      group: 'Fútbol Boliviano',
      resolution: '1080p',
    },
  };
  const mockResPostCustom: any = {
    json: (d: any) => { postCustomRes = d; },
    status: () => mockResPostCustom,
  };
  await customLayer?.route?.stack[0]?.handle(mockReqPostCustom, mockResPostCustom, () => {});

  assert(postCustomRes?.success === true, 'POST /api/iptv/custom guarda canal exitosamente');
  assert(postCustomRes?.channel?.name === 'Tigo Sports 1 Bolivia HD Test', 'El canal guardado contiene el nombre correcto');
  assert(postCustomRes?.channel?.isCustom === true, 'El canal queda marcado como isCustom: true');
  assert(postCustomRes?.channel?.country === 'BO', 'El país se asigna correctamente');

  const createdChannelId = postCustomRes?.channel?.id;
  assert(Boolean(createdChannelId), 'Se generó un ID único para el canal personalizado');

  let editedResponse: any;
  const editedRes: any = { status: () => editedRes, json: (data: any) => { editedResponse = data; } };
  await customLayer.route.stack[0].handle({ body: { ...mockReqPostCustom.body, editingId: createdChannelId, editingStreamUrl: mockReqPostCustom.body.streamUrl, name: 'Canal editado', streamUrl: 'https://example.test/edited.m3u8' } }, editedRes, () => {});
  assert(editedResponse?.success && editedResponse.channel.id === createdChannelId, 'Editar conserva el ID del canal personalizado');
  assert((await getCustomIptvChannelsFromFirebase()).find((channel: any) => channel.id === createdChannelId)?.name === 'Canal editado', 'La edición se guarda en persistencia simulada');
  assert(getCustomChannelsForTest().filter((channel: any) => channel.id === createdChannelId).length === 1, 'Editar no duplica el canal');

  // 6.2 Obtener canales personalizados vía GET /api/iptv/custom
  const getCustomLayer: any = (iptvRouter as any).stack.find(
    (layer: any) => layer.route?.path === '/custom' && layer.route?.methods?.get
  );
  assert(Boolean(getCustomLayer), 'Endpoint GET /api/iptv/custom registrado');

  let getCustomRes: any = null;
  const mockReqGetCustom: any = {};
  const mockResGetCustom: any = {
    json: (d: any) => { getCustomRes = d; },
  };
  await getCustomLayer?.route?.stack[0]?.handle(mockReqGetCustom, mockResGetCustom, () => {});

  assert(getCustomRes?.success === true, 'GET /api/iptv/custom responde con éxito');
  assert(getCustomRes?.total >= 1, 'GET /api/iptv/custom lista al menos 1 canal');
  assert(getCustomRes?.channels.some((c: any) => c.id === createdChannelId), 'El canal recién creado está presente en la lista');

  // 6.3 Verificar que el canal personalizado encabeza el catálogo general en /sports
  let sportsWithCustomRes: any = null;
  const mockReqSportsCheck: any = { query: {} };
  const mockResSportsCheck: any = {
    json: (d: any) => { sportsWithCustomRes = d; },
    status: () => mockResSportsCheck,
  };
  await sportsLayer?.route?.stack[0]?.handle(mockReqSportsCheck, mockResSportsCheck, () => {});

  assert(sportsWithCustomRes?.channels[0]?.id === createdChannelId, 'El canal personalizado del dashboard se ubica en primer lugar en /sports');

  let iframeResponse: any;
  const iframeRes: any = { status: () => iframeRes, json: (data: any) => { iframeResponse = data; } };
  await customLayer.route.stack[0].handle({ body: { name: 'Iframe fixture', sourceType: 'iframe', streamUrl: '<iframe src="https://streamxhd.st/live1.php?stream=dsports" onload="alert(1)"></iframe>' } }, iframeRes, () => {});
  assert(iframeResponse?.success === true && iframeResponse.channel.sourceType === 'iframe', 'POST guarda el tipo iframe en persistencia aislada');
  assert(iframeResponse?.channel?.streamUrl === 'https://streamxhd.st/live1.php?stream=dsports', 'POST conserva solo la URL validada del iframe');
  let rejectedCode = 0;
  const invalidRes: any = { status: (code: number) => { rejectedCode = code; return invalidRes; }, json: () => {} };
  await customLayer.route.stack[0].handle({ body: { name: 'Inválido', sourceType: 'iframe', streamUrl: 'https://evil.test/player' } }, invalidRes, () => {});
  assert(rejectedCode === 400, 'POST rechaza iframe de dominio no admitido');
  let refreshedCustom: any;
  await getCustomLayer.route.stack[0].handle({}, { json: (data: any) => { refreshedCustom = data; } }, () => {});
  assert(refreshedCustom.channels.some((channel: any) => channel.sourceType === 'iframe'), 'GET devuelve el canal iframe guardado');

  // 6.4 Eliminar canal personalizado vía DELETE /api/iptv/custom/:id
  const deleteCustomLayer: any = (iptvRouter as any).stack.find(
    (layer: any) => layer.route?.path === '/custom/:id' && layer.route?.methods?.delete
  );
  assert(Boolean(deleteCustomLayer), 'Endpoint DELETE /api/iptv/custom/:id registrado');

  let deleteCustomRes: any = null;
  const mockReqDeleteCustom: any = { params: { id: createdChannelId } };
  const mockResDeleteCustom: any = {
    json: (d: any) => { deleteCustomRes = d; },
  };
  await deleteCustomLayer?.route?.stack[0]?.handle(mockReqDeleteCustom, mockResDeleteCustom, () => {});

  assert(deleteCustomRes?.success === true, 'DELETE /api/iptv/custom/:id elimina el canal');
  assert(getCustomChannelsForTest().every((c) => c.id !== createdChannelId), 'El canal fue removido de la memoria');
  await deleteCustomLayer.route.stack[0].handle({ params: { id: iframeResponse.channel.id } }, mockResDeleteCustom, () => {});
  assert(persistenceCalls.save === 3 && persistenceCalls.delete === 2, 'Alta y baja usan exclusivamente la persistencia simulada');
  assert((await getCustomIptvChannelsFromFirebase()).length === 0, 'La baja elimina el canal también del almacenamiento simulado');
  failNextSaveForTest();
  let failedSaveStatus = 200;
  let failedSaveBody: any;
  const failedSaveResponse: any = {
    status: (status: number) => { failedSaveStatus = status; return failedSaveResponse; },
    json: (body: any) => { failedSaveBody = body; },
  };
  await customLayer.route.stack[0].handle(mockReqPostCustom, failedSaveResponse, () => {});
  assert(failedSaveStatus === 500 && failedSaveBody.success === false, 'Un error de persistencia se devuelve al cliente');
  assert(getCustomChannelsForTest().length === 0, 'No se publica un canal cuyo guardado falló');
  failNextSaveForTest('permission-denied');
  await customLayer.route.stack[0].handle(mockReqPostCustom, failedSaveResponse, () => {});
  assert(failedSaveStatus === 403 && failedSaveBody.code === 'FIRESTORE_PERMISSION_DENIED', 'Un rechazo de Firestore se distingue del bloqueo de la señal');
  assert(failedSaveBody.error.includes('iptvCustomChannels') && failedSaveBody.error.includes('admins/{UID}'), 'El rechazo de guardado identifica las reglas y la autenticación que revisar');
  assert(getCustomChannelsForTest().length === 0, 'El rechazo de permisos no publica el canal');



  const originalPublic = CURATED_FALLBACK_CHANNELS[0];
  let publicEdit: any;
  const publicRes: any = { status: () => publicRes, json: (data: any) => { publicEdit = data; } };
  await customLayer.route.stack[0].handle({ body: { ...originalPublic, editingId: originalPublic.id, editingStreamUrl: originalPublic.streamUrl, name: 'Versión administrada', streamUrl: 'https://example.test/public-edited.m3u8', sourceType: 'hls' } }, publicRes, () => {});
  assert(publicEdit?.success && publicEdit.channel.isCustom, 'Se puede editar un canal público mediante versión administrada');
  const storedEdits = await getCustomIptvChannelsFromFirebase();
  const merged = mergeChannelCatalog(storedEdits, CURATED_FALLBACK_CHANNELS);
  assert(merged.some(channel => channel.streamUrl === 'https://example.test/public-edited.m3u8') && !merged.some(channel => channel.streamUrl === originalPublic.streamUrl), 'La edición pública persiste al reconstruir el catálogo sin reintroducir el original');
  let staleStatus = 200;
  const staleRes: any = { status: (code: number) => { staleStatus = code; return staleRes; }, json: () => {} };
  await customLayer.route.stack[0].handle({ body: { ...mockReqPostCustom.body, editingId: 'missing-channel', editingStreamUrl: 'https://example.test/missing.m3u8' } }, staleRes, () => {});
  assert(staleStatus === 409, 'Una edición obsoleta no crea un canal nuevo silenciosamente');
  staleStatus = 200;
  await customLayer.route.stack[0].handle({ body: { ...originalPublic, editingId: originalPublic.id, editingStreamUrl: originalPublic.streamUrl, name: 'Duplicado', streamUrl: 'https://example.test/another-public-edit.m3u8', sourceType: 'hls' } }, staleRes, () => {});
  assert(staleStatus === 409, 'No se crean dos versiones administradas del mismo canal público');
  await deleteCustomLayer.route.stack[0].handle({ params: { id: publicEdit.channel.id } }, mockResDeleteCustom, () => {});

  // ── 7. Pruebas del Proxy Serverless /api/proxy (CORS y enlaces http://) ──
  console.log('\n--- 7. Pruebas del Proxy Serverless /api/proxy (CORS y enlaces http://) ---');

  // 7.1 Validación de parámetros y protocolo
  let noUrlStatus = 200;
  let noUrlJson: any = null;
  const mockResNoUrl: any = {
    setHeader: () => {},
    status: (s: number) => { noUrlStatus = s; return mockResNoUrl; },
    json: (d: any) => { noUrlJson = d; },
  };
  await proxyHandler({ method: 'GET', query: {} }, mockResNoUrl);
  assert(noUrlStatus === 400, 'Rechaza solicitudes sin parámetro ?url= con código 400');
  assert(noUrlJson?.error?.includes('Falta el parámetro'), 'Devuelve mensaje de error descriptivo');

  let invalidProtoStatus = 200;
  const mockResInvalidProto: any = {
    setHeader: () => {},
    status: (s: number) => { invalidProtoStatus = s; return mockResInvalidProto; },
    json: () => {},
  };
  await proxyHandler({ method: 'GET', query: { url: 'ftp://invalido.com/stream' } }, mockResInvalidProto);
  assert(invalidProtoStatus === 400, 'Rechaza protocolos no permitidos (ftp://) con código 400');

  // 7.2 Soporte de CORS Preflight (OPTIONS)
  const headersSet: Record<string, string> = {};
  let optionsEnded = false;
  let optionsStatus = 0;
  const mockResOptions: any = {
    setHeader: (k: string, v: string) => { headersSet[k.toLowerCase()] = v; },
    status: (s: number) => { optionsStatus = s; return mockResOptions; },
    end: () => { optionsEnded = true; },
  };
  await proxyHandler({ method: 'OPTIONS' }, mockResOptions);
  assert(optionsStatus === 200 && optionsEnded, 'Responde 200 a preflight OPTIONS');
  assert(headersSet['access-control-allow-origin'] === '*', 'Cabecera Access-Control-Allow-Origin: * configurada');
  assert(Boolean(headersSet['access-control-allow-methods']?.includes('GET')), 'Cabecera Access-Control-Allow-Methods incluye GET');

  // 7.3 Prueba de reescritura de listas de reproducción M3U8
  const sampleM3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-KEY:METHOD=AES-128,URI="http://key.origin.com/enc.key"
#EXTINF:6.0,
segment001.ts
#EXTINF:6.0,
http://cdn.origin.com/live/segment002.ts`;

  const rewritten = rewriteM3u8Content(sampleM3u8, 'http://origin.com/live/playlist.m3u8');
  assert(rewritten.includes('#EXTM3U'), 'Preserva encabezado #EXTM3U');
  assert(rewritten.includes('#EXTINF:6.0,'), 'Preserva marcas de duración #EXTINF');
  assert(
    rewritten.includes('/api/proxy?url=' + encodeURIComponent('http://origin.com/live/segment001.ts')),
    'Reescribe segmentos relativos (segment001.ts) resolviendo URL base absoluta'
  );
  assert(
    rewritten.includes('/api/proxy?url=' + encodeURIComponent('http://cdn.origin.com/live/segment002.ts')),
    'Reescribe segmentos absolutos (http://...) para pasar por el proxy'
  );
  assert(
    rewritten.includes('/api/proxy?url=' + encodeURIComponent('http://key.origin.com/enc.key')),
    'Reescribe URIs de claves de encriptación #EXT-X-KEY'
  );

  // 7.4 Helper frontend getProxiedStreamUrl
  const proxiedHttp = getProxiedStreamUrl('http://canal.bo/stream.m3u8');
  assert(
    proxiedHttp.startsWith('/api/proxy?url='),
    'Convierte automáticamente enlaces http:// a /api/proxy para evitar Mixed Content'
  );
  const proxiedHttps = getProxiedStreamUrl('https://seguro.bo/stream.m3u8');
  assert(
    proxiedHttps === 'https://seguro.bo/stream.m3u8',
    'Mantiene enlaces https:// intactos por defecto'
  );
  const forcedHttps = getProxiedStreamUrl('https://con-cors.bo/stream.m3u8', true);
  assert(
    forcedHttps.startsWith('/api/proxy?url='),
    'Permite forzar proxy en enlaces https:// cuando falla por CORS'
  );
  const alreadyProxied = getProxiedStreamUrl('/api/proxy?url=http%3A%2F%2Ftest');
  assert(
    alreadyProxied === '/api/proxy?url=http%3A%2F%2Ftest',
    'Evita doble envoltura si la URL ya está usando /api/proxy'
  );

  // ── 8. Pruebas de Canales Destacados y Carga M3U con bo.m3u ──
  console.log('\n--- 8. Pruebas de Canales Destacados y bo.m3u ---');

  const mainChannel = CURATED_FALLBACK_CHANNELS[0];
  assert(mainChannel.id === 'claro-sports-latam', 'El respaldo conserva la identidad real de Claro Sports');
  assert(CURATED_FALLBACK_CHANNELS.every((c) => c.isDemoFeed === false), 'El respaldo no disfraza señales de demostración como fútbol boliviano');

  // Probar parseM3uSports con defaultCountry='BO'
  const mockBoM3u = `#EXTM3U
#EXTINF:-1 tvg-id="Unitel.bo" tvg-name="Unitel" tvg-logo="https://unitel.bo/logo.png" group-title="General",Unitel HD
https://stream.unitel.bo/live.m3u8
#EXTINF:-1 tvg-id="BoliviaTV.bo" tvg-name="Bolivia TV" tvg-logo="https://boliviatv.bo/logo.png" group-title="TV Abierta",Bolivia TV 7.1
https://stream.boliviatv.bo/live.m3u8`;

  const parsedBo = parseM3uSports(mockBoM3u, 'BO');
  assert(parsedBo.length === 2, 'parseM3uSports extrae los canales de la lista M3U', `Total: ${parsedBo.length}`);
  assert(
    parsedBo.every((c: IptvChannel) => c.country === 'BO' && c.countryName === 'Bolivia'),
    'parseM3uSports asigna país BO y Bolivia automáticamente cuando defaultCountry="BO"'
  );
  assert(
    parsedBo[0].name === 'Unitel HD' && parsedBo[0].group === 'General',
    'Conserva nombre y group-title de Unitel'
  );

  // 8.3 Prueba de getCachedChannelsSync para renderizado en 0ms
  const syncChannels = iptvService.getCachedChannelsSync();
  assert(
    Array.isArray(syncChannels),
    'getCachedChannelsSync devuelve un array inmediatamente de forma síncrona'
  );

  // 8.4 Prueba de respuesta M3U8 en proxyHandler con cabeceras de caché Edge
  let proxyM3u8Headers: Record<string, string> = {};
  let proxyM3u8Body = '';
  const mockResM3u8: any = {
    setHeader: (k: string, v: string) => { proxyM3u8Headers[k.toLowerCase()] = v; },
    status: () => mockResM3u8,
    send: (b: any) => { proxyM3u8Body = b.toString(); return mockResM3u8; },
    json: () => mockResM3u8,
  };

  (globalThis as any).fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Map([['content-type', 'application/vnd.apple.mpegurl']]),
    text: async () => '#EXTM3U\n#EXTINF:4.0,\nsegment1.ts',
    url: 'https://cdn.origin.com/stream/playlist.m3u8',
  });

  await proxyHandler({ method: 'GET', query: { url: 'https://cdn.origin.com/stream/playlist.m3u8' } } as any, mockResM3u8);
  assert(
    proxyM3u8Headers['content-type']?.includes('application/vnd.apple.mpegurl'),
    'Proxy establece Content-Type de playlist M3U8'
  );
  assert(
    proxyM3u8Headers['cache-control']?.includes('public'),
    'Proxy configura cabecera Cache-Control para optimización Edge en M3U8'
  );
  assert(
    proxyM3u8Body.includes('/api/proxy?url='),
    'Proxy reescribe segmentos dentro del playlist M3U8'
  );

  // Errores del origen: nunca se presentan ni cachean como vídeo válido.
  for (const upstreamStatus of [403, 404, 429, 503]) {
    let status = 0;
    let body: any;
    const headers: Record<string, string> = {};
    const response: any = {
      setHeader: (key: string, value: string) => { headers[key.toLowerCase()] = value; },
      status: (value: number) => { status = value; return response; },
      json: (value: any) => { body = value; return response; },
      send: () => { throw new Error('No se debe enviar un error como fragmento de vídeo'); },
    };
    globalThis.fetch = async () => new Response('Error del origen', { status: upstreamStatus });
    await proxyHandler({ method: 'GET', query: { url: 'http://190.61.47.54:8000/play/a004/segment.ts' } } as any, response);
    assert(status === upstreamStatus && body.code === 'UPSTREAM_HTTP_ERROR', `Proxy conserva HTTP ${upstreamStatus} y devuelve un error explícito`);
    assert(headers['cache-control'] === 'no-store', `Proxy no almacena errores HTTP ${upstreamStatus}`);
  }
  let segmentHeaders: Record<string, string> = {};
  let segmentStatus = 0;
  let segmentBody: Buffer;
  const segmentResponse: any = {
    setHeader: (key: string, value: string) => { segmentHeaders[key.toLowerCase()] = value; },
    status: (value: number) => { segmentStatus = value; return segmentResponse; },
    send: (value: Buffer) => { segmentBody = value; return segmentResponse; },
    json: () => { throw new Error('Un segmento válido no debe convertirse en error'); },
  };
  globalThis.fetch = async () => new Response(new Uint8Array([0x47, 0x40, 0x11]), { headers: { 'content-type': 'video/mp2t' } });
  await proxyHandler({ method: 'GET', query: { url: 'http://190.61.47.54:8000/play/a004/segment.ts' } } as any, segmentResponse);
  assert(segmentStatus === 200 && segmentBody![0] === 0x47, 'Proxy conserva los bytes de un segmento correcto');
  assert(segmentHeaders['content-type'] === 'video/mp2t' && segmentHeaders['cache-control'].includes('public'), 'Proxy conserva la caché y el tipo de los segmentos correctos');

  console.log('\n====================================================');
  console.log(`🎉 TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO: ${passedTests}/${totalTests}`);
  console.log('====================================================\n');
}

const originalFetch = globalThis.fetch;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
// Todas las descargas de listas de esta suite son fixtures; no se usa Internet.
globalThis.fetch = async () => new Response('#EXTM3U\n#EXTINF:-1 tvg-id="Fixture.bo",Fixture Bolivia\nhttps://fixture.example/live.m3u8');
await runAllIptvTests().catch((err) => {
  console.error('\n❌ ERROR FATAL EN PRUEBAS:', err);
  process.exitCode = 1;
}).finally(() => {
  globalThis.fetch = originalFetch;
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});
