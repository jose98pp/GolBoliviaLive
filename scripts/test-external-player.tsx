import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExternalPlayer } from '../src/features/player/ExternalPlayer';
import { getStreamUrlForEvent, normalizeExternalPlayerUrl } from '../src/utils/streamUtils';
import { normalizeChannelSource, parseChannelPlaylist } from '../src/utils/channelSources';
import type { LiveEvent } from '../src/types/football';

const url = 'https://streamxhd.st/live1.php?stream=dsports';
for (const domain of ['streamxhd.st', 'streamxhd.com', 'streamxhd.click']) {
  assert.equal(normalizeExternalPlayerUrl(` https://${domain}/live1.php?stream=espnar `), `https://${domain}/live1.php?stream=espnar`);
}
for (const value of [null, '', 'javascript:alert(1)', 'http://streamxhd.st/live1.php?stream=dsports',
  'https://streamxhd.st.evil.test/live1.php?stream=dsports', 'https://streamxhd.st@evil.test/live1.php?stream=dsports',
  'https://user:password@streamxhd.st/live1.php?stream=dsports', 'https://streamxhd.st:8000/live1.php?stream=dsports',
  'https://streamxhd.st/', 'https://streamxhd.st/live1.php?stream=dsports&redirect=https://evil.test',
  'https://streamxhd.st/live1.php?stream=dsports&stream=espnar']) {
  assert.equal(normalizeExternalPlayerUrl(value), null);
}
const event = { primaryProvider: 'external', externalSource: { url }, iptvSource: { streamUrl: 'https://example.test/live.m3u8' }, fallbackOrder: ['iptv'] } as LiveEvent;
assert.equal(getStreamUrlForEvent(event), url);
assert.equal(getStreamUrlForEvent({ ...event, externalSource: null }), 'https://example.test/live.m3u8');
assert.equal(getStreamUrlForEvent({ ...event, primaryProvider: 'iptv' }), 'https://example.test/live.m3u8');
const html = renderToStaticMarkup(<ExternalPlayer url={url} />);
assert.match(html, /src="https:\/\/streamxhd.st\/live1.php\?stream=dsports"/);
assert.match(html, /sandbox="allow-scripts allow-same-origin allow-presentation"/);
assert.doesNotMatch(html, /allow-popups|allow-top-navigation|<video|api\/proxy/);
assert.match(html, /Recargar reproductor/);
assert.doesNotMatch(renderToStaticMarkup(<ExternalPlayer url="javascript:alert(1)" />), /<iframe/);
console.log('Reproductor externo: validación, selección, respaldo HLS y aislamiento del iframe comprobados.');

assert.equal(normalizeChannelSource(`<iframe src="${url}" allow="autoplay" onload="alert(1)"></iframe>`, 'iframe'), url, 'Solo se conserva la URL, nunca el HTML ni los manejadores');
assert.equal(normalizeChannelSource(url, 'hls'), null, 'Una página no se etiqueta como HLS');
for (const value of ['javascript:alert(1)', 'https://example.test/player.html', 'https://example.test/dash.mpd']) assert.equal(normalizeChannelSource(value), null);
assert.equal(normalizeChannelSource('http://example.test:8000/live.m3u'), 'http://example.test:8000/live.m3u');
const playlist = `#EXTM3U
#EXTINF:-1 tvg-country="BO" group-title="Deportes" tvg-logo="https://example.test/logo.png",Canal HLS
https://example.test/live.m3u8
#EXTINF:-1,DSports
${url}
#EXTINF:-1,Duplicado
${url}
#EXTINF:-1,Inválido
javascript:alert(1)`;
const imported = parseChannelPlaylist(playlist);
assert.equal(imported.length, 2);
assert.equal(imported[0].name, 'Canal HLS');
assert.equal(imported[0].group, 'Deportes');
assert.equal(imported[0].country, 'BO');
assert.equal(imported[0].logo, 'https://example.test/logo.png');
assert.equal(imported[1].sourceType, 'iframe');
assert.throws(() => parseChannelPlaylist('#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6,\nhttps://example.test/segment.ts'), /señal HLS/);
assert.throws(() => parseChannelPlaylist('not a playlist'), /válida/);
assert.throws(() => parseChannelPlaylist('x'.repeat(1024 * 1024 + 1)), /1 MB/);
console.log('Catálogo: HLS/M3U, iframe sin HTML ejecutable, importación de listas, deduplicación y rechazo de segmentos comprobados.');
