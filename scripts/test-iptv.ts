import { normalizeVercelUrl } from '../serverApp';
import {
  getOrRefreshSportsChannels,
  resetIptvCacheForTest,
  setCachedChannelsForTest,
  resetCustomChannelsForTest,
  setCustomChannelsForTest,
  getCustomChannelsForTest,
  CURATED_FALLBACK_CHANNELS,
  iptvRouter,
} from '../src/services/iptvBackend';
import { iptvService } from '../src/services/iptvService';
import type { IptvChannel } from '../src/types/iptv';

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
    'Canal Claro Sports verificado con CDN oficial Amagi'
  );
  assert(
    realFastChannels.some((c) => c.id === 'redbull-tv-live' && c.streamUrl.includes('akamaized.net')),
    'Canal Red Bull TV verificado con CDN oficial Akamai'
  );
  assert(
    realFastChannels.some((c) => c.id === 'fifa-plus-es' && c.streamUrl.includes('fifaplus')),
    'Canal FIFA+ verificado con CDN oficial Amagi'
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
  customLayer?.route?.stack[0]?.handle(mockReqPostCustom, mockResPostCustom, () => {});

  assert(postCustomRes?.success === true, 'POST /api/iptv/custom guarda canal exitosamente');
  assert(postCustomRes?.channel?.name === 'Tigo Sports 1 Bolivia HD Test', 'El canal guardado contiene el nombre correcto');
  assert(postCustomRes?.channel?.isCustom === true, 'El canal queda marcado como isCustom: true');
  assert(postCustomRes?.channel?.country === 'BO', 'El país se asigna correctamente');

  const createdChannelId = postCustomRes?.channel?.id;
  assert(Boolean(createdChannelId), 'Se generó un ID único para el canal personalizado');

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
  getCustomLayer?.route?.stack[0]?.handle(mockReqGetCustom, mockResGetCustom, () => {});

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
  deleteCustomLayer?.route?.stack[0]?.handle(mockReqDeleteCustom, mockResDeleteCustom, () => {});

  assert(deleteCustomRes?.success === true, 'DELETE /api/iptv/custom/:id elimina el canal');
  assert(getCustomChannelsForTest().every((c) => c.id !== createdChannelId), 'El canal fue removido de la memoria');

  console.log('\n====================================================');
  console.log(`🎉 TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO: ${passedTests}/${totalTests}`);
  console.log('====================================================\n');
  process.exit(0);
}

runAllIptvTests().catch((err) => {
  console.error('\n❌ ERROR FATAL EN PRUEBAS:', err);
  process.exit(1);
});
