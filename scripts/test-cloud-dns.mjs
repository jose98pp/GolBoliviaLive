import assert from 'node:assert/strict';
import dns from 'node:dns';
import dnsPromises from 'node:dns/promises';
import { syncBuiltinESMExports } from 'node:module';
import { createFallbackLookup } from './cloud-dns.mjs';

const nativeError = Object.assign(new Error('DNS nativo no disponible'), { code: 'EAI_AGAIN' });
const nativeLookup = async () => { throw nativeError; };
let requests = 0;
const fixtureFetch = async (url) => {
  requests++;
  const host = url.searchParams.get('name');
  const type = Number(url.searchParams.get('type'));
  const address = host === 'private.example' ? '127.0.0.1' : '93.184.216.34';
  return Response.json({ Status: 0, Question: [{ name: host + '.', type }], Answer: type === 1 ? [{ type, TTL: 60, data: address }] : [] });
};
const lookup = createFallbackLookup({ nativeLookup, fetch: fixtureFetch, allowedHosts: ['stream.example', 'private.example'] });
const results = await Promise.all([lookup('stream.example', { all: true }), lookup('stream.example', { family: 4 })]);
assert.deepEqual(results[0], [{ address: '93.184.216.34', family: 4 }]);
assert.equal(results[1].address, '93.184.216.34');
assert.equal(requests, 2, 'A y AAAA se comparten entre consultas concurrentes');
await lookup('stream.example');
assert.equal(requests, 2, 'La caché evita repetir consultas HTTPS');
await assert.rejects(lookup('internal.example'), (error) => error === nativeError);
assert.equal(requests, 2, 'No se envían nombres no habilitados al resolutor externo');
await assert.rejects(lookup('stream.example', { family: 6 }), { code: 'ENOTFOUND' });
const working = createFallbackLookup({ nativeLookup: async () => ({ address: '1.2.3.4', family: 4 }), fetch: async () => { throw new Error('No se debe consultar HTTPS'); }, allowedHosts: ['stream.example'] });
assert.equal((await working('stream.example')).address, '1.2.3.4');
const blocked = createFallbackLookup({ nativeLookup, fetch: async () => new Response('', { status: 403 }), allowedHosts: ['stream.example'] });
await assert.rejects(blocked('stream.example'), { code: 'EDNSHTTPS' });
const unavailable = createFallbackLookup({ nativeLookup, fetch: async () => { throw new Error('Proxy no disponible'); }, allowedHosts: ['stream.example'] });
await assert.rejects(unavailable('stream.example'), { code: 'EDNSHTTPS' });
const malformed = createFallbackLookup({ nativeLookup, fetch: async () => Response.json({ Status: 0, Question: [{ name: 'otro.example', type: 1 }] }), allowedHosts: ['stream.example'] });
await assert.rejects(malformed('stream.example'), { code: 'EDNSHTTPS' });
const nxdomain = createFallbackLookup({ nativeLookup: async () => { throw Object.assign(new Error('NXDOMAIN nativo'), { code: 'ENOTFOUND' }); }, fetch: fixtureFetch, allowedHosts: ['stream.example'] });
await assert.rejects(nxdomain('stream.example'), { code: 'ENOTFOUND' });

const originalPromisesLookup = dnsPromises.lookup;
const originalCallbackLookup = dns.lookup;
try {
  dnsPromises.lookup = lookup;
  syncBuiltinESMExports();
  const { assertPublicHttpUrl } = await import('../api/proxy.js');
  assert.equal((await assertPublicHttpUrl('https://stream.example/live.m3u8')).hostname, 'stream.example');
  await assert.rejects(assertPublicHttpUrl('https://private.example/live.m3u8'), (error) => error.status === 403);
  await assert.rejects(assertPublicHttpUrl('http://127.0.0.1/live'), (error) => error.status === 403);
  await assert.rejects(assertPublicHttpUrl('https://localhost/live'), (error) => error.status === 403);
} finally {
  dnsPromises.lookup = originalPromisesLookup;
  dns.lookup = originalCallbackLookup;
  syncBuiltinESMExports();
}
console.log('Cloud DNS: fallback, caché, concurrencia, errores y protección SSRF comprobados sin red.');
