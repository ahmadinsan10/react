import type { TopicDetail } from '../../types'

const details: Record<string, TopicDetail> = {
  reconciliation: {
    explanation: `Reconciliation adalah tahap ketika React membandingkan pohon elemen yang baru saja dikembalikan komponenmu dengan pohon dari render sebelumnya, lalu menghitung perubahan paling sedikit yang perlu diterapkan ke host (DOM, atau native view). Ini *bukan* diff antar node DOM: yang dibandingkan adalah **elemen React**, yaitu objek biasa yang murah seperti \`{ type: 'li', key: '42', props: {...} }\`.

### Kenapa pakai heuristik, bukan diff yang sempurna

Algoritma umum terbaik untuk mengubah satu pohon menjadi pohon lain butuh biaya sekitar O(n³). Untuk halaman dengan beberapa ribu elemen, itu berarti miliaran operasi per update, jelas terlalu lambat. React memakai dua asumsi yang menurunkan biayanya jadi O(n):

1. **Tipe berbeda berarti subtree berbeda.** Kalau sebuah posisi tadinya berisi \`<ProfileCard>\` lalu sekarang berisi \`<SettingsPanel>\`, atau \`<div>\` berubah jadi \`<section>\`, React tidak mencoba mencocokkan children-nya. React meng-unmount subtree lama (state dan DOM-nya ikut hancur), lalu me-mount yang baru.
2. **Key mengidentifikasi child di antara saudaranya.** Di dalam list, React mencocokkan child lama dan baru berdasarkan \`key\`, bukan posisi. Tanpa key, React kembali memakai index.

### Identitas = tipe + posisi (+ key)

Ini model mental yang paling berguna: **state melekat pada posisi di pohon, bukan pada instance komponen yang kamu buat.** Kalau tipe komponen yang sama dirender di posisi yang sama dengan key yang sama, React mempertahankan state dan fiber-nya, dan hanya meng-update props. Ubah salah satu dari ketiganya, state-nya hilang.

Ini menjelaskan beberapa perilaku yang sering bikin kaget:

- Merender \`{isEditing ? <Input /> : <Input />}\` tetap mempertahankan state input, karena tipe dan posisinya sama.
- Mendefinisikan komponen *di dalam* komponen lain membuat fungsi baru, berarti tipe baru, di setiap render. Child-nya di-remount setiap kali dan kehilangan focus serta state.
- Mengubah \`key\` adalah cara resmi untuk **me-reset** sebuah subtree, misalnya \`<EditForm key={userId} />\`.

### Key di dalam list

Dengan key berupa index, menyisipkan item di paling atas menggeser semua index. React lalu mengira item 0 berubah isinya, item 1 berubah, dan seterusnya, sehingga state (teks input, status checkbox, animasi) pindah ke baris yang salah. Id stabil dari data membuat React paham bahwa "ada satu item baru, sisanya cuma pindah", jadi React hanya menyisipkan satu node DOM dan state baris lain tetap aman.

Key cukup unik di antara saudaranya saja. Key tidak diteruskan ke komponen sebagai prop. Membuat key dengan \`Math.random()\` saat render adalah pilihan terburuk, karena setiap render akan me-remount semua baris.

### Kapan perlu memikirkannya

Sebagian besar waktu kamu tidak perlu memikirkannya. Pikirkan reconciliation ketika state "bocor" antar item, input kehilangan focus saat mengetik, list lambat saat re-render, atau ketika kamu memang sengaja ingin me-reset sebuah komponen.`,
    examples: [
      {
        title: '❌ Key index memindahkan state ke baris yang salah vs ✅ id stabil',
        code: `type Todo = { id: string; text: string }

// ❌ Prepending a todo shifts every index; each row's <input> draft text
// stays attached to the old index, so drafts appear on the wrong todos.
function TodoListBad({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((t, i) => (
        <li key={i}>
          {t.text} <input placeholder="Add a note" />
        </li>
      ))}
    </ul>
  )
}

// ✅ The key follows the data, so React moves DOM nodes (and their state)
// along with the todo they belong to.
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((t) => (
        <li key={t.id}>
          {t.text} <input placeholder="Add a note" />
        </li>
      ))}
    </ul>
  )
}`,
        note: 'Input uncontrolled menyimpan nilainya di node DOM. Dengan key index, React memakai ulang node 0 untuk item apa pun yang sekarang ada di urutan pertama, jadi catatan yang sudah diketik nempel ke todo yang salah.',
      },
      {
        title: '❌ Komponen didefinisikan di dalam render vs ✅ komponen diangkat ke luar',
        code: `// ❌ SearchField is a brand-new function type on every render of Page.
// React sees a different type at the same position, unmounts and remounts it,
// so the input loses focus after every keystroke.
function Page() {
  const [query, setQuery] = useState('')
  function SearchField() {
    return <input value={query} onChange={(e) => setQuery(e.target.value)} />
  }
  return <SearchField />
}

// ✅ Hoisted: the type is stable, so React only updates props.
function SearchField(props: { value: string; onChange: (v: string) => void }) {
  return <input value={props.value} onChange={(e) => props.onChange(e.target.value)} />
}
function PageFixed() {
  const [query, setQuery] = useState('')
  return <SearchField value={query} onChange={setQuery} />
}`,
        note: 'Identitas tipe dibandingkan dengan ===. Fungsi yang dideklarasikan di dalam komponen lain adalah nilai baru di setiap render.',
      },
      {
        title: '✅ Sengaja me-reset state dengan key',
        code: `function ProfilePage({ userId }: { userId: string }) {
  // When userId changes, the whole form remounts with fresh state,
  // with no useEffect needed to "sync" or clear fields.
  return <EditProfileForm key={userId} userId={userId} />
}`,
        note: 'Mengganti key adalah cara bersih untuk bilang "ini sekarang hal yang berbeda". Jauh lebih baik daripada effect yang me-reset beberapa state sekaligus.',
      },
    ],
    realCase: {
      title: 'Balasan tertulis di tiket support yang salah',
      story: `**Situasi:** Sebuah dashboard helpdesk menampilkan list tiket secara live, masing-masing dengan textarea "quick reply" inline. Tiket baru didorong lewat WebSocket dan ditambahkan di paling atas list.

**Gejala:** Para agent melaporkan bahwa balasan yang setengah diketik kadang "loncat" ke tiket lain. Beberapa balasan bahkan terkirim ke pelanggan yang salah.

**Akar masalah:** List memakai \`key={index}\`. Saat tiket baru masuk di index 0, React mempertahankan textarea DOM yang ada sesuai index-nya, sehingga draft untuk tiket A sekarang berada di bawah tiket B. Handler submit membaca id tiket dari props, yang sudah bergeser, sementara teksnya tetap di tempat.

**Perbaikan:** Tim mengganti ke \`key={ticket.id}\` dan memindahkan teks draft ke state yang di-key berdasarkan id tiket, supaya tidak bisa bergeser walaupun markup-nya berubah.

**Pelajaran:** Key index hanya aman untuk list statis yang tidak pernah diurutkan ulang, difilter, atau ditambah di depan. Untuk data yang live, key harus berasal dari data.`,
    },
    pitfalls: [
      'Memakai index array sebagai key untuk list yang bisa diurutkan ulang, difilter, atau ditambah di depan. State dan DOM jadi menempel ke item yang salah.',
      'Membuat key dengan `Math.random()` atau `crypto.randomUUID()` saat render. Setiap render akan me-remount semua child.',
      'Mendeklarasikan komponen di dalam komponen lain. Tipe baru di setiap render berarti remount, state hilang, dan focus hilang.',
      'Berharap state ter-reset saat props berubah. Tipe yang sama di posisi yang sama tetap mempertahankan state; pakai `key` kalau memang mau me-reset.',
      'Membungkus child dengan elemen berbeda secara kondisional (misalnya `<div>` vs `<section>`). Mengganti tipe parent akan meng-unmount seluruh subtree di bawahnya.',
    ],
    exercise: {
      task: 'Buat list berisi 5 counter, masing-masing punya `useState` count sendiri, plus tombol "Shuffle" yang mengacak urutan list. Pertama pakai key index dan perhatikan bahwa angka count tetap di tempatnya sementara label-nya berpindah. Lalu perbaiki supaya setiap count ikut dengan label-nya.',
      hint: 'Beri setiap item id yang stabil saat kamu membuat array awal, bukan saat render.',
      solution: `\`\`\`tsx
const initial = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'].map((label) => ({
  id: label.toLowerCase(),
  label,
}))

function Counter({ label }: { label: string }) {
  const [n, setN] = useState(0)
  return <button onClick={() => setN(n + 1)}>{label}: {n}</button>
}

export function ShuffleList() {
  const [items, setItems] = useState(initial)
  const shuffle = () => setItems([...items].sort(() => Math.random() - 0.5))
  return (
    <>
      <button onClick={shuffle}>Shuffle</button>
      {items.map((it) => (
        // key={it.id}: the counter state now travels with its label.
        <Counter key={it.id} label={it.label} />
      ))}
    </>
  )
}
\`\`\`

Dengan \`key={index}\`, angkanya tetap di slot 0 sampai 4 sementara label-nya berpindah. Ini membuktikan bahwa state melekat pada posisi plus key.`,
    },
    interview: [
      'Kenapa React memakai heuristik dan bukan algoritma tree-edit yang minimal, dan apa saja dua heuristik itu?',
      'Rekan kerjamu bilang "key itu cuma buat menghilangkan warning". Tunjukkan bug konkret yang disebabkan key index.',
      'Bagaimana cara me-reset semua state di dalam form ketika record yang dipilih berubah, tanpa effect?',
    ],
  },

  fiber: {
    explanation: `Fiber adalah struktur data dan algoritma internal yang dipakai React sejak versi 16. Sebuah **fiber** adalah objek JavaScript yang merepresentasikan satu unit kerja: instance komponen, host element seperti \`<div>\`, fragment, Suspense boundary, dan seterusnya. Setiap fiber menyimpan \`type\`, \`key\`, props yang pending dan yang sudah di-memoize, state yang sudah di-memoize (untuk function component, ini list hook-nya), flag effect, dan pointer ke fiber-fiber terkait.

### Pohon tertaut, bukan call stack rekursif

Sebelum Fiber, React merender secara rekursif. Pohon yang dalam berarti call stack JavaScript yang dalam dan tidak bisa dijeda, jadi update besar memblokir main thread sampai selesai. Fiber mengubah pohon menjadi node-node tertaut dengan tiga pointer:

- \`child\`: child pertama
- \`sibling\`: saudara berikutnya
- \`return\`: parent (tempat "kembali" ketika unit ini selesai)

Karena traversal-nya berupa loop atas pointer-pointer ini, bukan pemanggilan fungsi bersarang, React bisa berhenti setelah fiber mana pun, memberi giliran ke browser, lalu melanjutkan dari titik yang sama.

### Dua pohon: current dan work-in-progress

React menyimpan pohon **current** (yang sedang tampil di layar) dan membangun pohon **work-in-progress** untuk update berikutnya. Setiap fiber punya pointer \`alternate\` ke pasangannya. Ketika pohon work-in-progress selesai, React cukup menukar pointer dan pohon itu menjadi current. Teknik double buffering ini memungkinkan React membuang pekerjaan setengah jadi tanpa pengguna pernah melihatnya.

### Render phase: beginWork dan completeWork

**Render phase** menelusuri pohon secara depth first:

1. \`beginWork(fiber)\` saat turun: memanggil komponen (atau membaca props host element), melakukan reconcile terhadap children-nya, lalu mengembalikan child pertama.
2. Ketika sebuah fiber tidak punya child, \`completeWork(fiber)\` dijalankan: untuk host element, ini membuat atau menyiapkan node DOM dan menghitung props yang berubah. Lalu pindah ke sibling, atau naik kembali lewat \`return\` dan menyelesaikan parent-nya.

Fase ini **murni dan bisa diinterupsi**. Fase ini bisa berjalan lebih dari sekali untuk update yang sama. Itulah sebabnya render tidak boleh punya side effect, dan kenapa Strict Mode memanggil komponen dua kali di development untuk membongkar kode yang tidak murni.

### Commit phase

Ketika seluruh pohon siap, **commit phase** berjalan secara sinkron dan tidak bisa diinterupsi, jadi pengguna tidak pernah melihat UI yang setengah ter-update. Fase ini punya beberapa sub-tahap: before mutation (misalnya membaca layout untuk \`getSnapshotBeforeUpdate\`), mutation (menyisipkan, meng-update, dan menghapus node DOM, melepas ref), layout (memasang ref, menjalankan \`useLayoutEffect\`), lalu passive effect (\`useEffect\`) dijalankan sesudahnya, biasanya setelah paint.

### Kenapa kamu perlu peduli

Kamu tidak memakai fiber secara langsung, tapi model ini menjelaskan perilaku nyata: kenapa render bisa jalan dua kali, kenapa effect jalan setelah DOM ter-update, kenapa \`useLayoutEffect\` bisa memblokir paint, dan kenapa React bisa menjaga UI tetap responsif selama transition yang berat. Model ini juga membuat output Profiler di React DevTools (durasi render vs commit) jauh lebih mudah dibaca.`,
    examples: [
      {
        title: 'Work loop fiber versi sederhana',
        code: `type Fiber = {
  type: string | ((props: any) => any)
  props: { children?: any[] } & Record<string, unknown>
  child: Fiber | null
  sibling: Fiber | null
  return: Fiber | null
}

let nextUnitOfWork: Fiber | null = null

// The scheduler calls this; it processes fibers until the time slice is used up.
function workLoop(deadline: { timeRemaining: () => number }) {
  while (nextUnitOfWork && deadline.timeRemaining() > 1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  if (nextUnitOfWork) {
    requestIdleCallback(workLoop) // yield to the browser, continue later
  } else {
    commitRoot() // whole tree ready: apply DOM changes in one go
  }
}

function performUnitOfWork(fiber: Fiber): Fiber | null {
  beginWork(fiber) // render component, reconcile children, set fiber.child
  if (fiber.child) return fiber.child

  let node: Fiber | null = fiber
  while (node) {
    completeWork(node) // create/prepare DOM node, collect effects
    if (node.sibling) return node.sibling
    node = node.return // climb up to the parent
  }
  return null
}

declare function beginWork(f: Fiber): void
declare function completeWork(f: Fiber): void
declare function commitRoot(): void`,
        note: 'Loop ini bisa berhenti setelah unit kerja mana pun karena semua informasi posisi tersimpan di pointer child/sibling/return, bukan di call stack. React yang asli memakai scheduler sendiri, bukan requestIdleCallback, tapi bentuknya sama.',
      },
      {
        title: '❌ Side effect di render vs ✅ di dalam effect',
        code: `// ❌ Render may run several times (Strict Mode, interrupted transitions).
// This sends duplicate analytics events.
function ProductPage({ product }: { product: Product }) {
  analytics.track('product_viewed', { id: product.id })
  return <ProductDetails product={product} />
}

// ✅ Effects run once per commit, after the DOM is updated.
function ProductPageFixed({ product }: { product: Product }) {
  useEffect(() => {
    analytics.track('product_viewed', { id: product.id })
  }, [product.id])
  return <ProductDetails product={product} />
}`,
        note: 'Hanya commit phase yang dijamin terjadi sekali per update yang terlihat. Apa pun yang efeknya bisa diamati dari luar harus ditaruh di effect atau event handler.',
      },
    ],
    realCase: {
      title: 'Page view terhitung dobel setelah fitur concurrent diaktifkan',
      story: `**Situasi:** Sebuah perusahaan media memindahkan halaman artikelnya ke \`createRoot\` dan mulai memakai \`startTransition\` untuk perubahan filter.

**Gejala:** Analytics menunjukkan lonjakan tiba-tiba 30–40% pada event "article viewed", padahal log server tidak menunjukkan perubahan traffic.

**Akar masalah:** Ada pemanggilan tracking langsung di body komponen. Dengan concurrent rendering, transition bisa diinterupsi lalu dirender ulang, dan Strict Mode di staging memanggil render dua kali. Setiap render pass tambahan mengirim event baru.

**Perbaikan:** Tracking dipindahkan ke \`useEffect\` dengan dependency id artikel, dan ditambahkan lint rule untuk menandai pemanggilan modul analytics dari body komponen.

**Pelajaran:** Render phase adalah kalkulasi yang bisa diulang atau dibuang oleh React. Hanya commit phase (dan effect sesudahnya) yang mencerminkan apa yang benar-benar dilihat pengguna.`,
    },
    pitfalls: [
      'Menganggap render jalan tepat sekali per update. Pekerjaan yang diinterupsi atau diulang dan Strict Mode bisa menjalankannya beberapa kali.',
      'Melakukan pekerjaan sinkron yang berat di `useLayoutEffect`. Ia berjalan saat commit, sebelum paint, dan memblokir frame.',
      'Menyamakan "re-render" dengan "update DOM". Render bisa selesai tanpa mutasi DOM sama sekali kalau tidak ada yang berubah.',
      'Mengira commit phase bisa diinterupsi. Fase ini memang sengaja dibuat sinkron supaya UI tidak pernah tampil setengah ter-update.',
    ],
    exercise: {
      task: 'Diberikan pohon App > (Header, Main > (List, Sidebar)), tuliskan urutan persis pemanggilan beginWork dan completeWork di loop versi sederhana. Lalu tambahkan console.log ke work loop sederhana di atas dan jalankan pada pohon tersebut untuk mengecek jawabanmu.',
      hint: 'Depth first: turun lewat child sampai tidak ada lagi, selesaikan (complete) node itu, lalu coba sibling; kalau tidak ada, selesaikan parent-nya.',
      solution: `\`\`\`
begin App
begin Header
complete Header
begin Main
begin List
complete List
begin Sidebar
complete Sidebar
complete Main
complete App
\`\`\`

Parent baru selesai setelah semua child-nya selesai. Karena itulah \`completeWork\` bisa membangun host node lalu menempelkan node-node child yang sudah jadi ke dalamnya.`,
    },
    interview: [
      'Masalah apa yang diselesaikan Fiber dibandingkan stack reconciler yang lama?',
      'Jelaskan perbedaan render phase dan commit phase. Mana yang bisa diinterupsi, dan kenapa?',
      'Untuk apa pointer alternate, dan apa keuntungan double buffering bagi React?',
    ],
  },

  lanes: {
    explanation: `Tidak semua update sama mendesaknya. Ketikan keyboard harus muncul di input dalam satu frame, sedangkan memfilter ulang tabel 10.000 baris bisa menunggu beberapa ratus milidetik. React memodelkan ini dengan **lanes**: setiap update diberi prioritas, disimpan sebagai satu bit dalam bitmask 31-bit.

### Dari mana lane berasal

React memilih lane berdasarkan *bagaimana* update itu dipicu:

- **Discrete event** (click, keydown, input) mendapat sync lane berprioritas tinggi. Update ini di-flush secara sinkron, jadi UI langsung merespons.
- **Continuous event** (scroll, pointermove) mendapat lane yang sedikit lebih rendah tapi tetap cepat.
- **Default update** (misalnya \`setState\` di dalam \`setTimeout\` atau setelah fetch) mendapat default lane. Sejak React 18, update ini di-batch otomatis.
- **Transition** (\`startTransition\`, \`useTransition\`, dan render background dari \`useDeferredValue\`) mendapat salah satu dari beberapa transition lane.
- Pekerjaan **idle dan offscreen** mendapat lane terendah.

Karena lane berupa bit, React bisa menggabungkannya dengan murah (\`a | b\`), mengecek apakah sebuah fiber punya pekerjaan pending di sekumpulan lane, dan memproses beberapa lane sekaligus dalam satu batch.

### Interupsi dan restart

Ketika React sedang merender di transition lane lalu datang update yang mendesak, React bisa menghentikan render transition itu di antara fiber (lihat work loop fiber), menangani update mendesak dan meng-commit-nya, lalu kembali ke transition. Biasanya React **memulai ulang** transition dari root dengan state terbaru, bukan melanjutkan persis dari titik terakhir, karena update mendesak tadi mungkin sudah mengubah input-nya. Inilah kenapa render harus murni: pekerjaan parsial bisa dibuang.

Concurrent rendering juga memberi giliran ke browser sekitar setiap 5ms selama render transition, jadi main thread tidak pernah terblokir lama walaupun total render-nya lambat.

### Yang bisa kamu kendalikan

Kamu tidak memilih nomor lane. Kamu memilih *jenis* update-nya:

- \`startTransition(() => setFilter(x))\` menandainya tidak mendesak. UI lama tetap tampil dan bisa dipakai sampai UI baru siap, dan fallback Suspense tidak ditampilkan lagi untuk konten yang sudah terlihat.
- \`useDeferredValue(value)\` memberikan nilai yang "tertinggal" selama update mendesak, lalu menyusul lewat render di background.
- \`isPending\` dari \`useTransition\` memungkinkan kamu menampilkan indikator loading yang halus.

### Batasannya

Transition tidak membuat kode lambat jadi lebih cepat. Transition membuatnya *bisa diinterupsi*. Satu komponen yang berjalan 300ms tetap memblokir selama 300ms, karena React hanya bisa memberi giliran di antara komponen. Nilai input controlled tidak boleh di-update di dalam transition: nilai input harus tetap mendesak, kalau tidak mengetik akan terasa rusak. Pisahkan state menjadi "apa yang ditampilkan input" (mendesak) dan "apa yang dipakai list yang berat" (transition atau deferred).`,
    examples: [
      {
        title: '❌ Semuanya mendesak vs ✅ input mendesak plus transition untuk hasil',
        code: `// ❌ Each keystroke synchronously re-renders 5,000 rows; typing stutters.
function ProductSearchBad({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const results = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ResultsTable rows={results} />
    </>
  )
}

// ✅ Input value stays urgent; the expensive list renders in a transition lane.
function ProductSearch({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [isPending, startTransition] = useTransition()

  const results = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())),
    [products, filter],
  )

  return (
    <>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value) // sync lane
          startTransition(() => setFilter(e.target.value)) // transition lane
        }}
      />
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        <ResultsTable rows={results} />
      </div>
    </>
  )
}`,
        note: 'Dua state dengan dua prioritas. Kalau pengguna mengetik lagi sebelum tabel selesai dirender, React membuang render tabel yang sudah basi dan mulai ulang dengan filter terbaru.',
      },
      {
        title: '✅ Ide yang sama dengan useDeferredValue',
        code: `function ProductSearch({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <div style={{ opacity: isStale ? 0.6 : 1 }}>
        {/* memo matters: ResultsTable must skip re-render when deferredQuery is unchanged */}
        <MemoResultsTable products={products} query={deferredQuery} />
      </div>
    </>
  )
}

const MemoResultsTable = memo(function ResultsTable(props: { products: Product[]; query: string }) {
  const rows = props.products.filter((p) => p.name.includes(props.query))
  return <Table rows={rows} />
})`,
        note: 'useDeferredValue berguna ketika kamu tidak memegang pemanggilan setState-nya (misalnya nilainya datang dari props). Child-nya harus di-memoize, kalau tidak ia tetap ikut re-render bersama update yang mendesak.',
      },
    ],
    realCase: {
      title: 'Mengetik terasa lag di filter bar analytics',
      story: `**Situasi:** Sebuah tool BI internal punya filter bar di atas grid berisi sekitar 40 chart. Setiap ketikan di filter me-re-render semua chart.

**Gejala:** Mengetik di field filter lag 200–400ms per karakter. Pengukuran INP di Real User Monitoring masuk kategori "poor".

**Akar masalah:** Nilai input dan filter chart memakai satu state yang sama, di-update di default/sync lane, sehingga setiap ketikan harus menunggu 40 chart selesai dirender.

**Perbaikan:** Tim memisahkan state-nya: nilai input tetap mendesak, sedangkan filter yang diterapkan di-set di dalam \`startTransition\`. Grid chart dibungkus dengan \`memo\`. Mereka juga menampilkan perubahan opacity tipis selama \`isPending\` bernilai true.

**Pelajaran:** Lanes memungkinkan kamu memberi tahu React apa yang sedang ditunggu pengguna. Jaga feedback langsung (mengetik, klik) tetap mendesak, dan pindahkan render turunan yang berat ke transition.`,
    },
    pitfalls: [
      'Menaruh update nilai input controlled itu sendiri di dalam `startTransition`. Input jadi tidak langsung menampilkan ketikan.',
      'Berharap transition mempercepat satu komponen yang lambat. React hanya memberi giliran di antara komponen, bukan di dalam satu komponen.',
      'Memakai `useDeferredValue` tanpa me-memoize child yang berat. Child-nya tetap re-render di setiap update mendesak.',
      'Menambahkan transition padahal solusi sebenarnya adalah mengurangi pekerjaan: virtualisasi list panjang atau hindari menghitung ulang data terlebih dulu.',
    ],
    exercise: {
      task: 'Buat komponen dengan sebuah input dan list berisi 20.000 string hasil generate yang difilter berdasarkan input. Rasakan bagaimana rasanya mengetik. Lalu pisahkan state-nya dan pakai `useTransition` (atau `useDeferredValue`) supaya mengetik tetap mulus, dan tampilkan indikator pending.',
      hint: 'Pakai CPU throttling 4x atau 6x di Chrome DevTools supaya bedanya kelihatan jelas.',
      solution: `\`\`\`tsx
const all = Array.from({ length: 20_000 }, (_, i) => \`Item \${i} \${(i * 7919) % 1000}\`)

const List = memo(function List({ q }: { q: string }) {
  const rows = all.filter((s) => s.includes(q)).slice(0, 2000)
  return <ul>{rows.map((r) => <li key={r}>{r}</li>)}</ul>
})

export function Search() {
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [pending, start] = useTransition()
  return (
    <>
      <input value={text} onChange={(e) => { setText(e.target.value); start(() => setQ(e.target.value)) }} />
      {pending && <small>Updating…</small>}
      <List q={q} />
    </>
  )
}
\`\`\``,
    },
    interview: [
      'Apa itu lane, dan kenapa React merepresentasikan prioritas sebagai bitmask?',
      'Apa yang terjadi pada render transition yang sedang berjalan ketika pengguna mengklik sesuatu?',
      'Kapan kamu memilih `useDeferredValue` dibanding `useTransition`?',
    ],
  },

  'hook-storage': {
    explanation: `Hook terlihat seperti sulap: \`useState(0)\` entah bagaimana bisa mengingat nilai di antara pemanggilan sebuah fungsi biasa. Triknya sederhana. React menyimpan state hook **di fiber** milik komponen yang sedang dirender, dalam bentuk **linked list sesuai urutan pemanggilan**.

### Mount vs update

Ketika function component dirender pertama kali, React mengisi variabel "fiber yang sedang dirender" dan memakai implementasi *mount* untuk setiap hook. Setiap pemanggilan hook menambahkan objek hook baru ke list \`memoizedState\` milik fiber:

\`\`\`
fiber.memoizedState -> { memoizedState: 0, queue, next } -> { memoizedState: effect, next } -> ...
                           useState(0)                       useEffect(...)
\`\`\`

Di render berikutnya, React memakai implementasi *update*. React tidak mencari hook berdasarkan nama, karena memang tidak ada nama. React cukup menelusuri list-nya: pemanggilan hook pertama mendapat node pertama, pemanggilan kedua mendapat node kedua, dan seterusnya.

### Isi setiap node

- **useState / useReducer**: state saat ini plus sebuah **queue** update. \`setState\` tidak langsung mengubah state. Ia membuat objek update (dengan lane), memasukkannya ke queue, lalu menjadwalkan render. Di render berikutnya React memproses queue itu untuk menghitung state baru. Itulah sebabnya nilai yang kamu baca tepat setelah \`setCount(c + 1)\` masih nilai lama, dan kenapa functional update \`setCount(c => c + 1)\` bisa digabung dengan benar.
- **useRef**: objek \`{ current }\` yang dibuat sekali lalu dikembalikan terus.
- **useMemo / useCallback**: nilai yang di-cache dan dependency array-nya.
- **useEffect / useLayoutEffect**: objek effect (fungsi create, fungsi destroy, deps, flag). Objek ini juga ditautkan ke list terpisah supaya commit phase bisa menjalankannya dengan cepat.

### Kenapa Rules of Hooks ada

Karena identitasnya murni berdasarkan **posisi**, jumlah dan urutan pemanggilan hook harus sama di setiap render. Kalau kamu memanggil hook di dalam \`if\`, di loop dengan panjang yang berubah-ubah, atau setelah \`return\` lebih awal, maka di render yang melewati cabang itu setiap hook sesudahnya akan membaca node milik tetangganya. Sebuah \`useState\` bisa mendapat nilai cache milik memo, sebuah effect bisa mendapat ref. React mendeteksi sebagian kasus ("Rendered fewer hooks than expected"), tapi tidak semuanya.

Karena itu aturannya:

1. Panggil hook hanya di level teratas komponen atau custom hook, jangan pernah secara kondisional.
2. Panggil hook hanya dari fungsi React (komponen dan custom hook).

Custom hook tidak istimewa saat runtime. Ia hanyalah fungsi yang memanggil hook, jadi hook-hook di dalamnya langsung masuk ke list milik komponen pemanggilnya. Dua komponen yang memakai custom hook yang sama *tidak* berbagi state.

### Pengecualiannya: use

\`use(promise)\` dan \`use(context)\` boleh dipanggil secara kondisional, karena \`use\` tidak menyimpan node di list hook dengan cara posisional yang sama. Tapi \`use\` tetap hanya boleh dipanggil saat render, tidak di event handler.`,
    examples: [
      {
        title: 'Runtime hook mini',
        code: `type Hook = { state: unknown; next: Hook | null }
type FiberLike = { memoizedState: Hook | null }

let currentFiber: FiberLike
let workInProgressHook: Hook | null = null
let isMount = true

function useStateMini<T>(initial: T): [T, (v: T) => void] {
  let hook: Hook
  if (isMount) {
    hook = { state: initial, next: null }
    if (!currentFiber.memoizedState) currentFiber.memoizedState = hook
    else workInProgressHook!.next = hook
  } else {
    // walk to the next node in call order
    hook = workInProgressHook ? workInProgressHook.next! : currentFiber.memoizedState!
  }
  workInProgressHook = hook
  const setState = (v: T) => {
    hook.state = v // real React enqueues an update with a lane instead
    scheduleRender(currentFiber)
  }
  return [hook.state as T, setState]
}

declare function scheduleRender(f: FiberLike): void`,
        note: 'Tidak ada nama atau id di mana pun: satu-satunya penghubung antara pemanggilan dan state-nya adalah urutan pemanggilan. React yang asli juga menyimpan queue update dan dispatcher mount/update yang terpisah.',
      },
      {
        title: '❌ Hook kondisional vs ✅ kondisi di dalam hook',
        code: `// ❌ When isAdmin flips, every hook below shifts by one position.
function Toolbar({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) {
    const [auditOpen, setAuditOpen] = useState(false)
  }
  const [search, setSearch] = useState('') // may read auditOpen's node
  useEffect(() => { /* ... */ }, [search])
  return null
}

// ✅ Always call the hook; branch on the value.
function ToolbarFixed({ isAdmin }: { isAdmin: boolean }) {
  const [auditOpen, setAuditOpen] = useState(false)
  const [search, setSearch] = useState('')
  useEffect(() => { /* ... */ }, [search])
  return isAdmin ? <AuditToggle open={auditOpen} onChange={setAuditOpen} /> : null
}`,
        note: 'Pemanggilan hook yang tidak terpakai hampir tidak ada biayanya. List hook yang bergeser menghasilkan bug yang sangat sulit dilacak. eslint-plugin-react-hooks menangkap ini saat build.',
      },
    ],
    realCase: {
      title: 'Feature flag yang mengacak state form',
      story: `**Situasi:** Sebuah form checkout menambahkan field baru "pesan hadiah" di balik feature flag. Seorang developer membungkus \`useState\` yang baru dengan \`if (flags.giftMessage)\`. Lint rule-nya sudah dimatikan di folder itu sejak berbulan-bulan sebelumnya.

**Gejala:** Untuk pengguna yang nilai flag-nya baru datang setelah render pertama (flag dimuat secara asinkron), field alamat pengiriman tiba-tiba menampilkan teks pesan hadiah, dan sebuah effect mulai jalan di setiap ketikan.

**Akar masalah:** Di render pertama flag bernilai false, jadi list-nya berisi N hook. Ketika flag menjadi true, sebuah hook baru tersisip di tengah dan semua hook sesudahnya membaca node yang salah. React hanya mencatat warning urutan hook di development, dan tidak ada yang melihatnya.

**Perbaikan:** Hook dipanggil tanpa kondisi dan field-nya dirender secara kondisional. Lint rule dinyalakan lagi sebagai error di seluruh repo, dan CI gagal kalau ada warning hook.

**Pelajaran:** Identitas hook adalah posisi. Perlakukan Rules of Hooks sebagai aturan compiler yang wajib, bukan sekadar preferensi gaya.`,
    },
    pitfalls: [
      'Memanggil hook setelah `return` lebih awal. Jumlah hook jadi berbeda antar render.',
      'Memanggil hook di dalam loop yang panjangnya berubah, misalnya satu `useState` per item list. Pindahkan setiap item ke komponennya sendiri.',
      'Berharap state langsung berubah setelah `setState`. Update-nya masuk queue dan baru diterapkan di render berikutnya.',
      'Mengira custom hook berbagi state antar komponen. Setiap tempat pemanggilan mendapat node sendiri di fiber-nya sendiri.',
      'Mematikan `react-hooks/rules-of-hooks` "sementara". Itu satu-satunya pengaman dari bug urutan yang tidak bersuara.',
    ],
    exercise: {
      task: 'Kembangkan runtime mini di atas dengan `useRefMini` dan fungsi `render(Component)` yang me-reset `workInProgressHook` dan `isMount` dengan benar, sehingga komponen yang memanggil `useStateMini` lalu `useRefMini` tetap mempertahankan kedua nilainya selama tiga kali render.',
      hint: 'Sebelum setiap render, set `workInProgressHook = null`. Setelah render pertama, set `isMount = false`.',
      solution: `\`\`\`ts
function useRefMini<T>(initial: T): { current: T } {
  let hook: Hook
  if (isMount) {
    hook = { state: { current: initial }, next: null }
    if (!currentFiber.memoizedState) currentFiber.memoizedState = hook
    else workInProgressHook!.next = hook
  } else {
    hook = workInProgressHook ? workInProgressHook.next! : currentFiber.memoizedState!
  }
  workInProgressHook = hook
  return hook.state as { current: T }
}

function render(fiber: FiberLike, Component: () => void) {
  currentFiber = fiber
  workInProgressHook = null
  Component()
  isMount = false
}
\`\`\`

Panggil \`render\` tiga kali dan log nilainya: state dan objek ref tetap sama karena setiap pemanggilan membaca posisi yang sama.`,
    },
    interview: [
      'Di mana React menyimpan state untuk `useState`, dan bagaimana React menemukannya lagi di render berikutnya?',
      'Jelaskan secara persis apa yang rusak ketika sebuah hook dipanggil secara kondisional.',
      'Kenapa `use` boleh dipanggil di dalam kondisi sementara `useContext` tidak?',
    ],
  },

  suspense: {
    explanation: `Suspense memungkinkan sebuah komponen bilang "aku belum bisa dirender" dan memungkinkan parent-nya memutuskan apa yang ditampilkan sementara itu. Mekanismenya sederhana: saat render, komponen yang butuh data yang belum siap akan **suspend**. React berhenti merender subtree itu, mencari \`<Suspense>\` boundary terdekat di atasnya, lalu menampilkan \`fallback\` milik boundary tersebut. Ketika promise yang ditunggu selesai, React mencoba render lagi.

### Cara kerja suspend

Di React 19, cara resmi membaca promise saat render adalah \`use(promise)\`. Kalau promise-nya sudah resolve, \`use\` mengembalikan nilainya. Kalau masih pending, React men-suspend komponen. Kalau reject, error-nya dilempar ke **error boundary** terdekat. Library data seperti TanStack Query (\`useSuspenseQuery\`), Relay, dan loader dari framework terintegrasi dengan cara yang sama.

Detail penting: **promise-nya harus stabil antar render**. Kalau kamu membuat promise \`fetch()\` baru di dalam body komponen, setiap percobaan ulang akan membuat promise baru, yang suspend lagi, dan kamu terjebak loop tanpa akhir. Promise harus berasal dari cache, loader, parent (misalnya Server Component yang meneruskan promise ke bawah), atau library data.

### Boundary menentukan pengalaman loading

Di mana kamu menaruh boundary menentukan apa yang dilihat pengguna:

- Satu boundary untuk seluruh halaman: semuanya menunggu bagian yang paling lambat.
- Satu boundary per bagian yang independen: setiap bagian muncul begitu siap.
- Boundary bersarang: skeleton luar muncul lebih dulu, lalu detail di dalamnya muncul bertahap.

Saudara di dalam boundary yang sama ditampilkan bersamaan, sehingga mencegah efek "popcorn", yaitu banyak spinner yang muncul acak di sana-sini.

### Suspense dan transition

Kalau sebuah update yang sudah menampilkan konten suspend lagi, normalnya React akan mengganti konten itu dengan fallback. Kalau update tersebut adalah **transition** (\`startTransition\`, atau navigasi di kebanyakan router), React justru mempertahankan UI lama dan menunggu, karena menyembunyikan konten yang sedang dilihat pengguna terasa lebih buruk daripada jeda singkat. Pakai \`isPending\` untuk menampilkan indikator yang halus.

### Di server

Dengan streaming SSR, Suspense boundary juga menjadi **streaming boundary**. Server mengirim shell beserta fallback lebih dulu, lalu men-stream HTML setiap boundary ketika datanya siap, bersama script inline kecil yang menukarnya ke tempatnya. Di client, boundary juga menjadi unit **selective hydration**.

### Kapan tidak memakainya

Suspense menangani *loading*, bukan error. Pasangkan setiap boundary penting dengan error boundary. Hindari juga boundary yang terlalu halus sampai halaman berkedip penuh skeleton, dan hindari waterfall ketika child baru mulai fetch setelah data parent-nya tiba. Mulai request sedini mungkin (di loader atau parent) lalu baca di level yang lebih bawah.`,
    examples: [
      {
        title: '❌ Promise dibuat saat render vs ✅ promise dari parent dengan use',
        code: `// ❌ A new promise on every render: suspend -> retry -> new promise -> suspend ...
function OrderSummaryBad({ orderId }: { orderId: string }) {
  const order = use(fetch(\`/api/orders/\${orderId}\`).then((r) => r.json()))
  return <Summary order={order} />
}

// ✅ Start the request once, outside render, and pass the promise down.
// In Next.js the page is a Server Component, so this runs on the server.
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orderPromise = getOrder(id) // not awaited: starts the query now
  return (
    <ErrorBoundary fallback={<p>Could not load this order.</p>}>
      <Suspense fallback={<SummarySkeleton />}>
        <OrderSummary orderPromise={orderPromise} />
      </Suspense>
    </ErrorBoundary>
  )
}

// Client Component
'use client'
function OrderSummary({ orderPromise }: { orderPromise: Promise<Order> }) {
  const order = use(orderPromise) // suspends until resolved, throws to boundary on reject
  return <Summary order={order} />
}`,
        note: 'Identitas promise-nya stabil karena dibuat sekali oleh parent. Error ditangani ErrorBoundary; loading ditangani Suspense. (Di project nyata kedua komponen ini ada di file terpisah, karena directive harus berada di paling atas file.)',
      },
      {
        title: '✅ Boundary independen untuk data yang independen',
        code: `export default function Dashboard() {
  return (
    <>
      <Header />
      <div className="grid">
        <Suspense fallback={<CardSkeleton />}>
          <RevenueCard />{/* fast query */}
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <ChurnCard />{/* slow warehouse query */}
        </Suspense>
      </div>
    </>
  )
}`,
        note: 'Query churn yang lambat tidak lagi menunda revenue. Kedua query mulai paralel karena kedua komponen dirender di waktu yang sama.',
      },
    ],
    realCase: {
      title: 'Spinner tanpa akhir setelah migrasi ke use()',
      story: `**Situasi:** Sebuah tim mengganti fetching berbasis \`useEffect\` di halaman profil dengan \`use\` dari React 19, dengan menulis \`use(fetchProfile(id))\` langsung di dalam komponen.

**Gejala:** Halaman menampilkan skeleton selamanya di production dan membanjiri API dengan ratusan request identik per detik per pengguna.

**Akar masalah:** Setiap render percobaan ulang memanggil \`fetchProfile\` lagi dan mendapat promise baru yang masih pending. React suspend pada promise baru itu setiap kali, jadi dari sudut pandang React promise-nya tidak pernah selesai.

**Perbaikan:** Fetch dipindahkan ke Server Component milik route, yang meneruskan promise sebagai prop. Untuk bagian yang khusus client, mereka memakai \`useSuspenseQuery\` dari TanStack Query, yang meng-cache promise berdasarkan key. Alert rate-limit pada endpoint itu juga ditambahkan.

**Pelajaran:** \`use\` membaca promise; \`use\` tidak memilikinya. Promise harus di-cache atau dibuat di luar render.`,
    },
    pitfalls: [
      'Membuat promise di dalam komponen yang memanggil `use`. Ini menyebabkan loop suspend tanpa akhir.',
      'Tidak ada error boundary di dekat Suspense boundary. Promise yang reject akan membuat sebagian besar pohon crash.',
      'Satu boundary raksasa untuk seluruh halaman, sehingga query paling lambat yang menentukan kapan apa pun bisa muncul.',
      'Waterfall request: child baru mulai fetch setelah parent selesai. Mulai request bersamaan, baca di tempat yang membutuhkan.',
      'Kaget karena transition mempertahankan konten lama alih-alih menampilkan fallback. Itu memang disengaja; pakai `isPending` untuk feedback.',
    ],
    exercise: {
      task: 'Tulis `createResourceCache` kecil yang mengembalikan promise stabil per key, lalu buat client component `<UserCard id>` yang memakai `use` dengan cache itu. Bungkus dua card dengan id berbeda di Suspense boundary terpisah plus satu error boundary, lalu simulasikan satu request yang lambat dan satu yang gagal.',
      hint: '`Map<string, Promise<T>>` sudah cukup. Simpan promise-nya sebelum resolve.',
      solution: `\`\`\`tsx
const cache = new Map<string, Promise<User>>()
function getUser(id: string) {
  let p = cache.get(id)
  if (!p) {
    p = fetch(\`/api/users/\${id}\`).then((r) => {
      if (!r.ok) throw new Error('User not found')
      return r.json() as Promise<User>
    })
    cache.set(id, p)
  }
  return p
}

function UserCard({ id }: { id: string }) {
  const user = use(getUser(id))
  return <p>{user.name}</p>
}

export function Users() {
  return (
    <ErrorBoundary fallback={<p>Something failed.</p>}>
      <Suspense fallback={<p>Loading A…</p>}><UserCard id="a" /></Suspense>
      <Suspense fallback={<p>Loading B…</p>}><UserCard id="b" /></Suspense>
    </ErrorBoundary>
  )
}
\`\`\`

Di aplikasi nyata, tambahkan mekanisme eviction cache atau pakai library data; cache ini tidak pernah melupakan apa pun.`,
    },
    interview: [
      'Apa persisnya yang terjadi di dalam React ketika sebuah komponen suspend?',
      'Kenapa promise yang diberikan ke `use` harus stabil, dan bagaimana cara membuatnya stabil?',
      'Bagaimana perilaku Suspense berbeda saat transition, dan kenapa itu UX yang lebih baik?',
    ],
  },

  hydration: {
    explanation: `Server-side rendering menghasilkan HTML supaya pengguna bisa melihat konten sebelum JavaScript selesai dimuat. HTML itu belum interaktif. **Hydration** adalah proses ketika React, yang berjalan di browser, merender pohon komponen yang sama, menelusuri DOM yang sudah ada, lalu *mengadopsinya*: memasang event handler dan menghubungkan fiber ke node yang sudah ada, bukan membuat node baru. Kamu memulainya dengan \`hydrateRoot(container, <App />)\` (framework melakukan ini untukmu).

### Kontraknya: output harus sama

Hydration mengasumsikan render pertama di client menghasilkan **output yang persis sama** dengan server. Kalau tidak, terjadilah **hydration mismatch**. React 19 melaporkan satu error yang lebih jelas lengkap dengan diff konten yang tidak cocok. Untuk mismatch teks, React mungkin bisa menambalnya, tapi secara umum React akan mundur ke client rendering untuk Suspense boundary terdekat (atau seluruh root) dan membuang HTML dari server. Ini mahal dari sisi performa dan bisa menyebabkan kedipan yang terlihat atau input yang hilang.

Penyebab yang sering muncul:

- Waktu dan nilai acak: \`new Date()\`, \`Date.now()\`, \`Math.random()\`, atau id acak saat render.
- Perbedaan locale dan timezone: server memformat tanggal dalam UTC dengan \`en-US\`, browser memakai zona dan bahasa pengguna.
- Pengecekan khusus browser di render: \`typeof window !== 'undefined'\`, \`localStorage\`, \`matchMedia\`.
- Nesting HTML yang tidak valid, misalnya \`<div>\` di dalam \`<p>\`. Parser browser menyusun ulang strukturnya, jadi DOM-nya tidak cocok.
- Ekstensi browser yang menyisipkan atribut atau node (React 19 lebih toleran terhadap sebagian kasus ini, tapi tidak semuanya).

### Memperbaiki mismatch dengan benar

- Buat output yang deterministik: kirim waktu atau locale dari server sebagai prop, format dengan timezone eksplisit, dan pakai \`useId\` untuk id.
- Untuk nilai yang hanya bisa diketahui di client, render placeholder netral di kedua sisi lalu update setelah mount (lewat effect, atau \`useSyncExternalStore\` dengan \`getServerSnapshot\`).
- Untuk perbedaan teks kecil yang memang tidak bisa dihindari (misalnya timestamp), \`suppressHydrationWarning\` pada satu elemen itu masih bisa diterima. Ia hanya berlaku satu level dan tidak memperbaiki apa pun. Ia cuma membungkam warning-nya.

### Streaming dan selective hydration

Dengan streaming SSR (\`renderToReadableStream\`, atau framework seperti Next.js), HTML datang dalam potongan-potongan per Suspense boundary. Di client, setiap boundary bisa **di-hydrate secara independen**: React tidak perlu menunggu seluruh JavaScript dan data halaman untuk mulai. Kalau pengguna mengklik di dalam boundary yang belum di-hydrate, React **memprioritaskan hydration boundary itu** lebih dulu lalu memutar ulang event-nya. Inilah selective hydration, dan ini alasan kuat untuk membungkus bagian yang lambat atau berat dengan Suspense.

### Biayanya

Hydration tetap menjalankan setiap komponen di client, jadi pohon yang besar tetap memakan CPU walaupun HTML-nya sudah ada. Server Component mengurangi biaya ini karena output-nya tidak perlu di-hydrate dan kodenya tidak pernah dikirim ke browser.`,
    examples: [
      {
        title: '❌ Timestamp yang bergantung locale vs ✅ format yang deterministik',
        code: `// ❌ Server (UTC, en-US) prints "3/4/2026, 11:00 PM".
// A browser in Jakarta (UTC+7, id-ID) prints "5/3/2026, 06.00". Mismatch.
function OrderPlaced({ placedAt }: { placedAt: string }) {
  return <time>{new Date(placedAt).toLocaleString()}</time>
}

// ✅ Fix the locale and timezone explicitly (here: the store's timezone),
// so server and client produce identical text.
const fmt = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Jakarta',
})
function OrderPlacedFixed({ placedAt }: { placedAt: string }) {
  return <time dateTime={placedAt}>{fmt.format(new Date(placedAt))}</time>
}`,
        note: 'Kalau kamu benar-benar butuh timezone milik pengguna, render dulu teks dengan zona tetap, lalu ganti ke versi lokal setelah mount.',
      },
      {
        title: '❌ Cek window di render vs ✅ useSyncExternalStore dengan server snapshot',
        code: `// ❌ Server renders "desktop" layout, a phone renders "mobile" on hydration.
function NavBad() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  return isMobile ? <MobileNav /> : <DesktopNav />
}

// ✅ The server snapshot is used for SSR AND the hydration render,
// then React re-renders with the real value right after.
function subscribe(cb: () => void) {
  const mq = window.matchMedia('(max-width: 767px)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(max-width: 767px)').matches,
    () => false, // server and first client render agree
  )
}
function Nav() {
  return useIsMobile() ? <MobileNav /> : <DesktopNav />
}`,
        note: 'Untuk perbedaan yang murni visual, CSS media query malah lebih baik: tanpa JavaScript, tanpa mismatch, tanpa layout shift.',
      },
    ],
    realCase: {
      title: 'Label "terakhir diperbarui" yang mematikan SSR di halaman produk',
      story: `**Situasi:** Halaman produk sebuah toko online menampilkan "Harga diperbarui 3 menit lalu", yang dihitung dengan \`Date.now()\` saat render.

**Gejala:** Core Web Vitals di lab terlihat bagus, tapi LCP di lapangan malah lebih buruk dibanding sebelum SSR diterapkan, dan console menampilkan error hydration. Sebagian pengguna melihat halamannya berkedip.

**Akar masalah:** Server dan client menghitung nilai "menit lalu" yang berbeda. React tidak bisa memakai ulang HTML dari server untuk boundary itu, yang kebetulan mencakup seluruh bagian produk, sehingga merendernya ulang di client, termasuk mengunduh ulang dan men-decode ulang gambar.

**Perbaikan:** Server merender timestamp absolut di dalam elemen \`<time>\`. Sebuah client component kecil mengubahnya menjadi teks relatif setelah mount. Bagian produk juga dipecah menjadi Suspense boundary yang lebih kecil.

**Pelajaran:** Apa pun yang bergantung pada "sekarang", locale pengguna, atau browser tidak boleh muncul di render pertama. Error hydration adalah bug performa, bukan sekadar noise di console.`,
    },
    pitfalls: [
      'Memakai `Date.now()`, `Math.random()`, atau `toLocaleString()` tanpa locale/timezone tetap di render.',
      'Membuat percabangan berdasarkan `typeof window` di render. Server dan client akan mengambil cabang yang berbeda.',
      'Menebar `suppressHydrationWarning` di mana-mana untuk menyembunyikan error. Ini hanya menyembunyikan gejala dan cuma berlaku satu level.',
      'Nesting tidak valid seperti `<div>` di dalam `<p>` atau `<a>` di dalam `<a>`. Parser browser mengubah DOM sebelum React melihatnya.',
      'Menganggap SSR berarti tidak ada biaya di client. Hydration tetap menjalankan setiap Client Component.',
    ],
    exercise: {
      task: 'Buat komponen `<RelativeTime iso>` yang aman untuk hydration: di server dan selama hydration ia mencetak tanggal absolut dalam UTC; setelah mount ia menampilkan "5 minutes ago" dan diperbarui setiap menit.',
      hint: 'Simpan flag `mounted` di state yang di-set oleh effect, atau pakai `useSyncExternalStore` dengan server snapshot.',
      solution: `\`\`\`tsx
'use client'
const abs = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })
const rel = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function RelativeTime({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  const date = new Date(iso)
  const text =
    now === null
      ? abs.format(date) + ' UTC'
      : rel.format(Math.round((date.getTime() - now) / 60_000), 'minute')
  return <time dateTime={iso} title={abs.format(date)}>{text}</time>
}
\`\`\``,
    },
    interview: [
      'Apa sebenarnya yang dilakukan hydration, dan apa yang terjadi ketika ada mismatch?',
      'Sebutkan empat penyebab umum hydration mismatch dan cara memperbaiki masing-masing.',
      'Apa itu selective hydration dan bagaimana Suspense boundary memungkinkannya?',
    ],
  },

  compiler: {
    explanation: `**React Compiler** adalah tool build-time (plugin Babel, dengan integrasi untuk Vite, Next.js, dan bundler lain) yang menulis ulang komponen dan hook-mu supaya otomatis ter-memoize. Rilis stabil 1.0-nya keluar di Oktober 2025.

### Setup saat ini

\`\`\`ts
// vite.config.ts (@vitejs/plugin-react 6+; the old react({ babel: … }) option was removed)
// npm install -D @rolldown/plugin-babel @babel/core babel-plugin-react-compiler
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
})
\`\`\`

- **Next.js**: \`reactCompiler: true\` di \`next.config.ts\`.
- **Port Rust eksperimental**: \`react({ compiler: true })\` di Vite (butuh peer opsional \`oxc-transform-react\`), atau \`experimental.turbopackRustReactCompiler: true\` di Next.js 16.3+. Cepat, tapi masih eksperimental.
- **Lint**: \`eslint-plugin-react-hooks@latest\` dengan preset \`recommended-latest\` sudah mencakup aturan compiler.

### Masalah yang diselesaikan

Secara default, ketika sebuah komponen re-render, React menjalankan ulang seluruh fungsinya dan me-re-render semua child. Untuk menghindari kerja sia-sia, orang menambahkan \`useMemo\`, \`useCallback\`, dan \`memo\` secara manual. Hasilnya kode jadi ramai, gampang salah (dependency terlewat), dan gampang terlupa. Compiler mengerjakan itu untukmu, sering kali dengan granularitas yang lebih halus daripada kalau kamu tulis manual. Compiler bisa me-memoize elemen JSX satu per satu dan nilai-nilai perantara, bahkan nilai yang dihitung setelah return kondisional, sesuatu yang tidak bisa dilakukan hook manual.

### Cara kerjanya, kurang lebih

Compiler mem-parse setiap komponen ke dalam representasi perantara, menganalisis aliran data (nilai mana bergantung pada props, state, dan context yang mana), lalu mengidentifikasi **reactive scope**: kelompok nilai yang berubah bersamaan. Setelah itu compiler menghasilkan kode yang meng-cache setiap scope di array cache per komponen (lewat hook internal) dan hanya menghitung ulang ketika input-nya berubah. Secara konsep, output-nya kira-kira seperti ini:

\`\`\`
const $ = useMemoCache(4)
let rows
if ($[0] !== items || $[1] !== filter) {
  rows = items.filter(...)
  $[0] = items; $[1] = filter; $[2] = rows
} else {
  rows = $[2]
}
\`\`\`

Hasilnya: props yang tidak berubah menghasilkan referensi objek dan elemen yang sama, jadi child melewati re-render tanpa perlu \`memo\` eksplisit.

### Bergantung pada Rules of React

Compiler hanya bisa melakukan ini dengan aman kalau kodemu mengikuti aturannya:

- Komponen dan hook bersifat **murni** saat render: input sama, output sama, tanpa side effect.
- Props, state, dan nilai yang diberikan ke hook **diperlakukan sebagai immutable**. Jangan dimutasi; buat objek baru.
- Hook mengikuti Rules of Hooks.
- Ref tidak dibaca atau ditulis saat render (kecuali untuk inisialisasi lazy).

Ketika compiler mendeteksi pelanggaran aturan yang bisa dibuktikannya, compiler **melewati komponen itu** (tidak crash) dan membiarkannya tidak teroptimasi. Kode yang melanggar aturan dengan cara yang tidak bisa dideteksi, misalnya memutasi objek dari luar, bisa berperilaku berbeda setelah dikompilasi. Rule ESLint dari \`eslint-plugin-react-hooks\` (yang sekarang sudah mencakup diagnostik compiler) memunculkan masalah-masalah ini langsung di editor.

### Mengadopsinya

- Bereskan dulu pelanggaran lint, baru aktifkan compiler. Di codebase besar, kamu bisa mengaktifkannya per direktori atau memakai mode opt-in \`'use memo'\`.
- \`'use no memo'\` di bagian atas fungsi adalah jalan keluar darurat untuk mengecualikan satu komponen selama kamu menyelidiki masalah.
- \`useMemo\`/\`useCallback\` yang sudah ada tetap berfungsi. Jangan buru-buru menghapusnya; hapus bertahap di bagian yang perilakunya sudah dicover test, terutama yang dipakai sebagai dependency effect.
- Ukur dengan Profiler sebelum dan sesudah. Compiler menghilangkan pemborosan *re-render*; ia tidak memperbaiki algoritma yang lambat, list yang sangat panjang, atau waterfall network.`,
    examples: [
      {
        title: '❌ Memutasi props merusak memoization hasil compile vs ✅ update immutable',
        code: `// ❌ sort() mutates the incoming array. After compilation, the cached
// "sorted" value may be reused while the parent's array has silently changed,
// and the parent's own UI is also reordered. The compiler may bail out here.
function Leaderboard({ players }: { players: Player[] }) {
  const sorted = players.sort((a, b) => b.score - a.score)
  return <Table rows={sorted} />
}

// ✅ toSorted() returns a new array; render stays pure, so the compiler
// can safely cache "sorted" and only recompute when players changes.
function LeaderboardFixed({ players }: { players: Player[] }) {
  const sorted = players.toSorted((a, b) => b.score - a.score)
  return <Table rows={sorted} />
}`,
        note: 'Dengan compiler, kamu mendapat efek useMemo di sini secara gratis, tapi hanya karena komputasinya murni.',
      },
      {
        title: 'Sebelum dan sesudah: memo manual vs kode yang ramah compiler',
        code: `// Before: manual memoization everywhere
const InvoiceList = memo(function InvoiceList({ invoices, onSelect }: Props) {
  const overdue = useMemo(() => invoices.filter((i) => i.dueDate < today()), [invoices])
  const handleClick = useCallback((id: string) => onSelect(id), [onSelect])
  return overdue.map((i) => <InvoiceRow key={i.id} invoice={i} onClick={handleClick} />)
})

// After (with the compiler enabled): plain code, same or better memoization
function InvoiceListPlain({ invoices, onSelect }: Props) {
  const overdue = invoices.filter((i) => i.dueDate < today())
  return overdue.map((i) => <InvoiceRow key={i.id} invoice={i} onClick={() => onSelect(i.id)} />)
}

// vite.config.ts (@vitejs/plugin-react 6+)
// import react, { reactCompilerPreset } from '@vitejs/plugin-react'
// import babel from '@rolldown/plugin-babel'
// plugins: [react(), babel({ presets: [reactCompilerPreset()] })]`,
        note: 'Compiler meng-cache array hasil filter, arrow function, dan elemen JSX berdasarkan apa yang menjadi dependency-nya. Pastikan `today()` tetap deterministik dalam satu render.',
      },
    ],
    realCase: {
      title: 'UI basi setelah compiler dinyalakan',
      story: `**Situasi:** Sebuah perusahaan logistik mengaktifkan React Compiler di seluruh dashboard besar mereka untuk mengurangi re-render.

**Gejala:** Satu widget, yaitu list status pengiriman, berhenti ter-update ketika status baru datang lewat WebSocket, padahal store datanya jelas sudah berisi nilai baru.

**Akar masalah:** Store memutasi array yang sama secara langsung (\`shipments.push(...)\`) lalu memaksa re-render. Sebelum ada compiler, komponen menghitung ulang semuanya di setiap render, sehingga mutasi itu tertutupi. Setelah dikompilasi, list turunan yang di-cache dipakai ulang karena referensi array-nya tidak berubah.

**Perbaikan:** Store diubah supaya menghasilkan array baru di setiap update. Tim menambahkan \`'use no memo'\` sementara agar release tidak tertahan, lalu menghapusnya setelah perbaikan, dan menyalakan lint rule compiler di CI.

**Pelajaran:** Compiler menguntungkan kode yang immutable dan murni, sekaligus membongkar mutasi yang tersembunyi. Perlakukan output lint-nya sebagai daftar bug sungguhan.`,
    },
    pitfalls: [
      'Memutasi props, state, atau objek dari store lalu berharap re-render menampilkannya. Cache hasil compile membandingkan referensi.',
      'Membaca atau menulis `ref.current` saat render. Ini merusak kemurnian dan bisa membuat compiler berhenti mengoptimasi komponen itu.',
      'Menghapus semua `useMemo`/`useCallback` manual sekaligus, termasuk yang dipakai sebagai dependency effect. Timing effect bisa berubah.',
      'Berharap compiler memperbaiki algoritma lambat atau list panjang. Profile dulu; virtualisasi atau ganti algoritmanya kalau perlu.',
      'Mengabaikan diagnostik lint dari compiler. Komponen yang dilewati compiler diam-diam tetap tidak teroptimasi.',
    ],
    exercise: {
      task: 'Ambil komponen yang memakai `useMemo`, `useCallback`, dan `memo` serta mengandung satu mutasi tersembunyi (misalnya `items.reverse()`). Aktifkan compiler di playground Vite, pakai React DevTools (komponen hasil compile menampilkan badge "Memo ✨") untuk mengecek apakah komponen itu teroptimasi, perbaiki mutasinya, lalu pastikan badge-nya muncul.',
      hint: 'Jalankan dulu rule ESLint react-hooks; rule itu menunjuk baris persis yang menghalangi kompilasi.',
      solution: `\`\`\`tsx
// Before: blocks or breaks optimisation
function History({ events }: { events: Event[] }) {
  const latestFirst = events.reverse() // mutates the prop
  return <ul>{latestFirst.map((e) => <li key={e.id}>{e.label}</li>)}</ul>
}

// After: pure, compiles, and no manual memo needed
function HistoryFixed({ events }: { events: Event[] }) {
  const latestFirst = events.toReversed()
  return <ul>{latestFirst.map((e) => <li key={e.id}>{e.label}</li>)}</ul>
}
\`\`\`

Lalu hapus \`useMemo\`/\`useCallback\` lama yang membungkus nilai-nilai murni, dan pastikan lewat Profiler bahwa child tetap melewati re-render ketika state yang tidak berkaitan berubah.`,
    },
    interview: [
      'Apa sebenarnya yang dihasilkan React Compiler, dan kenapa granularitasnya lebih halus daripada useMemo manual?',
      'Aturan apa saja yang harus diikuti kode agar compiler bisa bekerja, dan apa yang terjadi ketika compiler mendeteksi pelanggaran?',
      'Bagaimana kamu menerapkan compiler secara aman di codebase besar yang sudah ada?',
    ],
  },
}

export default details
