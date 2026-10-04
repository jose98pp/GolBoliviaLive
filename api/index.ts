import type { Request, Response } from 'express';
import app from '../serverApp';

export default function handler(req: Request, res: Response) {
  // If Vercel rewrote path, recover it from headers or query
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path']) as string | undefined;
  if (matchedPath && typeof matchedPath === 'string') {
    req.url = matchedPath;
  } else {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const pathParam = parsed.searchParams.get('path');
      if (pathParam) {
        req.url = pathParam.startsWith('/') ? `/api${pathParam}` : `/api/${pathParam}`;
      }
    } catch {}
  }
  return app(req, res);
}

