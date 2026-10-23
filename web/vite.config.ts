import { defineConfig, type Plugin } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { handle, memoryRedis } from './api/_handler'

/** Serves /api/progress during `npm run dev` with an in-memory store, mirroring the Vercel function. */
function devSyncApi(): Plugin {
  const redis = memoryRedis()
  return {
    name: 'dev-sync-api',
    configureServer(server) {
      server.middlewares.use('/api/progress', (req, res) => {
        let raw = ''
        req.on('data', (c: { toString(): string }) => (raw += c.toString()))
        req.on('end', async () => {
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const body = raw || undefined
          const response = await handle(new Request('http://localhost/api/progress', { method: req.method, headers, body }), redis)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(await response.text())
        })
      })
    },
  }
}

export default defineConfig({
  // React Compiler via the plugin-react 6 preset (the inline `react({ babel })` option was removed in v6).
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), devSyncApi()],
  test: { environment: 'jsdom' },
})
