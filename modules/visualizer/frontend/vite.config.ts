import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import type { Plugin } from 'vite'

/** Recursively collects .svg paths relative to `baseDir`. */
function collectSvgFiles(baseDir: string, dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (fs.statSync(full).isFile() && entry.endsWith('.svg')) {
      files.push(path.relative(baseDir, full).replace(/\\/g, '/'))
    } else if (fs.statSync(full).isDirectory()) {
      files.push(...collectSvgFiles(baseDir, full))
    }
  }
  return files
}

/** Builds { provider → { category → relativeFilePaths[] } } manifest from the icons folder. */
function buildIconManifest(iconsDir: string): Record<string, Record<string, string[]>> {
  const result: Record<string, Record<string, string[]>> = {}
  if (!fs.existsSync(iconsDir)) return result
  for (const provider of fs.readdirSync(iconsDir)) {
    const providerPath = path.join(iconsDir, provider)
    if (!fs.statSync(providerPath).isDirectory()) continue
    result[provider] = {}
    for (const category of fs.readdirSync(providerPath)) {
      const categoryPath = path.join(providerPath, category)
      if (!fs.statSync(categoryPath).isDirectory()) continue
      const files = collectSvgFiles(categoryPath, categoryPath)
      if (files.length > 0) result[provider][category] = files
    }
  }
  return result
}

/** Serves the sibling /icons/ folder at the /icons/ URL prefix during dev and preview.
 *  Also exposes /icons/index.json — a manifest of all available icons. */
function serveIconsPlugin(): Plugin {
  const iconsDir = path.resolve(__dirname, '../icons')
  function handleRequest(req: { url?: string }, res: import('http').ServerResponse, next: () => void) {
    const url = decodeURIComponent(req.url ?? '/')
    if (url === '/index.json') {
      const manifest = buildIconManifest(iconsDir)
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify(manifest))
      return
    }
    const filePath = path.join(iconsDir, url)
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.setHeader('Content-Type', 'image/svg+xml')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      fs.createReadStream(filePath).pipe(res)
    } else {
      next()
    }
  }
  return {
    name: 'serve-icons',
    configureServer(server) {
      server.middlewares.use('/icons', handleRequest)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/icons', handleRequest)
    },
  }
}

export default defineConfig({
  plugins: [react(), serveIconsPlugin()],
  server: {
    port: 5173,
  },
  // Monaco editor workers must be excluded from Vite's dep optimisation
  // so their URLs resolve to the correct paths at runtime
  optimizeDeps: {
    exclude: ['monaco-editor'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
  },
})
