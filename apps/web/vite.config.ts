import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, type Plugin, type ViteDevServer } from 'vite';

/** Stamps public/sw.js with a hash of the build's files, so each deploy replaces the worker. */
const swVersion = (): Plugin => ({
  name: 'sw-version',
  apply: 'build',
  writeBundle(options, bundle) {
    const file = join(options.dir!, 'sw.js');
    const build = createHash('sha256')
      .update(Object.keys(bundle).sort().join())
      .digest('hex')
      .slice(0, 12);
    writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD__', build));
  },
});

/** Fetches the app chunk (and what it imports) with the HTML, in parallel with React DOM (see main.tsx). */
const preloadRoot = (): Plugin => ({
  name: 'preload-root',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      const bundle = ctx.bundle ?? {};
      const root = Object.values(bundle).find(
        (c) => c.type === 'chunk' && c.facadeModuleId?.endsWith('/src/root.tsx'),
      );
      if (!root) return;
      const files = new Set<string>();
      const walk = (f: string) => {
        const c = bundle[f];
        if (files.has(f) || c?.type !== 'chunk') return;
        files.add(f);
        c.imports.forEach(walk);
      };
      walk(root.fileName);
      return [...files]
        .filter((f) => !html.includes(`/${f}"`))
        .map((f) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: `/${f}` },
          injectTo: 'head' as const,
        }));
    },
  },
});

/**
 * The Modo Clube pack as a static, versioned file (ADR-020): `/packs/<id>.<checksum>.json`,
 * cached for good by the browser and by Cloudflare Pages (public/_headers), so a new career never
 * reaches the API for it. The pack is generated from the domain code: in dev on request, in the
 * build once, through a throwaway Vite server that can load the TypeScript workspace packages.
 */
const worldPacks = (): Plugin => {
  let dev: ViteDevServer | null = null;
  async function packFile(server?: ViteDevServer) {
    const own =
      server ??
      (await createServer({
        configFile: false,
        logLevel: 'silent',
        server: { middlewareMode: true },
        appType: 'custom',
      }));
    try {
      const domain = (await own.ssrLoadModule('@decabeca/club-domain')) as {
        generateDevPack: () => { id: string; checksum: string };
      };
      const pack = domain.generateDevPack();
      return { name: `packs/${pack.id}.${pack.checksum}.json`, json: JSON.stringify(pack) };
    } finally {
      if (!server) await own.close();
    }
  }
  let cached: Promise<{ name: string; json: string }> | null = null;
  return {
    name: 'world-packs',
    configureServer(server) {
      dev = server;
      // Start building it with the server: the first career should not wait for it.
      server.httpServer?.once('listening', () => {
        cached ??= packFile(server);
      });
      server.middlewares.use('/packs/', (req, res, next) => {
        cached ??= packFile(dev!);
        void cached.then((f) => {
          if (`/packs${req.url}` !== `/${f.name}`) return next();
          res.setHeader('content-type', 'application/json');
          res.end(f.json);
        }, next);
      });
    },
    async generateBundle() {
      const f = await packFile();
      this.emitFile({ type: 'asset', fileName: f.name, source: f.json });
    },
  };
};

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(
      (process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'dev').slice(0, 7),
    ),
  },
  plugins: [react(), tailwindcss(), swVersion(), preloadRoot(), worldPacks()],
  server: {
    port: 5173,
    strictPort: true,
    // Same origin in dev so the session cookie works (ADR-004).
    // The API also serves the search pages (same paths as the Pages middleware in production).
    proxy: Object.fromEntries(
      ['/v1', '/jogador/', '/jogadores', '/sitemap.xml', '/llms.txt', '/creditos'].map((p) => [
        p,
        process.env.API_URL ?? 'http://127.0.0.1:3000',
      ]),
    ),
  },
  test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'node' },
});
