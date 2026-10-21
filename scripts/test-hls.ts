import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = await mkdtemp(path.join(tmpdir(), 'golbolivia-hls-'));
const bundle = path.join(output, 'test.js');
let browser: ReturnType<typeof spawn> | undefined;
let deadline: ReturnType<typeof setTimeout> | undefined;
let server: ReturnType<typeof createServer> | undefined;
try {
  const chromiumBinary = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
  if (!existsSync(chromiumBinary)) {
    console.log(`[test-hls] Chromium no instalado (${chromiumBinary}). Omitiendo validación de navegador headless.`);
    process.exit(0);
  }
  await build({
    entryPoints: [path.join(root, 'scripts/fixtures/hls-browser.tsx')],
    outfile: bundle,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
    alias: { 'hls.js': path.join(root, 'scripts/fixtures/hls-double.ts') },
  });
  const html = path.join(output, 'test.html');
  await writeFile(html, '<!doctype html><html><body><script>' + (await readFile(bundle, 'utf8')).replace(/<\/script/gi, '<\\/script') + '</script></body></html>');
  const document = await readFile(html, 'utf8');
  server = createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(document); });
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  browser = spawn(process.env.CHROMIUM_PATH || '/usr/bin/chromium', [
    '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking',
    '--no-first-run', '--no-default-browser-check', '--disable-breakpad', '--disable-extensions',
    '--no-startup-window', '--remote-debugging-pipe', `--user-data-dir=${path.join(output, 'profile')}`,
  ], {
    env: { ...process.env, XDG_CACHE_HOME: path.join(output, 'cache'), XDG_CONFIG_HOME: path.join(output, 'config') },
    stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'],
  });
  // CDP por pipes locales: no se abre un puerto ni se necesita otra dependencia de pruebas.
  let nextId = 0;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  let input = '';
  let stderr = '';
  let loaded: (() => void) | undefined;
  browser.stderr?.on('data', (chunk) => { stderr = (stderr + chunk).slice(-3000); });
  (browser.stdio[4] as NodeJS.ReadableStream).on('data', (chunk) => {
    input += chunk.toString();
    let end: number;
    while ((end = input.indexOf('\0')) >= 0) {
      const message = JSON.parse(input.slice(0, end));
      input = input.slice(end + 1);
      if (message.method === 'Page.loadEventFired') loaded?.();
      const request = pending.get(message.id);
      if (!request) continue;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    }
  });
  const rejectPending = (error: Error) => {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };
  browser.on('error', rejectPending);
  browser.on('exit', () => rejectPending(new Error(`Chromium terminó antes de completar las pruebas: ${stderr}`)));
  const send = (method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<any> => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    (browser!.stdio[3] as NodeJS.WritableStream).write(JSON.stringify({ id, method, params, sessionId }) + '\0');
  });
  const run = async () => {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    const pageLoaded = new Promise<void>((resolve) => { loaded = resolve; });
    const navigation = await send('Page.navigate', { url: `http://127.0.0.1:${port}/` }, sessionId);
    if (navigation.errorText) throw new Error(navigation.errorText);
    await pageLoaded;
    const result = await send('Runtime.evaluate', {
      expression: `new Promise(resolve => { function check() { const status = document.body?.dataset.testStatus; if (status) resolve({ status, text: document.body.textContent }); else setTimeout(check, 20); } check(); })`,
      awaitPromise: true,
      returnByValue: true,
    }, sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    if (result.result.value.status !== 'passed') throw new Error(result.result.value.text);
    console.log(result.result.value.text);
    // El cierre puede terminar el proceso antes de confirmar el comando CDP.
    void send('Browser.close').catch(() => {});
  };
  await Promise.race([
    run(),
    new Promise<never>((_, reject) => { deadline = setTimeout(() => reject(new Error(`HLS tests timed out: ${stderr}`)), 30000); }),
  ]);
} finally {
  clearTimeout(deadline);
  if (browser && browser.exitCode === null) {
    const exited = new Promise<void>((resolve) => browser!.once('exit', () => resolve()));
    browser.kill();
    await exited;
  }
  server?.closeAllConnections();
  await new Promise<void>((resolve) => server ? server.close(() => resolve()) : resolve());
  await rm(output, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
