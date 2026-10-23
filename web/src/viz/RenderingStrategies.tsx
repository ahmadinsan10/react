import { useEffect, useState } from 'react'
import { Note, Segmented } from './common'
import { useLang } from '../i18n/lang'

const SEG_ID: Record<string, string> = {
  'empty HTML': 'HTML kosong', 'download JS': 'unduh JS', 'run JS': 'jalankan JS', 'fetch data': 'fetch data', render: 'render',
  'render HTML': 'render HTML', 'full HTML': 'HTML lengkap', hydrate: 'hydrate', 'cached HTML (CDN)': 'HTML ter-cache (CDN)',
  shell: 'shell', 'slow data': 'data lambat', 'shell HTML': 'HTML shell', 'hydrate shell': 'hydrate shell', 'stream chunk': 'stream chunk',
  'hydrate rest': 'hydrate sisanya', 'static shell (CDN)': 'shell statis (CDN)', 'dynamic data': 'data dinamis', 'stream holes': 'stream lubang', 'hydrate holes': 'hydrate lubang',
}

const T = {
  en: {
    strategy: 'Strategy', rows: { server: 'server', network: 'network', browser: 'browser' }, interactive: 'Interactive', illustrative: 'illustrative',
    sees: 'What the user sees', blank: '⬜ blank screen', works: 'Buy (works)', notYet: 'Buy (not yet)', status: { blank: 'blank', visible: 'visible', interactive: 'interactive' },
  },
  id: {
    strategy: 'Strategi', rows: { server: 'server', network: 'jaringan', browser: 'browser' }, interactive: 'Interaktif', illustrative: 'ilustrasi',
    sees: 'Yang dilihat pengguna', blank: '⬜ layar kosong', works: 'Beli (berfungsi)', notYet: 'Beli (belum bisa)', status: { blank: 'kosong', visible: 'terlihat', interactive: 'interaktif' },
  },
} as const

type Seg = { label: string; from: number; to: number; color: string; row: 'server' | 'network' | 'browser' }
type Strategy = { id: string; name: string; segs: Seg[]; fcp: number; tti: number; note: string; noteId: string }

const C = { server: 'var(--violet)', net: 'var(--text-3)', js: 'var(--warn)', render: 'var(--accent)', data: 'var(--bad)', hydrate: 'var(--ok)' }

