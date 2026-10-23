const cached = new Map<string, { expires: number; body: string; status: number }>();
const pending = new Map<string, Promise<{ body: string; status: number }>>();
export async function fetchEspn(url: string): Promise<Response> {
  const hit = cached.get(url);
  if (hit && hit.expires > Date.now()) return new Response(hit.body, { status: hit.status, headers: { 'Content-Type': 'application/json' } });
  let request = pending.get(url);
  if (!request) {
    request = (async () => {
      const response = await fetch(url, { headers: { 'User-Agent': 'GolBoliviaLive/1.0' }, signal: AbortSignal.timeout(8000) });
      const result = { body: await response.text(), status: response.status };
      if (response.ok) {
        if (cached.size >= 200) cached.delete(cached.keys().next().value!);
        cached.set(url, { ...result, expires: Date.now() + 15000 });
      }
      return result;
    })();
    pending.set(url, request);
  }
  try {
    const result = await request;
    return new Response(result.body, { status: result.status, headers: { 'Content-Type': 'application/json' } });
  } finally { if (pending.get(url) === request) pending.delete(url); }
}
