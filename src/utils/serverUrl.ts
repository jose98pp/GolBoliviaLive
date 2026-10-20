export function normalizeVercelUrl(
  rawUrl: string,
  headers: Record<string, string | string[] | undefined> = {}
): string {
  const xMatched = (headers['x-matched-path'] || headers['x-vercel-matched-path']) as string | undefined;
  const targetUrl = (xMatched && typeof xMatched === 'string') ? xMatched : rawUrl;

  try {
    const parsed = new URL(targetUrl, 'http://localhost');
    const pathParam = parsed.searchParams.get('path');
    if (pathParam) {
      parsed.searchParams.delete('path');
      const basePath = pathParam.startsWith('/') ? `/api${pathParam}` : `/api/${pathParam}`;
      const remainingSearch = parsed.searchParams.toString();
      return remainingSearch ? `${basePath}?${remainingSearch}` : basePath;
    }
    const remainingSearch = parsed.searchParams.toString();
    return remainingSearch ? `${parsed.pathname}?${remainingSearch}` : parsed.pathname;
  } catch {}

  return targetUrl;
}
