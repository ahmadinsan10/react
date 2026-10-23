import type { TopicDetail } from '../../types'

const details: Record<string, TopicDetail> = {
  strategies: {
    explanation: `Strategi rendering menjawab dua pertanyaan: **di mana** HTML dihasilkan (browser atau server) dan **kapan** (saat build, per request, atau bertahap sambil data datang). Setiap strategi adalah trade-off antara kesegaran data, time-to-first-byte, biaya interaktivitas, dan biaya infrastruktur.

### Empat strategi klasik

- **CSR (client-side rendering)**: server mengirim file HTML yang nyaris kosong plus bundle JS. Browser mengunduh, mem-parse, dan menjalankan bundle, lalu fetch data, baru kemudian menggambar halaman. Murah di-hosting (cukup file statis), cocok untuk dashboard bergaya aplikasi di balik login, tapi lemah untuk SEO dan first paint-nya lambat di perangkat kelas bawah.
- **SSR (server-side rendering)**: server menjalankan React untuk setiap request dan mengembalikan HTML lengkap. Pengguna melihat konten lebih cepat, crawler mendapat markup asli, tapi setiap request memakan CPU server dan halaman belum interaktif sampai hydration selesai.
- **SSG (static site generation)**: HTML di-render sekali saat build lalu disajikan dari CDN. TTFB-nya paling cepat, tapi data hanya sesegar build terakhir. Incremental regeneration (memvalidasi ulang halaman setelah N detik atau saat diminta) mempersempit celah itu.
- **Streaming SSR**: alih-alih menunggu query paling lambat, server langsung mengirim shell lalu men-stream sisanya setiap kali boundary \`<Suspense>\` selesai. Browser menerima potongan HTML plus script inline kecil yang menukar fallback dengan konten aslinya.

### Partial Prerendering (PPR)

PPR menggabungkan SSG dan streaming dalam satu route: semua yang tidak bergantung pada request (layout, navigasi, deskripsi produk) di-prerender menjadi **static shell** yang disajikan dari edge, sementara "lubang" yang bergantung pada request (jumlah item di keranjang, rekomendasi personal) dibungkus Suspense dan di-stream dari server dalam response yang sama. Di Next.js 16, model inilah yang menjadi dasar Cache Components: bagian yang di-cache menjadi bagian dari shell, bagian dinamis yang tidak di-cache menjadi lubang yang di-stream. Cek flag konfigurasi yang tepat di dokumentasi Next.js terbaru, karena penamaannya sudah berubah-ubah antar rilis.

### Cara memilih

Pilih per **route segment**, bukan per aplikasi. Tanyakan: apakah konten ini bergantung pada request (cookie, header, search params)? Seberapa basi data boleh? Butuh SEO atau tidak? Halaman marketing itu statis; halaman produk adalah static shell dengan lubang dinamis untuk harga/stok; tabel admin bisa sepenuhnya dinamis atau bahkan di-render di client.

### Kapan tidak perlu SSR

SSR tidak gratis: ada biaya server, cold start, dan kerja hydration. Tool internal di balik auth dengan interaksi berat sering cukup dengan CSR plus code splitting yang baik. Sebaliknya, jangan bikin landing page dengan CSR lalu heran kenapa Largest Contentful Paint-nya 4 detik di HP kelas menengah.`,
    examples: [
      {
        title: '❌ Seluruh halaman tertahan query paling lambat vs ✅ di-stream dengan Suspense',
        code: `// ❌ The entire page waits for recommendations (slow ML service, ~1.5s)
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)          // 40ms
  const recs = await getRecommendations(id)     // 1500ms
  return (
    <>
      <ProductInfo product={product} />
      <Recommendations items={recs} />
    </>
  )
}

// ✅ Shell + product stream immediately; recommendations fill in later
import { Suspense } from 'react'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  return (
    <>
      <ProductInfo product={product} />
      <Suspense fallback={<RecsSkeleton />}>
        <Recommendations productId={id} />
      </Suspense>
    </>
  )
}

async function Recommendations({ productId }: { productId: string }) {
  const items = await getRecommendations(productId)
  return <RecsGrid items={items} />
}`,
        note: 'Dengan memindahkan await yang lambat ke komponen anak yang dibungkus Suspense, server bisa mengirim semua yang ada di atas boundary lebih dulu. TTFB dan LCP sekarang ditentukan query yang cepat, bukan yang paling lambat.',
      },
      {
        title: 'Menentukan strategi per segment',
        code: `// app/(marketing)/pricing/page.tsx  -> fully static, cached in the shell
// app/products/[id]/page.tsx         -> static shell + dynamic stock/price hole
// app/dashboard/page.tsx             -> dynamic (reads cookies for the session)
// app/editor/page.tsx                -> mostly a client component island

import { cookies } from 'next/headers'

export default async function Dashboard() {
  const session = (await cookies()).get('session')?.value // request data => dynamic
  const stats = await getStatsFor(session)
  return <StatsPanel stats={stats} />
}`,
        note: 'Membaca cookie, header, atau searchParams-lah yang membuat sebuah segment bergantung pada request. Taruh pembacaan itu sedalam mungkin di tree supaya bagian lainnya tetap statis.',
      },
    ],
    realCase: {
      title: 'Satu carousel lambat membuat seluruh halaman produk ikut lambat',
      story: `**Situasi:** sebuah toko online skala menengah me-render halaman produk dengan SSR. Carousel baru "mungkin kamu juga suka" memanggil layanan rekomendasi internal.

**Gejala:** TTFB p75 melonjak dari 180ms ke 1,6 detik dalam semalam; konversi di mobile turun cukup terasa.

**Akar masalah:** komponen halaman meng-await panggilan rekomendasi sebelum mengembalikan JSX apa pun, jadi server tidak bisa mengirim satu byte pun sampai dependency paling lambat menjawab.

**Perbaikan:** carousel dijadikan async component sendiri di dalam \`<Suspense>\` dengan skeleton, dan deskripsi produk yang statis dipindah ke shell yang di-cache. TTFB kembali di bawah 200ms; carousel muncul ~1 detik kemudian tanpa menahan apa pun.

**Pelajaran:** di arsitektur streaming, setiap await di level atas adalah keputusan tentang apa yang menahan byte pertama. Dorong data yang lambat dan tidak kritis ke balik boundary Suspense.`,
    },
    pitfalls: [
      'Memperlakukan seluruh aplikasi dengan satu strategi. Strategi diputuskan per route (bahkan per komponen).',
      'Meng-await data lambat yang tidak esensial di bagian atas halaman, sehingga stream untuk semua bagian lain ikut tertahan.',
      'Memakai SSR untuk tool yang butuh login dan sangat interaktif, padahal CSR lebih sederhana dan murah.',
      'Mengira statis berarti basi selamanya: revalidasi on-demand bisa menjaga konten statis tetap segar setelah mutation.',
      'Menaruh boundary Suspense terlalu tinggi sampai fallback-nya menggantikan seluruh halaman, yang hasilnya sama saja dengan blocking.',
    ],
    exercise: {
      task: 'Ambil halaman artikel berita yang meng-await artikel (cepat), komentar (lambat), dan sidebar "trending" (lambat) secara berurutan. Susun ulang supaya artikel tampil lebih dulu, sementara komentar dan trending di-stream secara independen.',
      hint: 'Setiap bagian yang lambat sebaiknya jadi async component di dalam boundary Suspense masing-masing. Cek juga apakah dua fetch yang lambat itu berjalan paralel.',
      solution: `\`\`\`tsx
import { Suspense } from 'react'

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getArticle(slug)
  return (
    <main>
      <Article article={article} />
      <Suspense fallback={<p>Loading comments…</p>}>
        <Comments articleId={article.id} />
      </Suspense>
      <aside>
        <Suspense fallback={<TrendingSkeleton />}>
          <Trending />
        </Suspense>
      </aside>
    </main>
  )
}

async function Comments({ articleId }: { articleId: string }) {
  const comments = await getComments(articleId)
  return <CommentList comments={comments} />
}

async function Trending() {
  return <TrendingList items={await getTrending()} />
}
\`\`\`

Karena kedua boundary bersaudara (sibling), React memulai kedua fetch dalam render pass yang sama dan masing-masing di-stream begitu selesai; tidak ada yang saling menunggu.`,
    },
    interview: [
      'Bandingkan SSR, SSG, streaming SSR, dan Partial Prerendering dari sisi TTFB, kesegaran data, dan biaya server.',
      'Apa yang membuat sebuah route segment menjadi dinamis di Next.js App Router, dan bagaimana caranya tetap menjaga sebagian besar halaman statis?',
      'Kapan kamu sengaja memilih client-side rendering untuk layar baru di masa sekarang?',
    ],
  },

  rsc: {
    explanation: `React Server Components (RSC) membagi component tree menjadi dua jenis komponen yang berjalan di lingkungan berbeda.

### Server Components

Di App Router, setiap komponen adalah Server Component kecuali modulnya (atau modul leluhurnya di import graph) diawali \`'use client'\`. Server Components:

- hanya berjalan di server (saat build atau per request), tidak pernah di browser;
- boleh \`async\` dan langsung \`await\` data: query database, baca file, panggilan API yang memakai secret;
- mengirim **nol JavaScript** untuk kodenya sendiri; output-nya diserialisasi menjadi **RSC payload**, deskripsi tree hasil render yang bisa di-stream;
- tidak bisa memakai state, effect, ref ke DOM, atau event handler, karena tidak ada instance yang "hidup" di client.

### Client Components

File yang diberi \`'use client'\` mendeklarasikan sebuah **boundary**: modul itu beserta semua yang di-import-nya masuk ke client bundle. Client Components tetap di-render di server untuk HTML awal (SSR), lalu di-hydrate di browser. Pakai untuk interaktivitas: \`useState\`, \`useEffect\`, API browser, event handler.

### Aturan boundary

1. **Props yang menyeberang dari server ke client harus bisa diserialisasi**: string, number, plain object, array, Date, Map/Set, promise, JSX, dan Server Function. Bukan instance class, bukan sembarang fungsi.
2. **Client Component tidak bisa meng-import Server Component**: import itu akan menyeretnya ke client bundle. Sebagai gantinya, Server Component me-render Client Component dan mengoper JSX hasil render server lewat \`children\` atau prop lain. Client menerima output yang sudah jadi, semacam "lubang" yang bisa ditaruh di mana saja.
3. **Dorong \`'use client'\` ke daun (leaf).** Menandai seluruh layout sebagai client akan menyeret semua anaknya ke bundle. Tandai tombolnya saja, dropdown-nya, chart-nya.

### Di balik layar

Saat sebuah route diminta, React me-render server tree menjadi RSC payload. Untuk client component, ia menyisipkan referensi (module id + nama export) beserta props-nya. Di client, React membaca stream, memuat client module yang direferensikan, lalu melakukan reconcile. Pada navigasi di sisi client hanya RSC payload yang di-fetch, sehingga state client di layout bersama tetap bertahan.

### Keamanan dan data

Karena Server Components bisa langsung menyentuh DB, godaannya adalah over-fetch. Semua yang kamu oper sebagai prop ke Client Component akan masuk ke payload yang terlihat di browser. Oper \`user.name\`, bukan seluruh baris \`user\` lengkap dengan hash password dan flag internal. Menandai modul khusus server dengan \`import 'server-only'\` membuat import yang tidak sengaja dari client gagal saat build.

### Kapan tidak memakai RSC

Widget yang sangat interaktif (editor, canvas) memang alaminya client component. RSC paling bersinar untuk UI yang padat konten dan digerakkan data, di mana sebagian besar tree hanya untuk tampilan.`,
    examples: [
      {
        title: "❌ 'use client' di layout vs ✅ client leaf dengan children dari server",
        code: `// ❌ app/dashboard/layout.tsx
'use client'
import { useState } from 'react'
import { Sidebar } from './sidebar'          // now client too
export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return <div>{open && <Sidebar />}<button onClick={() => setOpen(o => !o)}>Toggle</button>{children}</div>
}

// ✅ app/dashboard/layout.tsx  (Server Component)
import { CollapsibleShell } from './collapsible-shell'
import { Sidebar } from './sidebar'           // stays on the server, can query the DB
export default function Layout({ children }: { children: React.ReactNode }) {
  return <CollapsibleShell sidebar={<Sidebar />}>{children}</CollapsibleShell>
}

// app/dashboard/collapsible-shell.tsx
'use client'
import { useState } from 'react'
export function CollapsibleShell({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="shell">
      {open && sidebar}
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}>Toggle sidebar</button>
      {children}
    </div>
  )
}`,
        note: 'Hanya logika toggle yang dikirim ke browser. Sidebar di-render di server dan dioper sebagai prop JSX: shell di client cuma menempatkannya, tidak pernah meng-import-nya.',
      },
      {
        title: '❌ Membocorkan baris DB vs ✅ DTO untuk client',
        code: `// ❌ The whole row, including passwordHash and stripeCustomerId, is serialized
import { db } from '@/lib/db'
import { ProfileCard } from './profile-card' // 'use client'
export default async function Page() {
  const user = await db.user.findFirstOrThrow()
  return <ProfileCard user={user} />
}

// ✅ Shape exactly what the client needs
import 'server-only'
export async function getProfileDTO(userId: string) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } })
  return { name: u.name, avatarUrl: u.avatarUrl, joined: u.createdAt.toISOString() }
}`,
        note: 'Props ke client component terlihat di RSC payload lewat DevTools. Data access layer yang mengembalikan DTO minimal mencegah data terekspos tanpa sengaja.',
      },
    ],
    realCase: {
      title: 'Ukuran bundle jadi tiga kali lipat gara-gara satu baris yang kelihatannya sepele',
      story: `**Situasi:** sebuah tim SaaS menambahkan toggle tema di root layout aplikasi Next.js mereka.

**Gejala:** first-load JS di setiap route naik dari ~95 kB ke ~310 kB; TBT di Lighthouse memburuk di semua halaman.

**Akar masalah:** developer menaruh \`'use client'\` di baris paling atas \`app/layout.tsx\` supaya bisa memakai \`useState\`. Semua komponen yang di-import layout (header, footer, markdown renderer, library tanggal) berubah menjadi kode client.

**Perbaikan:** dibuat client component kecil \`ThemeToggle\` dan \`ThemeProvider\` yang menerima \`children\`. Layout kembali menjadi Server Component.

**Pelajaran:** \`'use client'\` menandai batas di module graph, bukan satu komponen saja. Taruh di leaf terkecil yang butuh interaktivitas dan pantau bundle analyzer di CI.`,
    },
    pitfalls: [
      'Meng-import Server Component dari Client Component; oper sebagai children saja.',
      'Mengoper props yang tidak bisa diserialisasi (instance class, fungsi yang bukan Server Function) melewati boundary.',
      "Menaruh 'use client' terlalu tinggi di tree, sehingga subtree besar berubah menjadi JS client.",
      'Mengoper baris database utuh ke client component dan membocorkan field sensitif di payload.',
      'Mengira Client Components tidak di-render di server: mereka tetap di-render untuk SSR, jadi API khusus browser tetap perlu dijaga.',
    ],
    exercise: {
      task: 'Buat halaman produk di mana detail produk diambil dari DB di Server Component, dan tombol hati "Tambah ke wishlist" bersifat interaktif. Jaga client bundle seminimal mungkin.',
      hint: 'Hanya tombol hati yang butuh state. Oper productId dan state awal yang bisa diserialisasi.',
      solution: `\`\`\`tsx
// app/products/[id]/page.tsx
import { getProduct } from '@/lib/products'
import { WishlistButton } from './wishlist-button'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await getProduct(id)
  return (
    <article>
      <h1>{p.title}</h1>
      <p>{p.description}</p>
      <WishlistButton productId={p.id} initiallySaved={p.savedByViewer} />
    </article>
  )
}

// app/products/[id]/wishlist-button.tsx
'use client'
import { useOptimistic, useTransition } from 'react'
import { toggleWishlist } from './actions'

export function WishlistButton({ productId, initiallySaved }: { productId: string; initiallySaved: boolean }) {
  const [saved, setSaved] = useOptimistic(initiallySaved)
  const [, start] = useTransition()
  return (
    <button aria-pressed={saved} onClick={() => start(async () => { setSaved(!saved); await toggleWishlist(productId) })}>
      {saved ? '♥ Saved' : '♡ Save'}
    </button>
  )
}
\`\`\``,
    },
    interview: [
      'Kenapa Client Component bisa me-render Server Component yang dioper sebagai children, tapi tidak bisa meng-import-nya?',
      'Apa sebenarnya isi RSC payload, dan apa implikasinya untuk keamanan?',
      'Bagaimana state client di sebuah layout tetap bertahan saat navigasi di App Router?',
    ],
  },

  actions: {
    explanation: `**Server Function** adalah fungsi async yang ditandai \`'use server'\` (baik di baris paling atas file, sehingga setiap export-nya menjadi Server Function, atau di dalam badan fungsi). React dan framework mengompilasinya menjadi **referensi**: client hanya mendapat id yang opaque, dan memanggil fungsi itu berarti mengirim HTTP POST ke server dengan argumen yang diserialisasi. Saat dipakai sebagai \`action\` pada form atau lewat \`useActionState\`, ia sering disebut **Server Action**.

### Fakta paling penting

Server Function adalah **endpoint HTTP publik**. Siapa pun yang bisa menemukan id-nya (ada di JS client-mu) bisa memanggilnya dengan argumen apa saja, dari curl, tanpa lewat UI-mu. Menyembunyikan tombol untuk non-admin tidak melindungi apa pun. Tipe TypeScript juga tidak melindungi apa pun saat runtime. Karena itu setiap Server Function wajib:

1. **Autentikasi**: siapa yang memanggil? Baca session di sisi server.
2. **Validasi** input dengan schema runtime (Zod, Valibot). Perlakukan \`FormData\` sebagai string yang tidak bisa dipercaya.
3. **Otorisasi**: apakah pengguna *ini* boleh melakukan aksi terhadap resource *ini*? Cek kepemilikan, bukan sekadar "sudah login".
4. **Lakukan mutation**, lalu **revalidasi** cache yang menampilkan data yang berubah.
5. Kembalikan hasil yang minimal dan bisa diserialisasi (error untuk form, jangan pernah stack trace).

### Integrasi dengan React 19

- \`<form action={serverFn}>\` tetap jalan tanpa JavaScript (progressive enhancement) dan menerima \`FormData\`.
- \`useActionState(fn, initialState)\` memberimu state hasil return dan flag \`pending\`; fungsinya menerima \`(prevState, formData)\`.
- \`useFormStatus\` di dalam komponen anak memberi status pending dari form induknya, pas untuk tombol submit.
- \`useOptimistic\` menampilkan hasil yang diharapkan selama request masih berjalan.

### Closure dan argumen yang di-bind

Server Function inline yang didefinisikan di dalam Server Component bisa melakukan closure atas variabel; framework mengenkripsi nilai closure yang dikirim ke client, tapi kamu tetap tidak boleh mengandalkannya untuk otorisasi. Lebih baik pakai \`fn.bind(null, id)\` untuk mengoper id, lalu cek ulang izin untuk id tersebut di server.

### Kapan tidak memakainya

Server Function dipakai untuk **mutation** yang dipicu UI-mu sendiri. Untuk membaca data, fetch di Server Components. Untuk API publik, webhook, atau konsumen pihak ketiga, pakai Route Handler dengan kontrak yang eksplisit. Secara default di Next.js, Server Function berjalan berurutan per client, jadi kurang cocok untuk fetch data secara paralel.`,
    examples: [
      {
        title: '❌ Percaya begitu saja pada client vs ✅ validasi, autentikasi, otorisasi',
        code: `// ❌ app/projects/actions.ts
'use server'
import { db } from '@/lib/db'
export async function deleteProject(id: string) {
  await db.project.delete({ where: { id } })   // anyone can delete any project
}

// ✅ app/projects/actions.ts
'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const Input = z.object({ id: z.string().uuid() })

export async function deleteProject(raw: unknown) {
  const session = await auth()
  if (!session) return { ok: false as const, error: 'Not signed in' }

  const parsed = Input.safeParse(raw)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' }

  const project = await db.project.findUnique({ where: { id: parsed.data.id }, select: { ownerId: true } })
  if (!project || project.ownerId !== session.user.id) {
    return { ok: false as const, error: 'Not found' } // do not reveal existence
  }

  await db.project.delete({ where: { id: parsed.data.id } })
  revalidatePath('/projects')
  return { ok: true as const }
}`,
        note: 'Parameternya sengaja bertipe unknown: data runtime tidak bisa dipercaya. Kepemilikan dicek terhadap session, bukan terhadap userId yang dikirim client.',
      },
      {
        title: 'Form dengan useActionState dan useFormStatus',
        code: `'use client'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createInvoice, type InvoiceState } from './actions'

function Submit() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? 'Saving…' : 'Create invoice'}</button>
}

export function InvoiceForm() {
  const [state, formAction] = useActionState<InvoiceState, FormData>(createInvoice, { errors: {} })
  return (
    <form action={formAction}>
      <input name="customer" aria-invalid={!!state.errors.customer} />
      {state.errors.customer && <p role="alert">{state.errors.customer}</p>}
      <input name="amount" inputMode="decimal" />
      <Submit />
    </form>
  )
}`,
        note: 'createInvoice menerima (prevState, formData) dan mengembalikan error per field. useFormStatus harus berada di komponen anak dari form supaya bisa membaca status pending-nya.',
      },
    ],
    realCase: {
      title: 'Tombol admin disembunyikan, endpoint admin tetap terbuka',
      story: `**Situasi:** sebuah platform B2B fiktif menambahkan aksi "jadikan admin" di pengaturan tim. Tombolnya hanya di-render jika \`viewer.role === 'owner'\`.

**Gejala:** seorang security researcher melaporkan bahwa member biasa bisa menaikkan hak aksesnya sendiri.

**Akar masalah:** Server Action \`promoteUser(userId)\` hanya mengecek apakah session ada. Id action-nya terlihat di chunk client; mengirim ulang POST dengan id member lain berhasil untuk pengguna mana pun yang sudah login.

**Perbaikan:** action sekarang memuat keanggotaan tim si pemanggil dan mewajibkan role owner di tim target, memvalidasi input dengan Zod, dan mencatat perubahan di tabel audit. Aturan lint dan checklist code review mewajibkan pemanggilan helper auth di baris awal setiap export \`'use server'\`.

**Pelajaran:** UI yang tersembunyi bukan otorisasi. Perlakukan setiap Server Function seperti endpoint REST yang terbuka untuk publik.`,
    },
    pitfalls: [
      'Mengandalkan UI yang disembunyikan atau tipe TypeScript, bukan otorisasi di sisi server.',
      'Menerima userId atau role dari client alih-alih membacanya dari session.',
      'Lupa merevalidasi cache setelah mutation, sehingga UI menampilkan data basi.',
      'Mengembalikan error mentah atau record DB utuh ke client.',
      'Memakai Server Function untuk fetch data; ia dirancang untuk mutation dan diantrekan per client.',
    ],
    exercise: {
      task: 'Tulis Server Action `renameWorkspace(prev, formData)` untuk form yang memakai useActionState. Nama harus 3–50 karakter, pemanggil harus admin di workspace tersebut, dan halaman workspace harus ter-refresh.',
      hint: 'Validasi FormData dengan Zod, cari keanggotaan berdasarkan user id dari session plus workspace id, lalu revalidasi.',
      solution: `\`\`\`ts
'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const Schema = z.object({ workspaceId: z.string().uuid(), name: z.string().trim().min(3).max(50) })
export type RenameState = { error?: string; ok?: boolean }

export async function renameWorkspace(_prev: RenameState, formData: FormData): Promise<RenameState> {
  const session = await auth()
  if (!session) return { error: 'Please sign in' }

  const parsed = Schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const membership = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: parsed.data.workspaceId } },
  })
  if (membership?.role !== 'admin') return { error: 'Not allowed' }

  await db.workspace.update({ where: { id: parsed.data.workspaceId }, data: { name: parsed.data.name } })
  revalidatePath(\`/w/\${parsed.data.workspaceId}\`)
  return { ok: true }
}
\`\`\``,
    },
    interview: [
      'Kenapa Server Function dianggap endpoint publik, dan pengecekan apa saja yang dibutuhkan masing-masing?',
      'Bagaimana useActionState, useFormStatus, dan useOptimistic saling melengkapi dalam sebuah form?',
      'Kapan kamu memakai Route Handler alih-alih Server Action?',
    ],
  },

  'app-router': {
    explanation: `App Router memetakan folder di \`app/\` ke segment URL, dan nama file khusus di setiap folder ke peran tertentu dalam React tree yang bersarang.

### File-file khusus

- \`page.tsx\`: membuat segment bisa diakses sebagai route; UI paling ujung (leaf).
- \`layout.tsx\`: membungkus children dan **tetap bertahan saat navigasi** antar route anaknya (state terjaga, tidak di-render ulang saat navigasi).
- \`template.tsx\`: mirip layout tapi di-mount ulang setiap navigasi (berguna untuk animasi masuk atau effect per halaman).
- \`loading.tsx\`: otomatis membungkus page dengan \`<Suspense fallback={<Loading/>}>\`.
- \`error.tsx\`: error boundary di client untuk segment tersebut; menerima \`error\` dan fungsi \`reset\`. \`global-error.tsx\` menangani root layout.
- \`not-found.tsx\`: di-render saat \`notFound()\` dipanggil.
- \`route.ts\`: Route Handler (fungsi GET/POST) sebagai pengganti page.

Kuncinya ada di nesting: untuk \`/shop/shoes\`, React me-render RootLayout > ShopLayout > (loading boundary) > (error boundary) > ShoesPage. Error di page ditangkap file error terdekat tanpa ikut menjatuhkan layout.

### Mengorganisasi route

- **Route group** \`(marketing)\` mengelompokkan folder dan berbagi layout tanpa memengaruhi URL.
- **Dynamic segment** \`[id]\`, catch-all \`[...slug]\`, opsional \`[[...slug]]\`. Di Next.js versi sekarang, \`params\` dan \`searchParams\` adalah **promise**: \`const { id } = await params\`.
- **Parallel route** \`@modal\`, \`@analytics\`: slot bernama yang di-render berdampingan oleh sebuah layout, masing-masing dengan state loading/error sendiri.
- **Intercepting route** \`(.)photo/[id]\`: menampilkan sebuah route di konteks saat ini (modal di atas feed) pada soft navigation, tapi me-render halaman penuh saat hard load atau refresh.

### Metadata, gambar, dan font

Export \`metadata\` atau \`generateMetadata\` dari page/layout untuk judul, Open Graph, dan canonical URL. \`next/image\` menangani ukuran responsif, lazy loading, dan mencegah layout shift lewat dimensi yang wajib diisi. \`next/font\` meng-host font sendiri saat build, sehingga request eksternal hilang dan CLS berkurang.

### proxy.ts

Next.js 16 mengganti nama \`middleware.ts\` menjadi \`proxy.ts\` (meng-export fungsi \`proxy\`). Ia berjalan sebelum routing untuk path yang cocok: redirect, rewrite, set header, gating auth kasar, pembagian bucket A/B. Jaga tetap ringan; ia berjalan di setiap request yang cocok. **Jangan** jadikan ini satu-satunya pengecekan auth: akses data dan Server Function tetap harus memverifikasi session. Cek dokumentasi terbaru untuk default runtime dan codemod migrasinya.`,
    examples: [
      {
        title: 'Segment dengan layout, loading, error, dan not-found',
        code: `// app/orders/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getOrder } from '@/lib/orders'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: \`Order #\${id}\` }
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrder(id)
  if (!order) notFound()
  return <OrderDetails order={order} />
}

// app/orders/[id]/error.tsx
'use client'
export default function OrderError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert">
      <p>We could not load this order.</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}`,
        note: 'error.tsx wajib berupa Client Component. Error boundary berada di dalam layout, jadi navigasi dan header tetap berfungsi saat page gagal.',
      },
      {
        title: 'proxy.ts untuk redirect auth secara kasar',
        code: `// proxy.ts (project root, replaces middleware.ts in Next.js 16)
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has('session')
  if (!hasSession && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }`,
        note: 'Ini pengecekan optimistis (sekadar ada cookie atau tidak) untuk redirect yang cepat. Verifikasi sebenarnya tetap terjadi di data layer dan di setiap Server Action.',
      },
    ],
    realCase: {
      title: 'Route modal foto rusak saat di-refresh',
      story: `**Situasi:** sebuah side project berbagi foto membuka foto dalam modal dari feed memakai intercepting route \`@modal/(.)photo/[id]\`.

**Gejala:** saat link foto dibagikan lalu dibuka langsung, yang muncul feed kosong tanpa modal, atau 404.

**Akar masalah:** tidak ada \`app/photo/[id]/page.tsx\` biasa. Interception hanya berlaku pada soft navigation; hard load butuh halaman sungguhan. Slot \`@modal\` juga tidak punya \`default.tsx\`, sehingga state yang tidak cocok me-render sesuatu yang tidak bisa ditebak.

**Perbaikan:** ditambahkan route halaman penuh dan \`@modal/default.tsx\` yang mengembalikan \`null\`.

**Pelajaran:** intercepting route adalah lapisan peningkatan di atas route sungguhan. Selalu rancang versi hard navigation lebih dulu.`,
    },
    pitfalls: [
      'Lupa bahwa params dan searchParams adalah promise di Next.js versi sekarang dan harus di-await.',
      'Menjadikan error.tsx sebagai Server Component; ia wajib Client Component.',
      'Berharap layout di-render ulang saat navigasi; pakai template.tsx atau baca params di page.',
      'Memakai proxy.ts sebagai satu-satunya lapisan otorisasi.',
      'Slot parallel route tanpa default.tsx, menyebabkan 404 saat hard navigation.',
    ],
    exercise: {
      task: 'Buat route `app/(shop)/products/[slug]` dengan loading skeleton, error boundary dengan tombol coba lagi, halaman not-found untuk slug yang tidak ada, dan metadata yang di-generate termasuk gambar Open Graph.',
      hint: 'notFound() dari next/navigation; generateMetadata meng-await params persis seperti page.',
      solution: `\`\`\`tsx
// app/(shop)/products/[slug]/loading.tsx
export default function Loading() { return <div className="skeleton h-96" aria-busy="true" /> }

// app/(shop)/products/[slug]/not-found.tsx
export default function NotFound() { return <p>That product does not exist.</p> }

// app/(shop)/products/[slug]/page.tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getProductBySlug } from '@/lib/products'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug)
  if (!p) return { title: 'Not found' }
  return { title: p.title, openGraph: { images: [p.imageUrl] } }
}

export default async function Page({ params }: Props) {
  const p = await getProductBySlug((await params).slug)
  if (!p) notFound()
  return <ProductView product={p} />
}
\`\`\`
Ditambah error.tsx dengan 'use client' dan tombol reset seperti pada contoh di atas.`,
    },
    interview: [
      'Jelaskan component tree yang dibangun Next.js untuk route bersarang yang punya layout, file loading, dan file error.',
      'Bagaimana intercepting route dan parallel route digabungkan untuk membuat modal yang link-nya bisa dibagikan?',
      'Apa yang pantas ditaruh di proxy.ts, dan apa yang tidak boleh bergantung padanya?',
    ],
  },

  'cache-components': {
    explanation: `Versi App Router yang lebih lama punya model caching yang **implisit**: hasil fetch di-cache secara default, route di-render statis kecuali ada sesuatu yang dinamis terdeteksi, dan ada empat lapisan (request memoization, data cache, full route cache, client router cache) yang saling berinteraksi dengan cara yang sering bikin banyak tim kaget. Dengan **Cache Components** di Next.js 16, model ini dibalik dan dibuat eksplisit.

### Dinamis secara default

Saat Cache Components diaktifkan (sebuah flag di \`next.config\`; cek dokumentasi terbaru untuk nama persisnya), tidak ada yang di-cache kecuali kamu memintanya. Fetch data berjalan saat request. Supaya halaman tetap cepat, semua pekerjaan saat request yang tidak di-cache harus berada di dalam boundary \`<Suspense>\`: **static shell** hasil prerender langsung disajikan dan lubang-lubang dinamisnya menyusul lewat stream. Kalau data yang tidak di-cache diakses di luar Suspense, Next.js melaporkan error saat build/dev supaya kamu membuat pilihan secara sadar.

### Opt-in: 'use cache'

Taruh \`'use cache'\` di baris awal fungsi async, komponen, atau satu file utuh. Nilai return-nya di-cache, dengan key berdasarkan identitas fungsi dan **argumen yang bisa diserialisasi** (plus nilai closure). Di dalam scope yang di-cache kamu tidak bisa langsung membaca API request seperti \`cookies()\` atau \`headers()\`; baca di luar lalu oper nilai yang dibutuhkan sebagai argumen (yang kemudian ikut menjadi bagian dari key). Varian seperti \`'use cache: private'\` dan \`'use cache: remote'\` tersedia untuk cache per pengguna atau cache remote bersama; pastikan semantiknya yang terbaru di dokumentasi.

### Masa berlaku: cacheLife

\`cacheLife('hours')\` atau profil kustom \`{ stale, revalidate, expire }\` mengatur kesegaran. *stale* adalah berapa lama client boleh memakainya tanpa mengecek; *revalidate* adalah kapan server memperbaruinya di background; *expire* adalah batas keras, setelah itu request harus menunggu data segar.

### Invalidasi: cacheTag, revalidateTag, updateTag

Beri tag pada entri dengan \`cacheTag('product-42', 'products')\`. Setelah mutation:

- \`updateTag(tag)\` (khusus Server Action) meng-expire entri dan membuat pembacaan berikutnya di request yang sama menunggu data segar: **read-your-own-writes**, ideal saat pengguna harus langsung melihat perubahannya sendiri.
- \`revalidateTag(tag, profile)\` menandai entri sebagai stale dengan semantik stale-while-revalidate: pengunjung berikutnya mungkin masih melihat data lama selama proses refresh. Cocok untuk konten yang boleh eventual consistency, atau dari Route Handler dan webhook.

### Mengenali model lama

Kamu akan ketemu kode yang memakai \`fetch(url, { next: { revalidate: 60 } })\`, \`export const revalidate = 60\`, \`export const dynamic = 'force-static'\`, dan \`unstable_cache\`. Semua itu milik model sebelumnya; pelajari cara membacanya dan migrasikan secara bertahap.`,
    examples: [
      {
        title: 'Data produk yang di-cache dengan tag dan masa berlaku',
        code: `// lib/products.ts
import { cacheLife, cacheTag } from 'next/cache'
import { db } from '@/lib/db'

export async function getProduct(id: string) {
  'use cache'
  cacheLife('hours')
  cacheTag(\`product-\${id}\`, 'products')
  return db.product.findUnique({ where: { id }, select: { id: true, title: true, price: true, description: true } })
}`,
        note: 'Argumen id menjadi bagian dari cache key. Tag-nya memungkinkan sebuah mutation menginvalidasi tepat produk ini saja atau semua produk.',
      },
      {
        title: '❌ Basi setelah disimpan vs ✅ updateTag untuk read-your-own-writes',
        code: `// ❌ Admin saves a new price, the page still shows the old one until the cache expires
'use server'
export async function updatePrice(id: string, price: number) {
  await requireAdmin()
  await db.product.update({ where: { id }, data: { price } })
}

// ✅
'use server'
import { updateTag } from 'next/cache'
import { z } from 'zod'

export async function updatePrice(raw: unknown) {
  await requireAdmin()
  const { id, price } = z.object({ id: z.string(), price: z.number().positive() }).parse(raw)
  await db.product.update({ where: { id }, data: { price } })
  updateTag(\`product-\${id}\`) // the admin's redirect/refresh sees the new price immediately
}`,
        note: 'Tanpa invalidasi, entri cache bertahan sampai cacheLife habis. updateTag ditujukan untuk Server Action di mana pelakunya harus melihat perubahannya; revalidateTag cocok untuk webhook dan refresh di background.',
      },
      {
        title: 'Static shell dengan lubang dinamis',
        code: `import { Suspense } from 'react'
import { cookies } from 'next/headers'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)       // cached -> part of the shell
  return (
    <>
      <ProductInfo product={product} />
      <Suspense fallback={<CartBadgeSkeleton />}>
        <CartBadge />                         {/* per-user, uncached */}
      </Suspense>
    </>
  )
}

async function CartBadge() {
  const cartId = (await cookies()).get('cart')?.value
  const count = cartId ? await countItems(cartId) : 0
  return <span aria-label={\`\${count} items in cart\`}>{count}</span>
}`,
        note: 'cookies() adalah data request, jadi CartBadge bersifat dinamis dan wajib di dalam Suspense. Info produknya di-cache dan di-prerender.',
      },
    ],
    realCase: {
      title: 'Artikel yang sudah diedit masih menampilkan judul lama',
      story: `**Situasi:** tim redaksi di sebuah penerbit fiktif bermigrasi ke Cache Components. Loader artikel memakai \`'use cache'\` dengan \`cacheLife('days')\`.

**Gejala:** editor memperbaiki typo di judul, mendapat toast sukses, tapi typo-nya masih terlihat berjam-jam; pembaca juga melihatnya.

**Akar masalah:** action simpan menulis ke DB tapi tidak pernah menginvalidasi apa pun; loader-nya sama sekali tidak punya \`cacheTag\`, jadi tidak ada yang bisa menargetkannya.

**Perbaikan:** loader diberi tag \`article-\${slug}\` dan \`articles\`; action editor memanggil \`updateTag\` untuk artikel tersebut sehingga editor langsung melihat perubahannya, dan webhook CMS memanggil \`revalidateTag('articles', 'max')\` untuk halaman daftar.

**Pelajaran:** setiap \`'use cache'\` butuh skenario invalidasi yang diputuskan sekaligus: tag yang mana, mutation yang mana, read-your-writes atau stale-while-revalidate.`,
    },
    pitfalls: [
      'Memanggil cookies() atau headers() di dalam scope "use cache"; baca di luar dan oper nilainya sebagai argumen.',
      'Melakukan caching tanpa tag, sehingga tidak ada cara untuk menginvalidasi setelah mutation.',
      'Memakai revalidateTag padahal pengguna harus langsung melihat perubahannya sendiri; di Server Action lebih baik pakai updateTag.',
      'Mengoper argumen yang besar atau tidak bisa diserialisasi, sehingga cache key membengkak atau rusak.',
      'Mencampur route segment config lama (export dynamic, revalidate) dengan model baru tanpa paham mana yang sedang aktif.',
    ],
    exercise: {
      task: 'Buat index blog yang di-cache selama satu jam, setiap post di-cache per slug, dan invalidasi dengan benar saat penulis menerbitkan atau mengedit post lewat Server Action.',
      hint: 'Dua tag: tag per post dan tag daftar bersama. API invalidasi mana yang memberi penulis read-your-writes?',
      solution: `\`\`\`ts
// lib/posts.ts
import { cacheLife, cacheTag } from 'next/cache'
export async function listPosts() {
  'use cache'
  cacheLife('hours')
  cacheTag('posts')
  return db.post.findMany({ where: { published: true }, orderBy: { publishedAt: 'desc' } })
}
export async function getPost(slug: string) {
  'use cache'
  cacheLife('hours')
  cacheTag(\`post-\${slug}\`)
  return db.post.findUnique({ where: { slug } })
}

// app/admin/actions.ts
'use server'
import { updateTag } from 'next/cache'
export async function savePost(raw: unknown) {
  const user = await requireAuthor()
  const data = PostSchema.parse(raw)
  await db.post.update({ where: { slug: data.slug, authorId: user.id }, data })
  updateTag(\`post-\${data.slug}\`)
  updateTag('posts')
}
\`\`\``,
    },
    interview: [
      'Jelaskan bagaimana "use cache" membentuk cache key-nya dan kenapa API request tidak bisa dibaca di dalamnya.',
      'Kapan kamu memilih updateTag dan kapan revalidateTag?',
      'Bagaimana Cache Components mengubah perilaku default dibandingkan model caching implisit yang lama?',
    ],
  },

  'data-layer': {
    explanation: `Server Components memungkinkan kamu query database langsung dari komponen, tapi "bisa" bukan berarti "lakukan di mana-mana". Aplikasi production memusatkan akses data di sebuah **data access layer (DAL)**: kumpulan modul khusus server yang memegang DB client, pengecekan autentikasi, aturan otorisasi, dan pembentukan DTO.

### ORM: Prisma dan Drizzle

- **Prisma** memakai file schema (\`schema.prisma\`), meng-generate client yang bertipe, dan punya alur migrasi yang matang. Sangat nyaman dipakai, meski secara historis footprint runtime-nya lebih besar (cek dokumentasi terbaru soal arsitektur query-compiler yang lebih baru).
- **Drizzle** mendefinisikan tabel di TypeScript, menghasilkan query bergaya SQL dengan type inference penuh, runtime-nya kecil, dan cocok di lingkungan serverless maupun edge.

Keduanya bekerja dengan Postgres, pilihan default yang masuk akal untuk data relasional. Di serverless, pakai koneksi yang di-pool (PgBouncer, pooler dari provider, atau HTTP driver) dan buat instance client sekali per proses (singleton di level modul, dijaga dari hot reload saat dev).

### Library auth

**Auth.js** (dulu NextAuth) dan **Better Auth** menangani provider OAuth, session, CSRF, dan adapter ke DB-mu. Apa pun pilihannya, bungkus dalam satu helper seperti \`getCurrentUser()\` (di-memoize per request dengan \`cache()\` dari React) dan panggil dari DAL, dari Server Action, dan dari Route Handler. Redirect di \`proxy.ts\` atau di layout hanya optimasi UX: layout tidak dijalankan ulang di setiap navigasi dan bukan batas keamanan.

### Bentuk DAL

1. \`import 'server-only'\` di baris paling atas supaya import dari client gagal saat build.
2. Fungsi menerima id, membaca pengguna saat ini, mengecek izin, melakukan query, dan mengembalikan DTO.
3. Page dan action memanggil fungsi DAL, tidak pernah DB client mentah.

Dengan begini kamu punya satu tempat untuk mengaudit keamanan, menambahkan caching (\`'use cache'\` pada fungsi yang tidak memuat data per pengguna), dan mengganti infrastruktur.

### Alternatif framework

Next.js bukan satu-satunya pilihan di era RSC. **React Router framework mode** (penerus Remix) memakai route module dengan fungsi \`loader\` dan \`action\`, progressive enhancement yang kuat, dan Request/Response standar web. **TanStack Start** dibangun di atas TanStack Router dengan server function yang type-safe dari ujung ke ujung dan SSR yang fleksibel. Pilih berdasarkan keakraban tim, hosting, dan seberapa banyak kamu ingin framework mengurus caching dan data.`,
    examples: [
      {
        title: 'Data access layer khusus server',
        code: `// lib/dal.ts
import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const getCurrentUser = cache(async () => {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session.user
})

export async function getInvoice(invoiceId: string) {
  const user = await getCurrentUser()
  const inv = await db.invoice.findFirst({
    where: { id: invoiceId, org: { members: { some: { userId: user.id } } } },
    select: { id: true, number: true, total: true, status: true, dueDate: true },
  })
  return inv // null when it doesn't exist OR the user cannot see it
}`,
        note: 'cache() dari React menghilangkan duplikasi pemanggilan getCurrentUser dalam satu request. Otorisasi menjadi bagian dari query, jadi tidak ada jalur yang bisa mengembalikan invoice milik org lain.',
      },
      {
        title: 'Schema Drizzle dan query yang bertipe',
        code: `// db/schema.ts
import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  priceCents: integer('price_cents').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// lib/products.ts
import 'server-only'
import { desc } from 'drizzle-orm'
import { db } from '@/db'
import { products } from '@/db/schema'

export function latestProducts(limit = 20) {
  return db.select({ id: products.id, title: products.title, priceCents: products.priceCents })
    .from(products).orderBy(desc(products.createdAt)).limit(limit)
}`,
        note: 'Memilih kolom secara eksplisit sekaligus berfungsi sebagai pembentukan DTO. Simpan nilai uang sebagai integer sen untuk menghindari error floating-point.',
      },
    ],
    realCase: {
      title: 'Auth dicek di layout, data halaman tidak terlindungi',
      story: `**Situasi:** sebuah tool HR fiktif mengecek session di \`app/(app)/layout.tsx\` dan me-redirect pengguna anonim.

**Gejala:** pentest menunjukkan bahwa mengambil RSC payload \`/employees/[id]\` dengan request yang direkayasa mengembalikan data gaji karyawan di perusahaan lain.

**Akar masalah:** page langsung menjalankan \`db.employee.findUnique({ where: { id } })\`. Pengecekan di layout hanya memastikan *ada seseorang* yang login, dan tidak membatasi data berdasarkan organisasi.

**Perbaikan:** DAL dengan \`getEmployee(id)\` yang memfilter berdasarkan organisasi si pemanggil, plus aturan ESLint yang melarang import DB client di luar \`lib/dal\`.

**Pelajaran:** otorisasi tempatnya di samping data, bukan di layout atau routing.`,
    },
    pitfalls: [
      'Melakukan pengecekan auth hanya di layout atau proxy.ts, bukan di setiap akses data.',
      'Membuat ORM client baru per request atau per hot reload, sampai koneksi DB habis.',
      'Mengembalikan baris utuh ke komponen alih-alih DTO yang eksplisit.',
      'Meng-cache data per pengguna di scope cache yang dipakai bersama.',
      'Memilih framework karena hype, bukan karena hosting, skill tim, dan kebutuhan data.',
    ],
    exercise: {
      task: 'Buat fungsi DAL `listMyProjects()` dan Server Action `archiveProject(id)` yang sama-sama memastikan pengguna saat ini adalah anggota tim dari project tersebut. Pakai cache() dari React untuk pengguna saat ini.',
      hint: 'Taruh kondisi keanggotaan di dalam klausa where, jangan dicek belakangan.',
      solution: `\`\`\`ts
import 'server-only'
import { cache } from 'react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const currentUser = cache(async () => {
  const s = await auth()
  if (!s?.user) throw new Error('UNAUTHENTICATED')
  return s.user
})

export async function listMyProjects() {
  const u = await currentUser()
  return db.project.findMany({
    where: { archived: false, team: { members: { some: { userId: u.id } } } },
    select: { id: true, name: true, updatedAt: true },
  })
}

// actions.ts
'use server'
export async function archiveProject(id: string) {
  const u = await currentUser()
  const res = await db.project.updateMany({
    where: { id, team: { members: { some: { userId: u.id, role: { in: ['owner', 'admin'] } } } } },
    data: { archived: true },
  })
  if (res.count === 0) return { error: 'Not found' }
  revalidatePath('/projects')
  return { ok: true }
}
\`\`\``,
    },
    interview: [
      'Apa itu data access layer di aplikasi RSC dan tanggung jawab apa saja yang dipegangnya?',
      'Bandingkan Prisma dan Drizzle untuk deployment Postgres di serverless.',
      'Kenapa pengecekan session di layout tidak cukup untuk otorisasi?',
    ],
  },
}

export default details
