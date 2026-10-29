export function normalizeChannelLogoUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2000) return '';
  const source = value.trim();
  if (/^\/(?!\/)[^\s\\]*$/.test(source)) return source;
  try {
    const url = new URL(source);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
