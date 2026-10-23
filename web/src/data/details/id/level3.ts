import type { TopicDetail } from '../../types'

const details: Record<string, TopicDetail> = {
  'ts-basics': {
    explanation: `TypeScript adalah **deskripsi statis tentang bentuk-bentuk nilai yang bisa diambil oleh kode JavaScript-mu**. Compiler memeriksa deskripsi itu lalu menghapusnya: tidak ada type yang tersisa saat runtime. Kalau kamu ingat ini, sebagian besar perilaku TypeScript jadi masuk akal, termasuk kenapa validasi (Zod) tetap dibutuhkan di batas-batas aplikasimu.

### Perkakas utama

- **Union type** (\`'idle' | 'loading'\`) berarti "salah satu dari ini". **Literal type** menjadikan satu nilai sebagai type, sehingga string berubah jadi semacam enum yang tidak mungkin salah ketik.
- **Generic** adalah parameter type: \`function first<T>(items: T[]): T | undefined\` menjaga hubungan antara input dan output, bukan malah runtuh jadi \`any\`.
- **\`unknown\` vs \`any\`**: \`any\` mematikan pemeriksaan dan diam-diam menular ke semua yang disentuhnya. \`unknown\` berarti "aku belum tahu": kamu wajib mempersempitnya dulu sebelum dipakai. Pakai \`unknown\` untuk JSON, error di \`catch\`, dan apa pun yang datang dari luar.
- **Narrowing**: \`typeof x === 'string'\`, \`'error' in result\`, \`Array.isArray\`, memeriksa discriminant seperti \`state.status === 'error'\`, atau type guard buatan sendiri \`(x): x is User\`. Checker mengikuti alur kontrol, jadi di dalam \`if\` type-nya lebih sempit.
- **Utility type**: \`Partial<T>\` (semua opsional), \`Required<T>\`, \`Pick<T, K>\`, \`Omit<T, K>\`, \`Record<K, V>\`, \`ReturnType<typeof fn>\`, \`Awaited<T>\`. Dengan ini kamu bisa menurunkan type dari type lain, bukan menduplikasinya.

### Structural typing

TypeScript membandingkan bentuk, bukan nama. Objek apa pun yang punya properti yang tepat akan memenuhi sebuah type. Ini fleksibel, tapi artinya dua id yang "berbeda" (\`UserId\`, \`OrderId\`) yang sama-sama \`string\` bisa saling dipertukarkan, kecuali kamu memberinya brand.

### Pengaturan strict yang penting

\`strict: true\` mengaktifkan \`strictNullChecks\`, \`noImplicitAny\`, dan kawan-kawannya; tanpa itu, \`null\` diam-diam cocok di mana saja. Tambahkan \`noUncheckedIndexedAccess\`: dengan begitu \`items[0]\` bertipe \`Item | undefined\`, sesuai kenyataan. Seminggu pertama terasa berisik, setelah itu dia mulai menangkap crash sungguhan.

### \`satisfies\` dan \`as const\`

\`as const\` membekukan literal sehingga \`['a', 'b']\` menjadi \`readonly ['a', 'b']\`. \`satisfies\` memeriksa nilai terhadap sebuah type *tanpa melebarkannya*, jadi key hasil inferensi yang presisi tetap terjaga sambil tetap dapat error. Utamakan keduanya dibanding \`as SomeType\`, yang merupakan assertion tanpa pemeriksaan: kamu menyuruh compiler percaya padamu, dan dia akan percaya.

### Kapan tidak perlu menulis type

Biarkan inferensi bekerja. Beri anotasi pada parameter fungsi, return type yang publik, dan API yang di-export; jangan anotasi setiap variabel lokal. Anotasi berlebihan malah menutupi type hasil inferensi yang lebih baik dan menambah beban perawatan.

### Tooling di 2026: TypeScript 7

TypeScript 7 (Juli 2026) adalah rilis stabil pertama dari compiler native yang ditulis ulang dengan Go: full build kira-kira 8–12× lebih cepat, dan kamu tetap meng-install \`typescript\` serta menjalankan perintah \`tsc\` yang sama. Ada dua catatan: belum ada API programatik yang stabil sampai 7.1, jadi tool yang membutuhkannya (pengecekan template Vue/Svelte/Astro/Angular) masih berjalan di TypeScript 6; dan output JS hanya bisa di-downlevel sampai ES2021, belum ada emit untuk decorator. Di aplikasi React berbasis Vite hal ini jarang berpengaruh, karena Vite hanya membuang type dan \`tsc\` cukup melakukan type-check.`,
    examples: [
      {
        title: '❌ any vs ✅ unknown + narrowing',
        code: `// ❌ any spreads silently: no error, crashes at runtime
async function loadUserBad(id: string) {
  const res = await fetch(\`/api/users/\${id}\`)
  const data: any = await res.json()
  return data.profile.displayName.toUpperCase()
}

// ✅ unknown forces a check before use
type User = { id: string; profile: { displayName: string } }

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' && value !== null &&
    'id' in value && 'profile' in value
  )
}

async function loadUser(id: string): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`)
  const data: unknown = await res.json()
  if (!isUser(data)) throw new Error('Unexpected user payload')
  return data // narrowed to User
}`,
        note: 'Dengan `any`, compiler santai saja menerima `data.profile.displayName` walaupun API-nya sudah berubah. `unknown` memaksamu menulis guard; di kode sungguhan kamu akan pakai Zod alih-alih guard buatan tangan, tapi prinsipnya sama persis.',
      },
      {
        title: '✅ Turunkan type dengan utility type, satisfies, dan as const',
        code: `const ROLES = ['viewer', 'editor', 'admin'] as const
type Role = (typeof ROLES)[number] // 'viewer' | 'editor' | 'admin'

type Invoice = { id: string; amount: number; dueDate: string; paidAt: string | null }
type InvoiceDraft = Omit<Invoice, 'id' | 'paidAt'>
type InvoicePatch = Partial<InvoiceDraft>

const permissions = {
  viewer: ['read'],
  editor: ['read', 'write'],
  admin: ['read', 'write', 'delete'],
} satisfies Record<Role, string[]>

const first = ROLES[0] // with noUncheckedIndexedAccess: Role | undefined`,
        note: 'Satu sumber kebenaran (`ROLES`) menghasilkan type `Role`. `satisfies` akan error kalau ada role yang terlewat, tapi key `permissions` tetap persis. Type draft/patch diturunkan, jadi menambah field di `Invoice` otomatis memperbarui keduanya.',
      },
    ],
    realCase: {
      title: 'Item pertama yang undefined di dashboard fintech',
      story: `**Situasi:** tim fintech menampilkan "transaksi terakhir" dengan \`transactions[0].amount\`. **Gejala:** akun baru yang belum punya riwayat melihat layar putih; error monitoring mencatat "Cannot read properties of undefined". **Akar masalah:** \`strict\` sudah aktif tapi \`noUncheckedIndexedAccess\` belum, jadi TypeScript menganggap \`transactions[0]\` bertipe \`Transaction\`, bukan \`Transaction | undefined\`. **Perbaikan:** mereka menyalakan flag itu, membereskan sekitar 60 error yang muncul (kebanyakan dengan early return atau empty state), dan sekalian menemukan tiga crash lain yang selama ini tersembunyi. **Pelajaran:** flag compiler menyimpan asumsi; makin ketat flag-nya, makin banyak crash runtime yang berubah jadi error saat compile.`,
    },
    pitfalls: [
      'Memakai `as Type` untuk membungkam error: assertion tidak diperiksa dan menutupi ketidakcocokan yang nyata. Lakukan narrowing atau validasi.',
      'Memberi type pada response JSON langsung sebagai type domain (`res.json() as User`): type-nya langsung bohong begitu API berubah.',
      'Membiarkan `any` di `catch (e: any)`: variabel catch sebaiknya `unknown` lalu dipersempit dengan `e instanceof Error`.',
      'Menduplikasi type secara manual alih-alih menurunkannya dengan `Pick`/`Omit`/`typeof`: salinan-salinannya lama-lama tidak sinkron.',
      'Memakai `enum` TypeScript untuk kumpulan string sederhana: union literal (atau array `as const`) lebih ringan dan terhapus bersih saat compile.',
    ],
    exercise: {
      task: 'Tulis fungsi generic `groupBy<T, K extends PropertyKey>(items: T[], getKey: (item: T) => K): Record<K, T[]>` lalu pakai untuk mengelompokkan order berdasarkan status. Aktifkan `noUncheckedIndexedAccess` dan pastikan kodenya lolos compile tanpa `as any`.',
      hint: 'Memulai dengan `{} as Record<K, T[]>` memang menggoda, tapi itu assertion; accumulator `Partial<Record<K, T[]>>` plus `??=` lebih jujur.',
      solution: `\`\`\`ts
function groupBy<T, K extends PropertyKey>(items: T[], getKey: (item: T) => K) {
  const out: Partial<Record<K, T[]>> = {}
  for (const item of items) {
    const key = getKey(item)
    ;(out[key] ??= []).push(item)
  }
  return out
}

type Order = { id: string; status: 'open' | 'paid' | 'refunded' }
const byStatus = groupBy(orders, (o) => o.status)
const paid = byStatus.paid ?? [] // Order[]
\`\`\`
Mengembalikan \`Partial<Record<K, T[]>>\` itu akurat: status yang tidak punya order memang tidak punya key.`,
    },
    interview: [
      'Apa beda `unknown`, `any`, dan `never`? Beri satu contoh pemakaian untuk masing-masing.',
      'Jelaskan structural typing. Bagaimana cara mencegah `UserId` dioper ke tempat yang mengharapkan `OrderId`?',
      'Kapan kamu memakai `satisfies` alih-alih anotasi type atau `as`?',
    ],
  },

  'typing-components': {
    explanation: `Component React pada dasarnya hanyalah fungsi dari props ke UI, jadi memberi type pada component sebagian besar berarti **memberi type yang baik pada objek props-nya**. Tujuannya bukan hiasan: type props yang bagus adalah dokumentasi, autocomplete, sekaligus jaring pengaman refactor bagi setiap pemanggilnya.

### Props

Pakai alias \`type\` (atau interface) dan destructure langsung di parameter: \`function Card({ title, children }: CardProps)\`. Hindari \`React.FC\`: sekarang dia tidak menambah apa-apa yang berguna dan bikin generic jadi canggung. Biarkan return type di-infer (hasilnya \`JSX.Element\` atau \`React.ReactNode\` sesuai kebutuhan).

- \`children: React.ReactNode\` menerima apa pun yang bisa di-render: string, angka, elemen, array, \`null\`.
- Pakai \`React.ReactElement\` hanya kalau kamu benar-benar butuh satu elemen.
- Props opsional diberi \`?\` dan nilai default saat destructuring: \`size = 'md'\`.
- Callback props dinamai sesuai maksudnya: \`onSelect: (id: string) => void\`.

### Event

Handler inline meng-infer type event-nya dari atribut JSX, jadi \`onChange={(e) => setQ(e.target.value)}\` tidak perlu anotasi. Kalau handler dideklarasikan terpisah, beri type: \`React.ChangeEvent<HTMLInputElement>\`, \`React.FormEvent<HTMLFormElement>\`, \`React.MouseEvent<HTMLButtonElement>\`, \`React.KeyboardEvent\`.

### Memperluas elemen native

\`Button\` di design system seharusnya menerima semua yang diterima \`<button>\` asli: \`type\`, \`disabled\`, \`aria-*\`, \`onClick\`. Pakai \`ComponentProps<'button'>\` (atau \`ComponentPropsWithoutRef\`) lalu tambahkan props milikmu di atasnya. Gunakan \`Omit\` kalau props-mu bentrok dengan props native. Spread sisanya ke elemen.

### Ref di React 19

Di React 19, \`ref\` adalah **props biasa** untuk function component: \`ComponentProps<'input'>\` sudah menyertakannya, jadi \`forwardRef\` tidak lagi diperlukan untuk kode baru. Kamu masih akan menemukan \`forwardRef\` di codebase lama.

### Polimorfisme dan varian

Modelkan varian yang saling eksklusif dengan union, bukan dengan banyak boolean opsional. Tombol bergaya link yang wajib punya \`href\` tapi tidak boleh punya \`onClick\` adalah union: \`{ as: 'a'; href: string } | { as?: 'button'; onClick: () => void }\`. Polimorfisme penuh ala "as elemen apa saja" memang bisa, tapi rumit; pakai hanya di library bersama.

### Hook

\`useState\` meng-infer dari nilai awal; beri type argument kalau nilai awalnya lebih sempit dari type sebenarnya: \`useState<User | null>(null)\`. \`useRef<HTMLInputElement>(null)\` memberimu ref untuk node DOM. Untuk \`useReducer\`, beri type pada reducer-nya dan inferensi mengurus sisanya.`,
    examples: [
      {
        title: '❌ Mendeklarasi ulang props button vs ✅ memperluas ComponentProps',
        code: `// ❌ only the props the author remembered; aria-*, type, form... are lost
type BadButtonProps = { label: string; onClick: () => void; disabled?: boolean }

// ✅ every native prop, plus variants
import type { ComponentProps } from 'react'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
}

export function Button({ variant = 'primary', loading = false, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading}
      className={\`btn btn-\${variant}\`}
    >
      {loading ? 'Saving…' : children}
    </button>
  )
}

// Callers get full autocomplete, including ref in React 19
<Button type="submit" form="invoice-form" aria-describedby="hint">Save</Button>`,
        note: '`type="button"` ditaruh sebelum `{...rest}` supaya pemanggil bisa menimpanya jadi `submit`, sementara default-nya mencegah form ter-submit tanpa sengaja. `ref` ikut mengalir lewat `rest` karena di React 19 dia props biasa.',
      },
      {
        title: '✅ Handler ber-type yang dideklarasikan di luar JSX',
        code: `type SearchBoxProps = { initialQuery?: string; onSearch: (query: string) => void }

export function SearchBox({ initialQuery = '', onSearch }: SearchBoxProps) {
  const [query, setQuery] = useState(initialQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!query.trim()) return inputRef.current?.focus()
    onSearch(query.trim())
  }

  return (
    <form role="search" onSubmit={handleSubmit}>
      <label htmlFor="q">Search products</label>
      <input id="q" ref={inputRef} value={query} onChange={handleChange} />
    </form>
  )
}`,
        note: 'Callback props `onSearch` menunjukkan maksudnya (sebuah string query), bukan event DOM mentah. Parent sama sekali tidak perlu tahu soal event.',
      },
    ],
    realCase: {
      title: 'Button design system yang merusak form',
      story: `**Situasi:** sebuah design system internal merilis \`<Button label onClick />\` dengan props yang dipilih manual. **Gejala:** tim produk tidak bisa mengatur \`type="submit"\`, \`aria-label\`, atau \`form\`, jadi mereka membungkus tombol dengan div, menambah click handler yang memanggil \`form.requestSubmit()\`, dan screen reader membacakan tombol ikon hanya sebagai "button" tanpa nama. **Akar masalah:** type props-nya mendeklarasi ulang sebagian props native alih-alih memperluasnya. **Perbaikan:** tim menulis ulang jadi \`ComponentProps<'button'> & { variant }\`, men-spread sisa props, dan menambah aturan lint yang mewajibkan nama yang aksesibel untuk tombol yang isinya hanya ikon. **Pelajaran:** component pembungkus harus menjadi superset dari elemen yang dibungkusnya.`,
    },
    pitfalls: [
      'Memakai `React.FC` karena kebiasaan: dia menyulitkan generic component dan dulu menambahkan `children` secara implisit.',
      'Memberi type `children` sebagai `JSX.Element`, yang menolak string, array, dan `null`.',
      'Men-spread `{...rest}` sebelum props penting milikmu, sehingga pemanggil tanpa sengaja menimpa logika `className` atau `disabled` (atau kebalikannya, padahal kamu ingin mereka bisa menimpa).',
      'Callback props yang mengekspos event DOM (`onChange(e)`) alih-alih nilai domain (`onChange(value)`), sehingga detail implementasi bocor.',
      'Menulis pembungkus `forwardRef` baru di kode React 19, padahal `ref` sudah jadi props.',
    ],
    exercise: {
      task: 'Buat `TextField` ber-type yang menerima semua props native `<input>` plus `label: string` dan `error?: string`. Component ini harus me-render label yang terhubung ke input, menampilkan error, serta mengatur `aria-invalid` dan `aria-describedby` saat ada error.',
      hint: 'Pakai `useId()` untuk id, `ComponentProps<\'input\'>` sebagai dasar, dan tidak perlu `Omit` apa pun kecuali ada nama yang bentrok.',
      solution: `\`\`\`tsx
import { useId, type ComponentProps } from 'react'

type TextFieldProps = ComponentProps<'input'> & { label: string; error?: string }

export function TextField({ label, error, id, ...rest }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = \`\${inputId}-error\`
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error && <p id={errorId} role="alert">{error}</p>}
    </div>
  )
}
\`\`\``,
    },
    interview: [
      'Kenapa `ComponentProps<\'button\'>` lebih baik daripada menulis props button satu per satu?',
      'Apa yang berubah pada ref untuk function component di React 19, dan apa artinya bagi `forwardRef`?',
      'Apa beda `ReactNode` dan `ReactElement`, dan kapan kamu memakai masing-masing?',
    ],
  },

  discriminated: {
    explanation: `**Discriminated union** adalah union dari beberapa type objek yang sama-sama punya satu field literal, yaitu *discriminant* (biasanya \`status\` atau \`type\`). Memeriksa field itu akan mempersempit seluruh objek, sehingga TypeScript tahu persis field apa lagi yang tersedia. Ini pola TypeScript paling berharga untuk kode UI.

### Kenapa boolean gagal

Component fetch biasanya dimulai dengan \`isLoading\`, \`error\`, dan \`data\`. Itu 2 × 2 × 2 = 8 kombinasi, padahal yang masuk akal cuma 4. Apa artinya \`isLoading: true\` sekaligus ada \`error\`? Error lama yang tertinggal saat retry? Setiap jalur render harus berjaga-jaga terhadap kombinasi yang tidak masuk akal, dan bug bersembunyi di kombinasi yang tidak terpikirkan siapa pun: banner error lama tampil di atas data baru, atau spinner yang tidak pernah berhenti karena ada satu setter yang lupa dipanggil.

### Membuat state mustahil tidak bisa direpresentasikan

Dengan union, setiap state membawa persis data yang dibutuhkan state itu:

- \`{ status: 'idle' }\`
- \`{ status: 'loading' }\`
- \`{ status: 'error'; error: string }\`
- \`{ status: 'success'; data: City[] }\`

Kamu tidak bisa membaca \`data\` tanpa membuktikan dulu bahwa \`status === 'success'\`. Kamu tidak bisa loading dan error sekaligus. Transisi jadi cukup satu assignment (\`setState({ status: 'error', error })\`), bukan tiga panggilan setter yang harus tetap sinkron.

### Exhaustiveness

Di dalam \`switch (state.status)\`, tambahkan cabang \`default\` yang meng-assign \`state\` ke \`never\`. Kalau nanti ada yang menambah \`{ status: 'empty' }\`, setiap switch yang lupa menanganinya langsung jadi error saat compile. "Jangan lupa update semua tempat" pun berubah jadi checklist yang disodorkan compiler kepadamu.

### Lebih dari sekadar state fetch

Pola yang sama bisa memodelkan action reducer (\`{ type: 'added'; item } | { type: 'removed'; id }\`), langkah-langkah form, metode pembayaran (\`card\` butuh \`last4\`, \`bank\` butuh \`iban\`), varian component, dan hasil API (\`{ ok: true; value } | { ok: false; error }\`). Ini versi type-level dari state machine.

### Kapan tidak perlu

Kalau state-nya memang independen (flag modal terbuka dan tab yang dipilih), biarkan terpisah; memaksanya jadi satu union malah melipatgandakan kasus. Perhatikan juga bahwa library seperti TanStack Query sudah menyediakan \`status\` yang mirip union; lakukan narrowing di situ, jangan dimodelkan ulang.`,
    examples: [
      {
        title: '❌ Sup boolean vs ✅ discriminated union',
        code: `// ❌ 8 combinations, 4 nonsense
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [cities, setCities] = useState<City[] | null>(null)
// forgetting setError(null) on retry shows an old error above new data

// ✅ only valid states
type CitiesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: City[] }

function CityResults({ state }: { state: CitiesState }) {
  switch (state.status) {
    case 'idle':
      return <p>Type a city name to search.</p>
    case 'loading':
      return <Spinner label="Searching cities" />
    case 'error':
      return <ErrorBanner message={state.error} />
    case 'success':
      return state.data.length === 0
        ? <p>No cities found.</p>
        : <CityList cities={state.data} />
    default: {
      const unreachable: never = state
      return unreachable
    }
  }
}`,
        note: 'Di dalam setiap `case`, `state` sudah dipersempit: `state.data` hanya ada di cabang success. Default `never` membuat penambahan status baru jadi error compile sampai ditangani.',
      },
      {
        title: '✅ Action reducer berbentuk discriminated union',
        code: `type CheckoutState =
  | { step: 'cart' }
  | { step: 'shipping'; cartId: string }
  | { step: 'payment'; cartId: string; addressId: string }
  | { step: 'done'; orderId: string }

type CheckoutAction =
  | { type: 'cartConfirmed'; cartId: string }
  | { type: 'addressChosen'; addressId: string }
  | { type: 'paid'; orderId: string }

function checkout(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'cartConfirmed':
      return state.step === 'cart' ? { step: 'shipping', cartId: action.cartId } : state
    case 'addressChosen':
      return state.step === 'shipping'
        ? { step: 'payment', cartId: state.cartId, addressId: action.addressId }
        : state
    case 'paid':
      return state.step === 'payment' ? { step: 'done', orderId: action.orderId } : state
  }
}`,
        note: 'State dan action sama-sama union. Kamu tidak bisa sampai ke `payment` tanpa `addressId`, dan transisi yang tidak valid cukup mengembalikan state saat ini.',
      },
    ],
    realCase: {
      title: 'Banner error hantu',
      story: `**Situasi:** halaman pencarian di tim booking travel memakai boolean \`loading\`, \`error\`, dan \`results\`. **Gejala:** setelah jaringan sempat putus, pengguna mencoba lagi dan mendapat hasil, tapi banner merah "Search failed" tetap nongkrong di atas, sehingga mereka mengira harganya salah lalu batal memesan. **Akar masalah:** jalur retry memanggil \`setLoading(true)\` dan \`setResults(...)\` tapi tidak pernah \`setError(null)\`. **Perbaikan:** state ditulis ulang sebagai discriminated union; response yang sukses mengganti seluruh objek state, jadi error tidak mungkin tertinggal. Switch yang exhaustive me-render setiap status. **Pelajaran:** kalau beberapa potong state harus berubah bersamaan, sebenarnya mereka adalah satu state.`,
    },
    pitfalls: [
      'Memakai discriminant yang bukan literal (`status: string`), sehingga narrowing tidak bisa terjadi.',
      'Melakukan destructuring sebelum narrowing (`const { data } = state`) — TypeScript tidak bisa mempersempit field hasil destructuring dari pengecekan union aslinya di belakang.',
      'Melewatkan pengecekan exhaustiveness dengan `never`, sehingga varian baru diam-diam lolos.',
      'Pemodelan berlebihan: menggabungkan state yang benar-benar independen jadi satu union raksasa dengan puluhan varian.',
    ],
    exercise: {
      task: 'Modelkan upload file sebagai discriminated union: idle, uploading (dengan progress 0–100), failed (dengan error dan jumlah retry), done (dengan URL file). Tulis fungsi `render` memakai switch yang exhaustive dan reducer yang menangani `start`, `progress`, `fail`, `succeed`, `reset`.',
      hint: 'Abaikan action `progress` kecuali status saat ini `uploading`.',
      solution: `\`\`\`ts
type Upload =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'failed'; error: string; retries: number }
  | { status: 'done'; url: string }

type UploadAction =
  | { type: 'start' }
  | { type: 'progress'; value: number }
  | { type: 'fail'; error: string }
  | { type: 'succeed'; url: string }
  | { type: 'reset' }

function upload(state: Upload, a: UploadAction): Upload {
  switch (a.type) {
    case 'start': return { status: 'uploading', progress: 0 }
    case 'progress':
      return state.status === 'uploading' ? { ...state, progress: a.value } : state
    case 'fail': {
      const retries = state.status === 'failed' ? state.retries + 1 : 0
      return { status: 'failed', error: a.error, retries }
    }
    case 'succeed': return { status: 'done', url: a.url }
    case 'reset': return { status: 'idle' }
  }
}
\`\`\``,
    },
    interview: [
      'Kenapa tiga boolean untuk loading/error/data rawan bug? Hitung jumlah state-nya.',
      'Bagaimana cara kerja pengecekan exhaustiveness dengan `never`?',
      'Beri contoh di luar data fetching di mana discriminated union membuat API component lebih baik.',
    ],
  },

  'generic-components': {
    explanation: `**Generic component** adalah component yang props-nya diberi parameter type, sehingga hubungan antar-props tetap terjaga. Untuk \`<Select<T>>\`, type array \`options\` menentukan type nilai yang dioper ke \`onChange\`. Pemanggil jarang menulis \`<T>\` secara eksplisit: TypeScript meng-infer-nya dari props, itulah sebabnya library yang bagus terasa "ajaib".

### Bagaimana inferensi mengalir

Saat kamu menulis \`<Select options={currencies} onChange={(c) => ...} />\`, TypeScript melihat \`options: T[]\`, meng-infer \`T = Currency\` dari \`currencies\`, lalu memberi \`c\` type \`Currency\`. Satu titik inferensi menghidupi yang lain. Kalau dua props tidak sepakat, kamu dapat error, dan justru itulah keamanan yang kamu cari.

### Sintaks

Tulis generic component sebagai deklarasi fungsi: \`function Select<T>(props: SelectProps<T>)\`. Di file \`.tsx\`, arrow function butuh \`<T,>\` (dengan koma di belakang) supaya parser tidak membaca \`<T>\` sebagai JSX. Hindari \`React.FC\`, yang tidak bisa membawa parameter type.

### Constraint

Pakai \`extends\` untuk mensyaratkan apa yang kamu butuhkan. List butuh key yang stabil: \`T extends { id: string }\`. Atau, lebih baik lagi, terima props \`getKey: (item: T) => string\` supaya bentuk data apa pun bisa masuk. Constraint sebaiknya minimal: mewajibkan \`id\` berarti menolak data yang key-nya \`sku\`.

### Render props dan accessor

Generic component biasanya menerima fungsi-fungsi yang tahu soal \`T\`: \`renderItem\`, \`getLabel\`, \`getKey\`. Ini memisahkan *perilaku* (seleksi, navigasi keyboard, virtualisasi) dari *bentuk data*. \`DataTable<Row>\` bisa menerima \`columns: Column<Row>[]\` di mana tiap kolom punya \`accessor: (row: Row) => ReactNode\`. Dengan \`keyof\` kamu bisa melangkah lebih jauh: \`sortBy: keyof Row\` hanya mengizinkan nama field yang benar-benar ada.

### Kapan tidak perlu

Generic menambah beban pikiran. Kalau sebuah component hanya dipakai dengan satu type data, buat saja konkret. Pakai generic di blok bangunan bersama: select, combobox, tabel, list, field form, hook ber-type seperti \`useLocalStorage<T>\`. Jangan juga memakai generic sekadar untuk "meneruskan" type yang tidak pernah kamu hubungkan ke apa pun; parameter type yang hanya dipakai sekali biasanya cukup \`unknown\`.

### Pembungkus

\`memo\` dan HOC lainnya menghilangkan signature generic. Perbaikan yang umum adalah cast balik: \`export const List = memo(ListImpl) as typeof ListImpl\`. Dengan React Compiler, sering kali kamu tidak butuh \`memo\` sama sekali.`,
    examples: [
      {
        title: '❌ Select ber-type any vs ✅ select generic',
        code: `// ❌ onChange receives any; typos compile
type BadSelectProps = { options: any[]; onChange: (v: any) => void }

// ✅ generic: options decide the value type
type SelectProps<T> = {
  label: string
  options: readonly T[]
  value: T | null
  onChange: (value: T) => void
  getLabel: (option: T) => string
  getKey: (option: T) => string
}

export function Select<T>({ label, options, value, onChange, getLabel, getKey }: SelectProps<T>) {
  const id = useId()
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value ? getKey(value) : ''}
        onChange={(e) => {
          const next = options.find((o) => getKey(o) === e.target.value)
          if (next) onChange(next)
        }}
      >
        <option value="" disabled>Choose…</option>
        {options.map((o) => (
          <option key={getKey(o)} value={getKey(o)}>{getLabel(o)}</option>
        ))}
      </select>
    </>
  )
}

// Usage: T inferred as Currency
<Select
  label="Currency"
  options={currencies}
  value={currency}
  onChange={(c) => setCurrency(c)} // c: Currency
  getLabel={(c) => \`\${c.code} — \${c.name}\`}
  getKey={(c) => c.code}
/>`,
        note: 'Tidak ada yang menulis `<Select<Currency>>`. `T` di-infer dari `options`, dan semua callback mendapat type dari situ. Mengoper `onChange` yang mengharapkan type lain langsung jadi error compile.',
      },
      {
        title: '✅ Kolom tabel ber-type dengan keyof',
        code: `type Column<Row> = {
  header: string
  cell: (row: Row) => React.ReactNode
  sortKey?: keyof Row
}

type DataTableProps<Row> = {
  rows: Row[]
  columns: Column<Row>[]
  getRowId: (row: Row) => string
}

export function DataTable<Row>({ rows, columns, getRowId }: DataTableProps<Row>) {
  return (
    <table>
      <thead><tr>{columns.map((c) => <th key={c.header}>{c.header}</th>)}</tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={getRowId(r)}>{columns.map((c) => <td key={c.header}>{c.cell(r)}</td>)}</tr>
        ))}
      </tbody>
    </table>
  )
}

const invoiceColumns: Column<Invoice>[] = [
  { header: 'Number', cell: (i) => i.number, sortKey: 'number' },
  { header: 'Amount', cell: (i) => formatMoney(i.amount), sortKey: 'amount' },
  // sortKey: 'amout' -> compile error
]`,
        note: '`keyof Row` membatasi sort key hanya ke field yang ada, jadi salah ketik ketahuan saat compile, bukan berakhir jadi kolom yang tidak bisa diurutkan.',
      },
    ],
    realCase: {
      title: 'Tabel admin dengan kolom berbasis string',
      story: `**Situasi:** panel admin perusahaan logistik punya \`Table\` bersama yang menerima \`columns: { key: string }[]\` dan \`rows: any[]\`. **Gejala:** setelah API mengganti nama \`eta\` menjadi \`estimatedArrival\`, tiga layar menampilkan kolom kosong selama berminggu-minggu; tidak ada yang gagal dan tidak ada yang sadar sampai seorang pelanggan komplain. **Akar masalah:** key kolom hanyalah string biasa yang tidak terhubung ke type baris. **Perbaikan:** tabel diubah jadi \`Table<Row>\` dengan \`cell: (row: Row) => ReactNode\`; baris-barisnya memakai type hasil inferensi Zod, sehingga penggantian nama itu memunculkan error compile di setiap kolom yang terdampak. **Pelajaran:** generic mengubah kontrak implisit antar-props menjadi kontrak yang diperiksa.`,
    },
    pitfalls: [
      'Menulis `const List = <T>(...) =>` di file .tsx, yang terbaca sebagai JSX; pakai `<T,>` atau deklarasi fungsi.',
      'Constraint yang berlebihan (`T extends { id: string }`) padahal accessor `getKey` bisa menerima bentuk apa pun.',
      'Membungkus dengan `memo`/`forwardRef` lalu kehilangan generic-nya, sehingga semuanya jadi `unknown`.',
      'Membuat component jadi generic padahal pemanggilnya cuma satu; abstraksi tambahan itu mengorbankan keterbacaan.',
    ],
    exercise: {
      task: 'Tulis hook generic `useLocalStorage<T>(key: string, initial: T, schema: { parse: (v: unknown) => T })` yang mengembalikan `[value, setValue]` bertipe `T`, serta `<RadioGroup<T>>` generic yang me-render opsi-opsi dan memanggil `onChange(value: T)`.',
      hint: 'Terima schema sebagai apa saja yang punya method `parse` supaya schema Zod bisa masuk. Tangkap error parse dan kembali ke `initial`.',
      solution: `\`\`\`tsx
function useLocalStorage<T>(key: string, initial: T, schema: { parse: (v: unknown) => T }) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : schema.parse(JSON.parse(raw))
    } catch {
      return initial
    }
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])
  return [value, setValue] as const
}

type RadioGroupProps<T> = {
  name: string; options: readonly T[]; value: T
  onChange: (v: T) => void; getLabel: (v: T) => string; getKey: (v: T) => string
}
function RadioGroup<T>({ name, options, value, onChange, getLabel, getKey }: RadioGroupProps<T>) {
  return (
    <fieldset>
      {options.map((o) => (
        <label key={getKey(o)}>
          <input type="radio" name={name} checked={getKey(o) === getKey(value)} onChange={() => onChange(o)} />
          {getLabel(o)}
        </label>
      ))}
    </fieldset>
  )
}
\`\`\``,
    },
    interview: [
      'Bagaimana TypeScript meng-infer parameter type sebuah generic component dari props-nya?',
      'Kenapa generic sulit dipakai dengan `React.FC`, dan bagaimana menulis arrow component generic di .tsx?',
      'Kapan kamu memilih accessor `getKey` dibanding constraint `T extends { id: string }`?',
    ],
  },

  zod: {
    explanation: `Type TypeScript dihapus saat compile. Ketika data masuk ke aplikasimu dari jaringan, \`localStorage\`, search params URL, \`postMessage\`, atau form, compiler **sama sekali tidak tahu bentuk aslinya**. Memberi type \`User\` pada \`await res.json()\` itu sama saja kamu berjanji atas nama server yang tidak kamu kendalikan. **Zod** memungkinkan kamu menulis bentuk data sekali sebagai schema runtime, memeriksa data sungguhan terhadapnya, lalu *meng-infer* type statis dari schema yang sama, sehingga type dan validasi tidak mungkin melenceng satu sama lain. Contoh-contoh di sini memakai **Zod 4**: format string ada di level atas (\`z.email()\`, \`z.url()\`, \`z.uuid()\`, \`z.iso.date()\`; gaya lama \`z.string().email()\` sudah deprecated) dan pesan kustom memakai \`{ error: '...' }\`, bukan \`message\` yang sudah deprecated.

### Parse, jangan sekadar validasi

Idenya: di **batas** aplikasi, ubah \`unknown\` menjadi nilai ber-type yang bisa dipercaya, atau gagal dengan jelas. Setelah itu, bagian aplikasi lainnya bekerja dengan data ber-type dan tidak perlu memeriksa ulang. \`schema.parse(data)\` mengembalikan nilai ber-type atau melempar \`ZodError\`. \`schema.safeParse(data)\` mengembalikan \`{ success: true, data } | { success: false, error }\` — sebuah discriminated union, jadi kamu menangani kedua cabang tanpa try/catch.

### Inferensi

\`type User = z.infer<typeof UserSchema>\` menurunkan type TS-nya. Ubah schema, type-nya ikut berubah. Pakai \`z.input<>\` vs \`z.output<>\` kalau transform mengubah bentuk data (misalnya string yang dikonversi jadi \`Date\`).

### Membentuk data

Schema bisa lebih dari sekadar memeriksa:

- \`z.coerce.number()\` mengubah \`"42"\` dari URL menjadi \`42\`.
- \`.default(1)\` mengisi nilai yang hilang; \`.catch(1)\` mengganti nilai yang tidak valid (sangat cocok untuk search params).
- \`.transform(fn)\` memetakan data ke bentuk domain-mu (misalnya API snake_case ke camelCase).
- \`.refine\` / \`.superRefine\` menambah aturan lintas field ("tanggal akhir harus setelah tanggal mulai").
- \`z.discriminatedUnion('type', [...])\` memvalidasi payload union secara efisien.

### Di mana melakukan parse

- Di API client, tepat setelah \`res.json()\`, sehingga setiap pemanggil \`getInvoice\` menerima \`Invoice\` yang valid.
- Saat membaca search params dan \`localStorage\`, dengan default \`.catch\` supaya input buruk tidak pernah membuat halaman crash.
- Di form, lewat \`zodResolver\` untuk React Hook Form, dan sekali lagi di server (validasi di client itu untuk UX, validasi di server itu untuk keamanan).
- Untuk environment variable saat startup.

### Trade-off soal ketatnya validasi

Secara default, schema objek membuang key yang tidak dikenal, sehingga toleran terhadap perubahan API yang sifatnya menambah. Terlalu ketat (\`.strict()\`) pada API pihak ketiga bisa merusak UI saat ada field tak berbahaya yang ditambahkan. Terlalu longgar (\`z.any()\`) membuat semuanya percuma. Validasi apa yang kamu *pakai*. Saat gagal, log \`ZodError\` beserta konteksnya ke monitoring: dia memberi tahu persis field mana yang rusak, sehingga bug UI yang samar berubah jadi pelanggaran kontrak yang jelas.`,
    examples: [
      {
        title: '❌ Percaya pada cast vs ✅ parse di batas aplikasi',
        code: `// ❌ the cast is a lie if the API changes
async function getInvoiceBad(id: string) {
  const res = await fetch(\`/api/invoices/\${id}\`)
  return (await res.json()) as Invoice
}

// ✅ schema is the source of truth
import { z } from 'zod'

const InvoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  amount_cents: z.number().int().nonnegative(),
  currency: z.enum(['USD', 'EUR', 'IDR']),
  due_date: z.iso.date(),
  status: z.enum(['draft', 'sent', 'paid', 'void']),
}).transform((i) => ({
  id: i.id,
  number: i.number,
  amount: i.amount_cents / 100,
  currency: i.currency,
  dueDate: new Date(i.due_date),
  status: i.status,
}))

export type Invoice = z.output<typeof InvoiceSchema>

export async function getInvoice(id: string): Promise<Invoice> {
  const res = await fetch(\`/api/invoices/\${id}\`)
  if (!res.ok) throw new Error(\`Invoice \${id}: HTTP \${res.status}\`)
  return InvoiceSchema.parse(await res.json())
}`,
        note: 'API client adalah batasnya. Component menerima `Invoice` camelCase dengan `Date` sungguhan, dan payload yang rusak gagal di sini dengan error yang presisi, bukan jauh di dalam proses render.',
      },
      {
        title: '✅ Search params dengan coercion dan default yang aman',
        code: `const ProductFiltersSchema = z.object({
  q: z.string().trim().catch(''),
  page: z.coerce.number().int().min(1).catch(1),
  sort: z.enum(['price-asc', 'price-desc', 'newest']).catch('newest'),
  inStock: z.enum(['true', 'false']).transform((v) => v === 'true').catch(false),
})
export type ProductFilters = z.infer<typeof ProductFiltersSchema>

export function parseFilters(params: URLSearchParams): ProductFilters {
  return ProductFiltersSchema.parse(Object.fromEntries(params))
}
// ?page=abc&sort=hack  ->  { q: '', page: 1, sort: 'newest', inStock: false }`,
        note: '`.catch()` berarti sampah apa pun di URL akan jatuh ke nilai default, jadi link yang diedit manual atau link lama yang dibagikan tidak akan pernah membuat halaman crash.',
      },
    ],
    realCase: {
      title: 'Harga null setelah migrasi backend',
      story: `**Situasi:** backend tim e-commerce memigrasikan layanan harga dan mulai mengembalikan \`price: null\` untuk item yang tidak punya harga regional. **Gejala:** halaman produk crash di \`price.toFixed(2)\` untuk beberapa region; crash-nya muncul jauh dari tempat fetch, sehingga butuh sehari untuk melacaknya. **Akar masalah:** frontend meng-cast response ke \`Product\` dengan \`price: number\`. **Perbaikan:** response di-parse dengan Zod di API client; \`price\` menjadi \`z.number().nullable()\`, perubahan type itu memaksa setiap pemakai menangani kondisi "harga tidak tersedia", dan kegagalan parse dilaporkan ke monitoring beserta path yang gagal. **Pelajaran:** validasi di batas aplikasi supaya kontrak yang rusak ketahuan dengan jelas, cepat, dan presisi.`,
    },
    pitfalls: [
      'Mendefinisikan type TS dan schema Zod secara terpisah; lama-lama tidak sinkron. Infer type dari schema.',
      'Melakukan parse jauh di dalam component alih-alih sekali di batas aplikasi (API client, loader, pembaca storage).',
      'Memakai `.strict()` pada response pihak ketiga, sehingga field baru yang tidak berbahaya merusak UI-mu.',
      'Menganggap validasi Zod di client sebagai keamanan; server tetap harus memvalidasi.',
      'Menelan kegagalan `safeParse` tanpa mencatatnya, sehingga sinyal debugging paling berguna hilang.',
    ],
    exercise: {
      task: 'Tulis schema Zod untuk form pendaftaran: email, password (minimal 12 karakter, ada satu digit), confirmPassword (harus sama), dan kode referral opsional berupa 8 huruf kapital/digit. Export type hasil inferensinya dan sebuah fungsi yang mengembalikan error per field sebagai `Record<string, string>`.',
      hint: 'Pakai `.refine` pada objeknya dengan `path: [\'confirmPassword\']`, lalu iterasi `error.issues` untuk membangun map-nya.',
      solution: `\`\`\`ts
import { z } from 'zod'

export const SignUpSchema = z.object({
  email: z.email({ error: 'Enter a valid email' }),
  password: z.string().min(12, { error: 'At least 12 characters' }).regex(/\\d/, { error: 'Include a digit' }),
  confirmPassword: z.string(),
  referralCode: z.string().regex(/^[A-Z0-9]{8}$/, { error: 'Invalid code' }).optional(),
}).refine((v) => v.password === v.confirmPassword, {
  error: 'Passwords do not match',
  path: ['confirmPassword'],
})
export type SignUp = z.infer<typeof SignUpSchema>

export function fieldErrors(input: unknown): Record<string, string> {
  const result = SignUpSchema.safeParse(input)
  if (result.success) return {}
  const out: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.')
    out[key] ??= issue.message
  }
  return out
}
\`\`\``,
    },
    interview: [
      'Kenapa TypeScript saja tidak cukup untuk menjamin bentuk data dari API?',
      'Apa beda `parse` dan `safeParse`, dan kapan kamu memakai `.catch()`?',
      'Di mana validasi sebaiknya dilakukan dalam aplikasi React, dan kenapa cukup sekali per batas?',
    ],
  },
}

export default details
