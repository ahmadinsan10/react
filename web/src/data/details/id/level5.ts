import type { TopicDetail } from '../../types'

const details: Record<string, TopicDetail> = {
  placement: {
    explanation: `Kebanyakan "masalah state management" sebenarnya bukan soal library. Masalahnya adalah **state tinggal di tempat yang salah**, biasanya terlalu tinggi. Setiap potong state punya rumah yang paling cocok; kalau rumahnya dipilih dengan tepat, prop drilling, re-render yang tidak perlu, dan bug sinkronisasi ikut hilang.

### Tangga pilihan, dari yang terdekat sampai terluas

1. **Diturunkan, bukan disimpan**: kalau bisa dihitung dari props atau state lain saat render (list yang difilter, total, \`isValid\`), jangan disimpan sama sekali.
2. **State lokal** (\`useState\`/\`useReducer\`) di satu component yang memakainya: dropdown yang terbuka, state hover, draft input.
3. **State yang diangkat (lifted)**: dua component bersaudara membutuhkannya, jadi pindahkan ke parent bersama terdekat lalu oper ke bawah.
4. **URL**: harus bertahan setelah refresh, bisa dibagikan, atau bekerja dengan tombol back: filter, tab, pagination, item yang dipilih.
5. **Context**: banyak component di kedalaman berbeda butuh nilai yang jarang berubah: tema, locale, pengguna saat ini, service yang cakupannya satu fitur.
6. **External store** (Zustand, Redux, Jotai): client state level aplikasi yang sering berubah dan dibaca di banyak tempat, sehingga butuh subscription yang granular: keranjang belanja, state editor, wizard multi-langkah yang melintasi beberapa route.
7. **Server cache** (TanStack Query, loader): apa pun yang dimiliki server.

Selalu pilih **level terdekat yang sudah cukup**, dan naikkan hanya saat muncul kebutuhan yang nyata.

### Kenapa "terlalu tinggi" merugikan

State yang ditaruh tinggi berarti setiap update me-render ulang subtree yang besar, component jadi terikat ke global yang sebenarnya tidak mereka butuhkan, test butuh provider, dan fitur tidak bisa dihapus dengan bersih. Teks input pencarian yang disimpan di Redux menyebabkan pengecekan subscriber di seluruh aplikasi setiap kali mengetik, tanpa manfaat apa pun.

### Kenapa "terlalu rendah" merugikan

State yang ditaruh terlalu rendah memaksa sinkronisasi: dua component masing-masing memegang salinan, lalu effect berusaha menjaga keduanya tetap selaras. Gejalanya adalah \`useEffect(() => setX(props.y), [props.y])\`. Itu hampir selalu pertanda state-nya seharusnya diangkat, diturunkan, atau diberi key.

### Colocation

Simpan state, component yang memakainya, dan test-nya di folder fitur yang sama. Saat fitur dihapus, state-nya ikut hilang. Colocation juga mempermudah code review: pembaca bisa melihat semua penulis sebuah state.

### Checklist keputusan singkat

- Bisa diturunkan? Turunkan.
- Hanya satu component yang memakainya? Lokal.
- Perlu terekam di URL? URL.
- Dimiliki server? Query cache.
- Dibaca luas dan jarang berubah? Context.
- Dibaca luas dan sering berubah? Store dengan selector.`,
    examples: [
      {
        title: '❌ State duplikat + disinkronkan vs ✅ diturunkan dan diangkat',
        code: `// ❌ storing a copy of derived data and syncing with an effect
function CartSummaryBad({ items }: { items: CartItem[] }) {
  const [total, setTotal] = useState(0)
  useEffect(() => {
    setTotal(items.reduce((sum, i) => sum + i.price * i.qty, 0))
  }, [items]) // extra render, briefly wrong total
  return <p>Total: {formatMoney(total)}</p>
}

// ✅ derived during render
function CartSummary({ items }: { items: CartItem[] }) {
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  return <p>Total: {formatMoney(total)}</p>
}

// ✅ selection lifted to the closest common parent, not a global store
function InboxPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return (
    <div className="split">
      <MessageList selectedId={selectedId} onSelect={setSelectedId} />
      <MessagePreview messageId={selectedId} />
    </div>
  )
}`,
        note: 'Total tidak mungkin melenceng karena tidak pernah disimpan. Seleksi dipakai bersama oleh tepat dua component bersaudara, jadi parent-nya yang memiliki. Kalau seleksi harus bertahan setelah refresh, langkah berikutnya adalah search param, bukan Redux.',
      },
    ],
    realCase: {
      title: 'Satu global store untuk segalanya',
      story: `**Situasi:** sebuah platform HR menaruh hampir semua state di satu store Redux: draft form, flag modal, state hover, dan data API. **Gejala:** mengetik di field mana pun terasa lag di laptop spek rendah; menghapus satu fitur lama butuh seminggu karena slice-nya dirujuk di mana-mana. **Akar masalah:** state tinggal jauh di atas pemakainya, dan setiap ketikan men-dispatch action global yang menjalankan selector milik semua subscriber. **Perbaikan:** draft form dipindah ke React Hook Form, flag modal ke state lokal, data API ke TanStack Query, filter ke URL. Redux hanya menyimpan preferensi UI yang berkaitan dengan auth. **Pelajaran:** global adalah pilihan terakhir, bukan default.`,
    },
    pitfalls: [
      'Menyimpan nilai turunan lalu menyinkronkannya dengan effect.',
      'Menaruh state di global store "jaga-jaga kalau nanti ada yang butuh".',
      'Menyimpan state tampilan yang perlu dibagikan (filter, tab) di memori, bukan di URL.',
      'Mengangkat state sampai ke root aplikasi padahal ada parent bersama yang lebih dekat.',
    ],
    exercise: {
      task: 'Ambil sebuah halaman yang berisi list, filter bar, drawer detail, dan preferensi "compact view". Tentukan rumah untuk setiap state (data list, nilai filter, item yang dipilih, drawer terbuka, compact view, catatan yang belum disimpan di drawer) lalu implementasikan.',
      hint: 'Apakah "drawer terbuka" itu state terpisah, atau diturunkan dari "item yang dipilih tidak null"?',
      solution: `- Data list: **server cache** (\`useQuery(['items', filters])\`).
- Filter: search params di **URL**.
- Item yang dipilih: **URL** (\`?selected=42\`) supaya drawer bisa dibuka lewat deep link.
- Drawer terbuka: **diturunkan**: \`const open = selected !== null\`. Tidak perlu state terpisah.
- Compact view: **preferensi client yang di-persist** (store Zustand kecil dengan \`persist\`, atau hook localStorage).
- Catatan yang belum disimpan: state **lokal** di dalam drawer; di-reset per item dengan \`key={selectedId}\`.

\`\`\`tsx
const [params, setParams] = useSearchParams()
const selected = params.get('selected')
<Drawer open={selected !== null} onClose={() => setParams((p) => { p.delete('selected'); return p })}>
  {selected && <NoteEditor key={selected} itemId={selected} />}
</Drawer>
\`\`\``,
    },
    interview: [
      'Jelaskan level-level tempat state bisa tinggal dan bagaimana kamu memilih di antaranya.',
      'Code smell apa yang menandakan state ditaruh terlalu rendah?',
      'Kenapa menaruh state input form di global store biasanya keliru?',
    ],
  },

  'context-perf': {
    explanation: `Context adalah **mekanisme dependency injection**, bukan state manager. Provider membuat sebuah nilai tersedia untuk semua yang ada di bawahnya; \`useContext\` (atau \`use(Context)\` di React 19) membaca provider terdekat. Aturan performanya sederhana dan tegas: **saat nilai provider berubah (menurut \`Object.is\`), setiap component yang membaca context itu akan re-render**, tidak peduli bagian mana dari nilai itu yang dipakai, dan \`memo\` di component perantara tidak bisa mencegahnya.

### Kenapa ini sering menjebak

Kode yang umum: \`<AppContext.Provider value={{ user, theme, cart, setCart }}>\`. Ada dua masalah:

- Object literal itu **baru di setiap render** provider, jadi semua consumer ikut re-render setiap kali provider re-render, walaupun tidak ada yang berubah.
- Data yang tidak berkaitan berbagi satu context, sehingga update keranjang me-render ulang setiap component yang sebenarnya cuma butuh tema.

Context biasa tidak punya selector: kamu tidak bisa subscribe ke "cuma \`user.name\`".

### Teknik-teknik

1. **Pecah context berdasarkan urusan dan frekuensi perubahannya**: \`ThemeContext\`, \`AuthContext\`, \`CartContext\`. Nilai yang jarang berubah di satu context, nilai yang sering berubah di context lain.
2. **Pisahkan state dari dispatch**: taruh \`dispatch\` (atau objek action yang stabil) di context tersendiri. Component yang hanya memicu update (tombol "Add to cart") subscribe ke context action yang stabil itu dan tidak pernah re-render saat keranjang berubah.
3. **Stabilkan nilainya**: memoize objek value (\`useMemo\`) dan callback (\`useCallback\`), atau biarkan React Compiler yang melakukannya. \`dispatch\` dari \`useReducer\` dan setter dari \`useState\` sudah stabil dari sananya.
4. **Turunkan posisi provider**: provider untuk sebuah wizard cukup membungkus wizard itu, bukan seluruh aplikasi.
5. **Teruskan lewat children**: component yang di-render sebagai \`children\` dari component provider yang punya state dibuat oleh parent-nya, jadi tidak ikut re-render hanya karena state provider berubah; yang re-render hanya consumer-nya.

### Kapan berhenti memakai context

Kalau banyak component butuh *potongan yang berbeda* dari state yang sering berubah, yang kamu butuhkan adalah subscription dengan selector. Itulah persis yang diberikan Zustand, Redux (\`useSelector\`), dan Jotai, dengan \`useSyncExternalStore\` di baliknya. Context sangat pas untuk nilai seperti tema, locale, pengguna saat ini, atau untuk menyuntikkan instance store/client (QueryClient dioper lewat context, tapi datanya di-subscribe secara terpisah).

### Ukur dulu

Pakai Profiler di React DevTools dengan "highlight updates" untuk melihat siapa yang re-render dan kenapa. Re-render tidak otomatis jadi masalah; baru jadi masalah kalau mahal atau sangat sering.`,
    examples: [
      {
        title: '❌ Satu context dengan nilai yang tidak stabil vs ✅ state dan action dipisah',
        code: `// ❌ new object every render; theme readers re-render on cart changes
function AppProviderBad({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  return (
    <AppContext.Provider value={{ cart, setCart, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  )
}

// ✅ separate contexts, stable actions
type CartActions = { add: (item: CartItem) => void; remove: (id: string) => void }
const CartStateContext = createContext<CartItem[] | null>(null)
const CartActionsContext = createContext<CartActions | null>(null)

function cartReducer(state: CartItem[], action: { type: 'add'; item: CartItem } | { type: 'remove'; id: string }) {
  switch (action.type) {
    case 'add': return [...state, action.item]
    case 'remove': return state.filter((i) => i.id !== action.id)
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, [])
  const actions = useMemo<CartActions>(() => ({
    add: (item) => dispatch({ type: 'add', item }),
    remove: (id) => dispatch({ type: 'remove', id }),
  }), [])
  return (
    <CartActionsContext.Provider value={actions}>
      <CartStateContext.Provider value={cart}>{children}</CartStateContext.Provider>
    </CartActionsContext.Provider>
  )
}

export function useCartActions() {
  const ctx = useContext(CartActionsContext)
  if (!ctx) throw new Error('useCartActions must be used inside CartProvider')
  return ctx
}`,
        note: 'Tombol "Add to cart" yang hanya memakai `useCartActions()` tidak pernah re-render saat keranjang berubah, karena objek action-nya hanya dibuat sekali. Custom hook-nya juga melempar error yang jelas kalau provider-nya tidak ada.',
      },
    ],
    realCase: {
      title: 'Lag saat mengetik gara-gara context "global"',
      story: `**Situasi:** aplikasi CRM menyimpan query pencarian, pengguna saat ini, permission, dan notifikasi dalam satu \`AppContext\`. **Gejala:** setiap ketikan di kotak pencarian global memakan 80–120ms di laptop kelas menengah; profiler menunjukkan ratusan component re-render. **Akar masalah:** query pencarian tinggal di root context, jadi setiap consumer, termasuk tabel-tabel besar yang cuma membaca permission, re-render di setiap ketikan. **Perbaikan:** query dipindah ke state lokal di component pencarian (dan ke URL saat submit), permission dan pengguna masuk ke \`SessionContext\` yang jarang berubah, notifikasi masuk ke store Zustand kecil dengan selector. **Pelajaran:** perubahan nilai context menyebar ke setiap consumer; taruh state yang cepat berubah dekat dengan tempat pemakaiannya.`,
    },
    pitfalls: [
      'Mengoper objek/array inline sebagai value provider, sehingga tercipta nilai baru di setiap render.',
      'Menggabungkan data yang tidak berkaitan dan ritme perubahannya berbeda ke dalam satu context.',
      'Mengira `memo` bisa memblokir re-render yang dipicu context; tidak bisa.',
      'Memakai context untuk state berfrekuensi tinggi yang dibaca di banyak tempat, padahal store dengan selector lebih cocok.',
      'Memberi nilai default yang menyembunyikan provider yang hilang; lebih baik `null` plus custom hook yang melempar error.',
    ],
    exercise: {
      task: 'Buat `NotificationsProvider` yang mengekspos `notifications` serta action `push/dismiss`. Tambahkan `NotifyButton` yang hanya melakukan push dan `NotificationList` yang membaca. Buktikan dengan React DevTools (atau penghitung render) bahwa `NotifyButton` tidak re-render saat notifikasi berubah.',
      hint: 'Dua context, `useReducer`, dan objek action dari `useMemo` dengan dependency array kosong.',
      solution: `\`\`\`tsx
const ListCtx = createContext<Notification[] | null>(null)
const ActionsCtx = createContext<{ push: (n: Omit<Notification, 'id'>) => void; dismiss: (id: string) => void } | null>(null)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [list, dispatch] = useReducer(reducer, [])
  const actions = useMemo(() => ({
    push: (n: Omit<Notification, 'id'>) => dispatch({ type: 'push', n: { ...n, id: crypto.randomUUID() } }),
    dismiss: (id: string) => dispatch({ type: 'dismiss', id }),
  }), [])
  return (
    <ActionsCtx.Provider value={actions}>
      <ListCtx.Provider value={list}>{children}</ListCtx.Provider>
    </ActionsCtx.Provider>
  )
}

function NotifyButton() {
  const renders = useRef(0)
  renders.current++ // debug only
  const { push } = useNotificationActions()
  return <button onClick={() => push({ text: 'Saved' })}>Notify</button>
}
\`\`\`
Klik berulang kali akan menambah isi list, sementara jumlah render tombol tetap 1 (2 di StrictMode saat development).`,
    },
    interview: [
      'Kenapa setiap consumer re-render saat nilai context berubah, dan kenapa `memo` tidak membantu?',
      'Jelaskan pola "pisahkan state dan dispatch".',
      'Kapan kamu mengganti context dengan Zustand atau Redux?',
    ],
  },

  stores: {
    explanation: `**External store** adalah state yang tinggal di luar pohon React dalam objek JavaScript biasa, lengkap dengan mekanisme subscribe. Component subscribe memakai **selector** dan hanya re-render saat potongan yang dipilih berubah. React mengintegrasikannya dengan aman (tanpa tearing saat concurrent rendering) lewat \`useSyncExternalStore\`, yang dipakai secara internal oleh Zustand maupun React Redux.

### Kapan kamu membutuhkannya

Pakai store untuk **client state** yang dipakai bersama secara luas, sering berubah, atau harus diakses dari luar React (di interceptor API, handler WebSocket): keranjang belanja, editor, alur multi-langkah yang melintasi beberapa route, preferensi UI, presence di kolaborasi real-time. Jangan pakai untuk data server (pakai query cache) atau state tampilan yang perlu dibagikan (pakai URL).

### Zustand

Store adalah hook yang dibuat dengan \`create\`. State dan action tinggal bersama. Di TypeScript, pakai bentuk curried \`create<State>()(...)\`.

- **Selector adalah model performanya**: \`useCartStore((s) => s.items.length)\` hanya re-render saat jumlahnya berubah. Memanggil \`useCartStore()\` tanpa selector berarti subscribe ke semuanya.
- Selector harus mengembalikan nilai yang stabil. Mengembalikan objek atau array baru di setiap panggilan (\`(s) => ({ a: s.a, b: s.b })\`) berarti nilainya selalu berubah; di Zustand v5 ini bisa memicu loop re-render tanpa akhir. Pakai selector terpisah atau bungkus dengan \`useShallow\`.
- \`set\` melakukan merge di level teratas; update data bersarang secara immutable (atau tambahkan middleware \`immer\`).
- Middleware: \`persist\` (storage, dengan \`version\` dan \`migrate\`), \`devtools\`, \`immer\`, \`subscribeWithSelector\`.
- Di luar React: \`useCartStore.getState()\` dan \`useCartStore.subscribe\`.

Export custom hook (\`useCartCount\`) alih-alih store mentahnya, supaya component tidak terikat ke bentuk store.

### Redux Toolkit

Banyak codebase enterprise memakai Redux. RTK sudah memangkas boilerplate-nya: \`createSlice\` menghasilkan action creator dan reducer (dengan Immer sehingga "mutasi" aman), \`configureStore\` menyiapkan devtools dan middleware. Pakai hook ber-type (\`useAppSelector\`, \`useAppDispatch\` lewat \`.withTypes\`). Tulis **selector yang di-memoize** dengan \`createSelector\` untuk data turunan. Kekuatannya ada di alur satu arah yang ketat, satu log action, debugging time-travel, dan konvensi yang tetap rapi untuk tim besar.

**RTK Query** adalah lapisan server state milik Redux: definisikan endpoint dengan \`createApi\`, dapatkan hook yang di-generate, dan pakai cache tag untuk invalidasi. Kalau kamu bekerja di codebase Redux, utamakan ini dibanding thunk buatan sendiri yang menyimpan data API.

### Memilih

Zustand: API minimal, sedikit seremoni, cocok untuk sebagian besar aplikasi. Redux Toolkit: konvensi kuat, ekosistem middleware, familier bagi tim besar. Dua-duanya oke; yang lebih penting adalah menjaga store tetap kecil dan hanya mengisinya dengan client state yang benar-benar global.`,
    examples: [
      {
        title: '✅ Store keranjang Zustand dengan persist dan selector',
        code: `import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

type CartLine = { productId: string; name: string; unitPrice: number; qty: number }
type CartState = {
  lines: CartLine[]
  add: (line: Omit<CartLine, 'qty'>) => void
  setQty: (productId: string, qty: number) => void
  clear: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((s) => {
          const existing = s.lines.find((l) => l.productId === line.productId)
          return {
            lines: existing
              ? s.lines.map((l) => (l.productId === line.productId ? { ...l, qty: l.qty + 1 } : l))
              : [...s.lines, { ...line, qty: 1 }],
          }
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          lines: qty <= 0
            ? s.lines.filter((l) => l.productId !== productId)
            : s.lines.map((l) => (l.productId === productId ? { ...l, qty } : l)),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'cart', version: 1 },
  ),
)

// Public hooks: narrow subscriptions
export const useCartCount = () => useCartStore((s) => s.lines.reduce((n, l) => n + l.qty, 0))
export const useCartActions = () =>
  useCartStore(useShallow((s) => ({ add: s.add, setQty: s.setQty, clear: s.clear })))`,
        note: '`useCartCount` hanya me-render ulang badge di header saat angkanya berubah. `useShallow` memungkinkan satu selector mengembalikan objek berisi action tanpa menghasilkan hasil subscription baru setiap kali.',
      },
      {
        title: '❌ Memilih seluruh store vs ✅ slice Redux Toolkit dengan selector yang di-memoize',
        code: `// ❌ re-renders on every cart change, even unrelated fields
const { lines } = useCartStore()

// ✅ Redux Toolkit
import { createSlice, createSelector, configureStore, type PayloadAction } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'

const cartSlice = createSlice({
  name: 'cart',
  initialState: { lines: [] as CartLine[], couponCode: null as string | null },
  reducers: {
    added(state, action: PayloadAction<Omit<CartLine, 'qty'>>) {
      const line = state.lines.find((l) => l.productId === action.payload.productId)
      if (line) line.qty += 1 // Immer makes this safe
      else state.lines.push({ ...action.payload, qty: 1 })
    },
    couponApplied(state, action: PayloadAction<string>) {
      state.couponCode = action.payload
    },
  },
})

export const store = configureStore({ reducer: { cart: cartSlice.reducer } })
type RootState = ReturnType<typeof store.getState>
export const useAppSelector = useSelector.withTypes<RootState>()
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>()

export const selectSubtotal = createSelector(
  [(s: RootState) => s.cart.lines],
  (lines) => lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
)
// const subtotal = useAppSelector(selectSubtotal)`,
        note: '`createSelector` hanya menghitung ulang saat `lines` berubah, jadi memasang kupon tidak memicu penghitungan ulang subtotal. Hook ber-type membuatmu tidak perlu menganotasi `RootState` di mana-mana.',
      },
    ],
    realCase: {
      title: 'Loop tanpa akhir setelah upgrade Zustand',
      story: `**Situasi:** tim marketplace melakukan upgrade ke Zustand v5. **Gejala:** halaman produk crash dengan "Maximum update depth exceeded". **Akar masalah:** sebuah selector membuat objek baru di setiap panggilan: \`useStore((s) => ({ items: s.items, total: s.total }))\`. Di v4 ini hanya menyebabkan re-render yang sia-sia; dengan perilaku v5 yang lebih ketat dan berbasis \`useSyncExternalStore\`, snapshot yang selalu baru memicu loop render. **Perbaikan:** selector dipecah jadi dua selector primitif, dan selector objek yang tersisa dibungkus dengan \`useShallow\`; aturan lint ditambahkan untuk menandai selector berupa object literal. **Pelajaran:** selector harus mengembalikan referensi yang stabil; model subscription store bergantung pada hal itu.`,
    },
    pitfalls: [
      'Memanggil hook store tanpa selector, sehingga subscribe ke semuanya.',
      'Selector yang mengembalikan objek/array baru setiap kali (pakai nilai primitif, `useShallow`, atau selector yang di-memoize).',
      'Menaruh data server di store alih-alih query cache.',
      'Mengubah bentuk store yang di-persist tanpa `version`/`migrate`, sehingga pengguna lama yang kembali dengan data lama mengalami crash.',
      'Meng-export store mentah ke mana-mana alih-alih custom hook yang terfokus, sehingga component terikat ke bentuk internalnya.',
    ],
    exercise: {
      task: 'Buat store Zustand untuk "editor UI": id shape yang dipilih, tool yang aktif, level zoom. Ekspos `useActiveTool`, `useIsSelected(id)`, dan sebuah hook action. Persist hanya `activeTool` dan `zoom` (bukan seleksi) memakai `partialize`.',
      hint: '`useIsSelected(id)` sebaiknya mengembalikan boolean supaya setiap shape hanya re-render saat status seleksinya sendiri berubah.',
      solution: `\`\`\`ts
type Tool = 'select' | 'rect' | 'text'
type EditorState = {
  selected: string[]; tool: Tool; zoom: number
  select: (id: string, additive?: boolean) => void
  setTool: (t: Tool) => void
  setZoom: (z: number) => void
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      selected: [], tool: 'select', zoom: 1,
      select: (id, additive = false) =>
        set((s) => ({ selected: additive ? [...new Set([...s.selected, id])] : [id] })),
      setTool: (tool) => set({ tool }),
      setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.25, zoom)) }),
    }),
    { name: 'editor-ui', partialize: (s) => ({ tool: s.tool, zoom: s.zoom }) },
  ),
)

export const useActiveTool = () => useEditorStore((s) => s.tool)
export const useIsSelected = (id: string) => useEditorStore((s) => s.selected.includes(id))
export const useEditorActions = () =>
  useEditorStore(useShallow((s) => ({ select: s.select, setTool: s.setTool, setZoom: s.setZoom })))
\`\`\``,
    },
    interview: [
      'Bagaimana selector mencegah re-render yang tidak perlu di Zustand atau Redux?',
      'Kenapa selector yang mengembalikan `{ a, b }` bisa menimbulkan masalah, dan bagaimana cara memperbaikinya?',
      'Bandingkan Zustand dan Redux Toolkit. Kapan kamu memilih masing-masing?',
    ],
  },

  jotai: {
    explanation: `Jotai memodelkan state sebagai **atom**: unit-unit kecil yang independen dan di-subscribe component secara individual. Alih-alih satu store besar yang kamu pilih isinya (top-down), kamu menyusun state dari bawah ke atas (bottom-up). Component yang membaca \`countAtom\` hanya re-render saat \`countAtom\` berubah.

### Atom primitif dan atom turunan

- \`atom(0)\` membuat atom primitif dengan nilai awal. \`useAtom(a)\` mengembalikan \`[value, set]\`, mirip \`useState\` tapi bisa dipakai bersama. \`useAtomValue\` dan \`useSetAtom\` memisahkan baca dan tulis, sehingga component yang hanya menulis tidak ikut re-render.
- \`atom((get) => get(priceAtom) * get(qtyAtom))\` adalah **atom turunan**: dia melacak dependency-nya secara otomatis dan hanya menghitung ulang saat dependency itu berubah. Hasilnya adalah graf dependency, mirip spreadsheet.
- Atom turunan yang bisa ditulis menerima fungsi write: \`atom(null, (get, set, arg) => ...)\` berperan seperti action.
- Atom async mengembalikan promise dan terintegrasi dengan Suspense.

### Di mana Jotai unggul

State UI yang sangat saling terhubung: design tool, editor diagram, spreadsheet, form builder, di mana ribuan item masing-masing butuh state dan nilai turunannya sendiri. Pola ala \`atomFamily\` (atau atom yang dibuat per item lalu disimpan di map) memberi setiap item subscription-nya sendiri, jadi mengedit satu node hanya me-render ulang node itu.

### Scoping

Secara default, atom tinggal di default store global. Bungkus sebuah subtree dengan \`<Provider>\` untuk memberinya nilai atom yang terisolasi (misalnya dua instance editor yang independen, atau untuk test).

### Trade-off

Atom gampang dibuat, sehingga gampang juga state jadi tercecer di mana-mana. Tanpa konvensi, sulit melihat seluruh state sebuah fitur sekaligus, dan tidak ada satu log action seperti di Redux. Simpan atom di \`atoms.ts\` milik fitur, ekspos lewat custom hook, dan jangan pakai atom untuk server state (pakai TanStack Query, atau integrasi jotai-tanstack-query).`,
    examples: [
      {
        title: '✅ Atom primitif, turunan, dan write-only',
        code: `import { atom, useAtomValue, useSetAtom } from 'jotai'

type Shape = { id: string; x: number; y: number; w: number; h: number }

export const shapesAtom = atom<Record<string, Shape>>({})
export const selectedIdsAtom = atom<string[]>([])

export const selectedShapesAtom = atom((get) => {
  const shapes = get(shapesAtom)
  return get(selectedIdsAtom).map((id) => shapes[id]).filter((s): s is Shape => !!s)
})

export const moveSelectedAtom = atom(null, (get, set, delta: { dx: number; dy: number }) => {
  const ids = new Set(get(selectedIdsAtom))
  set(shapesAtom, (prev) => {
    const next = { ...prev }
    for (const id of ids) {
      const s = next[id]
      if (s) next[id] = { ...s, x: s.x + delta.dx, y: s.y + delta.dy }
    }
    return next
  })
})

function SelectionInfo() {
  const selected = useAtomValue(selectedShapesAtom)
  return <p>{selected.length} selected</p>
}

function NudgeButtons() {
  const move = useSetAtom(moveSelectedAtom) // write-only: never re-renders on shape changes
  return <button onClick={() => move({ dx: 10, dy: 0 })}>→</button>
}`,
        note: 'Atom turunan melacak kedua dependency-nya secara otomatis. `useSetAtom` memberi setter yang stabil tanpa subscribe ke nilainya.',
      },
    ],
    realCase: {
      title: 'Whiteboard yang me-render ulang semuanya di setiap drag',
      story: `**Situasi:** whiteboard milik sebuah startup menyimpan semua shape dalam satu context. **Gejala:** men-drag sticky note di board berisi 2.000 item membuat frame rate anjlok jadi beberapa frame per detik. **Akar masalah:** setiap update posisi mengganti nilai context, sehingga semua shape ikut re-render. **Perbaikan:** setiap shape diberi atom sendiri (disimpan di atom berupa map id), jadi men-drag satu shape hanya meng-update satu atom dan me-render ulang satu component; state seleksi dan toolbar diubah jadi atom turunan. **Pelajaran:** subscription yang granular jadi penting ketika kamu punya banyak item yang berubah secara independen.`,
    },
    pitfalls: [
      'Membuat atom di dalam component tanpa memoization, sehingga tercipta atom baru (dan state hilang) di setiap render.',
      'Menyebar atom ke banyak file tanpa kepemilikan fitur yang jelas, sehingga state sulit dilacak.',
      'Memakai `useAtom` padahal hanya butuh setter-nya, sehingga terjadi re-render yang tidak perlu.',
    ],
    exercise: {
      task: 'Buat spreadsheet mini dengan 3 atom sel (A1, A2, A3) berisi angka dan sebuah `sumAtom` turunan. Render input untuk setiap sel dan totalnya. Pastikan mengedit A1 tidak me-render ulang input A2.',
      hint: 'Satu component per sel, masing-masing memanggil `useAtom` pada atom miliknya sendiri.',
      solution: `\`\`\`tsx
const a1 = atom(0), a2 = atom(0), a3 = atom(0)
const sumAtom = atom((get) => get(a1) + get(a2) + get(a3))

function Cell({ label, cell }: { label: string; cell: PrimitiveAtom<number> }) {
  const [v, setV] = useAtom(cell)
  return <label>{label} <input type="number" value={v} onChange={(e) => setV(e.target.valueAsNumber || 0)} /></label>
}
function Total() {
  return <output>{useAtomValue(sumAtom)}</output>
}
\`\`\``,
    },
    interview: [
      'Apa beda model atom bottom-up di Jotai dengan store top-down yang memakai selector?',
      'Apa itu atom turunan dan bagaimana dia tahu kapan harus menghitung ulang?',
    ],
  },

  xstate: {
    explanation: `**State machine** menggambarkan sebuah alur sebagai kumpulan **state** yang terbatas, **event** yang diterima tiap state, dan **transisi** yang dipicu event-event itu. Apa pun yang tidak dideskripsikan berarti mustahil terjadi: kalau state \`submitting\` tidak menangani \`EDIT\`, pengguna tidak bisa mengedit selama proses submit, berapa kali pun tombol diklik. **Statechart** memperluas konsep ini dengan state bersarang, state paralel, guard, transisi tertunda, dan side effect.

### Kenapa ini membantu

Alur seperti checkout, wizard onboarding, media player, upload file, atau koneksi WebSocket punya aturan: "hanya bisa bayar setelah pengiriman dipilih", "retry maksimal 3 kali", "timeout setelah 30 detik". Kalau dikodekan sebagai boolean dan effect, aturan-aturan itu tercecer dan gampang rusak oleh urutan kejadian yang tidak biasa (klik ganda, tombol back, response yang lambat). Machine mengumpulkan semuanya dalam satu definisi deklaratif yang bisa dibaca, divisualisasikan, dan di-test.

### Inti XState v5

- \`setup({ types, actions, actors, guards }).createMachine({...})\` mendefinisikan machine yang ber-type.
- \`context\` menyimpan data tambahan (id keranjang, pesan error, jumlah retry).
- \`on: { NEXT: 'shipping' }\` mendefinisikan transisi; kondisi \`guard\` bisa memblokirnya; \`assign\` meng-update context.
- \`invoke\` menjalankan actor (misalnya panggilan API \`fromPromise\`) selama sebuah state aktif, dengan transisi \`onDone\`/\`onError\`; keluar dari state itu akan membatalkannya.
- Di React, \`useMachine(machine)\` mengembalikan \`[snapshot, send]\`. Pakai \`snapshot.matches('payment')\` dan \`snapshot.can({ type: 'PAY' })\` untuk mengendalikan UI.

### Alternatif yang lebih ringan

Sering kali kamu tidak butuh XState: \`useReducer\` dengan state berupa discriminated union yang mengabaikan event tidak valid sudah merupakan state machine. Pakai XState saat kamu butuh state bersarang/paralel, timer, service yang di-invoke, visualisasi, atau alur yang sama di banyak layar.

### Trade-off

Ada kurva belajar dan seremoni tambahan. Pakai machine untuk alur yang benar-benar kompleks, bukan untuk setiap toggle.`,
    examples: [
      {
        title: '✅ Machine checkout dengan transisi ber-guard dan pembayaran yang di-invoke',
        code: `import { setup, assign, fromPromise } from 'xstate'
import { useMachine } from '@xstate/react'

export const checkoutMachine = setup({
  types: {
    context: {} as { addressId: string | null; error: string | null; orderId: string | null },
    events: {} as
      | { type: 'CHOOSE_ADDRESS'; addressId: string }
      | { type: 'NEXT' }
      | { type: 'BACK' }
      | { type: 'PAY' },
  },
  actors: {
    pay: fromPromise(async ({ input }: { input: { addressId: string } }) => api.pay(input.addressId)),
  },
  guards: { hasAddress: ({ context }) => context.addressId !== null },
}).createMachine({
  id: 'checkout',
  initial: 'shipping',
  context: { addressId: null, error: null, orderId: null },
  states: {
    shipping: {
      on: {
        CHOOSE_ADDRESS: { actions: assign({ addressId: ({ event }) => event.addressId }) },
        NEXT: { target: 'payment', guard: 'hasAddress' },
      },
    },
    payment: { on: { BACK: 'shipping', PAY: 'paying' } },
    paying: {
      invoke: {
        src: 'pay',
        input: ({ context }) => ({ addressId: context.addressId! }),
        onDone: { target: 'done', actions: assign({ orderId: ({ event }) => event.output.orderId }) },
        onError: { target: 'payment', actions: assign({ error: 'Payment failed, try again' }) },
      },
    },
    done: { type: 'final' },
  },
})

function Checkout() {
  const [snapshot, send] = useMachine(checkoutMachine)
  if (snapshot.matches('done')) return <Confirmation orderId={snapshot.context.orderId} />
  return (
    <button disabled={!snapshot.can({ type: 'PAY' })} onClick={() => send({ type: 'PAY' })}>
      {snapshot.matches('paying') ? 'Paying…' : 'Pay'}
    </button>
  )
}`,
        note: 'Selama di state `paying`, event `PAY` tidak ditangani, jadi submit ganda mustahil terjadi berkat desainnya sendiri. `snapshot.can` mengendalikan state disabled dari aturan yang sama.',
      },
    ],
    realCase: {
      title: 'Wizard onboarding dengan langkah yang tak bisa dijangkau',
      story: `**Situasi:** wizard penawaran asuransi memakai delapan boolean dan effect untuk menentukan langkah mana yang ditampilkan. **Gejala:** pengguna yang menekan back saat request harga sedang berjalan kadang mendarat di langkah kosong, dan tim support tidak bisa mereproduksinya. **Akar masalah:** request yang masih berjalan selesai setelah navigasi lalu membalik flag-flag menjadi kombinasi yang tidak ditangani layar mana pun. **Perbaikan:** alurnya dimodelkan sebagai statechart; request harga menjadi actor yang di-invoke dan dibatalkan saat keluar dari state-nya, dan diagram machine-nya direview bersama tim produk. **Pelajaran:** state yang eksplisit mengubah race condition menjadi transisi yang mustahil.`,
    },
    pitfalls: [
      'Memakai machine untuk toggle UI yang sepele, menambah seremoni tanpa manfaat.',
      'Menyimpan state React duplikat di samping machine, sehingga dua sumber kebenaran lama-lama tidak sinkron.',
      'Memulai pekerjaan async di component alih-alih meng-invoke actor, sehingga kehilangan pembatalan otomatis.',
    ],
    exercise: {
      task: 'Modelkan media player sebagai state machine berbasis reducer dengan state `idle | loading | playing | paused | error`, yang menerima `LOAD`, `LOADED`, `PLAY`, `PAUSE`, `FAIL`. Event yang tidak valid harus diabaikan. Setelah itu, port ke XState.',
      hint: 'Tulis tabel transisi: `Record<State, Partial<Record<Event, State>>>`.',
      solution: `\`\`\`ts
type S = 'idle' | 'loading' | 'playing' | 'paused' | 'error'
type E = 'LOAD' | 'LOADED' | 'PLAY' | 'PAUSE' | 'FAIL'
const table: Record<S, Partial<Record<E, S>>> = {
  idle: { LOAD: 'loading' },
  loading: { LOADED: 'paused', FAIL: 'error' },
  paused: { PLAY: 'playing', LOAD: 'loading' },
  playing: { PAUSE: 'paused', FAIL: 'error' },
  error: { LOAD: 'loading' },
}
export const player = (s: S, e: E): S => table[s][e] ?? s
\`\`\``,
    },
    interview: [
      'Apa arti "transisi yang mustahil memang tidak ada" dalam praktiknya?',
      'Kapan `useReducer` sudah cukup dan kapan kamu beralih ke XState?',
    ],
  },

  structure: {
    explanation: `Struktur folder adalah arsitektur yang bisa dilihat. Mengelompokkan berdasarkan **jenis file** (\`components/\`, \`hooks/\`, \`services/\`, \`utils/\`) masih oke untuk aplikasi kecil, tapi buruk saat membesar: mengubah satu fitur menyentuh lima folder, dan tidak ada yang memberi tahu apa yang aman dihapus. Mengelompokkan berdasarkan **fitur** (\`features/cart\`, \`features/auth\`, \`features/invoices\`) menjaga semua yang berubah bersamaan tetap di satu tempat.

### Layout yang umum

- \`src/app/\`: app shell, provider, router, style global.
- \`src/features/<name>/\`: component, hook, fungsi API, schema, store, dan test untuk satu fitur domain.
- \`src/shared/\` (atau \`components/ui\`, \`lib/\`): blok bangunan generik yang tidak terikat domain: Button, Modal, formatter, API client.
- \`src/pages/\` atau modul route: komposisi tipis dari fitur-fitur.

### Public API

Setiap fitur mengekspos sebuah **entry point publik** (\`features/cart/index.ts\`) yang hanya meng-export apa yang boleh dipakai pihak lain: \`CartButton\`, \`useCartCount\`, \`cartQueries\`. Sisanya internal. Kode lain meng-import \`@/features/cart\`, tidak pernah \`@/features/cart/components/CartLineItem\`. Dengan begini kamu bisa me-refactor isi sebuah fitur tanpa merusak pemanggilnya, persis seperti cara kerja sebuah library.

Barrel file ada harganya: barrel \`export *\` yang sembarangan bisa mengganggu tree-shaking dan menciptakan import cycle. Export secara eksplisit dan buat per fitur, bukan satu barrel raksasa di root.

### Arah dependency

Dependency harus mengarah ke satu arah: \`app → pages → features → shared\`. **Shared tidak pernah meng-import dari features**, dan fitur menghindari meng-import bagian internal fitur lain. Kalau dua fitur butuh hal yang sama, berarti itu milik bersama (pindahkan ke bawah) atau salah satu fitur mengeksposnya lewat public API-nya. Komposisi lintas fitur terjadi di level page/route.

### Tegakkan dengan tooling

Konvensi lama-lama luntur kalau tidak ditegakkan. Pakai aturan ESLint seperti \`no-restricted-imports\` (larang deep import ke dalam fitur), \`import/no-cycle\`, atau plugin boundary (eslint-plugin-boundaries) yang mendeklarasikan jenis elemen dan dependency yang diizinkan. Gagalkan CI kalau ada pelanggaran. Path alias TypeScript (\`@/features/*\`) membuat import lebih mudah dibaca.

### Pragmatis saja

Jangan bikin folder fitur untuk setiap component sejak hari pertama. Mulai dengan colocation, pindahkan ke \`shared\` saat fitur kedua benar-benar butuh (jangan sebelumnya), dan pecah sebuah fitur saat dia tumbuh punya dua tanggung jawab yang jelas berbeda. Tujuannya: sebuah fitur bisa dipahami, diubah, dan dihapus di satu tempat.`,
    examples: [
      {
        title: '❌ Folder berdasarkan jenis file vs ✅ folder fitur dengan public API',
        code: `// ❌ one feature smeared across the tree
src/
  components/CartDrawer.tsx  CartLine.tsx  InvoiceTable.tsx ...
  hooks/useCart.ts  useInvoices.ts ...
  services/cartApi.ts  invoiceApi.ts ...

// ✅ feature-based
src/
  app/        router.tsx  providers.tsx
  shared/     ui/Button.tsx  ui/Dialog.tsx  lib/apiClient.ts  lib/formatMoney.ts
  features/
    cart/
      api.ts            // cartQueries, mutations
      schemas.ts        // Zod schemas + inferred types
      store.ts          // Zustand UI store (internal)
      components/CartDrawer.tsx  CartLine.tsx
      index.ts          // PUBLIC API
    invoices/ ...
  pages/CheckoutPage.tsx  // composes cart + payments

// features/cart/index.ts
export { CartDrawer } from './components/CartDrawer'
export { useCartCount } from './store'
export type { Cart } from './schemas'`,
        note: 'Menghapus fitur cart berarti menghapus satu folder lalu membereskan import `@/features/cart`. `CartLine` tetap privat, jadi bebas diubah.',
      },
      {
        title: '✅ Menegakkan batas dengan ESLint',
        code: `// eslint.config.js (flat config)
export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/features/*/*'],
          message: 'Import from the feature public API (@/features/<name>) instead.',
        }],
      }],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['@/features/*', '@/pages/*', '@/app/*'], message: 'shared must not depend on features.' }],
      }],
    },
  },
]`,
        note: 'Dua aturan sederhana sudah merangkum arsitekturnya: tidak ada deep import ke dalam fitur, dan shared tidak bergantung pada apa pun di atasnya. CI gagal sebelum keterikatan (coupling) sempat menyebar.',
      },
    ],
    realCase: {
      title: 'Folder "utils" yang menghambat rebranding',
      story: `**Situasi:** aplikasi web sebuah perusahaan media sudah tumbuh empat tahun dengan folder berdasarkan jenis file. **Gejala:** menghapus bagian "podcasts" yang sudah pensiun memakan tiga sprint; menghapus file merusak halaman yang tidak berkaitan, karena \`shared/utils\` meng-import helper podcast dan fitur-fitur lain melakukan deep import ke component podcast. **Akar masalah:** tidak ada public API dan tidak ada arah dependency, sehingga coupling menumpuk tanpa terlihat. **Perbaikan:** migrasi ke folder fitur, satu fitur demi satu fitur, dengan API \`index.ts\` dan aturan boundary ESLint yang ditegakkan di CI; pelanggaran dipantau sampai nol. Penghapusan fitur berikutnya cukup beberapa hari. **Pelajaran:** struktur hanya berharga kalau batas-batasnya ditegakkan secara otomatis.`,
    },
    pitfalls: [
      'Deep import ke bagian internal fitur lain, sehingga public API-nya jadi percuma.',
      'Modul shared yang meng-import dari features, menciptakan cycle dan coupling tersembunyi.',
      'Barrel file raksasa di root dengan `export *`, mengganggu tree-shaking dan menyebabkan circular import.',
      'Terlalu dini memindahkan ke `shared` kode yang baru dipakai satu fitur.',
      'Mengandalkan konvensi tanpa aturan lint; batas-batas akan terkikis saat dikejar deadline.',
    ],
    exercise: {
      task: 'Susun ulang aplikasi kecil (misalnya aplikasi katalogmu) menjadi `app/`, `shared/`, `features/`, dan `pages/`. Beri setiap fitur sebuah `index.ts` dan tambahkan aturan ESLint yang melarang deep import ke fitur serta import dari shared ke fitur. Buat satu pelanggaran dan pastikan lint gagal.',
      hint: 'Atur path alias `@/` dulu di `tsconfig` (`paths`) dan di Vite (`resolve.alias`).',
      solution: `1. Tambahkan alias: \`"paths": { "@/*": ["./src/*"] }\` dan alias di Vite.
2. Pindahkan file per fitur; buat \`features/<name>/index.ts\` yang hanya meng-export apa yang dipakai page.
3. Tambahkan dua blok \`no-restricted-imports\` dari contoh di atas.
4. Tulis \`import { CartLine } from '@/features/cart/components/CartLine'\` di sebuah page lalu jalankan \`npx eslint src\`:

\`\`\`text
error  '@/features/cart/components/CartLine' import is restricted from being used by a pattern.
       Import from the feature public API (@/features/<name>) instead
\`\`\`
5. Perbaiki dengan meng-export lewat \`index.ts\` hanya kalau page memang benar-benar butuh; kalau tidak, susun sebuah component publik sebagai gantinya.`,
    },
    interview: [
      'Kenapa struktur berbasis fitur lebih baik saat aplikasi membesar dibanding struktur berbasis jenis file?',
      'Apa itu public API sebuah fitur dan bagaimana cara menegakkannya?',
      'Ke arah mana dependency seharusnya mengalir antara app, pages, features, dan shared code?',
    ],
  },
}

export default details