const STRATEGIES: Strategy[] = [
  {
    id: 'csr', name: 'CSR', fcp: 2100, tti: 2100,
    segs: [
      { label: 'empty HTML', from: 0, to: 150, color: C.net, row: 'network' },
      { label: 'download JS', from: 150, to: 900, color: C.js, row: 'network' },
      { label: 'run JS', from: 900, to: 1200, color: C.js, row: 'browser' },
      { label: 'fetch data', from: 1200, to: 1900, color: C.data, row: 'network' },
      { label: 'render', from: 1900, to: 2100, color: C.render, row: 'browser' },
    ],
    note: '**Client-Side Rendering**: the browser gets an empty shell, downloads JS, then fetches data. Nothing useful appears until everything is done. Fine for dashboards behind login; poor for SEO and slow devices.',
    noteId: '**Client-Side Rendering**: browser menerima kerangka kosong, mengunduh JS, lalu baru fetch data. Tidak ada yang berguna tampil sampai semuanya selesai. Cocok untuk dashboard di balik login; buruk untuk SEO dan perangkat yang lambat.',
  },
  {
    id: 'ssr', name: 'SSR', fcp: 1000, tti: 1900,
    segs: [
      { label: 'fetch data', from: 0, to: 600, color: C.data, row: 'server' },
      { label: 'render HTML', from: 600, to: 800, color: C.server, row: 'server' },
      { label: 'full HTML', from: 800, to: 1000, color: C.net, row: 'network' },
      { label: 'download JS', from: 1000, to: 1600, color: C.js, row: 'network' },
      { label: 'hydrate', from: 1600, to: 1900, color: C.hydrate, row: 'browser' },
    ],
    note: '**Server-Side Rendering**: HTML is generated per request, so content shows sooner, but the server waits for ALL data before sending anything, and the page is not interactive until hydration finishes.',
    noteId: '**Server-Side Rendering**: HTML dibuat untuk setiap request, jadi konten tampil lebih cepat. Tapi server menunggu SEMUA data sebelum mengirim apa pun, dan halaman belum bisa diinteraksikan sampai hydration selesai.',
  },
  {
    id: 'ssg', name: 'SSG', fcp: 250, tti: 1050,
    segs: [
      { label: 'cached HTML (CDN)', from: 0, to: 250, color: C.net, row: 'network' },
      { label: 'download JS', from: 250, to: 750, color: C.js, row: 'network' },
      { label: 'hydrate', from: 750, to: 1050, color: C.hydrate, row: 'browser' },
    ],
    note: '**Static Site Generation**: HTML is built once at build time and served from a CDN. Fastest possible first paint, but content is only as fresh as the last build (or revalidation).',
    noteId: '**Static Site Generation**: HTML dibuat sekali saat build lalu disajikan dari CDN. First paint-nya paling cepat, tapi kesegaran konten hanya sebatas build (atau revalidation) terakhir.',
  },
  {
    id: 'stream', name: 'Streaming', fcp: 350, tti: 1500,
    segs: [
      { label: 'shell', from: 0, to: 200, color: C.server, row: 'server' },
      { label: 'slow data', from: 200, to: 1100, color: C.data, row: 'server' },
      { label: 'shell HTML', from: 200, to: 350, color: C.net, row: 'network' },
      { label: 'download JS', from: 350, to: 900, color: C.js, row: 'network' },
      { label: 'hydrate shell', from: 900, to: 1100, color: C.hydrate, row: 'browser' },
      { label: 'stream chunk', from: 1100, to: 1250, color: C.net, row: 'network' },
      { label: 'hydrate rest', from: 1250, to: 1500, color: C.hydrate, row: 'browser' },
    ],
    note: '**Streaming SSR with Suspense**: the server sends the shell immediately and streams each Suspense boundary as its data resolves. Selective hydration makes parts interactive independently.',
    noteId: '**Streaming SSR dengan Suspense**: server langsung mengirim shell, lalu men-stream setiap Suspense boundary begitu datanya siap. Selective hydration membuat tiap bagian bisa interaktif secara terpisah.',
  },
  {
    id: 'ppr', name: 'PPR', fcp: 250, tti: 1300,
    segs: [
      { label: 'static shell (CDN)', from: 0, to: 250, color: C.net, row: 'network' },
      { label: 'dynamic data', from: 0, to: 900, color: C.data, row: 'server' },
      { label: 'download JS', from: 250, to: 750, color: C.js, row: 'network' },
      { label: 'hydrate shell', from: 750, to: 950, color: C.hydrate, row: 'browser' },
      { label: 'stream holes', from: 900, to: 1050, color: C.net, row: 'network' },
      { label: 'hydrate holes', from: 1050, to: 1300, color: C.hydrate, row: 'browser' },
    ],
    note: "**Partial Prerendering** (Next.js Cache Components): the static shell is prerendered and served instantly like SSG, while dynamic 'holes' wrapped in Suspense stream in like SSR. Best of both.",
    noteId: "**Partial Prerendering** (Next.js Cache Components): shell statis di-prerender dan langsung disajikan seperti SSG, sementara 'lubang' dinamis yang dibungkus Suspense di-stream masuk seperti SSR. Dapat keunggulan keduanya.",
  },
]

const MAX = 2300
const ROWS = ['server', 'network', 'browser'] as const

