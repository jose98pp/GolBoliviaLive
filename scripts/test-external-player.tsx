import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExternalPlayer } from '../src/features/player/ExternalPlayer';
import { getStreamUrlForEvent, normalizeExternalPlayerUrl } from '../src/utils/streamUtils';
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
