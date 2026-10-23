import type { TopicDetail } from '../../types'

const details: Record<string, TopicDetail> = {
  setup: {
    explanation: `Setup yang baik menghapus satu kategori bug utuh bahkan sebelum kamu menulis komponen pertama. Proyek React modern di 2026 biasanya berdiri di atas tiga pilar: tool dev/build yang cepat, React Compiler, dan linting.

### Vite

\`npm create vite@latest my-app -- --template react-ts\` membuatkan kerangka proyek. Selama development, Vite menyajikan source-mu sebagai ES module native, sehingga server menyala hampir seketika dan hot module replacement (HMR) hanya memperbarui module yang berubah sambil mempertahankan state komponen. Sejak Vite 8 (Maret 2026), Rolldown (ditulis dengan Rust) menggantikan pasangan esbuild + Rollup untuk dev maupun build, dan Oxc menangani parsing, transform, serta minify; butuh Node 20.19+/22.12+ dan langsung mengerti \`paths\` di tsconfig. Untuk production, Vite melakukan bundle dan minify, menghasilkan aset ber-hash yang bisa kamu deploy ke static host mana pun.

File-file penting: \`index.html\` (entry sebenarnya, yang memuat \`src/main.tsx\`), \`vite.config.ts\` (plugin, alias, proxy), \`tsconfig*.json\` (pengaturan TypeScript). Environment variable berawalan \`VITE_\` diekspos lewat \`import.meta.env\`; jangan pernah menaruh rahasia di sana, karena nilainya akan ikut masuk ke bundle di browser.

### React Compiler

React Compiler (stabil sejak versi 1.0, Oktober 2025) adalah plugin Babel yang berjalan saat build. Ia menganalisis komponen dan hook-mu lalu menyisipkan memoisasi secara otomatis. Dalam praktiknya, hasilnya setara dengan pemakaian \`useMemo\`, \`useCallback\`, dan \`memo\` yang teliti, tanpa kamu perlu menulisnya. Compiler ini mengandalkan kodemu mengikuti **Rules of React**: render yang murni, tidak memutasi props/state, hook dipanggil tanpa kondisi. Kalau sebuah komponen melanggar aturan, compiler akan melewatinya alih-alih menghasilkan kode yang salah.

Dengan \`@vitejs/plugin-react\` 6+, kamu mengaktifkannya lewat \`@rolldown/plugin-babel\` dan \`reactCompilerPreset()\` yang diekspor plugin React (lihat contoh). Opsi lama \`react({ babel: { plugins: [...] } })\` sudah **dihapus** di v6, jadi tutorial lama akan gagal. Ada juga port Rust eksperimental lewat \`react({ compiler: true })\` (peer dependency opsional \`oxc-transform-react\`); anggap ini masih eksperimental. Next.js menyediakan \`reactCompiler: true\` di \`next.config.ts\`. Karena sifatnya opt-in per build, kamu bisa mengadopsinya secara bertahap.

### ESLint

\`eslint-plugin-react-hooks@latest\` dengan preset **\`recommended-latest\`** (sudah termasuk aturan yang ditenagai compiler) menandai pelanggaran aturan hook, dependency effect yang terlewat, mutasi saat render, dan pola yang tidak bisa dioptimalkan compiler. Pelanggaran hanya membuat compiler melewati komponen itu saja. Anggap peringatannya sebagai pelajaran, bukan gangguan; membungkam \`exhaustive-deps\` hampir selalu berarti menyembunyikan bug stale closure.

### TypeScript, longgar dulu di awal

Mulailah dengan file \`.tsx\` dan biarkan inferensi melakukan sebagian besar pekerjaan. Beri tipe props dengan \`type Props = {...}\` sederhana. Pengetikan yang lebih dalam dibahas di Level 3. Jalankan \`tsc --noEmit\` (atau \`tsc -b\`) di CI, karena dev server Vite hanya membuang tipe tanpa mengeceknya.

### Kebiasaan

- Biarkan \`StrictMode\` tetap aktif di \`main.tsx\`.
- Pakai Prettier (atau formatter bawaan editormu) supaya tidak ada lagi debat soal gaya penulisan.
- Tambahkan script \`typecheck\` dan \`lint\` lalu jalankan di CI sejak hari pertama.`,
    examples: [
      {
        title: 'vite.config.ts dengan React Compiler',
        code: `import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    proxy: { '/api': 'http://localhost:8080' }, // avoid CORS in dev
  },
})`,
        note: 'Dengan @vitejs/plugin-react 6+, compiler berjalan lewat `@rolldown/plugin-babel` memakai `reactCompilerPreset()`; opsi lama `react({ babel: ... })` sudah tidak ada. Proxy meneruskan panggilan `/api` ke backend lokal, sehingga frontend bisa memakai URL relatif di semua environment.',
      },
      {
        title: '❌ rahasia di env VITE_ vs ✅ di sisi server',
        code: `// .env
// ❌ VITE_STRIPE_SECRET_KEY=sk_live_... ends up in the JS bundle anyone can read
VITE_API_BASE_URL=/api            // ✅ public config only

// src/api.ts
export const api = (path: string) => fetch(\`\${import.meta.env.VITE_API_BASE_URL}\${path}\`)`,
        note: 'Semua yang berawalan `VITE_` disisipkan langsung ke kode client saat build. Rahasia harus tinggal di server yang dipanggil oleh browser.',
      },
    ],
    realCase: {
      title: 'API key yang ikut terkirim ke setiap pengunjung',
      story: `Sebuah startup travel kecil memakai API geocoding peta dari aplikasi React-nya dengan \`VITE_GEOCODER_KEY\`. Beberapa bulan kemudian tagihan dari provider melonjak: seseorang telah mengambil key itu dari bundle yang sudah di-minify dan memakainya untuk layanan mereka sendiri.

Perbaikannya memindahkan geocoding ke belakang endpoint server kecil yang menyimpan key-nya dan menambahkan rate limiting; browser cukup memanggil \`/api/geocode\`. Mereka juga menambahkan pengecekan di CI yang gagal kalau aset hasil build mengandung string yang cocok dengan pola key. Pelajarannya: bundle client itu publik. Tool build membuat kita mudah lupa bahwa "environment variable" tidak sama dengan "rahasia".`,
    },
    pitfalls: [
      'Menaruh rahasia di variabel berawalan `VITE_`.',
      'Mengira dev server melakukan type-check; ia hanya membuang tipe. Jalankan `tsc` secara terpisah.',
      'Mematikan aturan lint hooks alih-alih memperbaiki masalah aslinya.',
      'Menghapus StrictMode karena effect jalan dua kali di development.',
      'Berharap React Compiler memperbaiki kode yang melanggar Rules of React; compiler justru melewati komponen seperti itu.',
    ],
    exercise: {
      task: 'Buat proyek Vite React + TypeScript baru, aktifkan React Compiler, tambahkan script `lint` dan `typecheck`, lalu pastikan compiler aktif dengan membuka React DevTools (komponen yang di-compile menampilkan badge "Memo ✨").',
      hint: 'Install `@rolldown/plugin-babel`, `@babel/core`, dan `babel-plugin-react-compiler` sebagai dev dependency, lalu tambahkan `babel({ presets: [reactCompilerPreset()] })` di samping `react()`.',
      solution: `\`\`\`bash
npm create vite@latest shop -- --template react-ts
cd shop
npm install
npm install -D @rolldown/plugin-babel @babel/core babel-plugin-react-compiler eslint-plugin-react-hooks@latest
\`\`\`

Ubah \`vite.config.ts\` seperti contoh di atas, pakai preset \`recommended-latest\` dari \`eslint-plugin-react-hooks\` di \`eslint.config.js\`, lalu di \`package.json\`:

\`\`\`json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "typecheck": "tsc -b --noEmit"
}
\`\`\`

Jalankan \`npm run dev\`, buka React DevTools, dan cek apakah komponen-komponenmu memiliki badge compiler.`,
    },
    interview: [
      'Apa yang dilakukan React Compiler, dan apa syarat yang dituntutnya dari kodemu?',
      'Kenapa environment variable `VITE_` tidak pernah aman untuk menyimpan rahasia?',
      'Kenapa Vite menyala lebih cepat dibanding dev server lama yang berbasis bundler?',
    ],
  },

  thinking: {
    explanation: `"Thinking in React" adalah proses desain untuk mengubah sebuah mockup menjadi komponen dan state. Inilah skill React yang paling bisa dibawa ke mana-mana: langkah yang sama berlaku untuk to-do list maupun dashboard trading.

### 1. Pecah UI menjadi hierarki komponen

Gambar kotak di sekeliling bagian-bagian mockup. Idealnya sebuah komponen hanya mengerjakan satu hal (single responsibility). Bentuk datamu adalah panduan yang bagus: kalau JSON-nya berisi \`orders[].items[]\`, UI-nya kemungkinan besar \`OrderList > OrderCard > LineItem\`. Namai komponen berdasarkan *apa* dia, bukan bagaimana tampilannya.

### 2. Bangun versi statis

Render hierarkinya dari data hard-coded dengan props saja, tanpa state. Cara ini memisahkan urusan "layout dan aliran data" dari "interaktivitas", dan cepat ditulis. Data mengalir satu arah: dari parent ke child.

### 3. Temukan state minimal

State adalah sesuatu yang berubah seiring waktu *dan* tidak bisa dihitung dari hal lain. Tanyakan untuk setiap potong data:

- Apakah datang dari parent lewat props? Bukan state.
- Apakah tetap sama sepanjang waktu? Bukan state.
- Apakah bisa dihitung dari state atau props lain? Bukan state, turunkan saja.

Untuk tabel produk dengan kotak pencarian: daftar produk (props dari server), teks pencarian (state), checkbox "hanya yang tersedia" (state), dan daftar hasil filter (turunan).

### 4. Tentukan di mana state tinggal

Untuk setiap nilai state, cari semua komponen yang me-render sesuatu berdasarkan nilai itu, lalu cari parent bersama terdekatnya. Parent itu (atau sesuatu di atasnya) yang memiliki state-nya. Pilih pemilik paling rendah yang masih bisa bekerja; state yang terlalu tinggi menyebabkan re-render yang tidak perlu dan keterikatan antarbagian.

### 5. Tambahkan aliran data terbalik

Child tidak bisa mengubah state parent secara langsung. Pemilik state mengirim callback setter ke bawah (\`onSearchChange\`), lalu child memanggilnya di event handler.

### Kenapa cara ini berhasil

Model React adalah \`UI = f(state)\`. Kalau state-mu minimal dan tinggal di tempat yang tepat, UI selalu konsisten karena semua hal lain dihitung dari satu sumber kebenaran. Sebagian besar bug di aplikasi React (daftar filter yang basi, dua checkbox yang tidak sepakat) berasal dari state yang terduplikasi atau salah tempat, bukan dari React-nya sendiri.

### Di luar state lokal

Level-level berikutnya menambahkan tempat tinggal lain untuk state: URL (filter, tab, pagination yang harus bertahan setelah reload), context, external store, dan cache server. Pertanyaannya tetap sama: tempat mana yang *paling dekat* dan bisa melayani semua pembacanya?`,
    examples: [
      {
        title: '❌ state turunan terduplikasi vs ✅ state minimal',
        code: `// ❌ filtered list stored separately: easy to forget to update
function ProductPageBad({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const [filtered, setFiltered] = useState(products)
  function onQuery(q: string) {
    setQuery(q)
    setFiltered(products.filter(p => p.name.includes(q)))
  }
  // bug: if products prop changes, filtered is stale
}

// ✅ only the query is state; the list is derived each render
function ProductPage({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const visible = products.filter(
    p => p.name.toLowerCase().includes(query.toLowerCase()) && (!inStockOnly || p.stock > 0),
  )
  return (
    <>
      <SearchBar query={query} onQueryChange={setQuery} inStockOnly={inStockOnly} onInStockChange={setInStockOnly} />
      <ProductTable products={visible} />
    </>
  )
}`,
        note: 'Versi yang salah punya dua sumber kebenaran yang jadi tidak sinkron saat `products` berubah. Menurunkan `visible` membuat inkonsistensi itu mustahil terjadi.',
      },
    ],
    realCase: {
      title: 'Panel filter dan badge jumlah yang tidak sepakat',
      story: `Sebuah tool HR menampilkan daftar kandidat dengan sidebar filter dan badge di header bertuliskan "42 candidates". Komponen sidebar menyimpan filter di state-nya sendiri, daftar kandidat menyimpan salinan hasil filter, dan header menghitung jumlah dari salinan ketiga yang disinkronkan lewat effect.

Setelah sebuah refactor, menghapus filter memperbarui daftar tapi tidak memperbarui badge. Tim menerapkan ulang langkah-langkah Thinking in React: filter menjadi state di komponen halaman (parent bersama terdekat dari sidebar, daftar, dan header), lalu daftar maupun jumlahnya diturunkan dari \`candidates\` + \`filters\` saat render. Dua effect dan satu kelas bug hilang sekaligus. Pelajarannya: kalau ada hal yang tidak sepakat, cari state yang terduplikasi.`,
    },
    pitfalls: [
      'Menyimpan nilai yang bisa dihitung (total, daftar hasil filter, nama lengkap) sebagai state.',
      'Menaruh semua state di puncak aplikasi "buat jaga-jaga".',
      'Menyalin props ke state, yang membuat nilainya membeku di nilai awal.',
      'Menambahkan interaktivitas sebelum struktur statis dan aliran datanya jelas.',
    ],
    exercise: {
      task: 'Ambil mockup halaman hasil pencarian penerbangan: header ringkasan pencarian, dropdown urutan (harga/durasi), filter (transit: semua/langsung, slider harga maksimum), daftar hasil, dan label "N flights found". Tuliskan pohon komponennya, state minimalnya, di mana setiap state tinggal, lalu implementasikan versi statis disusul versi interaktifnya.',
      hint: 'Hasil pencarian datang dari props/server. Urutan dan filter adalah state. Daftar yang tampil dan N adalah turunan.',
      solution: `Pohon: \`FlightResultsPage > (SearchSummary, ControlsBar > (SortSelect, StopsFilter, PriceSlider), ResultsCount, FlightList > FlightCard)\`.

State (di \`FlightResultsPage\`): \`sort\`, \`nonstopOnly\`, \`maxPrice\`. Turunan: \`visible\`, \`visible.length\`.

\`\`\`tsx
function FlightResultsPage({ flights }: { flights: Flight[] }) {
  const [sort, setSort] = useState<'price' | 'duration'>('price')
  const [nonstopOnly, setNonstopOnly] = useState(false)
  const [maxPrice, setMaxPrice] = useState(1000)

  const visible = flights
    .filter(f => (!nonstopOnly || f.stops === 0) && f.price <= maxPrice)
    .toSorted((a, b) => (sort === 'price' ? a.price - b.price : a.minutes - b.minutes))

  return (
    <>
      <ControlsBar {...{ sort, setSort, nonstopOnly, setNonstopOnly, maxPrice, setMaxPrice }} />
      <ResultsCount count={visible.length} />
      <FlightList flights={visible} />
    </>
  )
}
\`\`\``,
    },
    interview: [
      'Bagaimana kamu memutuskan apakah sebuah data harus menjadi state?',
      'Bagaimana kamu memutuskan komponen mana yang harus memiliki sebuah state?',
      'Apa itu aliran data terbalik (inverse data flow) di React?',
    ],
  },

  jsx: {
    explanation: `JSX adalah ekstensi sintaks yang memungkinkan kamu menulis markup di dalam JavaScript. JSX bukan HTML dan bukan bahasa template; ia di-compile menjadi pemanggilan fungsi biasa.

### Hasil compile-nya

\`<Button variant="primary">Save</Button>\` (dengan automatic runtime modern) kurang lebih menjadi \`jsx(Button, { variant: 'primary', children: 'Save' })\`. Hasilnya adalah **React element**: objek kecil yang immutable seperti \`{ type: Button, props: {...}, key: null }\`. Element adalah deskripsi UI, bukan node DOM. Belakangan React membandingkan pohon element lalu memperbarui DOM.

Tag huruf kecil (\`div\`) menjadi string dan dipetakan ke elemen DOM; tag berhuruf kapital (\`Button\`) merujuk ke variabel di dalam scope. Itulah sebabnya nama komponen harus diawali huruf kapital.

### Expression, bukan statement

Di dalam \`{}\` kamu bisa menaruh *expression* JavaScript apa pun: variabel, pemanggilan fungsi, ternary, \`&&\`, \`.map()\`, template literal. Kamu tidak bisa menaruh statement (\`if\`, \`for\`, \`switch\`, deklarasi variabel). Hitung semua itu di atas \`return\` atau pecah ke helper terpisah.

### Perbedaan atribut dari HTML

- \`className\` alih-alih \`class\`, \`htmlFor\` alih-alih \`for\`.
- camelCase untuk sebagian besar atribut dan event: \`onClick\`, \`tabIndex\`, \`autoComplete\`. \`aria-*\` dan \`data-*\` tetap memakai tanda hubung.
- \`style\` menerima objek: \`style={{ marginTop: 8 }}\` (angka otomatis jadi px).
- Setiap tag harus ditutup: \`<img />\`, \`<input />\`.
- Komponen mengembalikan satu root; pakai fragment \`<>...</>\` (atau \`<Fragment key>\` di dalam list) untuk mengelompokkan elemen bersaudara tanpa DOM tambahan.

### Apa saja yang di-render

String dan angka di-render sebagai teks. \`null\`, \`undefined\`, \`true\`, dan \`false\` tidak me-render apa pun, dan itulah yang membuat \`cond && <X />\` bisa bekerja. Array me-render setiap itemnya (dengan key). Plain object melempar error "Objects are not valid as a React child".

### Keamanan

JSX melakukan escape pada teks secara default, jadi \`{userComment}\` tidak bisa menyuntikkan HTML atau script. Pintu daruratnya, \`dangerouslySetInnerHTML\`, sengaja diberi nama begitu; pakai hanya dengan konten yang sudah disanitasi.

### Kenapa JSX?

JSX menyatukan logika render dan markup, sesuai dengan cara UI berubah: label tombol, status disabled-nya, dan click handler-nya berubah bersama-sama. Karena JSX adalah JavaScript, kamu mendapat kekuatan penuh bahasa ini plus type checking untuk markup-mu.`,
    examples: [
      {
        title: '❌ statement di dalam JSX vs ✅ hitung sebelum return',
        code: `function OrderStatus({ order }: { order: Order }) {
  // ❌ syntax error: if is a statement
  // return <span>{if (order.paid) { 'Paid' } else { 'Due' }}</span>

  // ✅ compute with plain JS first
  let label: string
  switch (order.status) {
    case 'paid': label = 'Paid'; break
    case 'refunded': label = 'Refunded'; break
    default: label = \`Due \${order.dueDate}\`
  }
  return <span className={\`status status-\${order.status}\`}>{label}</span>
}`,
        note: 'Celah di JSX hanya menerima expression. Untuk logika dengan banyak cabang, pakai JavaScript biasa di atas return dan biarkan JSX-nya tetap sederhana.',
      },
      {
        title: 'Fragment dengan key di dalam definition list',
        code: `import { Fragment } from 'react'

function SpecList({ specs }: { specs: { name: string; value: string }[] }) {
  return (
    <dl>
      {specs.map(s => (
        <Fragment key={s.name}>
          <dt>{s.name}</dt>
          <dd>{s.value}</dd>
        </Fragment>
      ))}
    </dl>
  )
}`,
        note: '`dl` mewajibkan `dt`/`dd` sebagai child langsung, jadi `div` pembungkus akan membuatnya tidak valid. Sintaks pendek `<>` tidak bisa menerima key; pakai `Fragment` secara eksplisit di dalam list.',
      },
    ],
    realCase: {
      title: 'Me-render bio pengguna sebagai HTML',
      story: `Sebuah forum komunitas ingin bio pengguna mendukung teks tebal dan link, jadi seorang developer me-render-nya dengan \`dangerouslySetInnerHTML={{ __html: user.bio }}\`. Dalam hitungan minggu, seorang pengguna menyimpan bio berisi tag image dengan handler \`onerror\` yang membaca data session dari browser pengunjung lain.

Tim beralih menyimpan Markdown, me-render-nya menjadi HTML di server melalui sanitizer dengan allow-list tag, dan menambahkan Content Security Policy. Pelajarannya: JSX melindungimu dengan melakukan escape pada teks; kalau kamu melewati perlindungan itu, kontennya harus selalu diperlakukan sebagai tidak tepercaya.`,
    },
    pitfalls: [
      'Nama komponen huruf kecil (`<card />`) yang dianggap React sebagai tag DOM tak dikenal.',
      'Me-render objek secara langsung (`{user}`), yang akan melempar error.',
      'Memakai `class` dan `for` alih-alih `className` dan `htmlFor`.',
      'Membungkus elemen bersaudara dengan `div` yang tidak perlu sampai merusak layout CSS atau semantik, padahal bisa pakai fragment.',
      'Memakai `dangerouslySetInnerHTML` dengan konten yang belum disanitasi.',
    ],
    exercise: {
      task: 'Tulis secara manual hasil compile JSX ini (pakai pemanggilan `jsx(type, props)`), lalu tebak apa yang di-render React:\n\n```tsx\n<ul className="tags">\n  {tags.length === 0 ? <li>No tags</li> : tags.map(t => <li key={t}>#{t}</li>)}\n  {false}\n  {null}\n</ul>\n```',
      hint: 'children menjadi array kalau isinya lebih dari satu; boolean dan null tidak me-render apa pun.',
      solution: `\`\`\`js
jsxs('ul', {
  className: 'tags',
  children: [
    tags.length === 0 ? jsx('li', { children: 'No tags' }) : tags.map(t => jsx('li', { children: ['#', t] }, t)),
    false,
    null,
  ],
})
\`\`\`

Perhatikan bahwa key dikirim terpisah dari props. React me-render \`ul\` berisi "No tags" atau satu \`li\` per tag; \`false\` dan \`null\` tidak menghasilkan apa-apa.`,
    },
    interview: [
      'JSX di-compile menjadi apa, dan apa itu React element?',
      'Kenapa nama komponen harus diawali huruf kapital?',
      'Kenapa JSX aman dari XSS secara default, dan kapan tidak?',
    ],
  },

  props: {
    explanation: `Komponen adalah fungsi JavaScript yang menerima satu objek, **props**, dan mengembalikan deskripsi UI. Props adalah cara parent mengatur child-nya, dan alirannya tegas satu arah: ke bawah.

### Props bersifat read-only

Komponen harus memperlakukan props-nya sebagai immutable. Memutasi \`props.items.push(x)\` mengubah data milik parent diam-diam, merusak memoisasi, dan membuat render tidak murni. Kalau child perlu mengubah sesuatu, parent mengirimkan callback (\`onChange\`, \`onSelect\`) dan parent-lah yang memegang perubahan itu.

### Destructuring dan default

\`function Avatar({ src, size = 40, alt })\` adalah signature yang idiomatis. Default berlaku saat prop bernilai \`undefined\` (bukan saat \`null\`). Di TypeScript, beri tipe pada objek props: \`type AvatarProps = { src: string; size?: number; alt: string }\`.

### children dan komposisi

\`children\` hanyalah prop yang berisi JSX apa pun yang kamu sisipkan di antara tag pembuka dan penutup. Inilah yang memungkinkan komposisi: container generik (\`Card\`, \`Modal\`, \`Layout\`) yang tidak perlu tahu apa yang dibungkusnya. Alih-alih \`Card\` dengan props \`title\`, \`subtitle\`, \`showFooter\`, \`footerText\`..., terima \`children\` atau slot bernama (props \`header\`, \`footer\` yang menerima JSX). Komposisi adalah jawaban React untuk inheritance; kamu hampir tidak akan pernah meng-extend komponen.

Komposisi juga membantu performa dan menghindari prop drilling: parent bisa me-render \`<Layout sidebar={<UserMenu user={user} />}>\`, sehingga \`Layout\` tidak perlu tahu apa pun soal \`user\`.

### Props vs state

Props adalah input dari luar, state adalah memori milik komponen itu sendiri. Saat parent re-render dengan props baru, child menerimanya di render berikutnya. Menyalin prop ke state (\`useState(props.value)\`) hanya menangkap nilai *awal*; perubahan berikutnya diabaikan. Turunkan dari props saja, atau pakai \`key\` untuk me-reset.

### Mengirim fungsi

Callback juga props. Kirim fungsinya, jangan dipanggil: \`onClick={handleSave}\`, bukan \`onClick={handleSave()}\`. Namai prop callback dengan \`onSomething\` dan handler-nya \`handleSomething\`.

### React 19: ref adalah prop

Function component sekarang bisa menerima \`ref\` sebagai prop biasa, jadi \`forwardRef\` tidak diperlukan lagi untuk kode baru. Komponen \`Input\` di design system cukup men-destructure \`ref\` lalu meneruskannya ke \`input\` di dalamnya.

### Spread props

\`{...rest}\` meneruskan props yang tidak dikenal ke elemen di bawahnya, berguna untuk komponen pembungkus. Pakai dengan sengaja; menyebarkan semua props di mana-mana menyembunyikan props mana yang sebenarnya dipakai sebuah komponen.`,
    examples: [
      {
        title: '❌ ledakan prop konfigurasi vs ✅ komposisi',
        code: `// ❌ every new variant needs a new prop
<Card title="Invoice #42" subtitle="Due Friday" showBadge badgeText="Overdue" footerButtonText="Pay" onFooterClick={pay} />

// ✅ the card provides structure, callers provide content
function Card({ header, children, footer }: { header: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="card">
      <header className="card-header">{header}</header>
      <div className="card-body">{children}</div>
      {footer && <footer className="card-footer">{footer}</footer>}
    </section>
  )
}

<Card
  header={<><h3>Invoice #42</h3><Badge tone="danger">Overdue</Badge></>}
  footer={<button onClick={pay}>Pay</button>}
>
  <p>Due Friday</p>
</Card>`,
        note: 'Slot (`header`, `footer`, `children`) menjaga `Card` tetap kecil dan stabil, sementara pemanggilnya bebas menyusun konten apa pun ke dalamnya.',
      },
      {
        title: 'ref sebagai prop di React 19',
        code: `type InputProps = React.ComponentProps<'input'> & { label: string }

export function TextField({ label, ref, ...rest }: InputProps) {
  return (
    <label className="field">
      {label}
      <input ref={ref} {...rest} />
    </label>
  )
}

// usage
const emailRef = useRef<HTMLInputElement>(null)
<TextField label="Email" ref={emailRef} type="email" />`,
        note: 'Tanpa pembungkus `forwardRef`: `ref` datang seperti prop lainnya dan diteruskan ke input DOM.',
      },
    ],
    realCase: {
      title: 'Child yang mengedit list milik parent-nya',
      story: `Di sebuah panel admin internal, komponen \`TagEditor\` menerima \`tags\` sebagai prop, menjalankan \`props.tags.push(newTag)\`, lalu memanggil \`onChange(props.tags)\`. Di demo semuanya lancar. Di production, tombol "Save" tetap disabled setelah tag ditambahkan karena form membandingkan \`initialTags !== tags\`, padahal keduanya adalah array yang sama yang sudah dimutasi.

Perbaikannya membuat \`TagEditor\` memanggil \`onChange([...tags, newTag])\` dan tidak pernah menyentuh prop-nya. Pelajarannya: props adalah data milik pihak lain. Child melaporkan apa yang seharusnya berubah; pemiliknya yang memutuskan dan membuat data baru.`,
    },
    pitfalls: [
      'Memutasi props atau objek di dalam props.',
      'Menyalin props ke state dan berharap nilainya mengikuti perubahan prop berikutnya.',
      'Memanggil callback saat mengirimkannya: `onClick={remove(id)}`.',
      'Daftar prop boolean/konfigurasi yang panjang sekali alih-alih komposisi dengan `children` atau slot.',
      'Memakai `forwardRef` di kode React 19 baru padahal `ref` bisa jadi prop biasa.',
    ],
    exercise: {
      task: 'Buat komponen `Modal` dengan props `title`, `children`, `footer` (ReactNode opsional), dan `onClose`. Lalu pakai untuk me-render konfirmasi "Delete project?" dengan tombol Cancel dan Delete, sambil menjaga semua logika khusus proyek tetap di luar `Modal`.',
      hint: 'Modal hanya me-render struktur dan memanggil onClose; pemanggilnya mengirim tombol-tombol sebagai footer.',
      solution: `\`\`\`tsx
type ModalProps = { title: string; children: React.ReactNode; footer?: React.ReactNode; onClose: () => void }

export function Modal({ title, children, footer, onClose }: ModalProps) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="modal" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

function DeleteProjectDialog({ project, onCancel, onConfirm }: Props) {
  return (
    <Modal
      title="Delete project?"
      onClose={onCancel}
      footer={<><button onClick={onCancel}>Cancel</button><button className="danger" onClick={() => onConfirm(project.id)}>Delete</button></>}
    >
      <p>This permanently removes <strong>{project.name}</strong>.</p>
    </Modal>
  )
}
\`\`\``,
    },
    interview: [
      'Kenapa props bersifat read-only, dan bagaimana child meminta perubahan?',
      'Jelaskan komposisi dengan `children` dan kenapa React lebih memilihnya dibanding inheritance.',
      'Apa yang berubah soal `ref` di React 19?',
    ],
  },

  conditional: {
    explanation: `Conditional rendering dan list adalah titik pertemuan JSX dengan alur kontrol JavaScript biasa. Ada dua skill yang penting: memilih bentuk kondisi yang paling jelas, dan memberi key yang benar untuk item list.

### Bentuk-bentuk kondisi

- **Early return** untuk cabang yang mencakup seluruh komponen: \`if (!user) return <LoginPrompt />\`. Jelas dan datar.
- **Ternary** \`cond ? <A /> : <B />\` saat memilih di antara dua elemen secara inline.
- **Logical AND** \`cond && <A />\` saat me-render sesuatu atau tidak sama sekali.
- **Variabel**: assign JSX ke variabel di dalam \`if\`/\`switch\` di atas return kalau cabangnya banyak.
- **Objek lookup** untuk pemetaan status ke komponen: \`const icons = { paid: <Check />, failed: <X /> }\`.

Hindari ternary bersarang lebih dari satu tingkat; pecah menjadi komponen terpisah.

### Jebakan &&

\`&&\` mengembalikan operand kirinya kalau nilainya falsy. React me-render angka, jadi \`{items.length && <List />}\` akan me-render \`0\` saat list kosong. Pakai boolean sungguhan: \`items.length > 0 &&\`, atau ternary dengan \`null\`. String punya masalah yang sama dengan \`''\`, hanya saja tidak ada yang terlihat, tapi \`NaN\` akan me-render tulisan "NaN".

### List dan key

\`items.map(item => <Row key={item.id} item={item} />)\` mengubah data menjadi elemen. **Key** memberi tahu React elemen mana yang berpasangan dengan item mana dari render ke render. Saat reconciliation, React mencocokkan child berdasarkan key: key sama berarti "komponen yang sama, update saja"; key baru berarti "buat"; key yang hilang berarti "hapus".

Aturannya:

- Key harus **stabil** (item yang sama → key yang sama di setiap render), **unik di antara saudaranya**, dan berasal dari data (id database, slug).
- **Jangan pakai index array** kalau list bisa diurutkan ulang, difilter, atau disisipi item. Key berupa index membuat React memakai ulang instance komponen yang salah, sehingga state (teks input, checkbox, flag expanded) dan DOM (focus) menempel pada *posisi*, bukan pada item.
- **Jangan pakai \`Math.random()\` atau \`crypto.randomUUID()\` saat render**: key baru di setiap render menghancurkan dan membuat ulang setiap baris, sehingga state hilang dan kerja terbuang. Buat id saat data diciptakan.
- Key tidak dikirim sebagai props; kalau child butuh id-nya, kirim secara terpisah.

Key berupa index hanya bisa diterima untuk list statis yang urutannya tidak pernah berubah.

### State kosong dan loading

Perlakukan "tidak ada data", "loading", dan "error" sebagai cabang utama, bukan tambahan di akhir. Komponen list biasanya berbentuk seperti ini: error → pesan, loading → skeleton, kosong → empty state yang membantu, selain itu → item-itemnya.`,
    examples: [
      {
        title: '❌ me-render 0 vs ✅ kondisi boolean',
        code: `function NotificationsBell({ unread }: { unread: number }) {
  return (
    <button aria-label="Notifications">
      🔔
      {/* ❌ shows a stray "0" when unread is 0 */}
      {/* {unread && <span className="badge">{unread}</span>} */}

      {/* ✅ */}
      {unread > 0 && <span className="badge">{unread}</span>}
    </button>
  )
}`,
        note: '`0 && x` menghasilkan `0`, dan React me-render angka. Jadikan sisi kirinya boolean sungguhan.',
      },
      {
        title: '❌ key index kehilangan state saat diurutkan ulang vs ✅ id yang stabil',
        code: `function ShippingNotes({ stops }: { stops: Stop[] }) {
  return (
    <ol>
      {/* ❌ after sorting, each textarea keeps the text typed for the previous stop at that position */}
      {/* {stops.map((s, i) => <StopNote key={i} stop={s} />)} */}

      {/* ✅ state follows the stop, not the position */}
      {stops.map(s => <StopNote key={s.id} stop={s} />)}
    </ol>
  )
}

function StopNote({ stop }: { stop: Stop }) {
  const [note, setNote] = useState('')
  return <li>{stop.address} <textarea value={note} onChange={e => setNote(e.target.value)} /></li>
}`,
        note: 'Dengan key berupa index, React melihat "komponen di posisi 0" tetap bertahan setelah pengurutan, jadi state `note`-nya tetap di posisi 0 sementara prop alamatnya berubah.',
      },
    ],
    realCase: {
      title: 'Catatan driver yang menempel di titik antar yang salah',
      story: `Dashboard dispatch milik sebuah perusahaan logistik memungkinkan dispatcher mengurutkan ulang titik pengantaran dengan drag and drop dan mengetik catatan untuk tiap titik. Setelah diurutkan ulang, catatan muncul di samping alamat yang salah, dan seorang driver diminta "taruh di pintu belakang" di rumah yang tidak punya pintu belakang.

List-nya memakai \`key={index}\` dan setiap baris menyimpan draf catatannya di state lokal. Pengurutan ulang mengubah props di setiap posisi, tapi React mempertahankan state per posisi. Beralih ke \`key={stop.id}\` memperbaikinya; tim juga menambahkan aturan ESLint (\`react/no-array-index-key\`). Pelajarannya: key menentukan identitas, dan identitas menentukan state mana milik item mana.`,
    },
    pitfalls: [
      'Memakai `count && <X/>` dengan angka, yang akan me-render `0`.',
      'Key berupa index pada list yang bisa diurutkan ulang, difilter, atau disisipi.',
      'Key acak yang dibuat saat render.',
      'Ternary bersarang dalam alih-alih early return atau komponen terpisah.',
      'Lupa cabang kosong, loading, dan error.',
    ],
    exercise: {
      task: 'Buat `<InboxList messages loading error />` yang me-render: pesan error kalau ada `error`, tiga baris skeleton kalau `loading`, "Inbox zero 🎉" kalau kosong, selain itu daftar pesan dengan titik unread hanya untuk pesan yang belum dibaca dan header "N unread" hanya kalau N > 0.',
      hint: 'Pakai early return untuk error/loading/kosong, lalu list dengan key={m.id}.',
      solution: `\`\`\`tsx
type Msg = { id: string; from: string; subject: string; unread: boolean }

export function InboxList({ messages, loading, error }: { messages: Msg[]; loading: boolean; error?: string }) {
  if (error) return <p role="alert">Could not load inbox: {error}</p>
  if (loading) return <ul>{[0, 1, 2].map(i => <li key={i} className="skeleton" />)}</ul>
  if (messages.length === 0) return <p>Inbox zero 🎉</p>

  const unread = messages.filter(m => m.unread).length
  return (
    <section>
      {unread > 0 && <h2>{unread} unread</h2>}
      <ul>
        {messages.map(m => (
          <li key={m.id}>
            {m.unread && <span className="dot" aria-label="unread" />}
            <strong>{m.from}</strong> {m.subject}
          </li>
        ))}
      </ul>
    </section>
  )
}
\`\`\`

Key berupa index tidak masalah untuk baris skeleton yang statis.`,
    },
    interview: [
      'Kenapa `{items.length && <List/>}` kadang me-render 0?',
      'Apa persisnya yang salah saat kamu memakai index array sebagai key di list yang bisa diurutkan?',
      'Kenapa `key={Math.random()}` itu buruk?',
    ],
  },

  purity: {
    explanation: `React berasumsi komponenmu berperilaku seperti fungsi murni (pure function) selama render. Sebagian besar fitur canggih React bergantung pada asumsi ini.

### Arti murni di sini

Render yang murni:

- Mengembalikan JSX yang sama untuk props, state, dan context yang sama.
- Tidak mengubah apa pun yang sudah ada sebelum render dimulai: tidak memutasi props, state, variabel module, atau DOM; tidak ada panggilan network, timer, subscription, pencatatan ke analytics, atau penulisan ke \`localStorage\`.

Mutasi lokal itu aman: membuat array di dalam komponen lalu melakukan push ke array itu tidak berbahaya karena tidak ada pihak lain yang bisa melihatnya.

### Kenapa React membutuhkannya

- **React bisa render tanpa melakukan commit.** Dengan concurrent rendering, transition, dan Suspense, React bisa mulai render, berhenti sejenak, membuang hasil kerjanya, lalu mulai lagi. Efek samping di dalam render akan berjalan untuk UI yang tidak pernah dilihat pengguna.
- **React bisa render lebih dari sekali** untuk satu commit yang sama (StrictMode di development, percobaan ulang setelah suspend).
- **Memoisasi dan React Compiler** melewati render saat input-nya sama; ini hanya benar kalau output-nya semata-mata bergantung pada input.
- **Server rendering** menjalankan komponen di server, tempat efek samping khas browser tidak masuk akal.

### Ke mana efek samping seharusnya pergi

- **Event handler** untuk hal yang dipicu oleh aksi pengguna (submit, klik). Ini pilihan pertama.
- **Effect** (\`useEffect\`) untuk menyinkronkan dengan sistem eksternal karena komponen sedang tampil di layar.
- **Action** (React 19) untuk mutasi async yang dipicu oleh form dan transition.

### StrictMode

\`<StrictMode>\` di development sengaja: me-render komponen dua kali (dan memanggil state initializer, updater function, dan reducer dua kali), menjalankan setup → cleanup → setup effect sekali saat mount, dan menjalankan ulang ref callback. Di React 19, render kedua memakai ulang hasil memoisasi dari render pertama. Render ganda ini membongkar kode yang tidak murni: kalau ada yang bertambah dua kali, ter-append dua kali, atau melakukan fetch dua kali, berarti ada efek samping di tempat yang salah. StrictMode tidak berpengaruh di build production.

### Mengenali ketidakmurnian

Tanda bahaya di dalam render: \`Date.now()\` atau \`Math.random()\` dipakai untuk menghasilkan output (pakai state initializer atau kirim dari luar), \`array.sort()\` pada props, \`someGlobal++\`, \`document.title = ...\`, \`fetch(...)\`. Plugin ESLint React hooks dan compiler akan menandai banyak dari pola ini.`,
    examples: [
      {
        title: '❌ mutasi saat render vs ✅ murni',
        code: `let renderedCount = 0 // module-level

// ❌ changes outside state during render; StrictMode doubles it
function CommentListBad({ comments }: { comments: Comment[] }) {
  renderedCount += comments.length
  comments.sort((a, b) => b.likes - a.likes) // mutates parent's array
  return <ul>{comments.map(c => <CommentItem key={c.id} comment={c} />)}</ul>
}

// ✅ derive a new array, no external writes
function CommentList({ comments }: { comments: Comment[] }) {
  const ranked = comments.toSorted((a, b) => b.likes - a.likes)
  return <ul>{ranked.map(c => <CommentItem key={c.id} comment={c} />)}</ul>
}`,
        note: 'Counter maupun sort di tempat sama-sama mengubah data yang hidup lebih lama dari render. Versi yang benar hanya membuat data lokal.',
      },
      {
        title: '❌ analytics di render vs ✅ di event / effect',
        code: `function ProductPage({ product }: { product: Product }) {
  // ❌ fires on every render, twice in StrictMode, even for discarded renders
  // track('product_viewed', { id: product.id })

  // ✅ "the user saw this product" is synchronisation with an external system
  useEffect(() => {
    track('product_viewed', { id: product.id })
  }, [product.id])

  // ✅ user-caused effects belong in handlers
  const addToCart = () => { cart.add(product.id); track('add_to_cart', { id: product.id }) }
  return <button onClick={addToCart}>Add</button>
}`,
        note: 'Render bisa berjalan berapa kali saja. Handler berjalan sekali per aksi pengguna; effect berjalan setelah commit saat dependency-nya berubah.',
      },
    ],
    realCase: {
      title: 'Baris invoice yang dobel, tapi hanya di development',
      story: `Sebuah portal pemesanan B2B menyusun preview invoice dengan melakukan push ke array \`lines\` di level module dari dalam body komponen. Developer melihat setiap baris muncul dua kali di lokal, mengira StrictMode "bermasalah", lalu menghapusnya.

Beberapa minggu kemudian, setelah transition diaktifkan untuk sebuah filter, pengguna production juga melihat baris yang dobel: React menginterupsi lalu mengulang render, dan setiap percobaan melakukan push lagi. Perbaikannya menyusun \`lines\` sebagai variabel lokal di dalam render dan mengembalikan StrictMode. Pelajarannya: render ganda StrictMode itu ibarat detektor asap; mencabutnya tidak memadamkan apinya.`,
    },
    pitfalls: [
      'Menghapus StrictMode untuk "memperbaiki" log atau fetch ganda, alih-alih memperbaiki ketidakmurniannya.',
      'Mengurutkan atau memutasi props saat render.',
      'Menulis ke variabel level module, `document`, atau storage saat render.',
      'Memakai `Math.random()` / `Date.now()` langsung di output render, yang juga menyebabkan hydration mismatch.',
    ],
    exercise: {
      task: 'Temukan dan perbaiki tiga masalah kemurnian berikut:\n\n```tsx\nlet nextId = 0\nfunction TaskBoard({ tasks }: { tasks: Task[] }) {\n  document.title = `${tasks.length} tasks`\n  tasks.reverse()\n  return <ul>{tasks.map(t => <li key={nextId++}>{t.title}</li>)}</ul>\n}\n```',
      hint: 'Judul dokumen adalah sistem eksternal; reverse memutasi; key harus stabil dan berasal dari data.',
      solution: `\`\`\`tsx
function TaskBoard({ tasks }: { tasks: Task[] }) {
  useEffect(() => {
    document.title = \`\${tasks.length} tasks\`
  }, [tasks.length])

  const newestFirst = tasks.toReversed()
  return <ul>{newestFirst.map(t => <li key={t.id}>{t.title}</li>)}</ul>
}
\`\`\`

Judul dipindah ke effect, \`toReversed\` menghindari mutasi, dan key diambil dari id task, bukan dari counter global yang berubah di setiap render.`,
    },
    interview: [
      'Apa artinya komponen React itu murni, dan kenapa concurrent rendering membutuhkannya?',
      'Apa yang dilakukan StrictMode di development, dan kenapa ia menjalankan render dan effect dua kali?',
      'Kalau bukan di render, di mana efek samping seharusnya ditaruh?',
    ],
  },

  state: {
    explanation: `\`useState\` memberi komponen memori di antara render. Wawasan kuncinya: nilai state yang kamu baca adalah **snapshot** untuk render saat ini, bukan variabel yang hidup.

### Cara kerjanya

React menyimpan state di luar fungsimu, di dalam fiber milik komponen, diindeks berdasarkan urutan pemanggilan hook. Di setiap render, \`useState\` mengembalikan nilai yang dimiliki React untuk slot tersebut. Saat kamu memanggil setter, React tidak mengubah variabel yang sedang kamu pegang; ia **mengantrekan update** dan menjadwalkan re-render. Di render berikutnya, \`useState\` mengembalikan nilai baru dan fungsimu berjalan lagi, membuat handler-handler baru yang menangkap nilai tersebut.

Jadi di handler ini:

\`\`\`js
function handleClick() {
  setCount(count + 1)
  setCount(count + 1)
  console.log(count) // still the old value
}
\`\`\`

kedua pemanggilan menghitung \`0 + 1\`, dan log mencetak \`0\`. Nilai count berakhir di 1.

### Updater function

\`setCount(c => c + 1)\` mengantrekan sebuah *fungsi*. React menerapkan updater yang mengantre secara berurutan pada state terbaru yang masih tertunda, jadi dua pemanggilan updater menghasilkan +2. Pakai updater setiap kali state berikutnya bergantung pada state sebelumnya, terutama di kode async, interval, atau beberapa update berturut-turut.

### Batching

React 18+ mem-batch semua update yang dipicu di event, callback promise, atau timeout yang sama menjadi satu re-render. Sepuluh pemanggilan \`setX\` dalam satu klik hanya menyebabkan satu render. Untuk membaca DOM secara sinkron setelah update (jarang diperlukan), tersedia \`flushSync\`.

### Bail-out

Kalau kamu mengisi state dengan nilai yang sama menurut \`Object.is\` dengan nilai saat ini, React bisa melewati re-render komponen tersebut. Inilah sebabnya memutasi lalu men-set objek yang sama tidak berpengaruh apa-apa.

### Inisialisasi

\`useState(initial)\` hanya memakai nilai awal di render pertama. Untuk inisialisasi yang mahal, kirimkan fungsi: \`useState(() => loadDraft())\`; kalau tidak, pemanggilan mahal itu tetap berjalan (lalu dibuang) di setiap render.

### Memilih struktur state

- Kelompokkan nilai yang selalu berubah bersamaan ke dalam satu objek; biarkan nilai yang independen terpisah.
- Hindari kontradiksi (\`isLoading\` dan \`isError\` sama-sama true): pakai satu union \`status\`.
- Hindari redundansi: jangan simpan apa yang bisa dihitung.
- Hindari duplikasi objek (simpan \`selectedId\`, bukan salinan item yang dipilih).
- Hindari nesting yang dalam; ratakan saat update mulai menyiksa.

### Kenapa snapshot itu bagus

Handler selalu bekerja dengan nilai yang konsisten dengan UI yang dilihat pengguna saat mengklik. Bayangkan tombol "send" dengan jeda 3 detik: tombol itu mengirim pesan yang tampil di layar saat diklik, walaupun pengguna terus mengetik.`,
    examples: [
      {
        title: '❌ snapshot basi vs ✅ updater function',
        code: `function QuantityPicker() {
  const [qty, setQty] = useState(1)

  // ❌ +2 button only adds 1: both calls read the same snapshot
  const addTwoBad = () => { setQty(qty + 1); setQty(qty + 1) }

  // ✅ each updater receives the result of the previous one
  const addTwo = () => { setQty(q => q + 1); setQty(q => q + 1) }

  return <button onClick={addTwo}>{qty} (+2)</button>
}`,
        note: '`qty` adalah konstanta di dalam satu render. Updater diantrekan lalu diterapkan berurutan pada nilai terbaru yang tertunda.',
      },
      {
        title: '❌ boolean yang saling bertentangan vs ✅ union status',
        code: `// ❌ four booleans allow 16 combinations, most of them impossible
const [isLoading, setIsLoading] = useState(false)
const [isError, setIsError] = useState(false)
const [isSuccess, setIsSuccess] = useState(false)

// ✅ exactly one status at a time
type Status = 'idle' | 'submitting' | 'success' | 'error'
const [status, setStatus] = useState<Status>('idle')
const [error, setError] = useState<string | null>(null)

async function submit(data: FormData) {
  setStatus('submitting')
  try { await api.save(data); setStatus('success') }
  catch (e) { setError(String(e)); setStatus('error') }
}`,
        note: 'Memodelkan state sebagai satu status membuat kondisi yang mustahil tidak bisa direpresentasikan, dan logika render cukup berupa switch sederhana.',
      },
    ],
    realCase: {
      title: 'Klik dua kali, tapi tiket yang terbeli cuma satu',
      story: `Widget pemesanan bioskop punya tombol "+" di samping setiap jenis tiket. Di perangkat yang lambat, pengguna yang mengetuk "+" dua kali dengan cepat kadang hanya melihat satu tiket bertambah. Handler-nya adalah \`setCount(count + 1)\`.

Dua ketukan diproses sebelum React sempat re-render, jadi kedua handler menangkap \`count\` yang sama. Beralih ke \`setCount(c => c + 1)\` membuat setiap ketukan terhitung. Tim lalu mengaudit semua handler "increment/toggle/append" dan mengubahnya menjadi updater. Pelajarannya: kalau state berikutnya bergantung pada state sebelumnya, jangan percaya pada snapshot di dalam closure-mu.`,
    },
    pitfalls: [
      'Membaca state tepat setelah men-set-nya dan berharap mendapat nilai baru.',
      'Memakai `setX(x + 1)` berulang kali atau di callback async alih-alih updater.',
      'Mengirim pemanggilan yang mahal (`useState(parse(big))`) alih-alih fungsi initializer.',
      'Beberapa boolean yang bisa saling bertentangan alih-alih satu union status.',
      'Menyimpan salinan objek yang dipilih alih-alih id-nya.',
    ],
    exercise: {
      task: 'Tebak nilai akhir `score` setelah satu klik, lalu tulis ulang supaya hasilnya 6:\n\n```tsx\nconst [score, setScore] = useState(0)\nfunction onClick() {\n  setScore(score + 1)\n  setScore(s => s + 2)\n  setScore(score + 3)\n}\n```',
      hint: 'Proses antreannya berurutan: nilai biasa menggantikan, fungsi mentransformasi nilai terbaru yang tertunda.',
      solution: `Antrean: ganti dengan 1 → 1 + 2 = 3 → ganti dengan 0 + 3 = 3. Score akhir: **3**.

\`\`\`tsx
function onClick() {
  setScore(s => s + 1)
  setScore(s => s + 2)
  setScore(s => s + 3)
}
\`\`\`

Sekarang hasilnya 0 + 1 + 2 + 3 = 6.`,
    },
    interview: [
      'Kenapa `console.log(count)` tepat setelah `setCount(count + 1)` mencetak nilai lama?',
      'Apa itu batching, dan sejak kapan React mem-batch update di luar event handler?',
      'Bagaimana kamu menyusun state untuk form yang bisa berstatus idle, submitting, berhasil, atau gagal?',
    ],
  },

  sharing: {
    explanation: `Dua komponen sering butuh state yang sama: kotak pencarian dan daftar hasilnya, sekumpulan panel accordion yang hanya boleh terbuka satu, field form dan preview-nya. Jawaban React adalah **lifting state up** (mengangkat state ke atas).

### Lifting state up

1. Hapus state dari child-child-nya.
2. Taruh state di parent bersama terdekat mereka.
3. Kirim nilainya ke bawah sebagai props, dan kirim callback untuk mengubahnya.

Child-child itu menjadi **controlled** oleh parent: mereka me-render apa yang diperintahkan dan melaporkan event. Hasilnya satu sumber kebenaran; kedua child tidak mungkin berbeda pendapat.

Trade-off-nya: mengangkat terlalu tinggi membuat banyak komponen re-render dan mengikat bagian-bagian yang tidak berhubungan. Angkat ke parent bersama yang *terdekat*, dan kalau meneruskan props melewati banyak lapisan mulai menyiksa, pertimbangkan komposisi (mengirim JSX sebagai children) atau context.

### Controlled vs uncontrolled component

Kosakata yang sama berlaku untuk input form:

- **Controlled**: state React adalah sumber kebenarannya. \`value={name}\` ditambah \`onChange={e => setName(e.target.value)}\`. Setiap ketikan melewati React, jadi kamu bisa memvalidasi, mentransformasi (huruf besar, mask), atau menurunkan UI secara langsung.
- **Uncontrolled**: DOM yang menyimpan nilainya. \`defaultValue="..."\` mengatur nilai awal; kamu membacanya saat submit lewat \`FormData\` atau ref.

Tidak ada yang "paling benar". Input controlled cocok untuk validasi langsung, field yang saling bergantung, dan preview instan. Input uncontrolled lebih sederhana dan lebih murah untuk form besar yang hanya kamu baca saat submit, dan secara alami cocok dengan form Actions di React 19: \`<form action={save}>\` menerima \`FormData\` berisi setiap field yang punya name.

### Aturan

- Jangan mengubah input dari controlled ke uncontrolled atau sebaliknya. \`value={undefined}\` membuatnya uncontrolled; inisialisasi dengan \`''\` saja.
- \`value\` tanpa \`onChange\` membuat field read-only (React akan memberi peringatan). Pakai \`readOnly\` atau \`defaultValue\`.
- Checkbox memakai \`checked\`/\`defaultChecked\`, bukan \`value\`.
- \`select\` memakai \`value\` di elemen \`select\`, bukan \`selected\` di option.

### Komponen juga bisa controlled

Komponen buatanmu sendiri bisa mengikuti pola yang sama: komponen \`Tabs\` yang menerima \`activeTab\` dan \`onTabChange\` adalah controlled; yang menyimpan index aktifnya sendiri adalah uncontrolled. Komponen library yang bagus sering mendukung keduanya (controlled saat \`value\` dikirim, selain itu memakai state internal).`,
    examples: [
      {
        title: '❌ state terduplikasi vs ✅ state yang diangkat',
        code: `// ❌ each panel owns "open", so several can be open at once
function PanelBad({ title, children }: PanelProps) {
  const [open, setOpen] = useState(false)
  return <section><button onClick={() => setOpen(!open)}>{title}</button>{open && children}</section>
}

// ✅ parent owns which panel is open; panels are controlled
function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  return faqs.map(f => (
    <Panel
      key={f.id}
      title={f.question}
      isOpen={openId === f.id}
      onToggle={() => setOpenId(id => (id === f.id ? null : f.id))}
    >
      {f.answer}
    </Panel>
  ))
}

function Panel({ title, isOpen, onToggle, children }: { title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section>
      <button aria-expanded={isOpen} onClick={onToggle}>{title}</button>
      {isOpen && <div>{children}</div>}
    </section>
  )
}`,
        note: 'Aturan "hanya satu yang terbuka" melibatkan semua panel, jadi state-nya milik parent mereka. Setiap Panel cukup me-render `isOpen` dan melaporkan klik.',
      },
      {
        title: 'Input controlled dan uncontrolled berdampingan',
        code: `function ShippingForm() {
  // controlled: needed for the live postcode formatting
  const [postcode, setPostcode] = useState('')

  async function save(formData: FormData) {
    await api.saveAddress({
      street: formData.get('street'), // uncontrolled, read on submit
      postcode,
    })
  }

  return (
    <form action={save}>
      <input name="street" defaultValue="" />
      <input value={postcode} onChange={e => setPostcode(e.target.value.toUpperCase().replace(/\\s+/g, ''))} />
      <button>Save</button>
    </form>
  )
}`,
        note: 'Campur saja dengan bebas: jadikan controlled hanya field yang perlu bereaksi di setiap ketikan; sisanya biarkan di DOM dan baca lewat FormData.',
      },
    ],
    realCase: {
      title: 'Preview harga yang selalu tertinggal satu ketikan',
      story: `Sebuah toko print-on-demand punya input jumlah dan preview harga langsung yang posisinya bersaudara. Input menyimpan state-nya sendiri dan memanggil \`onQuantityChange\` dari effect setelah setiap perubahan, lalu parent menyalinnya ke state-nya sendiri untuk preview. Pengguna melihat harga untuk jumlah sebelumnya, dan sesekali checkout dengan total yang salah.

Dua salinan state yang sama yang disinkronkan lewat effect menyebabkan satu siklus render tambahan dan race. Mengangkat \`quantity\` ke parent dan menjadikan input-nya controlled menghapus effect itu sekaligus lag-nya. Pelajarannya: kalau dua komponen butuh nilai yang sama, simpan satu salinan di parent bersama mereka; jangan menyinkronkan salinan.`,
    },
    pitfalls: [
      'Menyimpan salinan state yang sama di komponen bersaudara dan menyinkronkannya dengan effect.',
      'Memulai input controlled dengan `undefined` lalu berubah jadi string, sehingga memicu peringatan controlled/uncontrolled.',
      'Memberi `value` tanpa `onChange`.',
      'Mengangkat state jauh lebih tinggi dari yang dibutuhkan, menyebabkan re-render besar-besaran.',
    ],
    exercise: {
      task: 'Buat konverter suhu dengan dua input, Celsius dan Fahrenheit. Mengetik di salah satunya memperbarui yang lain. Hanya boleh ada satu state.',
      hint: 'Simpan nilai persis seperti yang diketik beserta skala tempat ia diketik; turunkan yang lainnya.',
      solution: `\`\`\`tsx
type Scale = 'c' | 'f'
const toC = (f: number) => ((f - 32) * 5) / 9
const toF = (c: number) => (c * 9) / 5 + 32
const convert = (v: string, fn: (n: number) => number) =>
  v === '' || Number.isNaN(Number(v)) ? '' : String(Math.round(fn(Number(v)) * 10) / 10)

export function Converter() {
  const [input, setInput] = useState<{ scale: Scale; value: string }>({ scale: 'c', value: '' })
  const celsius = input.scale === 'c' ? input.value : convert(input.value, toC)
  const fahrenheit = input.scale === 'f' ? input.value : convert(input.value, toF)

  return (
    <>
      <label>°C <input value={celsius} onChange={e => setInput({ scale: 'c', value: e.target.value })} /></label>
      <label>°F <input value={fahrenheit} onChange={e => setInput({ scale: 'f', value: e.target.value })} /></label>
    </>
  )
}
\`\`\`

Menyimpan string mentahnya menjaga apa yang diketik pengguna tetap persis sama; field lainnya diturunkan.`,
    },
    interview: [
      'Apa arti lifting state up, dan apa biayanya?',
      'Bandingkan input controlled dan uncontrolled. Kapan kamu memilih masing-masing?',
      'Bagaimana kamu mendesain komponen yang bisa controlled sekaligus uncontrolled?',
    ],
  },

  preserve: {
    explanation: `State tidak tinggal "di dalam" fungsi komponenmu. React menyimpannya di pohon yang ia bangun dari element-element-mu, dan mengikatnya ke sebuah **posisi** di pohon itu. Memahami hal ini menjelaskan state yang tiba-tiba ter-reset maupun state yang tiba-tiba bertahan.

### Aturannya

Saat reconciliation, React membandingkan pohon element yang baru dengan yang sebelumnya:

- **Tipe sama di posisi yang sama** (dan key sama) → React mempertahankan instance komponen yang ada beserta state-nya, lalu memperbarui props-nya.
- **Tipe berbeda** di posisi itu (\`<Input>\` diganti \`<Select>\`, atau \`div\` diganti \`section\`) → React meng-unmount subtree lama (state dihancurkan) dan me-mount yang baru.
- **Key berbeda** → dianggap komponen berbeda walaupun tipenya sama: unmount lalu mount ulang.

"Posisi" berarti tempat di antara children milik parent, bukan baris JSX. \`{isAdmin ? <Profile user={a} /> : <Profile user={b} />}\` me-render \`Profile\` di posisi yang sama di kedua cabang, jadi state-nya *dipertahankan* saat berpindah.

### Pertahanan state yang mengejutkan

Sebuah aplikasi chat me-render \`<Chat contact={selected} />\`. Berpindah kontak hanya mengubah prop-nya; komponennya tetap ter-mount, jadi draf yang setengah diketik ikut terbawa ke orang berikutnya. Salah!

### Reset dengan key

\`<Chat key={selected.id} contact={selected} />\` memberi tahu React bahwa setiap kontak punya instance sendiri. Mengubah key akan meng-unmount instance lama dan me-mount instance baru dengan state awal. Inilah cara idiomatis untuk me-reset form saat mengedit record lain, jauh lebih bersih daripada effect yang me-reset field saat id berubah.

### Reset yang mengejutkan

- Mendefinisikan komponen **di dalam komponen lain** (\`function Parent() { function Row() {...} }\`) membuat tipe fungsi baru di setiap render. React melihat tipe yang berbeda setiap kali, jadi child di-mount ulang di setiap render parent, kehilangan state dan focus. Selalu definisikan komponen di level module.
- Membungkus elemen secara kondisional dengan container yang berbeda (\`isMobile ? <div><Form/></div> : <Form/>\`) mengubah jalur di pohon, sehingga \`Form\` ter-reset.

### Mempertahankan state untuk hal yang disembunyikan

Kalau kamu butuh state tetap bertahan saat komponen disembunyikan (misalnya tab), pilihannya: biarkan tetap ter-mount dan sembunyikan dengan CSS, angkat state-nya ke atas, atau pakai komponen \`Activity\` dari React (React 19.2), yang menyembunyikan subtree sambil mempertahankan state-nya.

### Kenapa React bekerja seperti ini

Mencocokkan berdasarkan posisi dan tipe itu cepat (heuristik O(n), bukan diff pohon yang mahal) dan mudah diprediksi. Key adalah caramu memberi React informasi identitas tambahan saat posisi saja tidak cukup.`,
    examples: [
      {
        title: '❌ draf bocor antar kontak vs ✅ reset dengan key',
        code: `function Messenger({ contacts }: { contacts: Contact[] }) {
  const [selected, setSelected] = useState(contacts[0])
  return (
    <div className="messenger">
      <ContactList contacts={contacts} selectedId={selected.id} onSelect={setSelected} />
      {/* ❌ same position, same type: draft state is preserved when switching */}
      {/* <ChatPanel contact={selected} /> */}

      {/* ✅ a new key per contact gives each its own fresh state */}
      <ChatPanel key={selected.id} contact={selected} />
    </div>
  )
}

function ChatPanel({ contact }: { contact: Contact }) {
  const [draft, setDraft] = useState('')
  return <textarea placeholder={\`Message \${contact.name}\`} value={draft} onChange={e => setDraft(e.target.value)} />
}`,
        note: 'Tanpa key, React melihat `ChatPanel` yang sama di tempat yang sama dan hanya menukar props-nya. Key membuat identitasnya eksplisit.',
      },
      {
        title: '❌ komponen yang didefinisikan di dalam komponen',
        code: `function UserTable({ users }: { users: User[] }) {
  // ❌ a new Row type on every UserTable render: rows remount, inputs lose focus
  function Row({ user }: { user: User }) {
    const [editing, setEditing] = useState(false)
    return <tr onClick={() => setEditing(true)}><td>{editing ? <input defaultValue={user.name} /> : user.name}</td></tr>
  }
  return <table><tbody>{users.map(u => <Row key={u.id} user={u} />)}</tbody></table>
}

// ✅ define Row at module level and pass what it needs as props`,
        note: 'Identitas komponen adalah referensi fungsinya. Fungsi yang dibuat ulang adalah tipe yang berbeda, jadi React membuang subtree lama di setiap render.',
      },
    ],
    realCase: {
      title: 'Mengedit satu pelanggan, yang tersimpan pelanggan lain',
      story: `Panel samping sebuah CRM menampilkan form edit untuk pelanggan yang dipilih. Form itu menginisialisasi field-nya dengan \`useState(customer.email)\`. Saat seorang sales mengklik pelanggan lain, header-nya berubah tapi field-nya masih menampilkan email pelanggan sebelumnya; menyimpan form akan menulis email itu ke pelanggan yang baru.

Perbaikan pertama tim adalah effect yang me-reset setiap field saat \`customer.id\` berubah, yang menimbulkan kilasan data basi. Perbaikan akhirnya adalah \`<CustomerForm key={customer.id} customer={customer} />\`: satu baris, tanpa effect, tanpa kilasan. Pelajarannya: kalau sebuah komponen harus mulai dari awal untuk entitas yang berbeda, beri key yang diturunkan dari entitas tersebut.`,
    },
    pitfalls: [
      'Berharap state ter-reset padahal hanya props yang berubah.',
      'Memakai effect untuk me-reset state saat id berubah alih-alih `key`.',
      'Mendefinisikan komponen di dalam komponen lain.',
      'Membungkus elemen secara kondisional dengan container berbeda, sehingga state-nya ter-reset tanpa sengaja.',
      'Mengira state bertahan saat komponen dihapus lalu ditambahkan lagi.',
    ],
    exercise: {
      task: 'Buat `Scoreboard` yang menampilkan counter dua pemain dengan toggle "Show Alice / Show Bob". Pertama, render satu `<Counter person={...} />` dan amati bahwa hitungannya ikut terbawa saat berpindah. Lalu buat setiap pemain menyimpan skornya sendiri secara independen, dengan dua teknik berbeda.',
      hint: 'Teknik 1: posisi yang berbeda. Teknik 2: key. Catatan: perpindahan dengan key me-reset skor, posisi terpisah hanya menjaga keduanya tetap ter-mount kalau keduanya di-render.',
      solution: `\`\`\`tsx
function Scoreboard() {
  const [isAlice, setIsAlice] = useState(true)
  return (
    <>
      {/* Technique 1: different positions, each its own state (resets when unmounted) */}
      {isAlice && <Counter person="Alice" />}
      {!isAlice && <Counter person="Bob" />}

      {/* Technique 2: same position, different keys */}
      <Counter key={isAlice ? 'alice' : 'bob'} person={isAlice ? 'Alice' : 'Bob'} />

      <button onClick={() => setIsAlice(a => !a)}>Switch</button>
    </>
  )
}
\`\`\`

Kedua teknik memberi setiap pemain state terpisah, tapi me-reset-nya saat berpindah. Untuk mempertahankan kedua skor saat berpindah, angkat skornya ke atas (\`{ alice: 0, bob: 0 }\` di \`Scoreboard\`) atau biarkan keduanya ter-mount dan sembunyikan salah satunya.`,
    },
    interview: [
      'Bagaimana React memutuskan untuk mempertahankan atau me-reset state sebuah komponen di antara render?',
      'Kenapa memakai `key` untuk me-reset form lebih baik daripada effect?',
      'Kenapa kamu tidak boleh mendefinisikan komponen di dalam komponen lain?',
    ],
  },
}

export default details
