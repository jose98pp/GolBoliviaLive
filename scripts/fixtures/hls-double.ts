export default class HlsDouble {
  static supported = true;
  static instances: HlsDouble[] = [];
  static Events = { MANIFEST_PARSED: 'manifest', LEVEL_SWITCHED: 'level', ERROR: 'error' };
  static ErrorDetails = { MANIFEST_LOAD_ERROR: 'manifestLoadError', MANIFEST_LOAD_TIMEOUT: 'manifestLoadTimeout', MANIFEST_PARSING_ERROR: 'manifestParsingError' };
  static ErrorTypes = { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError' };
  static isSupported() { return this.supported; }
  handlers = new Map<string, (...args: any[]) => void>();
  sources: string[] = [];
  starts = 0;
  mediaRecoveries = 0;
  destroyed = false;
  currentLevel = -1;
  constructor(public config: any) { HlsDouble.instances.push(this); }
  on(event: string, handler: (...args: any[]) => void) { this.handlers.set(event, handler); }
  off(event: string, handler?: (...args: any[]) => void) { if (!handler || this.handlers.get(event) === handler) this.handlers.delete(event); }
  emit(event: string, data: unknown) { this.handlers.get(event)?.(event, data); }
  attachMedia(_video: unknown) {}
  loadSource(src: string) { this.sources.push(src); }
  startLoad() { this.starts++; }
  recoverMediaError() { this.mediaRecoveries++; }
  destroy() { this.destroyed = true; }
}
