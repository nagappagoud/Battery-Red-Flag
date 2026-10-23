/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// LAYER 3: BACKEND ENTRY POINT — EXPRESS SERVER & VITE INTEGRATION
// ============================================================================

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { backendRouter } from './src/backend/router';

/**
 * Universal, bulletproof directory resolver compatible with:
 * 1. Native ESM (tsx / node ESM)
 * 2. Bundled CommonJS / CJS (dist/server.cjs)
 * 3. Windows, Linux, and macOS path formats
 */
function resolveCurrentDir(): string {
  if (typeof __dirname !== 'undefined' && __dirname) {
    return __dirname;
  }
  try {
    if (
      typeof import.meta !== 'undefined' &&
      import.meta &&
      typeof import.meta.url === 'string' &&
      import.meta.url.length > 0
    ) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Fall through to process.cwd()
  }
  return process.cwd();
}

const currentDir = resolveCurrentDir();

/**
 * Resolves the built static frontend asset directory ('dist')
 * Handles execution from workspace root, from within dist/, or custom deployment paths
 */
function resolveDistPath(): string {
  const candidateRoot = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(candidateRoot) && fs.existsSync(path.join(candidateRoot, 'index.html'))) {
    return candidateRoot;
  }

  // If server is executing directly from inside the dist/ folder (e.g. node dist/server.cjs)
  if (fs.existsSync(path.join(currentDir, 'index.html'))) {
    return currentDir;
  }

  const candidateCurrent = path.resolve(currentDir, 'dist');
  if (fs.existsSync(candidateCurrent) && fs.existsSync(path.join(candidateCurrent, 'index.html'))) {
    return candidateCurrent;
  }

  return candidateRoot;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.DEFAULT_APP_PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';


  // Request parsing middlewares
  app.use(express.json({ limit: '50mb' }));
  app.use(express.text({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Layer 3: REST API routes
  app.use('/api', backendRouter);

  // Layer 1: Frontend serving
  if (!isProd) {
    try {
      // In development: mount Vite dev middleware
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log(`[Layer 3 Backend] Vite development middleware attached.`);
    } catch (e) {
      // Fallback if vite is not available in production runtime
      console.warn(`[Layer 3 Backend] Vite dev server not available, falling back to static dist.`);
      const distPath = resolveDistPath();
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  } else {
    // In production: serve pre-built static assets from dist/
    const distPath = resolveDistPath();
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log(`[Layer 3 Backend] Serving production static bundle from ${distPath}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[3-Layer EV BMS Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`  - Layer 1 (Frontend): React 19 UI & Interactive Oscilloscope`);
    console.log(`  - Layer 2 (Middle Layer): Data Quality, Parsing & Numerical Engine`);
    console.log(`  - Layer 3 (Backend): Express REST API & ZIP Package Service`);
  });
}

startServer().catch((err) => {
  console.error('[Layer 3 Backend] Fatal error during startup:', err);
  process.exit(1);
});
