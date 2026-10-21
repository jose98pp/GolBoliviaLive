import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getProxiedStreamUrl, getStreamUrlForEvent, normalizeExternalPlayerUrl, normalizeMatchIptvUrl } from '../src/utils/streamUtils';
import type { MatchIptvSource, LiveEvent, StreamProvider } from '../src/types/football';

const httpSource = 'http://stream.example:1936/live/espn.m3u8?token=fixture';
const httpsSource = 'https://stream.example:1936/live/espn.m3u8?token=fixture#live';
assert.equal(normalizeMatchIptvUrl(`  ${httpSource}  `), httpSource);
assert.equal(normalizeMatchIptvUrl(httpsSource), httpsSource);
assert.equal(normalizeMatchIptvUrl('HTTP://STREAM.EXAMPLE/live/index.M3U8'), 'http://stream.example/live/index.M3U8');
for (const input of [undefined, null, '', 'not-a-url', 'https://stream.example/player.html',
  'https://stream.example/player?file=index.m3u8', 'https://stream.example/index.mpd',
  'ftp://stream.example/index.m3u8', 'javascript:alert(1)', 'https://user:password@stream.example/index.m3u8',
  'https://stream.example/a b/index.m3u8', `https://stream.example/${'a'.repeat(1500)}.m3u8`]) {
  assert.equal(normalizeMatchIptvUrl(input), null, `Se rechaza un formato no compatible: ${String(input).slice(0, 60)}`);
}

// Ejecutar el callback real del editor sin montar Firebase ni guardar partidos reales.
const editor = await readFile(new URL('../src/components/MatchDetailsEditor.tsx', import.meta.url), 'utf8');
const callback = editor.match(/const selectIptvChannel = \(channel: IptvChannel\) => \{([\s\S]*?)\n  \};/);
assert.ok(callback, 'Callback de selección localizado');
const select = new Function('channel', 'normalizeExternalPlayerUrl', 'normalizeMatchIptvUrl', 'setIptvSource', 'setMatchPrimaryProvider',
  'setMatchFallbackOrder', 'setErrorMsg', 'setIsDirty', 'setExternalUrl', 'setExternalPreview', 'setMatchActiveSource', 'setBroadcastMode', callback[1]);
let source: MatchIptvSource | undefined;
let provider: StreamProvider = 'cloudflare';
let fallbacks: StreamProvider[] = ['cloudflare', 'youtube', 'kick'];
let error: string | null = 'Error anterior';
let dirty = false;
let externalUrl = '';
let externalPreview = 'previous';
const channel = Object.freeze({ id: 'espn-fixture', name: 'ESPN fixture', streamUrl: ` ${httpSource} `, group: 'Deportes' });
const selectChannel = (input: { id: string; name: string; streamUrl: string; group: string }) => select(input, normalizeExternalPlayerUrl, normalizeMatchIptvUrl,
  (value: MatchIptvSource) => { source = value; },
  (value: StreamProvider) => { provider = value; },
  (update: (value: StreamProvider[]) => StreamProvider[]) => { fallbacks = update(fallbacks); },
  (value: string | null) => { error = value; },
  (value: boolean) => { dirty = value; }, (value: string) => { externalUrl = value; }, (value: string) => { externalPreview = value; }, () => {}, () => {});
selectChannel(channel);
assert.equal(source?.streamUrl, httpSource, 'El partido conserva la URL HTTP original, normalizada');
assert.equal(provider, 'iptv');
assert.equal(error, null);
assert.equal(dirty, true);
assert.deepEqual(fallbacks, ['iptv', 'cloudflare', 'youtube', 'kick']);
selectChannel(channel);
assert.equal(fallbacks.filter((item) => item === 'iptv').length, 1);
assert.equal(channel.streamUrl, ` ${httpSource} `, 'No se altera el canal del catálogo');
const assignedSource = source;
selectChannel({ ...channel, streamUrl: 'https://stream.example/index.mpd' });
assert.equal(source, assignedSource, 'Una selección incompatible no borra la señal válida anterior');
assert.match(error || '', /HLS/);
const event = { id: 'partido-fixture', primaryProvider: 'iptv', iptvSource: source } as LiveEvent;
assert.equal(getStreamUrlForEvent(event), httpSource);
assert.equal(getProxiedStreamUrl(getStreamUrlForEvent(event)), `/api/proxy?url=${encodeURIComponent(httpSource)}`);

const server = await readFile(new URL('../serverApp.ts', import.meta.url), 'utf8');
assert.ok(server.includes('const iptvSource = normalizeMatchIptvSource(raw.iptvSource);'), 'El backend valida la referencia completa HLS o iframe');
assert.ok(server.includes('      iptvSource,'), 'El backend conserva la referencia validada');
console.log('Match IPTV: HTTP/HTTPS, puerto alternativo, selección real del editor, respaldo, validación y ruta al proxy comprobados.');

selectChannel({ ...channel, streamUrl: 'https://streamxhd.st/live1.php?stream=dsports' });
assert.equal(provider, 'external');
assert.equal(externalUrl, 'https://streamxhd.st/live1.php?stream=dsports');
assert.equal(externalPreview, '');
assert.equal(fallbacks[0], 'external');
selectChannel(channel);
assert.equal(provider, 'iptv', 'Se puede volver a HLS después de seleccionar un iframe');
assert.equal(normalizeMatchIptvUrl('https://example.test/live.m3u'), 'https://example.test/live.m3u');