export default function RenderingStrategies() {
  const lang = useLang()
  const tr = T[lang]
  const segLabel = (l: string) => (lang === 'id' ? SEG_ID[l] ?? l : l)
  const [id, setId] = useState('csr')
  const [t, setT] = useState(0)
  const st = STRATEGIES.find(s => s.id === id)!

  useEffect(() => {
    setT(0)
    const start = performance.now()
    let raf = requestAnimationFrame(function tick(now) {
      const elapsed = (now - start) * 0.9
      setT(Math.min(elapsed, MAX))
      if (elapsed < MAX) raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [id])

  const pct = (ms: number) => `${(ms / MAX) * 100}%`
  const status = t < st.fcp ? 'blank' : t < st.tti ? 'visible' : 'interactive'

  return (
    <div>
      <Segmented label={tr.strategy} value={id} onChange={setId} options={STRATEGIES.map(s => ({ value: s.id, label: s.name }))} />
      <div className="grid cols-2" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', marginTop: 14 }}>
        <div className="viz-stage">
          {ROWS.map(r => (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 64, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>{tr.rows[r]}</span>
              <div style={{ position: 'relative', flex: 1, height: 26 }}>
                {st.segs
                  .filter(s => s.row === r)
                  .map(s => {
                    const shown = Math.max(0, Math.min(t, s.to) - s.from)
                    return (
                      <div
                        key={s.label}
                        title={`${segLabel(s.label)}: ${s.from}–${s.to}ms`}
                        style={{ position: 'absolute', left: pct(s.from), width: pct(shown), height: '100%', background: s.color, borderRadius: 5, overflow: 'hidden', fontSize: '0.65rem', color: '#fff', fontWeight: 700, padding: '0 4px', lineHeight: '26px', whiteSpace: 'nowrap' }}
                      >
                        {segLabel(s.label)}
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
          <div style={{ position: 'relative', height: 30, marginLeft: 72 }}>
            {[['FCP', st.fcp, 'var(--accent)'], [tr.interactive, st.tti, 'var(--ok)']].map(([l, ms, c]) => (
              <div
                key={l as string}
                style={{
                  position: 'absolute', left: pct(ms as number), top: 0, height: 30, fontSize: '0.7rem', fontWeight: 700, color: c as string, whiteSpace: 'nowrap',
                  // Late markers put their label on the left so it never overflows the timeline.
                  ...((ms as number) / MAX > 0.55
                    ? { transform: 'translateX(-100%)', borderRight: `2px dashed ${c}`, paddingRight: 4 }
                    : { borderLeft: `2px dashed ${c}`, paddingLeft: 4 }),
                }}
              >
                {l} {ms}ms
              </div>
            ))}
          </div>
          <div className="subtle" style={{ textAlign: 'right' }}>t = {Math.round(t)} ms ({tr.illustrative})</div>
        </div>
        <div className="viz-stage" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="subtle" style={{ marginBottom: 6 }}>{tr.sees}</div>
          <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-elev)', padding: 10, minHeight: 150, position: 'relative' }}>
            {status === 'blank' ? (
              <div className="subtle" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>{tr.blank}</div>
            ) : (
              <>
                <div style={{ height: 10, width: '60%', background: 'var(--text-3)', borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 8, width: '90%', background: 'var(--border)', borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 8, width: '80%', background: 'var(--border)', borderRadius: 4, marginBottom: 12 }} />
                <button className={`btn sm${status === 'interactive' ? ' primary' : ''}`} style={{ pointerEvents: 'none' }}>
                  {status === 'interactive' ? tr.works : tr.notYet}
                </button>
              </>
            )}
            <span className={`pill ${status === 'interactive' ? 'ok' : status === 'visible' ? 'warn' : ''}`} style={{ position: 'absolute', bottom: 8, right: 8 }}>
              {tr.status[status]}
            </span>
          </div>
        </div>
      </div>
      <Note>{lang === 'id' ? st.noteId : st.note}</Note>
    </div>
  )
}
