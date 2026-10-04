import type { Request, Response } from 'express';
import app from '../serverApp';

export default function handler(req: Request, res: Response) {
  // 1. Prefer original client URL headers from Vercel
  const forwardedUri = (req.headers['x-forwarded-uri'] || req.headers['x-vercel-original-url']) as string | undefined;
  if (forwardedUri && typeof forwardedUri === 'string' && forwardedUri.startsWith('/api/')) {
    req.url = forwardedUri;
  } else {
    // 2. Recover from query param path (?path=...)
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const pathParam = parsed.searchParams.get('path');
      if (pathParam) {
        const cleanPath = pathParam.startsWith('/') ? pathParam : `/${pathParam}`;
        req.url = cleanPath.startsWith('/api/') ? cleanPath : `/api${cleanPath}`;
      } else {
        // 3. Fallback to matched path if valid and not the handler itself
        const matched = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path']) as string | undefined;
        if (matched && typeof matched === 'string' && matched.startsWith('/api/') && !matched.startsWith('/api/index')) {
          req.url = matched;
        }
      }
    } catch {}
  }
  return app(req, res);
}

