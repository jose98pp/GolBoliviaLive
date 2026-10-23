import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useHls } from '../../src/features/player/hooks/useHls';
import HlsDouble from './hls-double';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const nativeSetTimeout = window.setTimeout.bind(window);
const nativeClearTimeout = window.clearTimeout.bind(window);
const startupTimers = new Map<number, () => void>();
let timerId = -1;
window.setTimeout = ((callback: () => void, delay?: number, ...args: unknown[]) => {
  if (delay === 30000) { const id = timerId--; startupTimers.set(id, () => { startupTimers.delete(id); callback(); }); return id; }
  return nativeSetTimeout(callback, delay, ...args);
}) as typeof window.setTimeout;
window.clearTimeout = ((id: number) => {
  startupTimers.delete(id);
  nativeClearTimeout(id);
}) as typeof window.clearTimeout;

class VideoDouble extends EventTarget {
  src = '';
  muted = false;
  plays = 0;
  pause() {}
  load() {}
  play() { this.plays++; return Promise.resolve(); }
  removeAttribute() { this.src = ''; }
  canPlayType() { return 'maybe'; }
}
let checks = 0;
function check(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
  checks++;
}

async function run() {
  let options = { src: 'https://stream.example/primary.m3u8', backupSrc: undefined as string | undefined, autoplay: true, autoFailover: true };
  const video = new VideoDouble();
  const videoRef = { current: video as unknown as HTMLVideoElement };
  const errors: string[] = [];
  const switches: string[] = [];
  let successes = 0;
  let hook!: ReturnType<typeof useHls>;
  function Harness() {
    hook = useHls({ ...options, videoRef, onError: (error) => errors.push(error), onSuccess: () => successes++, onFailoverTriggered: (source) => switches.push(source) });
    return null;
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  let root = createRoot(host);
  const render = () => act(async () => root.render(<Harness />));
  const current = () => HlsDouble.instances.at(-1)!;
  const emit = (type: string, details = 'fragLoadError') => act(async () => current().emit('error', { type, details, fatal: true, response: { code: 503 } }));
  const exhaustNetwork = async () => { for (let i = 0; i < 4; i++) await emit('networkError'); };

  await render();
  const first = current();
  check(first.config.startLevel === 0 && !first.config.testBandwidth, 'Startup plays the lowest rendition without downloading a bandwidth-test fragment');
  check(first.config.manifestLoadPolicy.default.errorRetry.maxNumRetry === 0, 'Manifest retries are owned by the hook rather than duplicated internally');
  await act(async () => first.emit('manifest', { levels: [{ height: 720, bitrate: 1000000 }] }));
  check(!hook.isLoaded && successes === 0, 'A manifest alone must not report playback success');
  await act(async () => video.dispatchEvent(new Event('playing')));
  check(hook.isLoaded && successes === 1, 'Playing confirms actual playback');
  check(startupTimers.size === 0, 'Playback cancels the startup deadline');
  options = { ...options, autoplay: false };
  await render();
  options = { ...options, autoplay: true };
  await render();
  check(current() === first, 'Pause/resume must not recreate HLS or reset retry budgets');
  await act(async () => video.dispatchEvent(new Event('waiting')));
  await act(async () => video.dispatchEvent(new Event('stalled')));
  check(startupTimers.size === 1, 'Repeated stalls share a bounded recovery deadline');
  await exhaustNetwork();
  check(first.sources.length === 2 && first.sources[1].startsWith('/api/proxy'), 'Proxy is tried once per source');
  check(first.starts === 3 && first.destroyed, 'Two network recoveries after the proxy end in destruction');
  check(errors.length === 1, 'Exhausted source emits one terminal error');
  check(errors[0].includes('HTTP 503'), 'Terminal network failure preserves the HTTP status for diagnosis');
  await emit('networkError');
  check(first.starts === 3 && errors.length === 1, 'Late fatal events cannot restart a failed instance');

  await act(async () => hook.retry());
  check(current() !== first && !hook.isLoaded && hook.levels.length === 0, 'Manual retry creates a fresh instance and clears old state');
  const second = current();
  await emit('mediaError', 'bufferAppendError');
  await emit('mediaError', 'bufferAppendError');
  check(second.mediaRecoveries === 1 && second.destroyed, 'Media recovery is bounded');

  options = { ...options, src: 'https://stream.example/next.m3u8', backupSrc: 'https://stream.example/backup.m3u8' };
  await render();
  await exhaustNetwork();
  check(hook.isUsingBackup && switches.at(-1) === 'backup', 'Primary failure switches to a distinct backup');
  const backup = current();
  await exhaustNetwork();
  check(backup.destroyed && errors.length === 3, 'Backup exhaustion terminates instead of cycling back to primary');
  options = { ...options, src: 'https://stream.example/new-channel.m3u8' };
  await render();
  check(!hook.isUsingBackup && current().sources[0] === options.src, 'Changing channels resets backup selection');
  const beforeTimeout = current();
  await act(async () => { for (const callback of [...startupTimers.values()]) callback(); });
  check(beforeTimeout.destroyed && hook.isUsingBackup, 'Startup timeout switches to backup');
  await act(async () => { for (const callback of [...startupTimers.values()]) callback(); });
  check(errors.length === 4, 'Backup startup timeout terminates');
  await act(async () => root.unmount());
  check(startupTimers.size === 0, 'Unmount clears startup timers');

  HlsDouble.supported = false;
  errors.length = 0;
  switches.length = 0;
  options = { src: 'https://stream.example/native.m3u8', backupSrc: undefined, autoplay: true, autoFailover: true };
  root = createRoot(host);
  await render();
  await act(async () => video.dispatchEvent(new Event('error')));
  check(video.src.startsWith('/api/proxy'), 'Native HLS tries the proxy once');
  await act(async () => video.dispatchEvent(new Event('error')));
  await act(async () => video.dispatchEvent(new Event('error')));
  check(errors.length === 1, 'Native HLS exhaustion reports one terminal error');
  await act(async () => root.unmount());
  check(startupTimers.size === 0, 'Native cleanup clears timers');
  HlsDouble.supported = true;
  options = { ...options, src: 'https://stream.example/stall.m3u8', backupSrc: undefined };
  root = createRoot(host);
  await render();
  await act(async () => video.dispatchEvent(new Event('playing')));
  const stalledInstance = current();
  await act(async () => video.dispatchEvent(new Event('waiting')));
  await act(async () => { for (const callback of [...startupTimers.values()]) callback(); });
  check(stalledInstance.destroyed && errors.length === 2, 'A stall after successful playback ends at its deadline');
  await act(async () => root.unmount());
  options = { ...options, autoplay: false };
  root = createRoot(host);
  await render();
  await act(async () => video.dispatchEvent(new Event('waiting')));
  check(startupTimers.size === 0, 'Paused playback must not schedule an error deadline');
  await act(async () => root.unmount());
  options = { ...options, autoplay: true };
  root = createRoot(host);
  await render();
  const missing = current();
  const previousErrors = errors.length;
  await act(async () => missing.emit('error', { type: 'networkError', details: 'fragLoadError', fatal: true, response: { code: 404 } }));
  check(missing.destroyed && missing.sources.length === 1, 'HTTP 404 terminates without retrying a missing source');
  check(errors.length === previousErrors + 1 && errors.at(-1)!.includes('HTTP 404'), 'HTTP 404 is preserved in the terminal diagnosis');
  await act(async () => root.unmount());
  host.remove();
  return checks;
}

run().then((count) => {
  document.body.dataset.testStatus = 'passed';
  document.body.textContent = `HLS: ${count} checks passed`;
}).catch((error) => {
  document.body.dataset.testStatus = 'failed';
  document.body.textContent = String(error.stack || error);
});
