import type { HlsConfig } from 'hls.js';

export const HLS_PLAYBACK_CONFIG: Partial<HlsConfig> = {
  enableWorker: true,
  lowLatencyMode: true,
  startLevel: 0,
  testBandwidth: false,
  capLevelToPlayerSize: true,
  backBufferLength: 15,
  maxBufferLength: 15,
  maxMaxBufferLength: 30,
  liveSyncDurationCount: 3,
  liveMaxLatencyDurationCount: 6,
  progressive: true,
  // El hook controla los intentos de manifiesto y el cambio al proxy.
  manifestLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 5000,
      maxLoadTimeMs: 10000,
      timeoutRetry: { maxNumRetry: 0, retryDelayMs: 0, maxRetryDelayMs: 0 },
      errorRetry: { maxNumRetry: 0, retryDelayMs: 0, maxRetryDelayMs: 0 },
    },
  },
  playlistLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 6000,
      maxLoadTimeMs: 10000,
      timeoutRetry: { maxNumRetry: 1, retryDelayMs: 300, maxRetryDelayMs: 1000 },
      errorRetry: { maxNumRetry: 1, retryDelayMs: 300, maxRetryDelayMs: 1000 },
    },
  },
  fragLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 10000,
      maxLoadTimeMs: 30000,
      timeoutRetry: { maxNumRetry: 2, retryDelayMs: 300, maxRetryDelayMs: 1000 },
      errorRetry: { maxNumRetry: 2, retryDelayMs: 300, maxRetryDelayMs: 1000 },
    },
  },
};
