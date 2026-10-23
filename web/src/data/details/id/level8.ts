import type { TopicDetail } from '../../types'

const details: Record<string, TopicDetail> = {
  measure: {
    explanation: `Optimasi performa tanpa pengukuran sama saja dengan menebak, dan tebakan soal di mana waktu terbuang ternyata cukup sering salah. Disiplinnya begini: **tentukan metrik yang dirasakan pengguna, reproduksi kelambatannya, catat baseline, ubah satu hal, ukur lagi**.

### Core Web Vitals
Core Web Vitals dari Google menggambarkan pengalaman pengguna dalam tiga angka, diukur di persentil ke-75 dari pemuatan halaman sungguhan:
- **LCP (Largest Contentful Paint)**: kapan konten utama (gambar hero, judul utama) selesai di-paint. Bagus: 2,5 detik atau kurang. Dipengaruhi waktu respons server, resource yang memblokir render, ukuran gambar, dan waterfall rendering di sisi client.
- **INP (Interaction to Next Paint)**: responsivitas. Untuk setiap klik, tap, atau tekan tombol, ini adalah waktu dari input sampai frame berikutnya di-paint; nilai yang dilaporkan kira-kira interaksi terburuk selama kunjungan. Bagus: 200 ms atau kurang. INP menggantikan FID pada Maret 2024 karena FID hanya mengukur *jeda sebelum* handler interaksi pertama berjalan, tanpa menghitung waktu handler dan render. Di aplikasi React, biasanya INP inilah metrik yang paling menderita: render panjang setelah klik atau mengetik.
- **CLS (Cumulative Layout Shift)**: pergeseran konten yang tidak terduga. Bagus: 0,1 atau kurang. Penyebabnya gambar tanpa dimensi, banner yang dimuat belakangan, dan font yang berganti.

### Lab vs lapangan
- **Data lab** (Lighthouse, panel Performance) bisa direproduksi dan sangat bagus untuk debugging, tapi hanya memakai satu profil perangkat dan network. Lighthouse tidak bisa mengukur INP karena tidak berinteraksi; sebagai gantinya ia melaporkan Total Blocking Time.
- **Data lapangan** (Real User Monitoring dengan library \`web-vitals\`, Chrome UX Report) menunjukkan apa yang dialami pengguna sungguhan di berbagai perangkat. Data lapangan memberi tahu *apakah* ada masalah; tool lab memberi tahu *kenapa*.

### Tool-nya
- **React DevTools Profiler**: merekam commit. Flamegraph menunjukkan waktu render setiap component dalam satu commit; aktifkan "Record why each component rendered while profiling" untuk melihat penyebabnya (props berubah, state, context, parent). Tampilan ranked mengurutkan berdasarkan biaya.
- **Panel Performance di Chrome**: sumber kebenaran untuk main thread. Cari long task (di atas 50 ms, ditandai merah), lihat JS, style, layout, dan paint, dan di React 19.2+ track performa React menampilkan prioritas scheduler dan render component di timeline. Pakai **CPU throttling 4x atau 6x** untuk mendekati HP kelas menengah.
- **Lighthouse**: audit untuk performa loading, aksesibilitas, dan praktik terbaik.
- **Bundle analyzer** (misalnya rollup-plugin-visualizer) untuk melihat apa yang kamu kirim ke pengguna.

### Kebiasaan mengukur yang baik
1. Tuliskan skenarionya ("mengetik di kotak filter dengan 5.000 baris").
2. Profiling dengan throttling di **build production** (build development jauh lebih lambat dan menyesatkan).
3. Catat angkanya: durasi interaksi, waktu commit, long task.
4. Perbaiki biaya terbesar, ukur ulang, simpan catatan. Kalau angkanya tidak bergerak, kembalikan perubahannya.`,
    examples: [
      {
        title: '✅ Melaporkan Web Vitals dari pengguna sungguhan',
        code: `// src/vitals.ts
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals/attribution'

function send(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    id: metric.id,
    page: location.pathname,
    // attribution says WHAT was slow, e.g. the INP target element and phase breakdown
    attribution:
      metric.name === 'INP'
        ? { target: (metric as any).attribution?.interactionTarget, processing: (metric as any).attribution?.processingDuration }
        : undefined,
  })
  navigator.sendBeacon?.('/analytics/vitals', body) || fetch('/analytics/vitals', { body, method: 'POST', keepalive: true })
}

onLCP(send)
onINP(send)
onCLS(send)`,
        note: 'Build attribution memberi tahu elemen mana yang diinteraksikan dan apakah waktunya habis di input delay, processing, atau presentation. sendBeacon tetap terkirim meskipun halaman ditutup.',
      },
      {
        title: '✅ Mengukur interaksi tertentu lewat kode',
        code: `import { Profiler, type ProfilerOnRenderCallback } from 'react'

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
  if (actualDuration > 16) {
    console.warn(\`[\${id}] \${phase} took \${actualDuration.toFixed(1)}ms (unmemoized estimate \${baseDuration.toFixed(1)}ms)\`)
  }
}

export function OrdersPage() {
  return (
    <Profiler id="OrdersTable" onRender={onRender}>
      <OrdersTable />
    </Profiler>
  )
}

// And for user timing visible in the Performance panel:
performance.mark('filter-start')
// ...state update...
requestAnimationFrame(() => setTimeout(() => performance.measure('filter', 'filter-start')))`,
        note: 'actualDuration adalah waktu yang dihabiskan untuk merender commit ini; baseDuration memperkirakan biaya re-render penuh tanpa memoization. Profiler menambah overhead, jadi pakai di subtree yang ditargetkan atau di build khusus profiling.',
      },
    ],
    realCase: {
      title: 'Regresi INP yang tersembunyi di balik skor Lighthouse yang bagus',
      story: `**Situasi:** Sebuah situs booking travel mendapat skor 95 di Lighthouse setelah redesign.

**Gejala:** Data lapangan menunjukkan INP di persentil ke-75 naik dari 180 ms ke 420 ms di mobile; konversi di halaman pencarian turun.

**Akar masalah:** Lighthouse mengukur pemuatan halaman tanpa berinteraksi. Date-range picker yang baru me-re-render seluruh daftar hasil (300 kartu dengan gambar dan perhitungan harga) setiap kali kursor melewati sebuah tanggal. Attribution RUM menunjuk sel-sel kalender sebagai target interaksi; trace Performance dengan throttling 4x menunjukkan commit React selama 350 ms.

**Perbaikan:** State hover dipindah ke dalam component kalender, daftar hasil dibungkus deferred value, dan format harga dipindah keluar dari render. INP kembali ke 160 ms.

**Pelajaran:** Skor lab bisa hijau sementara pengguna menderita. Kumpulkan INP lapangan lengkap dengan attribution, lalu reproduksi di lab.`,
    },
    pitfalls: [
      'Profiling build development, yang berisi pengecekan tambahan dan jauh lebih lambat dari production.',
      'Hanya menguji di laptop developer yang kencang tanpa CPU throttling.',
      'Menganggap skor Lighthouse sebagai bukti responsivitas yang baik; Lighthouse tidak bisa mengukur INP.',
      'Mengubah beberapa hal sekaligus, sehingga kamu tidak tahu mana yang benar-benar membantu.',
    ],
    exercise: {
      task: 'Pilih satu halaman di aplikasimu yang punya interaksi terasa berat (filtering, membuka panel). Rekam trace Performance dengan CPU throttling 4x dan satu sesi React Profiler. Catat: durasi interaksi, component paling lambat, dan kenapa component itu dirender.',
      hint: 'Aktifkan "Record why each component rendered" di pengaturan Profiler. Di panel Performance, lihat track Interactions untuk menemukan durasi interaksinya.',
      solution: `Catatan yang bagus kira-kira seperti ini:

- Skenario: mengetik "berlin" di filter kota, build production, throttling 4x.
- Track Interactions: keypress 310 ms (input delay 8 ms, processing 270 ms, presentation 32 ms).
- Profiler: \`ResultsList\` 240 ms per commit, dirender karena "props changed: items"; 400 child \`ResultCard\` masing-masing sekitar 0,5 ms.
- Hipotesis: list di-re-render di setiap ketikan, padahal yang perlu di-update segera hanya input-nya.
- Langkah berikutnya: tunda list dengan \`useDeferredValue\` dan pastikan ketikan di input turun di bawah 50 ms.`,
    },
    interview: [
      'Apa yang diukur INP, dan kenapa INP menggantikan FID?',
      'Apa beda data performa lab dan data lapangan, dan kenapa kamu butuh keduanya?',
      'Jelaskan langkah-langkahmu menyelidiki laporan "halamannya terasa lambat saat mengetik".',
    ],
  },

  rerenders: {
    explanation: `**Render** adalah saat React memanggil fungsi component kamu untuk mendapatkan deskripsi UI. **Commit** adalah saat React menerapkan perbedaannya ke DOM. Mencampuradukkan keduanya membuat upaya optimasi jadi sia-sia.

### Apa yang memicu render
Sebuah component dirender ketika:
1. **State-nya berubah** (setter \`useState\` atau \`useReducer\` dipanggil dengan nilai yang berbeda menurut \`Object.is\`).
2. **Parent-nya dirender**. Secara default, React me-re-render semua child dari component yang sedang dirender, tidak peduli props-nya berubah atau tidak. Bukan props yang memicu render, melainkan render parent.
3. **Context yang dibacanya berubah nilai** (menurut \`Object.is\`). Setiap consumer context itu ikut dirender, bahkan kalau ia hanya memakai satu field dari sebuah objek.
4. External store yang di-subscribe lewat \`useSyncExternalStore\` melaporkan perubahan (begitulah Redux, Zustand, dan lainnya memicu render, biasanya dengan selector untuk membatasinya).

Perhatikan apa yang *tidak* ada di daftar: mengubah ref, memutasi objek, atau prop yang berupa objek "baru" padahal parent-nya tidak dirender.

### Render bukan update DOM
Setelah render, React membandingkan (reconcile) pohon elemen baru dengan yang sebelumnya dan hanya menyentuh node DOM yang output-nya berubah. Parent dengan 200 child yang re-render mungkin hanya meng-update satu text node. Sebagian besar re-render itu murah: memanggil fungsi dan membandingkan beberapa objek hanya butuh hitungan mikrodetik.

### Kapan re-render jadi masalah
- Component melakukan **kerja berat saat render**: mengurutkan atau memfilter ribuan item, format data, membangun chart.
- **Banyak component** yang dirender: list 2.000 baris yang masing-masing re-render karena ketikan di parent mengubah state.
- Render terjadi **dengan frekuensi tinggi**: di setiap ketikan, scroll, atau gerakan mouse.
- **Context dengan nilai yang sering berubah** berada tinggi di pohon component.

### Identitas dan memoization
\`memo(Component)\` melewatkan render kalau props-nya sama secara shallow. Tapi parent yang membuat \`{}\`, \`[]\`, atau \`() => {}\` secara inline menghasilkan identitas baru di setiap render, sehingga \`memo\` jadi tidak berguna. Itulah alasan \`useMemo\` dan \`useCallback\` ada, dan alasan **React Compiler** sekarang menanganinya secara otomatis: ia melakukan memoization pada JSX, nilai, dan callback berdasarkan dependency sebenarnya saat build.

### Cara melihatnya
- React DevTools: "Highlight updates when components render" membuat component yang sedang dirender berkedip.
- Profiler: "Why did this render?" menunjukkan penyebabnya per component per commit.
- \`console.count('Row render')\` sementara adalah cara cepat untuk memastikan.

### Pola pikir yang tepat
Jangan mengejar nol re-render. Kejar **tidak ada interaksi yang lambat**. Temukan render yang mahal dengan profiler, lalu kurangi seberapa sering ia dirender atau seberapa besar biayanya.`,
    examples: [
      {
        title: 'Kenapa semua baris re-render saat kamu mengetik',
        code: `// ❌ query state lives in the page, so every keystroke re-renders all 2,000 rows
function ProductsPage({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} aria-label="Quick note" />
      <ProductTable products={products} /> {/* does not even use query */}
    </>
  )
}

// ✅ state colocated with the only component that needs it
function QuickNote() {
  const [query, setQuery] = useState('')
  return <input value={query} onChange={e => setQuery(e.target.value)} aria-label="Quick note" />
}
function ProductsPage({ products }: { products: Product[] }) {
  return (
    <>
      <QuickNote />
      <ProductTable products={products} />
    </>
  )
}`,
        note: 'ProductTable re-render bukan karena props-nya berubah, tapi karena parent-nya dirender. Memindahkan state ke bawah menghilangkan penyebabnya sama sekali, tanpa perlu memoization.',
      },
      {
        title: 'Context: satu field berubah, semua consumer ikut render',
        code: `// ❌ cursor position updates 60x/second; Sidebar and Header only need user
const AppCtx = createContext<{ user: User; cursor: { x: number; y: number } } | null>(null)

// ✅ split by update frequency
const UserCtx = createContext<User | null>(null)
const CursorCtx = createContext<{ x: number; y: number }>({ x: 0, y: 0 })

function Header() {
  const user = use(UserCtx) // no longer renders on mouse move
  return <span>{user?.name}</span>
}`,
        note: 'Consumer context re-render ketika identitas value-nya berubah. Memecah context berdasarkan seberapa sering nilainya berubah membatasi area dampaknya.',
      },
    ],
    realCase: {
      title: '"Global store di context" yang membuat seluruh aplikasi re-render',
      story: `**Situasi:** Sebuah aplikasi manajemen proyek menyimpan semua state client (user, tema, modal yang terbuka, posisi drag, notifikasi) di satu objek value \`AppContext\` yang dibuat di dalam provider.

**Gejala:** Menggeser kartu task terasa patah-patah; Profiler menunjukkan 1.100 component dirender di setiap gerakan pointer.

**Akar masalah:** Provider membuat objek value baru setiap kali ada field yang berubah, sehingga semua consumer ikut dirender. Posisi drag berubah di setiap pointermove.

**Perbaikan:** State drag dipindah ke state lokal di component board (transform kartu yang sedang digeser diterapkan lewat ref dan style). Sisa state dipecah menjadi context user, UI, dan notifikasi; notifikasi dipindah ke external store kecil dengan subscription berbasis selector. Jumlah render per gerakan pointer turun menjadi 3.

**Pelajaran:** Kenali empat pemicu render. Sebagian besar masalah "terlalu banyak re-render" berasal dari state yang ditaruh terlalu tinggi atau di context yang cakupannya terlalu luas.`,
    },
    pitfalls: [
      'Mengira props baru memicu re-render; penyebabnya adalah parent yang dirender. Props hanya berpengaruh untuk memo.',
      'Menyamakan re-render dengan update DOM, lalu mengoptimasi render yang sebenarnya murah.',
      'Menaruh nilai yang sering berubah di context yang dipakai banyak component.',
      'Memutasi objek state sehingga Object.is tidak melihat perubahan dan component sama sekali tidak dirender.',
    ],
    exercise: {
      task: 'Buat halaman dengan tombol counter dan list berisi 1.000 item yang masing-masing mencatat log saat dirender. Temukan lewat DevTools kenapa item-item itu dirender ketika counter berubah. Lalu hilangkan render tersebut tanpa memakai memo.',
      hint: 'Pindahkan state counter ke component-nya sendiri, atau oper list sebagai children dari component yang memegang state.',
      solution: `\`\`\`tsx
function Counter() {
  const [n, setN] = useState(0)
  return <button onClick={() => setN(n + 1)}>Clicked {n} times</button>
}
export function Page({ items }: { items: string[] }) {
  return (
    <>
      <Counter />
      <ul>{items.map(i => <Item key={i} label={i} />)}</ul>
    </>
  )
}
\`\`\`
Awalnya, "why did this render" di Profiler menyebut "parent component rendered" untuk setiap Item. Setelah state dipindah ke Counter, klik hanya merender Counter.`,
    },
    interview: [
      'Sebutkan alasan-alasan sebuah component React re-render. Apakah perubahan props memicu re-render?',
      'Apa beda rendering dan committing?',
      'Kenapa context provider yang berada tinggi di pohon bisa merusak performa, dan bagaimana cara memperbaikinya?',
    ],
  },

  fixes: {
    explanation: `Setelah profiler menemukan interaksi yang lambat, terapkan perbaikan mulai dari yang paling murah dan paling struktural sampai yang paling manual. Perbaikan struktural menghilangkan pekerjaan; memoization hanya melewatkannya, dan menambah kompleksitas.

### 1. Serahkan memoization ke React Compiler
React Compiler (stabil sejak akhir 2025) adalah plugin Babel di waktu build yang menganalisis component dan hook, lalu otomatis melakukan memoization pada JSX, nilai hasil komputasi, dan callback dengan dependency yang presisi. Kalau compiler aktif, sebagian besar \`memo\`, \`useMemo\`, dan \`useCallback\` di kode aplikasi jadi tidak diperlukan. Di React DevTools, component yang sudah di-compile menampilkan badge **"Memo ✨"**. Kalau component yang lambat tidak punya badge itu, berarti compiler menyerah (bail out), biasanya karena kodenya melanggar Rules of React (memutasi props atau state, membaca ref saat render, hook kondisional). Aturan compiler di \`eslint-plugin-react-hooks\` melaporkan pelanggaran ini. Perbaiki pelanggarannya, dan compiler bisa mengoptimasinya.

### 2. Pindahkan state ke bawah
Kalau state dipegang lebih tinggi dari yang diperlukan, setiap component di antara pemilik state dan leaf ikut dirender di setiap perubahan. Letakkan state bersama component yang memakainya. Ini perbaikan paling efektif dan tidak ada biayanya.

### 3. Angkat konten ke atas (children sebagai props)
Kalau sebuah component harus memegang state yang sering berubah (posisi scroll, hover, buka/tutup) tapi membungkus subtree yang mahal, terima subtree itu sebagai \`children\`. Elemen \`children\` dibuat oleh parent, jadi ketika state wrapper berubah, React melihat objek elemen yang sama dan melewatkan re-render-nya.

### 4. Pecah context
Pisahkan nilai yang berubah dengan kecepatan berbeda, dan pisahkan state dari dispatch/setter (identitas setter tidak pernah berubah). Alternatifnya, pakai external store dengan selector (Zustand, Redux, \`useSyncExternalStore\`) supaya component hanya subscribe ke potongan yang dibutuhkan.

### 5. Buat render lebih murah
- Pindahkan komputasi berat keluar dari render: hitung di server, hitung sekali saat data datang, atau pindahkan ke Web Worker.
- Hindari membuat struktur turunan yang besar di setiap render; turunkan sekali per perubahan data.
- Virtualisasi list yang panjang.

### 6. Memoization manual, kalau terbukti perlu
Tanpa compiler, atau ketika compiler tidak bisa membantu (misalnya component pihak ketiga yang butuh identitas prop yang stabil, atau nilai yang dioper ke dependency effect), pakai \`memo\`, \`useMemo\`, dan \`useCallback\` dengan sengaja. Selalu verifikasi lewat Profiler bahwa perubahan itu benar-benar mengurangi waktu commit. Memoization memakan memori dan waktu perbandingan, dan gampang sekali gagal hanya karena satu prop yang tidak stabil.

### 7. Pakai fitur concurrent
Kalau pekerjaannya memang berat tapi tidak mendesak, \`useTransition\` atau \`useDeferredValue\` menjaga update yang mendesak (mengetik, klik) tetap responsif, sementara render berat berjalan di latar belakang dan bisa diinterupsi.

### Simpan buktinya
Untuk setiap perubahan, catat angka sebelum/sesudah dari skenario yang sama. Buang optimasi yang tidak membantu.`,
    examples: [
      {
        title: '✅ Angkat konten ke atas: subtree mahal dioper sebagai children',
        code: `// ❌ ScrollTracker owns fast-changing state and renders the heavy Dashboard itself
function ScrollTracker() {
  const [y, setY] = useState(0)
  useEffect(() => {
    const on = () => setY(window.scrollY)
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <div>
      <ProgressBar value={y} />
      <Dashboard /> {/* re-renders on every scroll event */}
    </div>
  )
}

// ✅ Dashboard is created by the parent and passed in
function ScrollTracker({ children }: { children: React.ReactNode }) {
  const [y, setY] = useState(0)
  /* same effect */
  return (
    <div>
      <ProgressBar value={y} />
      {children}
    </div>
  )
}

<ScrollTracker>
  <Dashboard />
</ScrollTracker>`,
        note: 'Elemen children identitasnya tetap sama di setiap render ScrollTracker, jadi React tidak merender ulang Dashboard. Tanpa memo sama sekali.',
      },
      {
        title: '❌ Compiler bail-out vs ✅ kode yang ramah compiler',
        code: `// ❌ Mutates a prop during render: breaks the Rules of React, compiler skips this component
function SortedOrders({ orders }: { orders: Order[] }) {
  orders.sort((a, b) => b.createdAt - a.createdAt)
  return <OrderList orders={orders} />
}

// ✅ Pure: the compiler memoizes the sorted copy and the JSX automatically
function SortedOrders({ orders }: { orders: Order[] }) {
  const sorted = orders.toSorted((a, b) => b.createdAt - a.createdAt)
  return <OrderList orders={sorted} />
}`,
        note: 'Dengan compiler aktif, versi kedua mendapat badge Memo ✨; pengurutan hanya dijalankan ulang ketika orders berubah. Tidak perlu useMemo.',
      },
      {
        title: '✅ Memo manual saat compiler tidak tersedia, dan sudah diverifikasi',
        code: `const Row = memo(function Row({ order, onSelect }: { order: Order; onSelect: (id: string) => void }) {
  return (
    <tr>
      <td>{order.number}</td>
      <td><button onClick={() => onSelect(order.id)}>Open</button></td>
    </tr>
  )
})

function OrderTable({ orders }: { orders: Order[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const onSelect = useCallback((id: string) => setSelected(id), []) // stable identity for memo
  return <table><tbody>{orders.map(o => <Row key={o.id} order={o} onSelect={onSelect} />)}</tbody></table>
}
// Profiler before: 180ms commit on select. After: 6ms (only the parent renders).`,
        note: 'memo tidak berguna tanpa onSelect yang stabil. Catat angka dari profiler untuk membuktikan bahwa kode ini layak ada.',
      },
    ],
    realCase: {
      title: 'Menghapus 300 useMemo justru membuat aplikasi lebih cepat',
      story: `**Situasi:** Dashboard sebuah fintech sudah menumpuk ratusan pemanggilan \`useMemo\`/\`useCallback\` "demi performa". Beberapa input masih terasa lemot.

**Gejala:** Profiler menunjukkan tabel besar tetap dirender di setiap ketikan; banyak memo punya dependency yang berubah di setiap render (objek inline dari parent).

**Akar masalah:** Memoization diterapkan tanpa pengukuran dan digagalkan oleh input yang tidak stabil. Masalah sebenarnya adalah state filter yang disimpan di context level halaman.

**Perbaikan:** Tim mengaktifkan React Compiler, memperbaiki pelanggaran Rules of React yang dilaporkan lint supaya semua component bisa di-compile, menghapus memoization manual di kode aplikasi, dan memindahkan state filter ke filter bar, dengan tabel membaca deferred value. Kodenya jadi lebih pendek dan interaksi ketikan turun dari 220 ms ke 40 ms.

**Pelajaran:** Perbaikan struktural dan compiler mengalahkan memoization yang ditaruh manual. Ukur sebelum dan sesudah.`,
    },
    pitfalls: [
      'Menambahkan memo/useMemo di mana-mana tanpa bukti dari profiler.',
      'Mengoper objek atau callback inline ke child yang di-memo, sehingga memo diam-diam tidak berfungsi.',
      'Mengabaikan compiler bail-out: component tanpa badge Memo biasanya punya pelanggaran Rules of React yang perlu diperbaiki.',
      'Memakai useMemo untuk kebenaran logika (menjaga sesuatu tetap stabil untuk effect), lalu kaget ketika React membuang cache-nya.',
    ],
    exercise: {
      task: 'Ada halaman tempat `Sidebar` dengan `NavTree` yang mahal ikut re-render setiap kali boolean `collapsed` di layout parent-nya berganti. Perbaiki dua kali: sekali dengan "pindahkan state ke bawah" dan sekali dengan "angkat konten ke atas". Ukur keduanya di Profiler.',
      hint: 'Kalau hanya Sidebar yang butuh collapsed, pindahkan ke Sidebar. Kalau layout harus memegangnya, render NavTree di layout dan oper sebagai children.',
      solution: `\`\`\`tsx
// Move state down
function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  return <aside data-collapsed={collapsed}><button aria-expanded={!collapsed} onClick={() => setCollapsed(c => !c)}>Menu</button><NavTree /></aside>
}
// NavTree still renders here because Sidebar renders... so combine with lifting content up:
function Sidebar({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return <aside data-collapsed={collapsed}><button aria-expanded={!collapsed} onClick={() => setCollapsed(c => !c)}>Menu</button>{children}</aside>
}
function Layout() {
  return <Sidebar><NavTree /></Sidebar>
}
\`\`\`
Hasil Profiler setelahnya: toggle hanya merender Sidebar; NavTree menunjukkan "did not render".`,
    },
    interview: [
      'Apa yang dilakukan React Compiler, dan kapan kamu masih akan menulis useMemo atau memo secara manual?',
      'Jelaskan kenapa mengoper subtree yang mahal sebagai children mencegahnya re-render.',
      'Berikan urutan perbaikan yang akan kamu coba untuk component yang lambat, dan jelaskan alasan urutannya.',
    ],
  },

  concurrent: {
    explanation: `Concurrent rendering memungkinkan React **menyiapkan UI baru di latar belakang, menginterupsinya, dan membuangnya** kalau ada hal yang lebih mendesak. Kamu mengaktifkannya per update dengan menandai update tersebut sebagai tidak mendesak.

### Mendesak vs tidak mendesak
Mengetik di input, mengklik toggle, menekan tombol: pengguna mengharapkan feedback seketika. Merender list hasil filter berisi 5.000 item atau isi tab baru tidak terlalu mendesak: jeda singkat masih oke asalkan input tetap responsif. Tanpa concurrency, React merender secara sinkron: begitu render besar dimulai, main thread terblokir sampai selesai, dan ketikan pun mengantre (INP buruk).

### useTransition
\`const [isPending, startTransition] = useTransition()\` mengembalikan fungsi yang menandai update state di dalamnya sebagai **transition**. React merender update transition dengan prioritas lebih rendah, sepotong-sepotong, dan secara rutin memberi giliran ke browser (sekitar setiap 5 ms) supaya event input bisa ditangani. Kalau ada update mendesak baru yang datang, React meninggalkan render transition yang sedang berjalan dan memulai lagi dengan state terbaru. \`isPending\` bernilai true selama transition berlangsung, jadi kamu bisa menampilkan indikator halus sambil tetap menampilkan UI lama.

Jaga update yang mendesak tetap di luar transition: \`value\` milik input harus ter-update secara sinkron, kalau tidak mengetik akan terasa rusak.

Di React 19, transition bisa **async**: \`startTransition(async () => { await save(); setX(...) })\`. Actions, \`useActionState\`, dan form action dibangun di atas ini, dengan \`isPending\` mencakup seluruh operasi async.

### useDeferredValue
\`const deferred = useDeferredValue(value)\` memberimu salinan nilai yang tertinggal di belakang selama render berat. React pertama-tama merender dengan nilai deferred yang lama (cepat, karena child yang mahal bisa melewatkan render kalau ia di-memo atau di-compile), lalu merender lagi di latar belakang dengan nilai yang baru. Pakai ini ketika kamu **tidak memegang update state-nya** (nilainya datang dari props) atau ingin kode tetap sederhana. Bandingkan \`value !== deferred\` untuk menandai bahwa tampilan sedang basi (misalnya meredupkan list).

Penting: child yang mahal harus melewatkan render ketika props-nya tidak berubah (memo atau React Compiler). Kalau tidak, render pertama yang mendesak tetap merender pohon berat itu dengan nilai lama dan kamu tidak mendapat apa-apa.

### Transition dan Suspense
Kalau sebuah transition membuat component suspend (lazy route, data), React tetap menampilkan UI saat ini alih-alih menggantinya dengan fallback. Ini menghindari spinner yang mengagetkan saat navigasi; karena itulah router membungkus navigasi dengan transition.

### Apa yang tidak dilakukan concurrency
- Concurrency tidak membuat rendering lebih cepat; ia membuatnya **bisa diinterupsi**. Render 300 ms tetap memakan 300 ms CPU.
- Tidak membantu untuk event handler yang lambat atau pekerjaan sinkron di luar React.
- Text input yang dikendalikan lewat update transition akan lag atau berperilaku aneh.

Pakai ketika profiling menunjukkan interaksi mendesak terblokir oleh render berat yang tidak mendesak.`,
    examples: [
      {
        title: '❌ Filter yang memblokir vs ✅ useTransition',
        code: `// ❌ Every keystroke synchronously re-renders 5,000 rows; typing stutters
function Search({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('')
  const results = filterItems(items, query)
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} aria-label="Search" />
      <ResultList items={results} />
    </>
  )
}

// ✅ Urgent: the input. Non-urgent: the list.
function Search({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('')
  const [listQuery, setListQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const results = filterItems(items, listQuery)

  return (
    <>
      <input
        value={query}
        aria-label="Search"
        onChange={e => {
          setQuery(e.target.value) // urgent
          startTransition(() => setListQuery(e.target.value)) // interruptible
        }}
      />
      <div aria-busy={isPending} style={{ opacity: isPending ? 0.6 : 1 }}>
        <ResultList items={results} />
      </div>
    </>
  )
}`,
        note: 'Kalau pengguna mengetik lagi sebelum list selesai dirender, React membuang render list yang sudah basi. Dengan throttling 4x, INP untuk ketikan biasanya turun dari ratusan ms menjadi puluhan.',
      },
      {
        title: '✅ useDeferredValue ketika nilainya datang dari props',
        code: `function ResultsPanel({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery
  return (
    <section aria-busy={isStale} className={isStale ? 'stale' : undefined}>
      {/* SlowResults must be memoized (or compiled) so the urgent render with the old value bails out */}
      <SlowResults query={deferredQuery} />
    </section>
  )
}`,
        note: 'Panel ini tidak memegang state query, jadi tidak bisa membungkus setter-nya dengan transition. Menunda nilainya menghasilkan pemisahan yang sama.',
      },
      {
        title: '✅ Transition async dengan action (React 19)',
        code: `function PublishButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await fetch(\`/api/posts/\${postId}/publish\`, { method: 'POST' })
            if (!res.ok) setError('Could not publish. Try again.')
          })
        }
      >
        {isPending ? 'Publishing…' : 'Publish'}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  )
}`,
        note: 'isPending tetap true selama seluruh operasi yang di-await. Catatan: di beberapa versi React, update state setelah await mungkin perlu startTransition sendiri supaya dianggap bagian dari transition.',
      },
    ],
    realCase: {
      title: 'Filter produk dengan lag input 900 ms di HP kelas menengah',
      story: `**Situasi:** Halaman katalog sebuah aplikasi belanja kebutuhan sehari-hari memfilter 3.000 produk di sisi client saat pengguna mengetik.

**Gejala:** RUM menunjukkan INP 600–900 ms di kotak pencarian untuk pengguna Android; orang mengetik, tidak melihat apa-apa, lalu mengetik lagi.

**Akar masalah:** Setiap ketikan merender seluruh grid secara sinkron; main thread terblokir selama render berlangsung.

**Perbaikan:** State input tetap mendesak, query untuk grid dijadikan transition, grid di-compile oleh React Compiler supaya render yang basi bisa dilewati, dan grid-nya divirtualisasi. INP lapangan untuk interaksi itu turun ke sekitar 120 ms.

**Pelajaran:** Concurrency memisahkan apa yang harus terasa instan dari apa yang boleh tertinggal. Kombinasikan dengan membuat bagian yang berat jadi lebih murah.`,
    },
    pitfalls: [
      'Menaruh setState milik controlled input itu sendiri di dalam startTransition, sehingga ketikan jadi lag atau ada karakter yang hilang.',
      'Memakai useDeferredValue dengan child yang tidak di-memo atau di-compile, sehingga render mendesaknya tetap mahal.',
      'Berharap transition membuat kode lambat jadi cepat; transition hanya membuatnya bisa diinterupsi.',
      'Menampilkan spinner satu halaman penuh selama transition, alih-alih mempertahankan UI sebelumnya dengan state pending yang halus.',
    ],
    exercise: {
      task: 'Buat halaman bertab di mana salah satu tab ("Analytics") merender component yang sengaja dibuat lambat (busy-loop 2 ms per item, 200 item). Buat perpindahan tab tetap responsif: mengklik tab lain saat Analytics sedang dirender harus langsung berpindah.',
      hint: 'Bungkus perubahan tab dengan startTransition. Tampilkan state pending di tombol tab yang diklik.',
      solution: `\`\`\`tsx
function TabsPage() {
  const [tab, setTab] = useState<'overview' | 'analytics' | 'settings'>('overview')
  const [isPending, startTransition] = useTransition()
  const select = (t: typeof tab) => startTransition(() => setTab(t))
  return (
    <>
      <div role="tablist" aria-label="Sections">
        {(['overview', 'analytics', 'settings'] as const).map(t => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => select(t)}>{t}</button>
        ))}
        {isPending && <span role="status">Loading…</span>}
      </div>
      <div role="tabpanel">
        {tab === 'overview' && <Overview />}
        {tab === 'analytics' && <SlowAnalytics />}
        {tab === 'settings' && <Settings />}
      </div>
    </>
  )
}
\`\`\`
Karena render Analytics adalah transition, mengklik Settings di tengah render akan meninggalkannya. Tanpa transition, klik itu harus menunggu sekitar 400 ms.`,
    },
    interview: [
      'Apa beda useTransition dan useDeferredValue, dan kapan memakai masing-masing?',
      'Kenapa update state milik controlled input itu sendiri tidak boleh berada di dalam transition?',
      'Bagaimana transition berinteraksi dengan Suspense boundary saat navigasi?',
    ],
  },

  lists: {
    explanation: `Setiap node DOM memakan memori, kalkulasi style, layout, dan paint, dan setiap elemen React memakan waktu render dan reconciliation. Tabel 10.000 baris dengan 8 sel berarti 80.000+ elemen. Bahkan kalau React hanya merendernya sekali, render awalnya butuh beberapa detik, scroll jadi patah-patah, dan setiap update pada list itu lambat.

### Idenya
**Virtualisasi** (windowing) hanya merender baris yang terlihat di viewport ditambah beberapa baris ekstra di atas dan bawahnya (**overscan**). Elemen spacer yang tinggi menjaga tinggi scroll penuh, sehingga scrollbar berperilaku seolah semua baris ada. Saat pengguna scroll, library menghitung rentang index mana yang terlihat dan React hanya merender baris-baris itu, diposisikan dengan \`transform: translateY\` atau offset top absolut. Sepuluh ribu baris menjadi sekitar 30 baris DOM.

### TanStack Virtual
Library headless: \`useVirtualizer({ count, getScrollElement, estimateSize, overscan })\` mengembalikan \`getVirtualItems()\` (index, start, size, key) dan \`getTotalSize()\`. Kamu sendiri yang merender markup-nya. Library ini mendukung tinggi baris tetap maupun **tinggi baris dinamis** (diukur dengan \`measureElement\`), virtualisasi horizontal dan grid, serta scroll di window.

### Trade-off dan jebakan
- **Find in page** (Ctrl+F) tidak bisa menemukan baris yang tidak dirender.
- **Aksesibilitas**: screen reader hanya melihat baris yang dirender. Untuk tabel, set \`aria-rowcount\` di tabel dan \`aria-rowindex\` di baris supaya teknologi asistif tahu ukuran sebenarnya. Pastikan navigasi keyboard tetap jalan ketika focus pindah ke baris yang perlu di-scroll agar terlihat.
- **Tinggi dinamis** butuh pengukuran dan bisa menyebabkan scroll melompat kalau estimasinya jauh meleset; berikan \`estimateSize\` yang bagus.
- **Sticky header**, **state pilihan baris**, dan **focus** harus berada di luar component baris, karena baris di-unmount saat ter-scroll keluar layar.
- **SEO dan print**: konten yang tidak dirender tidak terlihat oleh keduanya.

### Alternatif dan pelengkap
- **Pagination** atau "load more": lebih sederhana, aksesibel, URL bisa dibagikan. Sering kali UX yang lebih baik untuk hasil pencarian.
- **Infinite scroll + virtualisasi** untuk feed.
- **CSS \`content-visibility: auto\`** dengan \`contain-intrinsic-size\`: browser melewatkan layout dan paint untuk bagian yang di luar layar. Murah untuk ditambahkan, semua konten tetap ada di DOM (find-in-page tetap jalan), tapi React tetap merender setiap elemen, jadi tidak mengurangi waktu render.
- **Filtering/sorting di server** supaya client tidak pernah memegang 100.000 baris.

### Kapan perlu virtualisasi
Patokan praktisnya: pertimbangkan virtualisasi kalau sudah lebih dari beberapa ratus baris kompleks atau beberapa ribu baris sederhana, dan profiling menunjukkan biaya render atau scroll. Ukur: waktu render awal, memori, dan kemulusan scroll (panel Performance, frame).`,
    examples: [
      {
        title: '✅ Tabel pesanan yang divirtualisasi dan aksesibel dengan TanStack Virtual',
        code: `import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

export function OrdersTable({ orders }: { orders: Order[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 8,
  })

  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }} tabIndex={0} aria-label="Orders, scrollable">
      <table role="table" aria-rowcount={orders.length + 1} style={{ width: '100%' }}>
        <thead style={{ position: 'sticky', top: 0 }}>
          <tr aria-rowindex={1}><th>Order</th><th>Customer</th><th>Total</th></tr>
        </thead>
        <tbody style={{ position: 'relative', height: virtualizer.getTotalSize(), display: 'block' }}>
          {virtualizer.getVirtualItems().map(row => {
            const o = orders[row.index]
            return (
              <tr
                key={o.id}
                aria-rowindex={row.index + 2}
                style={{ position: 'absolute', top: 0, transform: \`translateY(\${row.start}px)\`, height: row.size, display: 'flex', width: '100%' }}
              >
                <td style={{ flex: 1 }}>{o.number}</td>
                <td style={{ flex: 2 }}>{o.customer}</td>
                <td style={{ flex: 1 }}>{o.total}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}`,
        note: 'Hanya sekitar 22 baris yang ada di DOM pada satu waktu. aria-rowcount dan aria-rowindex memberi tahu screen reader ukuran dan posisi sebenarnya. Key memakai id yang stabil, bukan index virtual.',
      },
      {
        title: '✅ Kemenangan murah tanpa virtualisasi: content-visibility',
        code: `/* Long article or settings page with many sections */
.section {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px; /* placeholder size until rendered */
}`,
        note: 'Browser melewatkan layout dan paint untuk bagian di luar layar; find-in-page tetap berfungsi. Biaya render React tidak berubah, jadi ini membantu halaman yang berat di layout, bukan list yang berat di render.',
      },
    ],
    realCase: {
      title: 'Log viewer admin yang membuat tab crash',
      story: `**Situasi:** Viewer audit log internal memuat event 7 hari terakhir (sekitar 40.000 baris) dan merendernya dalam satu tabel.

**Gejala:** Membuka halamannya butuh 9 detik, Chrome memakai 1,2 GB untuk tab itu, dan di beberapa laptop tab-nya crash. Scroll turun sampai fps satu digit.

**Akar masalah:** 40.000 baris × 6 sel, masing-masing dengan tooltip dan tanggal yang diformat, semuanya di-mount.

**Perbaikan:** Tabel divirtualisasi dengan TanStack Virtual (overscan 10), format tanggal dipindah ke field yang sudah dihitung saat data datang, dan filtering dipindah ke server dengan cursor pagination 2.000 baris per halaman. Render awal turun ke 300 ms dan memori ke 150 MB.

**Pelajaran:** Node DOM tercepat adalah yang tidak pernah kamu buat. Pasangkan virtualisasi dengan tidak memuat data lebih banyak dari yang dibutuhkan pengguna.`,
    },
    pitfalls: [
      'Memakai index virtual sebagai key React, sehingga baris di-mount ulang dengan state yang salah ketika data berubah.',
      'Menyimpan state pilihan atau focus di dalam component baris, yang hilang ketika baris di-unmount saat scroll.',
      'Lupa aria-rowcount/aria-rowindex, sehingga screen reader mengumumkan tabel berisi 20 baris.',
      'Memvirtualisasi list kecil, yang hanya menambah kompleksitas dan merusak find-in-page tanpa ada untungnya.',
    ],
    exercise: {
      task: 'Render 10.000 kontak secara naif, catat waktu render awal dan pemakaian memorinya, lalu virtualisasi dengan TanStack Virtual. Sediakan checkbox "selected" per baris yang tetap tersimpan meskipun barisnya di-scroll keluar lalu kembali lagi.',
      hint: 'Simpan id yang dipilih dalam Set di component parent. Oper checked dan onToggle ke setiap baris yang dirender.',
      solution: `\`\`\`tsx
function ContactList({ contacts }: { contacts: Contact[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const parentRef = useRef<HTMLDivElement>(null)
  const v = useVirtualizer({ count: contacts.length, getScrollElement: () => parentRef.current, estimateSize: () => 40, overscan: 6 })
  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  return (
    <div ref={parentRef} style={{ height: 500, overflow: 'auto' }}>
      <ul role="list" style={{ height: v.getTotalSize(), position: 'relative' }}>
        {v.getVirtualItems().map(item => {
          const c = contacts[item.index]
          return (
            <li key={c.id} style={{ position: 'absolute', top: 0, width: '100%', transform: \`translateY(\${item.start}px)\` }}>
              <label><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} /> {c.name}</label>
            </li>
          )
        })}
      </ul>
      <p role="status">{selected.size} selected</p>
    </div>
  )
}
\`\`\`
Hasil yang umum: render awal versi naif sekitar 1,5 detik dengan puluhan ribu node; versi virtual di bawah 50 ms dengan sekitar 25 baris.`,
    },
    interview: [
      'Bagaimana virtualisasi list bekerja, dan apa fungsi overscan?',
      'Masalah aksesibilitas dan UX apa yang muncul karena virtualisasi, dan bagaimana cara mengatasinya?',
      'Kapan kamu memilih pagination atau content-visibility alih-alih virtualisasi?',
    ],
  },

  bundle: {
    explanation: `JavaScript adalah byte paling mahal di web: harus diunduh, di-parse, di-compile, dan dieksekusi di main thread sebelum aplikasi React kamu bisa dipakai. Gambar dan font biasanya mendominasi LCP. Optimasi bundle dan network intinya adalah **mengirim lebih sedikit, lebih belakangan, dan secara paralel**.

### Code splitting
Bundler memecah kode di batas \`import()\` dinamis. Di React, \`lazy(() => import('./Settings'))\` membuat component yang kodenya dimuat saat pertama kali dirender, dan boundary \`Suspense\` menampilkan fallback selama proses muat.
- **Pecah per route** dulu: pengguna yang membuka halaman utama tidak perlu mengunduh area admin. Router seperti React Router mendukung lazy route secara native.
- Lalu pecah **component berat yang kondisional**: rich text editor, library chart, widget peta, modal yang jarang dibuka.
- **Preload** chunk yang kemungkinan dibuka berikutnya saat link di-hover atau di-focus (panggil \`import()\` lebih awal) supaya pemecahan itu tidak menimbulkan jeda yang terlihat.
- Jangan memecah component kecil; setiap chunk adalah satu request dengan overhead-nya sendiri.

### Analisis apa yang kamu kirim
Pakai \`rollup-plugin-visualizer\` (Vite) atau \`source-map-explorer\` untuk melihat treemap bundle. Temuan yang umum: library tanggal lengkap dengan semua locale, \`lodash\` di-import utuh, library ikon tanpa tree shaking, dua versi dari package yang sama, polyfill untuk browser yang tidak kamu dukung. Tetapkan **performance budget** di CI (misalnya JS awal untuk route home di bawah 170 KB gzip) supaya regresi tertangkap saat review.

### Dependency
Sebelum menambah package, cek ukurannya dan apakah bisa di-tree-shake (ESM, \`sideEffects: false\`). Utamakan API platform: \`Intl.DateTimeFormat\` dan \`Intl.NumberFormat\` alih-alih library format, \`fetch\` alih-alih HTTP client, \`structuredClone\` alih-alih utility deep-clone.

### Gambar
- Sajikan format modern (AVIF, WebP) dengan \`srcset\` dan \`sizes\` supaya HP tidak mengunduh gambar untuk desktop.
- Selalu set \`width\` dan \`height\` (atau \`aspect-ratio\`) untuk mencegah CLS.
- \`loading="lazy"\` untuk gambar di bawah lipatan layar; **jangan pernah** lazy-load gambar LCP. Beri gambar LCP \`fetchPriority="high"\`.

### Font
Host sendiri, subset, pakai WOFF2, \`font-display: swap\` atau \`optional\`, preload satu atau dua font yang kritis, dan pakai fallback yang ukurannya sudah disesuaikan untuk mengurangi layout shift.

### Pekerjaan di main thread
Tugas yang berat di CPU (parsing file CSV besar, pemrosesan gambar, filtering kompleks, diffing) memblokir interaksi. Pindahkan ke **Web Worker** (Vite mendukung \`new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })\`). Library seperti Comlink membuat API worker terasa seperti pemanggilan fungsi async biasa. Script pihak ketiga (analytics, widget chat) sebaiknya dimuat setelah halaman bisa dipakai.

### Network
Hindari waterfall request: mulai fetch data paralel dengan pemuatan kode (route loader, prefetching), pakai HTTP caching dengan nama file ber-hash untuk aset yang tidak berubah, dan kompres dengan Brotli.`,
    examples: [
      {
        title: '✅ Splitting per route dengan preload saat ada niat',
        code: `import { lazy, Suspense } from 'react'

const loadReports = () => import('./routes/Reports')
const Reports = lazy(loadReports)

export function NavLinkReports() {
  return (
    <a
      href="/reports"
      onMouseEnter={() => void loadReports()}
      onFocus={() => void loadReports()}
    >
      Reports
    </a>
  )
}

export function AppRoutes({ path }: { path: string }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {path === '/reports' ? <Reports /> : <Home />}
    </Suspense>
  )
}`,
        note: 'Memanggil fungsi import yang sama saat hover/focus mulai mengunduh chunk sebelum diklik; berkat module cache, lazy memakai ulang promise yang sama. Skeleton sebaiknya cocok dengan layout akhir untuk menghindari CLS.',
      },
      {
        title: '❌ Import yang berat vs ✅ API platform dan import yang terarah',
        code: `// ❌ pulls the whole library (and maybe all locales) into the main bundle
import _ from 'lodash'
import moment from 'moment'
const label = moment(order.date).format('D MMM YYYY')
const grouped = _.groupBy(orders, 'status')

// ✅
const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const label = fmt.format(new Date(order.date))
const grouped = Object.groupBy(orders, o => o.status)`,
        note: 'Intl dan Object.groupBy sudah tertanam di browser modern: nol byte yang dikirim. Buat formatter sekali saja, bukan per baris.',
      },
      {
        title: '✅ Memindahkan parsing CSV ke Web Worker',
        code: `// csv.worker.ts
self.onmessage = (e: MessageEvent<string>) => {
  const rows = e.data.split('\\n').map(line => line.split(','))
  postMessage(rows)
}

// useCsvImport.ts
export function parseInWorker(text: string): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./csv.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = e => { resolve(e.data); worker.terminate() }
    worker.onerror = err => { reject(err); worker.terminate() }
    worker.postMessage(text)
  })
}`,
        note: 'Parsing file 20 MB tidak lagi membekukan UI. Structured cloning untuk hasil yang besar juga punya biaya; transfer ArrayBuffer kalau memungkinkan.',
      },
    ],
    realCase: {
      title: 'Situs marketing yang LCP-nya jadi dua kali lipat setelah menambah chart',
      story: `**Situasi:** Landing page sebuah SaaS menambahkan kalkulator harga interaktif dengan library chart.

**Gejala:** LCP mobile di data lapangan naik dari 2,1 detik ke 4,3 detik; JS awal membengkak dari 140 KB ke 520 KB gzip.

**Akar masalah:** Library chart dan dependency tanggalnya di-import secara statis di entry landing page, dan gambar hero mendapat \`loading="lazy"\` dari autofix lint yang diterapkan secara menyeluruh.

**Perbaikan:** Kalkulator dijadikan component \`lazy\` yang dirender saat hampir ter-scroll ke layar (IntersectionObserver), gambar hero diberi \`fetchPriority="high"\` tanpa lazy loading, dan budget bundle di CI ditambahkan untuk route landing. LCP kembali ke 2,0 detik.

**Pelajaran:** Analisis bundle setiap kali ada perubahan dependency yang signifikan, dan perlakukan elemen LCP secara khusus.`,
    },
    pitfalls: [
      'Lazy-load gambar LCP atau component hero, sehingga paint yang paling penting jadi tertunda.',
      'Memecah berlebihan menjadi puluhan chunk kecil, sehingga muncul waterfall request.',
      'Fallback Suspense dengan dimensi yang berbeda dari konten aslinya, sehingga menimbulkan layout shift.',
      'Menambah dependency besar hanya untuk satu fungsi helper tanpa mengecek ukuran dan kemampuan tree-shake-nya.',
      'Menjalankan parsing atau komputasi berat di main thread selama interaksi.',
    ],
    exercise: {
      task: 'Jalankan analisis bundle di proyekmu. Identifikasi tiga dependency terbesar di chunk awal, dan untuk masing-masing putuskan: hapus, ganti, lazy-load, atau pertahankan. Implementasikan minimal satu split per route dan ukur JS awal sebelum dan sesudahnya.',
      hint: 'Tambahkan rollup-plugin-visualizer ke vite.config.ts dengan { open: true, gzipSize: true } lalu jalankan build production.',
      solution: `\`\`\`ts
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'
export default defineConfig({
  plugins: [react(), visualizer({ filename: 'stats.html', gzipSize: true, brotliSize: true })],
})
\`\`\`

Contoh catatan keputusan:

1. \`recharts\` (95 KB gz), hanya dipakai di /reports: **lazy-load** route-nya.
2. \`date-fns\` dengan semua locale (40 KB): **ganti** dengan \`Intl.DateTimeFormat\`.
3. \`react-dom\` (sekitar 45 KB): **pertahankan**, itu framework-nya.

Hasil: JS awal untuk "/" turun dari 310 KB ke 165 KB gzip; LCP di profil mobile yang di-throttle membaik 0,8 detik.`,
    },
    interview: [
      'Bagaimana lazy dan Suspense mengimplementasikan code splitting, dan bagaimana menghindari jeda yang terlihat saat bernavigasi ke route yang dipecah?',
      'Apa yang pertama kali kamu cek kalau LCP sebuah halaman mengalami regresi?',
      'Kapan kamu memindahkan pekerjaan ke Web Worker, dan apa biayanya?',
    ],
  },
}

export default details
