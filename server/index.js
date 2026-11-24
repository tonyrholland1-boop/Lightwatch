import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { api } from './api.js';
import { maintainDemoData } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Deliberately no X-Frame-Options: the app is designed to be embedded
  // in a sandboxed preview frame.
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), camera=(), microphone=(), payment=()',
  );
  next();
});

app.use('/api', express.json({ limit: '16kb' }), api);

// Body-parser and other API-layer failures must answer in JSON, never fall
// through to the SPA handler (which would return HTML to a fetch caller).
app.use('/api', (error, _req, res, _next) => {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid_request', message: 'The request could not be read.' });
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'payload_too_large', message: 'That request was too large to process.' });
  }
  if (error?.status && error.status < 500) {
    return res.status(error.status).json({ error: 'invalid_request', message: 'The request could not be processed.' });
  }
  console.error('[api:unhandled]', error);
  res.status(500).json({
    error: 'server_error',
    message: 'Something went wrong on our side. Please try again in a moment.',
  });
});

const distDir = path.join(root, 'dist');
const isProduction = config.nodeEnv === 'production' && fs.existsSync(path.join(distDir, 'index.html'));

if (isProduction) {
  app.use(
    express.static(distDir, {
      index: false,
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
      },
    }),
  );
  app.get('*splat', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root,
    appType: 'custom',
    server: {
      middlewareMode: true,
      allowedHosts: true,
      hmr: false,
      host: '0.0.0.0',
    },
  });
  app.use(vite.middlewares);
  app.get('*splat', async (req, res, next) => {
    try {
      const template = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error);
      next(error);
    }
  });
}

app.listen(config.port, '0.0.0.0', () => {
  console.log(
    `[LightWatch] ${isProduction ? 'production' : 'development'} server listening on http://0.0.0.0:${config.port}`,
  );
  if (config.seedDemoData) {
    console.log(`[LightWatch] demo data re-ages every ${config.demoRefreshMinutes} min of drift`);
  }
});

// Keep the seeded demo dataset representative during long-running sessions.
// Real reports are never touched.
if (config.seedDemoData && Number.isFinite(config.demoRefreshMinutes) && config.demoRefreshMinutes > 0) {
  setInterval(
    () => {
      const result = maintainDemoData();
      if (result.refreshed) console.log('[LightWatch] demo data re-aged');
    },
    Math.min(config.demoRefreshMinutes, 5) * 60 * 1000,
  ).unref();
}
