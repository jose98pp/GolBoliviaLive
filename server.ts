import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { app, SYSTEM_USERS } from './serverApp';
import type { UserRole } from './serverApp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// ==========================================
// VITE DEV MIDDLEWARE OR PRODUCTION STATIC
// ==========================================
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      const url = req.originalUrl;
      if (
        url.startsWith('/api') ||
        url.startsWith('/@') ||
        url.startsWith('/node_modules') ||
        url.startsWith('/src') ||
        /\.[a-zA-Z0-9]+(\?.*)?$/.test(url)
      ) {
        return next();
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);

        // Prepend WebSocket stub to head to execute before /@vite/client
        const wsHmrStub = `<script>if(typeof window!=='undefined'&&window.WebSocket){var _OWS=window.WebSocket;window.WebSocket=function(u,p){if(p==='vite-hmr'||(Array.isArray(p)&&p.indexOf('vite-hmr')!==-1)||(typeof u==='string'&&(u.indexOf('vite')!==-1||u.indexOf('3000')!==-1))){var s=new EventTarget();s.readyState=3;s.close=function(){};s.send=function(){};return s;}return new _OWS(u,p);};window.WebSocket.prototype=_OWS.prototype;window.WebSocket.CONNECTING=_OWS.CONNECTING;window.WebSocket.OPEN=_OWS.OPEN;window.WebSocket.CLOSING=_OWS.CLOSING;window.WebSocket.CLOSED=_OWS.CLOSED;}var _isV=function(m){if(!m)return false;var s=typeof m==='string'?m:(m.message||(m.stack?m.stack:'')||String(m)||'');return s.indexOf('[vite]')!==-1||s.indexOf('WebSocket')!==-1||s.indexOf('websocket')!==-1;};['error','warn','info','log','debug'].forEach(function(m){var o=console[m];console[m]=function(){for(var i=0;i<arguments.length;i++){if(_isV(arguments[i]))return;}return o.apply(console,arguments);};});window.addEventListener('error',function(e){if(e&&(_isV(e.message)||_isV(e.error))){e.stopImmediatePropagation();e.preventDefault();}},true);window.addEventListener('unhandledrejection',function(e){if(e&&_isV(e.reason)){e.stopImmediatePropagation();e.preventDefault();}},true);</script>`;
        template = template.replace('<head>', '<head>' + wsHmrStub);

        res.status(200).set({
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        }).end(template);
      } catch (e: any) {
        if (vite) {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(
        express.static(distPath, {
          setHeaders: (res, filePath) => {
            if (
              filePath.endsWith('.html') ||
              filePath.endsWith('sw.js') ||
              filePath.includes('manifest.json')
            ) {
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
              res.setHeader('Pragma', 'no-cache');
              res.setHeader('Expires', '0');
            }
          },
        })
      );
      app.get('*', (_req: Request, res: Response) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  if (!process.env.VERCEL) {
    server.listen(PORT, () => {
      console.log(`[GolBolivia Backend] Servidor ejecutándose en http://0.0.0.0:${PORT}`);
      console.log(`[GolBolivia Backend] Endpoints API listos: /api/live, /api/auth/login, /api/scoreboard, /api/streams, /api/events`);
    });
  }
}

startServer();

export { app, SYSTEM_USERS };
export type { UserRole };
export default app;
