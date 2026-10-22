import { describe, expect, it } from 'vitest'
import { handle, memoryRedis } from '../../api/_handler'
import { emptyProgress, recordAnswer, toggleFlag, type Progress } from '../store/logic'
import { generateSyncKey, isValidKey, normalizeKey } from './client'
import { merge3, sameProgress } from './merge'

const T = new Date(2026, 9, 22, 10).getTime()
const base = (() => {
  let p = emptyProgress(T)
  p = toggleFlag(p, 'topics', '0:arrays', T)
  p = toggleFlag(p, 'topics', '0:closures', T)
  return p
})()

describe('merge3', () => {
  it('keeps independent additions from both devices', () => {
    const laptop = toggleFlag(base, 'topics', '1:jsx', T + 1)
    const phone = toggleFlag(base, 'tasks', 'tic-tac-toe-0', T + 2)
    const m = merge3(base, laptop, phone)
    expect(Object.keys(m.topics).sort()).toEqual(['0:arrays', '0:closures', '1:jsx'])
    expect(m.tasks).toEqual({ 'tic-tac-toe-0': true })
  })

  it('propagates an un-check made on one device', () => {
    const laptop = toggleFlag(base, 'topics', '0:arrays', T + 1) // unchecked
    const m = merge3(base, laptop, base)
    expect(m.topics['0:arrays']).toBeUndefined()
    // and the same from the other side
    expect(merge3(base, base, laptop).topics['0:arrays']).toBeUndefined()
  })

  it('adds activity counts from both sides instead of overwriting', () => {
    const day = Object.keys(base.activity)[0]!
    const laptop = toggleFlag(base, 'topics', 'x', T)
    const phone = toggleFlag(toggleFlag(base, 'topics', 'y', T), 'topics', 'z', T)
    expect(merge3(base, laptop, phone).activity[day]).toBe(base.activity[day]! + 1 + 2)
  })

  it('resolves the same quiz card answered on both devices by most recent answer', () => {
    const laptop = recordAnswer(base, 'L0-Q1', true, T + 10)
    const phone = recordAnswer(base, 'L0-Q1', false, T + 20)
    expect(merge3(base, laptop, phone).cards['L0-Q1']).toMatchObject({ wrong: 1, last: T + 20 })
  })

  it('treats a first sync (no base) as a union', () => {
    const a = toggleFlag(emptyProgress(T), 'topics', 'a', T)
    const b = toggleFlag(emptyProgress(T - 1000), 'topics', 'b', T)
    const m = merge3(null, a, b)
    expect(Object.keys(m.topics).sort()).toEqual(['a', 'b'])
    expect(m.startedAt).toBe(T - 1000)
  })

  it('merging identical states is a no-op', () => {
    expect(sameProgress(merge3(base, base, base), base)).toBe(true)
  })
})

describe('sync key', () => {
  it('generates valid, unique keys and normalizes user input', () => {
    const k = generateSyncKey()
    expect(isValidKey(k)).toBe(true)
    expect(generateSyncKey()).not.toBe(k)
    expect(normalizeKey(k.toLowerCase().replace(/-/g, ' '))).toBe(k)
  })
})

describe('sync API handler', () => {
  const key = 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX'
  const req = (method: string, body?: unknown, k = key) =>
    new Request('http://x/api/progress', { method, headers: { 'x-sync-key': k }, body: body === undefined ? undefined : JSON.stringify(body) })
  const data: Progress = toggleFlag(emptyProgress(T), 'topics', 'a', T)

  it('rejects bad keys and reports missing storage config', async () => {
    expect((await handle(req('GET', undefined, 'nope'), memoryRedis())).status).toBe(400)
    expect((await handle(req('GET'), null)).status).toBe(503)
  })

  it('404s before first write, then round-trips data with revisions', async () => {
    const redis = memoryRedis()
    expect((await handle(req('GET'), redis)).status).toBe(404)
    const put = await handle(req('PUT', { baseRev: 0, data }), redis)
    expect(put.status).toBe(200)
    expect(await put.json()).toEqual({ rev: 1 })
    const got = (await (await handle(req('GET'), redis)).json()) as { rev: number; data: Progress }
    expect(got.rev).toBe(1)
    expect(got.data.topics).toEqual({ a: true })
  })

  it('returns 409 with current data when the base revision is stale', async () => {
    const redis = memoryRedis()
    await handle(req('PUT', { baseRev: 0, data }), redis)
    const stale = await handle(req('PUT', { baseRev: 0, data: emptyProgress(T) }), redis)
    expect(stale.status).toBe(409)
    expect(((await stale.json()) as { rev: number }).rev).toBe(1)
  })

  it('validates payloads', async () => {
    const redis = memoryRedis()
    expect((await handle(req('PUT', { baseRev: -1, data }), redis)).status).toBe(400)
    expect((await handle(req('PUT', { baseRev: 0, data: { version: 9 } }), redis)).status).toBe(400)
    expect((await handle(req('DELETE'), redis)).status).toBe(405)
  })

  it('stores progress under a hash, never under the raw key', async () => {
    const seen: string[] = []
    const inner = memoryRedis()
    const spy: typeof inner = async cmd => {
      seen.push(...cmd.map(String))
      return inner(cmd)
    }
    await handle(req('PUT', { baseRev: 0, data }), spy)
    expect(seen.some(s => s.includes(key))).toBe(false)
    expect(seen.some(s => /^rm:progress:[0-9a-f]{64}$/.test(s))).toBe(true)
  })
})
