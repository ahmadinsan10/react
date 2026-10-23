import { useState } from 'react'
import { Note } from './common'
import { useLang } from '../i18n/lang'

type Node = { q: string; yes: string; no: string } | { answer: string; tool: string; why: string; example: string }

const TREE: Record<string, Node> = {
  start: { q: 'Can the value be calculated from props or other state?', yes: 'derived', no: 'server' },
  derived: { answer: 'Not state at all', tool: 'Compute during render', why: 'Storing derived data creates two sources of truth that drift apart.', example: 'const total = items.reduce(...) — right in the component body.' },
  server: { q: 'Does the data come from (and belong to) a server?', yes: 'serverState', no: 'url' },
  serverState: { answer: 'Server state', tool: 'TanStack Query / RTK Query / Server Components', why: 'It is a cache of remote data: it needs fetching, caching, deduping, refetching and invalidation.', example: "useQuery({ queryKey: ['products', filters], queryFn })" },
  url: { q: 'Should it survive a refresh, be shareable, or work with the back button?', yes: 'urlState', no: 'many' },
  urlState: { answer: 'URL state', tool: 'Search params / route params', why: 'The URL is the one piece of state the browser persists, shares and navigates for free.', example: '/products?category=shoes&sort=price&page=2' },
  many: { q: 'Is it used by only one component (and its children)?', yes: 'local', no: 'siblings' },
  local: { answer: 'Local state', tool: 'useState / useReducer', why: 'The closest possible home. Nothing else re-renders and it is easy to delete.', example: 'const [isOpen, setIsOpen] = useState(false)' },
  siblings: { q: 'Is it shared by a few nearby components?', yes: 'lift', no: 'often' },
  lift: { answer: 'Lifted state', tool: 'Lift to the closest common parent', why: 'Pass values and setters down a level or two. Simple and explicit.', example: 'Parent owns selectedId; List and Details receive it as props.' },
  often: { q: 'Does it change frequently (e.g. on every keystroke or many times a second)?', yes: 'store', no: 'context' },
  store: { answer: 'External store', tool: 'Zustand / Redux Toolkit / Jotai', why: 'Selectors let each component subscribe to just the slice it uses, avoiding app-wide re-renders.', example: 'const count = useCart(s => s.items.length)' },
  context: { answer: 'Context', tool: 'createContext + Provider', why: 'Great for rarely-changing, widely-read values. Every consumer re-renders on change.', example: 'Theme, locale, current user, feature flags.' },
}

// Indonesian overrides for the prose fields; code examples stay identical.
const TREE_ID: Record<string, Partial<Record<'q' | 'answer' | 'tool' | 'why' | 'example', string>>> = {
  start: { q: 'Apakah nilainya bisa dihitung dari props atau state lain?' },
  derived: { answer: 'Sama sekali bukan state', tool: 'Hitung saat render', why: 'Menyimpan data turunan menciptakan dua sumber kebenaran yang lama-lama tidak sinkron.', example: 'const total = items.reduce(...) — langsung di body component.' },
  server: { q: 'Apakah datanya berasal dari (dan milik) server?' },
  serverState: { answer: 'Server state', why: 'Ini adalah cache dari data remote: butuh fetching, caching, dedupe, refetch, dan invalidation.' },
  url: { q: 'Apakah nilainya harus bertahan setelah refresh, bisa dibagikan, atau bekerja dengan tombol back?' },
  urlState: { answer: 'URL state', tool: 'Search params / route params', why: 'URL adalah satu-satunya state yang disimpan, dibagikan, dan dinavigasi browser secara gratis.' },
  many: { q: 'Apakah hanya dipakai oleh satu component (dan child-nya)?' },
  local: { answer: 'State lokal', why: 'Tempat paling dekat yang bisa ada. Tidak ada yang ikut re-render, dan gampang dihapus.' },
  siblings: { q: 'Apakah dipakai bersama oleh beberapa component yang berdekatan?' },
  lift: { answer: 'State yang diangkat (lifted)', tool: 'Angkat ke parent bersama terdekat', why: 'Turunkan nilai dan setter-nya satu atau dua level. Sederhana dan eksplisit.', example: 'Parent memegang selectedId; List dan Details menerimanya lewat props.' },
  often: { q: 'Apakah nilainya sering berubah (misalnya di setiap ketikan atau berkali-kali per detik)?' },
  store: { answer: 'External store', why: 'Selector membuat setiap component hanya subscribe ke potongan data yang dipakainya, jadi tidak memicu re-render di seluruh aplikasi.' },
  context: { answer: 'Context', why: 'Cocok untuk nilai yang jarang berubah tapi dibaca di banyak tempat. Setiap consumer re-render saat nilainya berubah.', example: 'Tema, locale, pengguna yang sedang login, feature flag.' },
}

const T = {
  en: {
    question: 'Question', yes: 'Yes', no: 'No', rec: 'Recommendation', use: 'Use:', another: 'Classify another piece of state',
    note: "Order matters: the questions go from the **closest** home to the **widest**. Most state-management pain comes from state living higher than it needs to. Try classifying real examples: a modal's open flag, the cart, search filters, the logged-in user, form input text.",
  },
  id: {
    question: 'Pertanyaan', yes: 'Ya', no: 'Tidak', rec: 'Rekomendasi', use: 'Pakai:', another: 'Klasifikasikan state lainnya',
    note: 'Urutannya penting: pertanyaannya bergerak dari tempat yang **paling dekat** ke yang **paling luas**. Kebanyakan masalah state management muncul karena state disimpan lebih tinggi dari yang seharusnya. Coba klasifikasikan contoh nyata: flag terbuka-tidaknya modal, keranjang belanja, filter pencarian, pengguna yang sedang login, teks input form.',
  },
} as const

export default function StatePlacement() {
  const [path, setPath] = useState<string[]>(['start'])
  const lang = useLang()
  const t = T[lang]
  const node = (k: string) => (lang === 'id' ? ({ ...TREE[k]!, ...TREE_ID[k] } as Node) : TREE[k]!)
  const cur = node(path[path.length - 1]!)

  return (
    <div>
      <div className="viz-stage">
        <div className="row" style={{ marginBottom: 14 }}>
          {path.map((p, i) => {
            const n = node(p)
            return (
              <span key={i} className="row" style={{ gap: 4 }}>
                {i > 0 && <span className="subtle">→</span>}
                <button className="btn sm ghost" onClick={() => setPath(path.slice(0, i + 1))} disabled={i === path.length - 1}>
                  {'q' in n ? `Q${i + 1}` : n.answer}
                </button>
              </span>
            )
          })}
        </div>
        {'q' in cur ? (
          <div className="card flat" style={{ textAlign: 'center' }}>
            <div className="eyebrow">{t.question} {path.length}</div>
            <h2>{cur.q}</h2>
            <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
              <button className="btn primary" onClick={() => setPath([...path, cur.yes])}>{t.yes}</button>
              <button className="btn" onClick={() => setPath([...path, cur.no])}>{t.no}</button>
            </div>
          </div>
        ) : (
          <div className="card flat" style={{ borderColor: 'var(--ok)' }}>
            <div className="eyebrow" style={{ color: 'var(--ok)' }}>{t.rec}</div>
            <h2>{cur.answer}</h2>
            <p>
              <strong>{t.use}</strong> {cur.tool}
            </p>
            <p className="muted">{cur.why}</p>
            <pre>
              <code>{cur.example}</code>
            </pre>
            <button className="btn" onClick={() => setPath(['start'])}>{t.another}</button>
          </div>
        )}
      </div>
      <Note>{t.note}</Note>
    </div>
  )
}
