import type { TopicDetail } from '../../types'

const details: Record<string, TopicDetail> = {
  routing: {
    explanation: `Router memetakan **URL ke UI**. Di single-page app, browser tidak pernah reload; router mendengarkan perubahan history, mencocokkan lokasi saat ini dengan pohon route, lalu me-render component yang cocok. Perlakukan URL sebagai bagian dari state aplikasi yang bisa di-bookmark, dibagikan, di-refresh, dan dinavigasi pengguna dengan tombol back.

### Nested route dan layout

Route membentuk pohon. Route parent me-render kerangka bersama (navigasi, sidebar, tab) dan sebuah \`<Outlet />\` tempat child yang cocok di-render. \`/projects/:projectId/settings\` bisa saja me-render \`AppLayout > ProjectLayout > ProjectSettings\`. Berpindah antar-child route membuat parent tetap ter-mount, sehingga state dan layout-nya bertahan. Pakai **index route** untuk child default dan route \`path: '*'\` (atau \`errorElement\`) untuk halaman 404.

### Params vs search params

- **Path params** (\`:projectId\`) menunjukkan *resource mana* yang sedang dibahas halaman itu.
- **Search params** (\`?status=open&page=2\`) menjelaskan *cara kamu melihatnya*: filter, sort, pagination, tab yang dipilih, query pencarian.

Kalau state harus bertahan setelah refresh atau bisa dibagikan, taruh di URL. \`useSearchParams\` memberimu \`URLSearchParams\` beserta setter-nya. Nilainya selalu string, jadi **parse dan validasi** (Zod dengan default \`.catch\`), jangan langsung dipercaya. Pakai \`replace: true\` untuk update per ketikan supaya tombol back tidak kebanjiran entri history.

### Data API: loader dan action

Dengan \`createBrowserRouter\`, setiap route bisa punya \`loader\` yang berjalan **sebelum** route di-render, secara paralel untuk semua route yang cocok. Ini menghilangkan waterfall klasik di mana parent render, fetch, lalu child render dan fetch lagi. \`useLoaderData\` membaca hasilnya. \`action\` menangani submit \`<Form method="post">\`; setelah action, loader otomatis melakukan revalidasi. \`useNavigation\` mengekspos state pending untuk spinner global. Loader cocok dipasangkan dengan TanStack Query: loader memanggil \`queryClient.ensureQueryData\` dan component memakai \`useQuery\` dengan key yang sama, sehingga kamu dapat fetch lebih awal sekaligus cache.

### Route yang dilindungi dan lazy route

Lindungi route di loader (redirect ke \`/login?redirectTo=...\` kalau tidak ada session) atau di layout route yang memeriksa auth. Ingat, ini hanya untuk UX: server tetap harus mengotorisasi setiap request. Pakai \`lazy\` pada route untuk melakukan code splitting per halaman, sehingga bundle awal hanya berisi apa yang dibutuhkan layar pertama.

### React Router v8 (2026)

Contoh-contoh di sini memakai React Router v8 (Juni 2026). Package \`react-router-dom\` sudah **dihapus**: import semuanya dari \`react-router\` (bagian khusus DOM dari \`react-router/dom\`). Versi ini hanya ESM dan butuh Node 22.22+, React 19.2.7+, serta Vite 7+. Future flag yang dulu opsional sekarang jadi default: **middleware aktif secara default**, route module dipecah secara default, dan fungsi meta menerima \`loaderData\` (parameter \`data\` yang lama sudah tidak ada). Ada tiga mode: **declarative** (router client sederhana dengan \`<Routes>\`), **data mode** (\`createBrowserRouter\` dengan loader dan action, seperti di sini), dan **framework mode** (penerus Remix, dengan route berbasis file dan SSR). v6 dan Remix v2 sudah end-of-life.

### Kapan memilih TanStack Router

Library ini menawarkan path, params, dan search params tervalidasi yang sepenuhnya type-safe, dengan konsekuensi model mental yang berbeda. Dua-duanya oke; yang penting kamu paham nested layout, state di URL, dan memuat data sebelum render.`,
    examples: [
      {
        title: '✅ Pohon route dengan layout, loader, lazy page, dan 404',
        code: `import { createBrowserRouter, redirect } from 'react-router'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'projects',
        loader: requireUser,
        children: [
          { index: true, lazy: () => import('./features/projects/ProjectListPage') },
          {
            path: ':projectId',
            lazy: () => import('./features/projects/ProjectLayout'),
            children: [
              { index: true, lazy: () => import('./features/projects/OverviewTab') },
              { path: 'settings', lazy: () => import('./features/projects/SettingsTab') },
            ],
          },
        ],
      },
      { path: 'login', element: <LoginPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

async function requireUser({ request }: { request: Request }) {
  const user = await getSession()
  if (!user) {
    const url = new URL(request.url)
    throw redirect(\`/login?redirectTo=\${encodeURIComponent(url.pathname + url.search)}\`)
  }
  return null
}`,
        note: 'Setiap modul yang di-import secara lazy bisa meng-export `Component`, `loader`, dan `ErrorBoundary`. Pengecekan auth berjalan sebelum halaman project mana pun di-render, dan lokasi asal disimpan untuk dipakai setelah login.',
      },
      {
        title: '❌ Filter di useState vs ✅ search params sebagai state',
        code: `// ❌ lost on refresh, not shareable, back button does nothing
const [status, setStatus] = useState('open')

// ✅ URL is the state
import { useSearchParams } from 'react-router'
import { z } from 'zod'

const FiltersSchema = z.object({
  status: z.enum(['open', 'closed', 'all']).catch('open'),
  page: z.coerce.number().int().min(1).catch(1),
  q: z.string().catch(''),
})

export function useTicketFilters() {
  const [params, setParams] = useSearchParams()
  const filters = FiltersSchema.parse(Object.fromEntries(params))

  function update(patch: Partial<z.infer<typeof FiltersSchema>>, opts?: { replace?: boolean }) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) next.set(k, String(v))
      if (!('page' in patch)) next.set('page', '1') // filter change resets paging
      return next
    }, opts)
  }
  return { filters, update }
}

// typing in a search box: update({ q: value }, { replace: true })`,
        note: 'Filter diturunkan dari URL di setiap render dan divalidasi dengan default yang aman. Mengganti filter akan me-reset halaman, dan ketikan memakai `replace` supaya history tetap bisa dipakai.',
      },
    ],
    realCase: {
      title: 'Agen support tidak bisa berbagi tampilan yang sudah difilter',
      story: `**Situasi:** sebuah helpdesk SaaS menyimpan filter tiket di store Zustand. **Gejala:** agen menempelkan link "tiket urgent yang belum di-assign" di chat, tapi rekan mereka malah membuka list tanpa filter; refresh setelah deploy juga me-reset tampilan semua orang, dan tombol back malah keluar dari aplikasi. **Akar masalah:** state tampilan yang seharusnya bisa dibagikan disimpan di memori, bukan di URL. **Perbaikan:** filter, sort, dan page dipindah ke search params, di-parse dengan schema Zod ber-default \`.catch\`; query key list dibangun dari filter hasil parse. **Pelajaran:** kalau seseorang mungkin mem-bookmark, membagikan, atau me-refresh-nya, tempatnya di URL.`,
    },
    pitfalls: [
      'Membaca search params tanpa validasi; isinya string yang bisa diedit pengguna, dan link lama hidup selamanya.',
      'Menambah entri history di setiap ketikan alih-alih memakai `replace`.',
      'Melakukan fetch di `useEffect` pada component bersarang, menciptakan waterfall parent-lalu-child yang bisa dihindari dengan loader.',
      'Menganggap route guard di client sebagai keamanan; API tetap harus memeriksa otorisasi.',
      'Lupa me-reset pagination saat filter berubah, sehingga pengguna mendarat di halaman 7 yang kosong.',
    ],
    exercise: {
      task: 'Buat route `/products` yang list-nya dikendalikan oleh `?q=&category=&sort=&page=`. Validasi params dengan Zod, tambahkan tombol "Clear filters", lalu ubah tab kategori menjadi nested route di bawah `/products/:category`.',
      hint: 'Tentukan bagian mana yang merupakan identitas (path param) dan mana yang merupakan tampilan (search param). Kategori bisa masuk ke keduanya; jelaskan alasan pilihanmu.',
      solution: `\`\`\`tsx
const Schema = z.object({
  q: z.string().catch(''),
  sort: z.enum(['newest', 'price-asc', 'price-desc']).catch('newest'),
  page: z.coerce.number().int().min(1).catch(1),
})

function ProductsPage() {
  const { category = 'all' } = useParams()
  const [params, setParams] = useSearchParams()
  const filters = Schema.parse(Object.fromEntries(params))
  const { data } = useQuery({
    queryKey: ['products', { category, ...filters }],
    queryFn: () => api.listProducts({ category, ...filters }),
  })
  return (
    <>
      <nav>{CATEGORIES.map((c) => <NavLink key={c} to={\`/products/\${c}\`}>{c}</NavLink>)}</nav>
      <button onClick={() => setParams({})}>Clear filters</button>
      <ProductGrid products={data?.items ?? []} />
    </>
  )
}
\`\`\`
Menjadikan kategori sebagai path param memberi setiap kategori URL yang bersih dan bisa diindeks; filter tetap di search params.`,
    },
    interview: [
      'Apa yang cocok jadi path param dan apa yang cocok jadi search param? Beri contoh.',
      'Bagaimana route loader menghilangkan waterfall request dibanding fetch di dalam effect?',
      'Kenapa protected route di sisi client bukan batas keamanan?',
    ],
  },

  'server-state': {
    explanation: `Sebagian besar hal yang disebut "state" oleh pemula di aplikasi React sebenarnya bukan milik mereka. Daftar invoice, profil pengguna yang sedang login, stok sebuah produk: semua ini **dimiliki server**. Yang dipegang browser hanyalah **cache**: snapshot yang bisa jadi sudah basi. Itulah server state. Sebaliknya, client state sepenuhnya dimiliki UI: apakah modal terbuka, teks di draft yang belum dikirim, baris mana yang sedang di-expand.

### Kenapa pembedaan ini penting

Server state punya masalah yang tidak dimiliki client state:

- Bisa **basi**: orang lain mengedit invoice itu dua menit lalu.
- Bersifat **bersama**: lima component butuh data pengguna saat ini; jangan sampai masing-masing melakukan fetch sendiri.
- Butuh **deduplikasi**: dua component yang mount bersamaan seharusnya cukup memicu satu request.
- Butuh **refetch** di momen yang tepat: saat jendela kembali fokus, koneksi tersambung lagi, setelah mutation.
- Punya **lifecycle**: loading, error, refresh di background, garbage collection untuk data yang tidak terpakai.
- Rentan **race condition**: response lama yang lambat tidak boleh menimpa response baru yang cepat.

Kalau kamu memasukkan data server ke \`useState\` + \`useEffect\`, atau ke Redux/Zustand, kamu sedang membangun cache sendiri dan biasanya melewatkan separuh daftar di atas. Gejala klasiknya: spinner di setiap navigasi, data basi setelah mengedit, request ganda, dan "kenapa sidebar masih menampilkan nama lama?".

### Alat yang tepat

Pakai library server state (TanStack Query, RTK Query, SWR, atau router loader dengan revalidasi) untuk server state. Pakai \`useState\`, \`useReducer\`, URL, context, atau store kecil untuk client state. Global store pun jadi mungil, karena sebagian besar isinya dulu ternyata cuma cache.

### Area abu-abu

- **Draft form** dari data server: salin nilai server ke state lokal saat mulai mengedit (atau pakai sebagai \`defaultValues\`), lalu tulis balik lewat mutation.
- **Filter**: client state, paling baik disimpan di URL, tapi menjadi bagian dari *query key* untuk server state.
- **Optimistic update**: sementara berada di sisi client, lalu direkonsiliasi dengan server.

### Tes sederhana yang berguna

Tanyakan: "Kalau tab ini kututup lalu kubuka lagi, kebenarannya datang dari mana?" Kalau jawabannya server, itu server state, dan tugasmu adalah mengelola kesegaran datanya, bukan kepemilikannya.`,
    examples: [
      {
        title: '❌ Data server disalin ke global store vs ✅ query yang di-cache',
        code: `// ❌ a hand-made cache: no dedupe, no staleness, manual refetch everywhere
const useStore = create<{ user: User | null; loadUser: () => Promise<void> }>()((set) => ({
  user: null,
  loadUser: async () => set({ user: await api.getMe() }),
}))
// Every page calls loadUser() in an effect; after editing the profile,
// someone must remember to call loadUser() again.

// ✅ server state in a query, client state stays local
export const meQuery = {
  queryKey: ['me'] as const,
  queryFn: api.getMe,
  staleTime: 5 * 60_000,
}

export function useMe() {
  return useQuery(meQuery)
}

function ProfileMenu() {
  const { data: me } = useMe()          // server state (cached, shared)
  const [open, setOpen] = useState(false) // client state (local)
  return <Menu open={open} onOpenChange={setOpen} title={me?.name ?? '…'} />
}`,
        note: 'Sepuluh component bisa memanggil `useMe()` dan hanya terjadi satu request. Setelah mutation profil, `invalidateQueries({ queryKey: [\'me\'] })` me-refresh semua pemakainya. Flag open milik menu itu memang tidak pernah layak masuk global store.',
      },
    ],
    realCase: {
      title: 'Badge keranjang yang basi',
      story: `**Situasi:** tim retail menyimpan keranjang belanja di Redux, di-fetch sekali saat aplikasi dibuka. **Gejala:** pelanggan yang menambah barang lewat HP melihat jumlah yang basi di desktop; setelah checkout, badge masih menunjukkan 3 item sampai di-hard refresh. **Akar masalah:** data keranjang adalah server state yang diperlakukan sebagai client state tanpa aturan kesegaran. **Perbaikan:** keranjang dipindah ke query dengan refetch saat jendela fokus dan invalidasi setelah mutation keranjang; Redux hanya menyimpan urusan UI. Ukuran store menyusut sekitar dua pertiga. **Pelajaran:** klasifikasikan state berdasarkan kepemilikannya dulu; pilihan alat menyusul.`,
    },
    pitfalls: [
      'Menyimpan response API di Redux/Zustand/context lalu mengimplementasi ulang caching dengan buruk.',
      'Menyalin data query ke `useState` "supaya bisa diedit", lalu tidak pernah disinkronkan saat data server berubah.',
      'Menganggap filter sebagai server state; filter adalah client state (URL) yang menjadi input query key.',
      'Menganggap data hasil fetch selalu terbaru; selalu tanyakan kapan data itu perlu di-refresh.',
    ],
    exercise: {
      task: 'Audit aplikasi yang pernah kamu buat: daftar semua state dan klasifikasikan sebagai server state, URL, lokal, atau global client state. Pindahkan minimal satu data server dari `useState`/store ke query hook.',
      hint: 'Untuk setiap state, tanyakan: siapa pemilik kebenarannya, siapa yang membutuhkannya, dan apakah harus bertahan setelah refresh?',
      solution: `Contoh klasifikasi untuk dashboard project:
- Daftar project, pengguna saat ini, notifikasi: **server state** -> hook \`useQuery\` (\`useProjects\`, \`useMe\`).
- Filter/sort/page yang dipilih: **URL** -> search params.
- Sidebar collapsed, tema: **global client** -> store Zustand kecil (di-persist).
- Modal terbuka, draft form: **lokal** -> \`useState\` / library form.

\`\`\`ts
export const projectsQuery = (filters: Filters) => ({
  queryKey: ['projects', filters] as const,
  queryFn: () => api.listProjects(filters),
})
export const useProjects = (f: Filters) => useQuery(projectsQuery(f))
\`\`\``,
    },
    interview: [
      'Definisikan server state dan client state. Kenapa keduanya butuh alat yang berbeda?',
      'Sebutkan empat masalah yang diselesaikan cache server state tapi tidak diselesaikan `useState` + `useEffect`.',
      'Bagaimana kamu menangani form edit yang nilai awalnya berasal dari data server?',
    ],
  },

  'tanstack-query': {
    explanation: `TanStack Query adalah **cache server state** dengan API React. Kamu memberi tahu cara fetch (\`queryFn\`) dan cara mengidentifikasi datanya (\`queryKey\`); library ini mengurus caching, deduplikasi, refetch di background, retry, garbage collection, dan race condition.

### Query key

Query key adalah array yang secara unik mengidentifikasi data di cache, mirip alamat cache: \`['invoices', 'list', { status, page }]\`. Semua yang dipakai \`queryFn\` harus ada di key; saat key berubah, entri cache baru dipakai dan di-fetch. Key di-hash secara deterministik, jadi urutan properti objek tidak berpengaruh. Susun secara hierarkis (sering memakai **query key factory**) supaya kamu bisa melakukan invalidasi secara luas (\`['invoices']\`) atau secara presisi.

### staleTime vs gcTime

- \`staleTime\` (default 0): berapa lama data dianggap **segar**. Data segar disajikan dari cache tanpa refetch. Data basi tetap ditampilkan, tapi di-refetch di background saat ada pemicu seperti mount, jendela kembali fokus, dan koneksi tersambung lagi.
- \`gcTime\` (default 5 menit, dulu bernama \`cacheTime\`): berapa lama data yang **tidak terpakai** (tanpa observer) tetap di memori sebelum dibuang oleh garbage collection.

Sebagian besar keluhan "kok refetch-nya kebanyakan" beres dengan \`staleTime\` yang masuk akal (misalnya 30–60 detik untuk list).

### Status

\`status\` bernilai \`'pending' | 'error' | 'success'\` (apakah kita sudah punya data?), sedangkan \`fetchStatus\` bernilai \`'fetching' | 'paused' | 'idle'\` (apakah ada request yang sedang jalan?). \`isPending\` berarti belum ada data; \`isFetching\` termasuk refresh di background. Tampilkan skeleton untuk pending, dan indikator yang halus untuk fetch di background.

### Mutation dan invalidasi

\`useMutation\` menjalankan operasi tulis. Saat sukses, panggil \`queryClient.invalidateQueries({ queryKey: ['invoices'] })\`: query yang cocok ditandai basi dan yang aktif langsung di-refetch. Kembalikan promise dari \`onSuccess\` / \`onSettled\` kalau kamu ingin mutation tetap pending sampai refetch selesai.

### Optimistic update

Ada dua pendekatan: render \`mutation.variables\` selama pending (sederhana, lokal untuk satu component), atau update cache di \`onMutate\` (batalkan query yang sedang berjalan, simpan snapshot data sebelumnya, \`setQueryData\`, rollback di \`onError\`, invalidasi di \`onSettled\`).

### Pagination, infinite, prefetch

Pakai \`placeholderData: keepPreviousData\` supaya halaman 2 tidak berkedip menampilkan spinner. \`useInfiniteQuery\` dengan \`initialPageParam\` dan \`getNextPageParam\` menjadi mesin di balik "load more". \`queryClient.prefetchQuery\` saat hover atau di route loader membuat navigasi terasa instan. \`useSuspenseQuery\` terintegrasi dengan Suspense dan selalu mengembalikan data.

### Kapan tidak dipakai

Jangan taruh client state (modal yang terbuka) di sini, dan jangan pakai \`useEffect\` untuk menyalin data query ke \`useState\`. Turunkan langsung dari \`data\`.`,
    examples: [
      {
        title: '✅ Query key factory dan hook ber-type',
        code: `import { queryOptions, useQuery, keepPreviousData } from '@tanstack/react-query'

type InvoiceFilters = { status: 'all' | 'open' | 'paid'; page: number }

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (f: InvoiceFilters) => [...invoiceKeys.lists(), f] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
}

export const invoiceListOptions = (f: InvoiceFilters) =>
  queryOptions({
    queryKey: invoiceKeys.list(f),
    queryFn: ({ signal }) => api.listInvoices(f, { signal }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

export const useInvoices = (f: InvoiceFilters) => useQuery(invoiceListOptions(f))

// in a route loader: await queryClient.ensureQueryData(invoiceListOptions(filters))`,
        note: '`queryOptions` menyatukan key dan fn dalam satu tempat yang type-safe, bisa dipakai ulang oleh hook, loader, dan prefetch. Mengoper `signal` memungkinkan library membatalkan request yang sudah tidak dibutuhkan.',
      },
      {
        title: '❌ Fetch di useEffect vs ✅ mutation dengan optimistic update di cache',
        code: `// ❌ race conditions, no cache, no retry, manual loading flags
useEffect(() => {
  setLoading(true)
  api.listInvoices(filters).then(setInvoices).finally(() => setLoading(false))
}, [filters])

// ✅ optimistic "mark as paid"
export function useMarkPaid(filters: InvoiceFilters) {
  const qc = useQueryClient()
  const key = invoiceKeys.list(filters)
  return useMutation({
    mutationFn: (id: string) => api.markPaid(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<InvoicePage>(key)
      qc.setQueryData<InvoicePage>(key, (old) =>
        old && { ...old, items: old.items.map((i) => (i.id === id ? { ...i, status: 'paid' } : i)) },
      )
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  })
}`,
        note: 'Batalkan fetch yang sedang berjalan supaya tidak menimpa perubahan optimistic, simpan snapshot untuk rollback, dan selalu lakukan invalidasi di akhir agar sinkron kembali dengan server.',
      },
    ],
    realCase: {
      title: 'Dashboard yang membombardir API-nya sendiri',
      story: `**Situasi:** tim analytics mengadopsi TanStack Query dengan pengaturan default. **Gejala:** beban API naik tiga kali lipat; setiap pindah tab dan setiap jendela kembali fokus memicu refetch belasan query laporan yang berat. **Akar masalah:** \`staleTime: 0\` (default) membuat semua data langsung basi, jadi setiap mount dan fokus memicu refetch. Beberapa key juga menyisipkan \`new Date()\`, sehingga tercipta entri cache baru di setiap render. **Perbaikan:** query laporan diberi \`staleTime: 5 * 60_000\`, rentang tanggal dinormalisasi jadi string di key, dan refetch saat fokus hanya dipertahankan untuk query yang murah dan sering berubah. **Pelajaran:** atur kesegaran data sesuai jenisnya, dan jaga query key tetap stabil serta bisa diserialisasi.`,
    },
    pitfalls: [
      'Tidak memasukkan variabel yang dipakai `queryFn` ke dalam `queryKey`, sehingga cache mengembalikan data untuk filter yang salah.',
      'Memakai `cacheTime` (v4) di kode v5; sekarang namanya `gcTime`, dan opsinya memakai sintaks satu objek.',
      'Menyalin `data` ke `useState` lewat effect alih-alih menurunkannya langsung.',
      'Mencampuradukkan `isPending` (belum ada data) dengan `isFetching` (ada request apa pun yang berjalan), sehingga spinner satu halaman penuh muncul saat refresh di background.',
      'Optimistic update tanpa `cancelQueries` dan rollback, menyebabkan UI berkedip atau salah permanen saat gagal.',
    ],
    exercise: {
      task: 'Implementasikan list "Orders" berpaginasi dengan `useQuery` + `keepPreviousData`, lakukan prefetch halaman berikutnya, dan buat mutation "Cancel order" yang secara optimistic menghapus baris dan melakukan rollback saat error.',
      hint: 'Prefetch dengan `queryClient.prefetchQuery(ordersOptions({ page: page + 1 }))` di dalam effect yang bergantung pada `page` dan `data?.hasMore`.',
      solution: `\`\`\`tsx
const ordersOptions = (page: number) => queryOptions({
  queryKey: ['orders', 'list', { page }] as const,
  queryFn: () => api.listOrders({ page }),
  placeholderData: keepPreviousData,
  staleTime: 20_000,
})

function Orders() {
  const [page, setPage] = useState(1)
  const qc = useQueryClient()
  const { data, isPending, isFetching, isPlaceholderData } = useQuery(ordersOptions(page))

  useEffect(() => {
    if (data?.hasMore) qc.prefetchQuery(ordersOptions(page + 1))
  }, [data, page, qc])

  const cancel = useMutation({
    mutationFn: api.cancelOrder,
    onMutate: async (id: string) => {
      const key = ordersOptions(page).queryKey
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData(key)
      qc.setQueryData(key, (old) => old && { ...old, items: old.items.filter((o) => o.id !== id) })
      return { prev, key }
    },
    onError: (_e, _id, ctx) => ctx && qc.setQueryData(ctx.key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  if (isPending) return <OrdersSkeleton />
  return (
    <>
      {isFetching && <TopProgressBar />}
      <OrderTable orders={data?.items ?? []} onCancel={(id) => cancel.mutate(id)} />
      <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
      <button disabled={isPlaceholderData || !data?.hasMore} onClick={() => setPage((p) => p + 1)}>Next</button>
    </>
  )
}
\`\`\``,
    },
    interview: [
      'Jelaskan `staleTime` vs `gcTime` dengan contoh timeline yang konkret.',
      'Kenapa setiap input `queryFn` harus menjadi bagian dari `queryKey`?',
      'Jelaskan langkah-langkah optimistic update beserta rollback-nya. Untuk apa `cancelQueries`?',
    ],
  },

  forms: {
    explanation: `Form kelihatannya sederhana, padahal termasuk bagian tersulit dalam pekerjaan UI: nilai, validasi, kapan error ditampilkan, submit async, state pending, error dari server, reset, dan aksesibilitas semuanya saling memengaruhi. Buat satu form secara manual sekali supaya kamu paham komponen-komponennya, setelah itu pakai alat bantu.

### Bagian-bagian yang bergerak

- **Nilai**: controlled (\`value\` + \`onChange\` di state) atau uncontrolled (DOM yang menyimpan nilainya; baca lewat \`FormData\` atau ref saat submit).
- **Error**: per field, plus error level form (misalnya "kredensial tidak valid").
- **Touched/dirty**: tampilkan error hanya setelah pengguna meninggalkan field atau mencoba submit, bukan saat mereka baru mengetik karakter pertama.
- **State submit**: idle, submitting, succeeded, failed; cegah submit ganda.
- **Error dari server**: petakan kembali ke field-nya (\`email: 'already taken'\`).

### React Hook Form + Zod

React Hook Form (RHF) menjaga input tetap **uncontrolled** lewat \`register\`, jadi mengetik tidak me-render ulang seluruh form: tetap cepat bahkan untuk form besar. Pasangkan dengan \`zodResolver(schema)\` supaya satu schema Zod mendefinisikan validasi sekaligus type TypeScript untuk nilai-nilainya (gaya Zod 4: \`z.email()\`, \`z.url()\`, dan \`{ error: '...' }\` untuk pesan). API utama: \`useForm<T>({ resolver, defaultValues, mode })\`, \`register\`, \`handleSubmit\`, \`formState: { errors, isSubmitting, isDirty }\`, \`setError\` untuk error dari server, \`reset\` setelah data server dimuat, dan \`Controller\` untuk input non-native (date picker, combobox). Selalu sediakan \`defaultValues\`.

### React 19 Actions

React 19 memungkinkan \`<form action={fn}>\` menerima sebuah fungsi. React menjalankannya di dalam transition saat form di-submit, mengoper \`FormData\`, dan me-reset field uncontrolled setelah sukses. Hook terkait:

- \`useActionState(action, initialState)\` mengembalikan \`[state, formAction, isPending]\`. Action-mu menerima \`(previousState, formData)\` dan mengembalikan state berikutnya, sangat pas untuk mengembalikan error validasi atau pesan sukses.
- \`useFormStatus()\` yang dipanggil *di dalam* component yang di-render di dalam form mengembalikan \`{ pending, data, method }\`, sehingga \`SubmitButton\` yang reusable bisa menonaktifkan dirinya sendiri.
- \`useOptimistic\` menampilkan hasil yang diharapkan selama action berjalan.

Actions unggul untuk form sederhana dan progressive enhancement (terutama dengan server function di framework). RHF unggul untuk form client-side yang kompleks: field array, field yang saling bergantung, validasi langsung. Keduanya bisa digabung, tapi pilih satu pemilik state form.

### Lapisan validasi

Validasi di client itu urusan UX: umpan balik yang cepat. Validasi di server adalah sumber kebenaran dan keamanan. Bagikan schema Zod untuk keduanya bila memungkinkan, dan selalu tangani error yang dikembalikan server.`,
    examples: [
      {
        title: '✅ React Hook Form + Zod dengan error dari server',
        code: `import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const ProjectSchema = z.object({
  name: z.string().trim().min(3, { error: 'At least 3 characters' }),
  slug: z.string().regex(/^[a-z0-9-]+$/, { error: 'Lowercase letters, digits and dashes' }),
  budget: z.coerce.number().positive({ error: 'Must be positive' }),
})
type ProjectInput = z.infer<typeof ProjectSchema>

export function NewProjectForm({ onCreated }: { onCreated: (id: string) => void }) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<ProjectInput>({
      resolver: zodResolver(ProjectSchema),
      defaultValues: { name: '', slug: '', budget: 0 },
      mode: 'onTouched',
    })

  const onSubmit = handleSubmit(async (values) => {
    const res = await api.createProject(values)
    if (!res.ok) {
      if (res.error.code === 'SLUG_TAKEN') setError('slug', { message: 'Slug already in use' })
      else setError('root', { message: 'Could not create project. Try again.' })
      return
    }
    onCreated(res.value.id)
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <TextField label="Name" {...register('name')} error={errors.name?.message} />
      <TextField label="Slug" {...register('slug')} error={errors.slug?.message} />
      <TextField label="Budget" type="number" {...register('budget')} error={errors.budget?.message} />
      {errors.root && <p role="alert">{errors.root.message}</p>}
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create'}</button>
    </form>
  )
}`,
        note: 'Satu schema menghasilkan validasi sekaligus type `ProjectInput`. `mode: \'onTouched\'` mencegah form "berteriak" saat pengguna masih mengetik. Error dari server dipetakan ke field dengan `setError`, dan `root` menampung error level form.',
      },
      {
        title: '✅ React 19 useActionState + useFormStatus',
        code: `import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

type State = { ok: boolean; errors?: Partial<Record<'email', string>>; message?: string }

async function subscribe(_prev: State, formData: FormData): Promise<State> {
  const parsed = z.object({ email: z.email() }).safeParse({ email: formData.get('email') })
  if (!parsed.success) return { ok: false, errors: { email: 'Enter a valid email' } }
  const res = await api.subscribe(parsed.data.email)
  return res.ok ? { ok: true, message: 'Check your inbox!' } : { ok: false, message: 'Try again later' }
}

function SubmitButton() {
  const { pending } = useFormStatus() // reads the parent <form>
  return <button disabled={pending}>{pending ? 'Subscribing…' : 'Subscribe'}</button>
}

export function NewsletterForm() {
  const [state, formAction, isPending] = useActionState(subscribe, { ok: false })
  return (
    <form action={formAction} aria-busy={isPending}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" aria-invalid={!!state.errors?.email} />
      {state.errors?.email && <p role="alert">{state.errors.email}</p>}
      <SubmitButton />
      {state.message && <p aria-live="polite">{state.message}</p>}
    </form>
  )
}`,
        note: 'Action mengembalikan state berikutnya, jadi error mengalir balik tanpa `useState` tambahan. `useFormStatus` harus dipanggil di child dari `<form>`, bukan di component yang me-render form tersebut.',
      },
    ],
    realCase: {
      title: 'Donasi yang tertagih dua kali',
      story: `**Situasi:** form donasi sebuah organisasi nirlaba melakukan submit lewat handler \`onClick\` biasa. **Gejala:** di jaringan seluler yang lambat, sebagian donatur mengetuk "Donate" dua kali dan tertagih dua kali. **Akar masalah:** tidak ada state pending; tombol tetap aktif selama request berjalan, dan backend tidak punya idempotency key. **Perbaikan:** form dipindah ke RHF dengan \`isSubmitting\` yang menonaktifkan tombol, client membuat idempotency key per sesi form, dan server melakukan deduplikasi berdasarkan key tersebut. **Pelajaran:** state submit adalah soal kebenaran perilaku, bukan sekadar polesan; jaga di sisi client dan server.`,
    },
    pitfalls: [
      'Menampilkan error validasi sejak ketikan pertama; validasi saat blur/touched, lalu saat change setelah field tidak valid.',
      'Memanggil `useFormStatus` di component yang sama yang me-render `<form>` (dia hanya bisa melihat form parent).',
      'Tidak menyediakan `defaultValues` di RHF, sehingga muncul peringatan uncontrolled-to-controlled dan `reset`/`isDirty` jadi rusak.',
      'Mencampur RHF dan `useActionState` yang sama-sama ingin memiliki nilai field yang sama.',
      'Mengabaikan error dari server, sehingga response "slug taken" hanya tampil sebagai kegagalan umum.',
    ],
    exercise: {
      task: 'Buat form "Edit profile": muat profil dengan `useQuery`, isi RHF lewat `values` atau `reset`, validasi dengan Zod (display name 2–40 karakter, URL website opsional), submit dengan `useMutation`, petakan error `409` ke field display name, dan lakukan invalidasi `[\'me\']` saat sukses.',
      hint: 'Opsi `values` di RHF memperbarui form saat data server tiba; `isDirty` bisa menonaktifkan tombol Save kalau tidak ada yang berubah.',
      solution: `\`\`\`tsx
const ProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
  website: z.url().or(z.literal('')),
})
type Profile = z.infer<typeof ProfileSchema>

function EditProfile() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['me'], queryFn: api.getMe })
  const form = useForm<Profile>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { displayName: '', website: '' },
    values: data ? { displayName: data.displayName, website: data.website ?? '' } : undefined,
  })
  const save = useMutation({
    mutationFn: api.updateMe,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409)
        form.setError('displayName', { message: 'Name already taken' })
    },
  })
  const { errors, isDirty } = form.formState
  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate>
      <TextField label="Display name" {...form.register('displayName')} error={errors.displayName?.message} />
      <TextField label="Website" {...form.register('website')} error={errors.website?.message} />
      <button disabled={!isDirty || save.isPending}>Save</button>
    </form>
  )
}
\`\`\``,
    },
    interview: [
      'Kenapa React Hook Form tetap cepat untuk form besar? Apa arti "uncontrolled" di sini?',
      'Jelaskan signature `useActionState` dan apa yang diterima oleh action-nya.',
      'Kapan kamu memilih React 19 Actions dibanding React Hook Form, dan sebaliknya?',
    ],
  },

  'forms-a11y': {
    explanation: `Form yang aksesibel adalah form yang bisa dipakai dengan keyboard, screen reader, kontrol suara, zoom, dan autofill. Sebagian besar sudah gratis didapat dari **HTML native**; sebagian besar kegagalan justru muncul karena elemen native diganti div, atau karena error hanya terlihat tapi tidak pernah diumumkan.

### Label

Setiap input butuh nama yang bisa dibaca secara programatis. \`<label htmlFor={id}>\` yang terlihat adalah pilihan terbaik: mengkliknya akan mem-focus input, memperbesar area sentuh, dan dibacakan oleh screen reader. Placeholder **bukan** label: dia hilang saat mengetik, kontrasnya buruk, dan tidak selalu diumumkan. Kelompokkan kontrol yang berkaitan (radio button, alamat) di dalam \`<fieldset>\` dengan \`<legend>\`. Pakai \`useId()\` untuk membuat id yang stabil.

### Petunjuk dan error

- Hubungkan teks bantuan dan pesan error dengan \`aria-describedby\` (bisa berisi beberapa id). Screen reader membacanya setelah label.
- Tandai field yang tidak valid dengan \`aria-invalid="true"\` hanya saat ada error.
- Tulis pesan error yang menjelaskan cara memperbaikinya: "Masukkan tanggal seperti 31/12/2026", bukan "Input tidak valid".
- Jangan mengandalkan warna saja; sertakan teks atau ikon.

### Alur saat submit gagal

Saat submit gagal, **pindahkan focus ke field pertama yang tidak valid** (React Hook Form melakukannya secara default lewat \`shouldFocusError\`). Untuk form yang panjang, ringkasan error di bagian atas dengan heading, \`tabIndex={-1}\`, dan focus yang dipindah ke sana, berisi anchor ke setiap field, malah lebih baik. Untuk hasil async, pakai live region yang sopan (\`aria-live="polite"\` atau \`role="status"\`) supaya "Tersimpan" diumumkan; simpan \`role="alert"\` untuk error yang penting.

### Semantik input dan autofill

Pakai \`type\` yang tepat (\`email\`, \`tel\`, \`url\`, \`number\` secukupnya), \`inputMode\` untuk keyboard numerik, dan token \`autoComplete\` (\`email\`, \`current-password\`, \`new-password\`, \`one-time-code\`, \`postal-code\`). Autofill meningkatkan tingkat penyelesaian form secara drastis, dan password manager bergantung pada token-token ini. Tandai field wajib secara visual dan dengan \`required\` atau \`aria-required\`.

### Kontrol custom

Kalau kamu membangun select, combobox, atau toggle custom, kamu ikut mewarisi tugas dukungan keyboard, role, state, dan manajemen focus. Utamakan elemen native atau library headless yang sudah teruji (React Aria, Radix). Minimalkan tombol submit yang disabled: tombol disabled tidak memberi petunjuk *kenapa*; sering kali lebih baik izinkan submit lalu tampilkan error-nya.

### Testing

Telusuri seluruh form dengan Tab tanpa mouse. Pakai query Testing Library seperti \`getByRole('textbox', { name: 'Email' })\`: kalau query-nya gagal, berarti field itu tidak punya nama yang aksesibel. Cobalah memakai screen reader setidaknya sekali.`,
    examples: [
      {
        title: '❌ Field yang hanya punya placeholder vs ✅ field dengan label dan deskripsi',
        code: `// ❌ no label, error only visible, colour-only signal
<input placeholder="Email" className={error ? 'red' : ''} />
{error && <span className="red">Invalid</span>}

// ✅
function EmailField({ error }: { error?: string }) {
  const id = useId()
  const hintId = \`\${id}-hint\`
  const errorId = \`\${id}-error\`
  return (
    <div>
      <label htmlFor={id}>Work email <span aria-hidden="true">*</span></label>
      <p id={hintId}>We'll send the invoice here.</p>
      <input
        id={id}
        name="email"
        type="email"
        autoComplete="email"
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? \`\${hintId} \${errorId}\` : hintId}
      />
      {error && <p id={errorId} className="field-error">⚠ {error}</p>}
    </div>
  )
}`,
        note: 'Screen reader membaca label, lalu petunjuk, lalu error. `aria-invalid` hanya ada saat tidak valid. Error-nya punya ikon dan teks, bukan sekadar warna.',
      },
      {
        title: '✅ Ringkasan error dengan manajemen focus',
        code: `function ErrorSummary({ errors }: { errors: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null)
  const entries = Object.entries(errors)
  useEffect(() => {
    if (entries.length > 0) ref.current?.focus()
  }, [entries.length])
  if (entries.length === 0) return null
  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby="error-summary-title">
      <h2 id="error-summary-title">There are {entries.length} problems</h2>
      <ul>
        {entries.map(([field, message]) => (
          <li key={field}><a href={\`#\${field}\`}>{message}</a></li>
        ))}
      </ul>
    </div>
  )
}`,
        note: 'Setelah submit gagal, focus mendarat di ringkasan yang langsung diumumkan; setiap link melompat ke field-nya (yang `id`-nya sama dengan nama field).',
      },
    ],
    realCase: {
      title: 'Checkout yang tidak bisa diselesaikan pengguna screen reader',
      story: `**Situasi:** sebuah toko grosir online mendesain ulang checkout dengan input yang hanya punya placeholder dan border merah untuk error. **Gejala:** keluhan aksesibilitas berdatangan dan tingkat penyelesaian di kalangan pengguna keyboard turun secara terukur; pengguna screen reader menekan "Pay", tidak mendengar apa-apa, lalu mengira situsnya rusak. **Akar masalah:** tidak ada label, error tidak terhubung maupun diumumkan, focus tetap di tombol setelah submit gagal, dan dropdown slot pengiriman berbasis div buatan sendiri tidak mendukung keyboard. **Perbaikan:** label, error lewat \`aria-describedby\`, focus ke field pertama yang tidak valid, \`<select>\` native, dan token \`autoComplete\` yang benar. Tingkat penyelesaian membaik untuk semua pengguna, bukan hanya pengguna teknologi bantu. **Pelajaran:** form yang aksesibel adalah form yang lebih baik.`,
    },
    pitfalls: [
      'Memakai placeholder sebagai label.',
      'Error yang terlihat tapi tidak dihubungkan lewat `aria-describedby` atau tidak diumumkan.',
      'Membiarkan focus tetap di tombol submit setelah validasi gagal.',
      'Tidak memakai token `autoComplete`, sehingga autofill dan password manager tidak berfungsi.',
      'Membangun ulang kontrol native dengan div tanpa dukungan keyboard dan ARIA.',
    ],
    exercise: {
      task: 'Ambil form alamat pengiriman dengan 5 field dan buat sepenuhnya aksesibel: label, fieldset/legend, petunjuk, error yang terhubung, token `autoComplete`, focus ke error pertama, dan live region yang mengumumkan "Address saved". Verifikasi dengan query `getByRole` dari Testing Library.',
      hint: 'Token alamat: `name`, `address-line1`, `address-level2` (kota), `postal-code`, `country`.',
      solution: `\`\`\`tsx
<form onSubmit={onSubmit} noValidate>
  <fieldset>
    <legend>Shipping address</legend>
    <TextField label="Full name" name="name" autoComplete="name" required error={errors.name} />
    <TextField label="Street address" name="line1" autoComplete="address-line1" required error={errors.line1} />
    <TextField label="City" name="city" autoComplete="address-level2" required error={errors.city} />
    <TextField label="Postal code" name="postal" autoComplete="postal-code" inputMode="numeric" error={errors.postal} />
    <TextField label="Country" name="country" autoComplete="country-name" error={errors.country} />
  </fieldset>
  <button type="submit">Save address</button>
  <p role="status">{saved ? 'Address saved' : ''}</p>
</form>

// test
expect(screen.getByRole('textbox', { name: /city/i })).toHaveAttribute('aria-invalid', 'true')
\`\`\`
Pindahkan focus ke field pertama yang tidak valid di \`onSubmit\` dengan \`document.getElementById(firstErrorName)?.focus()\` (atau pakai \`shouldFocusError\` bawaan RHF).`,
    },
    interview: [
      'Kenapa placeholder bukan pengganti label?',
      'Apa fungsi `aria-describedby` dan `aria-invalid`, dan kapan masing-masing perlu dipasang?',
      'Jelaskan perilaku focus yang ideal setelah submit form gagal.',
    ],
  },

  auth: {
    explanation: `Autentikasi di sisi client sebagian besar soal **tidak mempersulit tugas server** dan tidak membocorkan kredensial. Browser tidak akan pernah bisa jadi batas keamanan: siapa pun bisa mengubah JavaScript-mu. Server yang memutuskan siapa seseorang dan apa yang boleh dia lakukan; client menyimpan bukti identitas dengan aman dan menyesuaikan tampilan UI.

### Di mana menyimpan session

- **Cookie httpOnly, Secure, SameSite** yang di-set oleh server: JavaScript tidak bisa membacanya, jadi bug XSS tidak bisa mencuri token-nya. Browser mengirimnya otomatis di setiap request ke origin tersebut. Ini default yang direkomendasikan untuk aplikasi web yang punya backend sendiri (atau backend-for-frontend).
- **Token di localStorage / sessionStorage**: script apa pun di halaman, termasuk yang disisipkan penyerang atau dependency yang disusupi, bisa membaca dan mengirimnya keluar. Praktis, tapi satu XSS langsung berujung pengambilalihan akun sepenuhnya.
- **Access token di memori** dengan refresh token di cookie httpOnly adalah jalan tengah yang masuk akal untuk arsitektur SPA-ke-API: saat reload, aplikasi memanggil endpoint refresh.

Cookie membawa risiko **CSRF**: situs lain bisa memicu request yang ikut membawa cookie-mu. \`SameSite=Lax\` atau \`Strict\` memblokir sebagian besarnya; tambahkan token CSRF atau wajibkan header custom untuk request yang mengubah state bila diperlukan.

### Tanggung jawab di sisi client

- Muat pengguna saat ini sekali saja (\`useQuery(['me'])\` atau root loader) dan ekspos lewat hook. Belum diketahui, anonim, dan terautentikasi adalah tiga state yang berbeda; jangan sampai halaman login berkedip muncul selama session masih dimuat.
- **Protected route**: redirect pengguna yang belum login di loader atau layout, sambil menyimpan tujuan awalnya (\`/login?redirectTo=/billing\`). Setelah login, pastikan \`redirectTo\` adalah path relatif untuk menghindari open redirect.
- Tangani **401** secara global: bersihkan data pengguna yang di-cache lalu redirect ke login. Tangani **403** sebagai "kamu sudah login tapi tidak diizinkan", yang merupakan layar berbeda.
- Saat logout, panggil server untuk menginvalidasi session dan \`queryClient.clear()\` supaya pengguna berikutnya di komputer bersama tidak melihat data yang ter-cache.
- Sembunyikan UI untuk izin yang tidak dimiliki pengguna, tapi jangan pernah mengandalkannya: API harus menegakkan otorisasi di setiap request.

### Identitas pihak ketiga

Untuk provider OAuth/OIDC, pakai Authorization Code flow dengan PKCE lewat library yang terawat atau lewat backend-mu; jangan pernah mengimplementasikan kriptografi atau parsing token sendiri. Hindari menaruh token di URL.`,
    examples: [
      {
        title: '❌ Token di localStorage vs ✅ session cookie dengan credentials',
        code: `// ❌ readable by any injected script
localStorage.setItem('token', data.accessToken)
fetch('/api/invoices', { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } })

// ✅ the server sets: Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax; Path=/
export async function apiFetch<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const res = await fetch(\`/api\${path}\`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch', ...init?.headers },
  })
  if (res.status === 401) throw new UnauthorizedError()
  if (res.status === 403) throw new ForbiddenError()
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return schema.parse(await res.json())
}`,
        note: 'Client sama sekali tidak menyentuh token. 401 dan 403 menjadi error ber-type sehingga aplikasi bisa redirect ke login atau menampilkan halaman "tidak punya akses".',
      },
      {
        title: '✅ Login dengan redirect balik yang aman',
        code: `function safeRedirect(target: string | null, fallback = '/') {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return fallback
  return target
}

export function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const login = useMutation({
    mutationFn: api.login,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] })
      navigate(safeRedirect(params.get('redirectTo')), { replace: true })
    },
  })
  return <LoginForm onSubmit={(v) => login.mutate(v)} error={login.error?.message} />
}

export function useLogout() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return async () => {
    await api.logout()
    qc.clear() // drop every cached query from the previous user
    navigate('/login', { replace: true })
  }
}`,
        note: '`safeRedirect` memblokir open redirect seperti `?redirectTo=https://evil.example` atau `//evil.example`. `replace: true` membuat halaman login tidak masuk history. Logout membersihkan seluruh cache.',
      },
    ],
    realCase: {
      title: 'Script analytics yang disusupi dan token yang dicuri',
      story: `**Situasi:** sebuah SaaS B2B menyimpan JWT di \`localStorage\` dan memuat widget chat pihak ketiga. **Gejala:** tim security mendapati panggilan API dari IP tak dikenal yang memakai token pelanggan yang valid. **Akar masalah:** CDN milik widget itu sudah diutak-atik dalam insiden supply chain yang menimpa vendor (fiktif) tersebut; script yang disisipkan membaca \`localStorage\` dan mengirim token keluar. **Perbaikan:** session dipindah ke cookie httpOnly SameSite lewat backend-for-frontend, Content Security Policy yang ketat membatasi sumber script, script pihak ketiga dimuat dengan integrity hash, dan semua token dicabut. **Pelajaran:** anggap saja suatu saat akan ada script asing yang berjalan di halamanmu; simpan rahasia di tempat yang tidak bisa dijangkau script.`,
    },
    pitfalls: [
      'Menyimpan token berumur panjang di `localStorage`.',
      'Menganggap pengecekan role di client sebagai otorisasi.',
      'Redirect ke `redirectTo` tanpa validasi, sehingga tercipta open redirect.',
      'Tidak membersihkan query cache saat logout, sehingga data bocor ke pengguna berikutnya.',
      'Memperlakukan 401 dan 403 dengan cara yang sama, sehingga pengguna yang sudah login tapi tidak punya izin terjebak dalam loop login.',
    ],
    exercise: {
      task: 'Implementasikan `useSession()` yang mengembalikan discriminated union `loading | anonymous | authenticated(user)`, layout route `RequireAuth` yang melakukan redirect dengan `redirectTo`, dan handler 401 global di QueryClient yang membersihkan cache lalu bernavigasi ke login.',
      hint: 'Pakai `QueryCache({ onError })` di QueryClient untuk menangkap `UnauthorizedError` dari query mana pun.',
      solution: `\`\`\`tsx
type Session = { status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; user: User }

export function useSession(): Session {
  const { data, isPending, error } = useQuery({ queryKey: ['me'], queryFn: api.getMe, retry: false })
  if (isPending) return { status: 'loading' }
  if (error instanceof UnauthorizedError || !data) return { status: 'anonymous' }
  return { status: 'authenticated', user: data }
}

export function RequireAuth() {
  const session = useSession()
  const location = useLocation()
  if (session.status === 'loading') return <FullPageSpinner />
  if (session.status === 'anonymous') {
    const to = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={\`/login?redirectTo=\${to}\`} replace />
  }
  return <Outlet />
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err) => {
      if (err instanceof UnauthorizedError) {
        queryClient.clear()
        router.navigate('/login')
      }
    },
  }),
})
\`\`\``,
    },
    interview: [
      'Bandingkan cookie httpOnly dan localStorage untuk token session. Ancaman apa yang ditangkal masing-masing?',
      'Apa itu CSRF dan bagaimana `SameSite` memitigasinya?',
      'Kenapa protected route di React saja tidak cukup untuk melindungi data?',
    ],
  },
}

export default details
