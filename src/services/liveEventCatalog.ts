export function createLiveEventCatalog<T>(options: {
  read: () => Promise<T[]>; get: () => T[]; set: (events: T[]) => void;
  timeoutMs?: number; ttlMs?: number;
}) {
  let confirmed = false;
  let updatedAt = 0;
  let pending: Promise<void> | null = null;
  let failed = false;
  let retryAt = 0;
  const start = () => {
    if (pending || Date.now() < retryAt || (confirmed && Date.now() - updatedAt < (options.ttlMs ?? 5000))) return;
    const before = JSON.stringify(options.get());
    pending = Promise.resolve().then(options.read).then(events => {
      if (!Array.isArray(events)) throw new Error('Invalid live event snapshot');
      // An initial read must not overwrite an administrator's confirmed write.
      if (JSON.stringify(options.get()) === before) options.set(events);
      confirmed = true; failed = false; updatedAt = Date.now();
    }).catch(() => { failed = true; retryAt = Date.now() + 2000; }).finally(() => { pending = null; });
  };
  return {
    async load() {
      start();
      if (pending) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([pending, new Promise<void>(resolve => { timer = setTimeout(resolve, options.timeoutMs ?? 5000); })]);
        if (timer) clearTimeout(timer);
      }
      const stale = failed || pending !== null || !confirmed;
      return { events: options.get(), catalogConfirmed: confirmed && !stale, stale, updatedAt };
    },
  };
}
