import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CURATED_FALLBACK_CHANNELS } from '../src/data/iptvFallbackChannels';

const exec = promisify(execFile);
const directory = await mkdtemp(path.join(tmpdir(), 'golbolivia-streams-'));
const reportPath = process.env.STREAM_SMOKE_REPORT || path.join(tmpdir(), 'golbolivia-stream-smoke.json');
let sequence = 0;
class StreamCheckError extends Error {
  constructor(public status: string, message: string, public host?: string) { super(message); }
}

async function download(url: string): Promise<{ file: string; url: string }> {
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.username || target.password) throw new StreamCheckError('invalid_source', 'La fuente debe usar HTTPS sin credenciales');
  const file = path.join(directory, String(++sequence));
  let stdout: string;
  try {
    // curl usa el proxy HTTPS ya configurado y mantiene la verificación TLS.
    ({ stdout } = await exec('curl', ['--silent', '--show-error', '--fail', '--location', '--max-redirs', '3',
      '--max-time', '15', '--proto', '=https', '--proto-redir', '=https', '--max-filesize', '16777216',
      '--output', file, '--write-out', '%{json}', url], { timeout: 20000, maxBuffer: 1024 * 1024 }));
  } catch (error: any) {
    let response: any = {};
    try { response = JSON.parse(error.stdout || '{}'); } catch {}
    if (Number(response.http_connect) === 403) throw new StreamCheckError('blocked_by_proxy', 'El proxy rechazó la conexión antes de llegar al servidor de vídeo', target.hostname);
    if (Number(response.http_code) >= 400) throw new StreamCheckError('origin_http_error', `El origen respondió HTTP ${response.http_code}`, target.hostname);
    throw new StreamCheckError('connection_failed', `No se completó la descarga (curl ${error.code || 'timeout'})`, target.hostname);
  }
  const result = JSON.parse(stdout);
  return { file, url: result.url_effective || url };
}

async function verifyChannel(channel: typeof CURATED_FALLBACK_CHANNELS[number]) {
  let phase = 'manifest';
  const requiredHosts = new Set([new URL(channel.streamUrl).hostname]);
  try {
    let resource = await download(channel.streamUrl);
    let playlist = await readFile(resource.file, 'utf8');
    for (let depth = 0; ; depth++) {
      if (!playlist.trimStart().startsWith('#EXTM3U')) throw new StreamCheckError('invalid_manifest', 'La respuesta no es una lista HLS');
      const lines = playlist.split(/\r?\n/).map((line) => line.trim());
      const next = lines.find((line) => line && !line.startsWith('#'));
      if (!next) throw new StreamCheckError('empty_manifest', 'La lista no contiene variantes ni segmentos');
      const nextUrl = new URL(next, resource.url);
      requiredHosts.add(nextUrl.hostname);
      if (lines.some((line) => line.startsWith('#EXT-X-STREAM-INF:'))) {
        if (depth >= 3) throw new StreamCheckError('invalid_manifest', 'Demasiados niveles de variantes HLS');
        phase = 'variant';
        resource = await download(nextUrl.href);
        playlist = await readFile(resource.file, 'utf8');
        continue;
      }
      if (lines.some((line) => line.startsWith('#EXT-X-KEY:') && !line.includes('METHOD=NONE'))) {
        throw new StreamCheckError('encrypted_media', 'La señal requiere una comprobación de descifrado en el reproductor');
      }
      phase = 'segment';
      const segment = await download(nextUrl.href);
      const initUri = lines.find((line) => line.startsWith('#EXT-X-MAP:'))?.match(/URI="([^"]+)"/)?.[1];
      if (initUri) {
        const initUrl = new URL(initUri, resource.url);
        requiredHosts.add(initUrl.hostname);
        const init = await download(initUrl.href);
        await writeFile(segment.file, Buffer.concat([await readFile(init.file), await readFile(segment.file)]));
      }
      phase = 'decode';
      // Decodificar un fotograma demuestra más que un HTTP 200 o un manifiesto válido.
      await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-xerror', '-i', segment.file,
        '-map', '0:v:0', '-frames:v', '1', '-f', 'null', '-'], { timeout: 20000, maxBuffer: 1024 * 1024 });
      return { id: channel.id, status: 'passed', phase, requiredHosts: [...requiredHosts] };
    }
  } catch (error) {
    const failure = error instanceof StreamCheckError ? error : new StreamCheckError('decode_failed', 'No se pudo decodificar un fotograma del segmento descargado');
    return { id: channel.id, status: failure.status, phase, reason: failure.message, host: failure.host, requiredHosts: [...requiredHosts] };
  }
}

try {
  const catalogUrl = 'https://iptv-org.github.io/iptv/categories/sports.m3u';
  let catalog: { status: string; reason?: string };
  try {
    const resource = await download(catalogUrl);
    const text = await readFile(resource.file, 'utf8');
    if (!text.trimStart().startsWith('#EXTM3U') || !/^https:\/\//m.test(text)) throw new StreamCheckError('invalid_catalog', 'Catálogo vacío o inválido');
    catalog = { status: 'passed' };
  } catch (error) {
    catalog = { status: error instanceof StreamCheckError ? error.status : 'failed', reason: error instanceof Error ? error.message : String(error) };
  }
  const channels = await Promise.all(CURATED_FALLBACK_CHANNELS.map(verifyChannel));
  const report = { checkedAt: new Date().toISOString(), catalog, channels };
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  console.log(`Informe: ${reportPath}`);
  if (catalog.status !== 'passed' || channels.some((channel) => channel.status !== 'passed')) process.exitCode = 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
