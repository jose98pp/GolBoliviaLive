import assert from 'node:assert/strict';
import { normalizePlaylistUrl, fetchPlaylistPreview } from '../src/services/playlistImport';

assert.equal(normalizePlaylistUrl('https://proveedor.example/get.php?type=m3u&token=abc'), 'https://proveedor.example/get.php?type=m3u&token=abc');
assert.equal(normalizePlaylistUrl('http://proveedor.example:8080/lista.m3u8'), 'http://proveedor.example:8080/lista.m3u8');
for (const source of ['file:///etc/passwd', 'javascript:alert(1)', 'https://user:pass@proveedor.example/lista.m3u', 'wrong']) assert.equal(normalizePlaylistUrl(source), null);
const savedFetch = globalThis.fetch;
const savedAllowlist = process.env.PROXY_ALLOWED_HOSTS;
delete process.env.PROXY_ALLOWED_HOSTS;
let calls = 0;
try {
  globalThis.fetch = (async () => { calls++; return new Response('#EXTM3U\n#EXTINF:-1,Canal\nhttps://cdn.example/live.m3u8'); }) as typeof fetch;
  const channels = await fetchPlaylistPreview('https://93.184.216.34/list.m3u');
  assert.equal(channels[0].name, 'Canal'); assert.equal(channels[0].sourceType, 'hls');
  for (const target of ['http://127.0.0.1/list.m3u', 'http://169.254.169.254/latest/meta-data', 'http://10.0.0.1/list.m3u', 'http://[::1]/list.m3u']) {
    const before = calls; await assert.rejects(fetchPlaylistPreview(target), /permitido/); assert.equal(calls, before, 'No descarga destinos privados');
  }
  globalThis.fetch = (async () => { calls++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/list.m3u' } }); }) as typeof fetch;
  const before = calls; await assert.rejects(fetchPlaylistPreview('https://93.184.216.34/list.m3u'), /permitido/); assert.equal(calls, before + 1, 'Se valida también el destino de cada redirección');
  globalThis.fetch = (async () => new Response('<html>Acceso</html>')) as typeof fetch;
  await assert.rejects(fetchPlaylistPreview('https://93.184.216.34/list.m3u'), /válida/);
  globalThis.fetch = (async () => new Response('x'.repeat(1024 * 1024 + 1))) as typeof fetch;
  await assert.rejects(fetchPlaylistPreview('https://93.184.216.34/list.m3u'), /1 MB/);
  globalThis.fetch = (async () => new Response('forbidden', { status: 403 })) as typeof fetch;
  await assert.rejects(fetchPlaylistPreview('https://93.184.216.34/list.m3u'), /403/);
  globalThis.fetch = (async () => new Response('#EXTM3U\n#EXT-X-TARGETDURATION:2\n#EXTINF:2,\nsegment.ts')) as typeof fetch;
  const signal = await fetchPlaylistPreview('https://93.184.216.34/live.m3u8');
  assert.equal(signal.length, 1); assert.equal(signal[0].streamUrl, 'https://93.184.216.34/live.m3u8');
  process.env.PROXY_ALLOWED_HOSTS = 'otro-proveedor.example';
  await assert.rejects(fetchPlaylistPreview('https://93.184.216.34/list.m3u'), /PROXY_ALLOWED_HOSTS/, 'Se respeta una política explícita del servidor');
} finally {
  globalThis.fetch = savedFetch;
  if (savedAllowlist === undefined) delete process.env.PROXY_ALLOWED_HOSTS; else process.env.PROXY_ALLOWED_HOSTS = savedAllowlist;
}
console.log('Listas externas: catálogos, manifiestos HLS, HTML inválido, tamaño, errores y bloqueo de red privada/redirecciones comprobados.');
