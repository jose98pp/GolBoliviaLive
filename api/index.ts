import type { Request, Response } from 'express';
import app from '../serverApp';

export default function handler(req: Request, res: Response) {
  // If Vercel rewrote path, recover it from headers or query
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path']) as string | undefined;
  if (matchedPath && typeof matchedPath === 'string') {
    req.url = matchedPath;
  } else if ((req as any).query?.path) {
    req.url = `/api/${(req as any).query.path}`;
  }
  return app(req, res);
}

