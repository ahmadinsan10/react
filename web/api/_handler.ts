/**
 * Progress sync API. Pure Web-standard Request → Response logic with an injectable Redis
 * client, so the same code runs on Vercel, in the Vite dev server and in unit tests.
 *
 *   GET  /api/progress            header x-sync-key  → 200 { rev, data } | 404
 *   PUT  /api/progress            header x-sync-key, body { baseRev, data }
 *                                 → 200 { rev } | 409 { rev, data } (someone else wrote first)
 */

export type Redis = (command: (string | number)[]) => Promise<unknown>

export const KEY_PATTERN = /^[A-Z2-7]{4}(-[A-Z2-7]{4}){5}$/
const MAX_BYTES = 256 * 1024

// Atomic compare-and-set: only write if the stored revision is the one the client last saw.
const CAS_SCRIPT = `
local cur = redis.call('GET', KEYS[1])
local rev = 0
if cur then rev = cjson.decode(cur).rev end
if rev ~= tonumber(ARGV[1]) then
  if cur then return cur end
  return ''
end
redis.call('SET', KEYS[1], ARGV[2])
return 'OK'
`

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

async function storageKey(syncKey: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(syncKey))
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
  return `rm:progress:${hex}`
}

export async function handle(req: Request, redis: Redis | null): Promise<Response> {
  if (!redis) return json(503, { error: 'Sync storage is not configured on the server.' })
  const syncKey = req.headers.get('x-sync-key')?.trim().toUpperCase() ?? ''
  if (!KEY_PATTERN.test(syncKey)) return json(400, { error: 'Invalid sync key.' })
  const key = await storageKey(syncKey)

  try {
    if (req.method === 'GET') {
      const raw = await redis(['GET', key])
      if (typeof raw !== 'string' || raw === '') return json(404, { error: 'No progress stored for this key yet.' })
      return json(200, JSON.parse(raw))
    }

    if (req.method === 'PUT') {
      const text = await req.text()
      if (text.length > MAX_BYTES) return json(413, { error: 'Progress payload too large.' })
      let body: unknown
      try {
        body = JSON.parse(text)
      } catch {
        return json(400, { error: 'Body must be JSON.' })
      }
      const { baseRev, data } = (body ?? {}) as { baseRev?: unknown; data?: unknown }
      if (typeof baseRev !== 'number' || !Number.isInteger(baseRev) || baseRev < 0) return json(400, { error: 'baseRev must be a non-negative integer.' })
      if (typeof data !== 'object' || data === null || (data as { version?: unknown }).version !== 1) return json(400, { error: 'data must be a version 1 progress object.' })

      const rev = baseRev + 1
      const record = JSON.stringify({ rev, updatedAt: Date.now(), data })
      const result = await redis(['EVAL', CAS_SCRIPT, 1, key, baseRev, record])
      if (result === 'OK') return json(200, { rev })
      // Conflict: return what is stored so the client can merge and retry.
      const current = typeof result === 'string' && result !== '' ? JSON.parse(result) : { rev: 0, data: null }
      return json(409, current)
    }

    return json(405, { error: 'Method not allowed.' })
  } catch (e) {
    console.error('sync error', e)
    return json(502, { error: 'Storage error, please retry.' })
  }
}

/** Redis client for Upstash's REST API (what the Vercel Marketplace integration provisions). */
export function upstash(url: string | undefined, token: string | undefined): Redis | null {
  if (!url || !token) return null
  return async command => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(command),
    })
    const out = (await res.json()) as { result?: unknown; error?: string }
    if (!res.ok || out.error) throw new Error(out.error ?? `Upstash HTTP ${res.status}`)
    return out.result
  }
}

/** In-memory Redis stand-in that understands GET, SET and our CAS script. For dev and tests. */
export function memoryRedis(): Redis {
  const db = new Map<string, string>()
  return async ([cmd, ...args]) => {
    if (cmd === 'GET') return db.get(String(args[0])) ?? null
    if (cmd === 'SET') {
      db.set(String(args[0]), String(args[1]))
      return 'OK'
    }
    if (cmd === 'EVAL') {
      const [, , key, expected, value] = args
      const cur = db.get(String(key))
      const rev = cur ? (JSON.parse(cur) as { rev: number }).rev : 0
      if (rev !== Number(expected)) return cur ?? ''
      db.set(String(key), String(value))
      return 'OK'
    }
    throw new Error(`memoryRedis: unsupported ${String(cmd)}`)
  }
}
