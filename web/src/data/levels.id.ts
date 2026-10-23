import type { LevelsId } from '../i18n/content'

export const LEVELS_ID: LevelsId = {
  0: {
    title: 'Fondasi JavaScript & Web',
    tagline: 'React itu pada dasarnya JavaScript. Kuasai bahasanya sampai terasa ringan.',
    checkpoint: 'Kamu bisa menjelaskan closure dan event loop, dan bisa menulis transformasi map/filter/reduce tanpa perlu mencari referensi.',
    topics: {
      'modern-syntax': {
        title: 'Sintaks modern',
        body: `Kamu akan membaca dan menulis ini setiap hari di kode React:

- \`const\`/\`let\` sebagai pengganti \`var\` (block scope, tidak ada kejutan di dalam loop)
- arrow function, template literal, default parameter
- destructuring: \`const { name, age = 0 } = user\`
- spread/rest: \`{ ...user, age: 31 }\`, \`[...items, next]\`
- optional chaining \`user?.address?.city\` dan nullish coalescing \`value ?? 'default'\`
- ES module: named export vs default export

**Kenapa ini penting:** hampir setiap update state di React memakai spread untuk membuat objek atau array yang *baru*.`,
      },
      arrays: {
        title: 'Method array',
        body: `List di JSX dibangun dengan \`map\`, tampilan yang difilter dengan \`filter\`, dan total dengan \`reduce\`. Pelajari method mana yang **memutasi** (\`push\`, \`splice\`, \`sort\`, \`reverse\`) beserta pasangannya yang tidak memutasi (\`concat\`/spread, \`slice\`/\`toSpliced\`, \`toSorted\`, \`toReversed\`).

\`\`\`js
const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
const visible = todos.filter(t => !t.done).map(t => t.title)
\`\`\``,
      },
      immutability: {
        title: 'Immutability',
        body: `React memutuskan perlu re-render atau tidak dengan membandingkan **reference**. Kalau kamu memutasi objek secara langsung, reference-nya tetap sama dan React bisa saja melewatkan update tersebut.

- Update objek dengan spread: \`{ ...state, done: true }\`
- Update data bersarang level demi level: \`{ ...user, address: { ...user.address, city } }\`
- Update array dengan \`map\` (mengganti), \`filter\` (menghapus), spread (menambah)
- \`structuredClone\` melakukan deep copy kalau kamu memang benar-benar butuh`,
      },
      references: {
        title: 'Reference vs value',
        body: `Primitif (number, string, boolean) dibandingkan berdasarkan nilai. Objek, array, dan fungsi dibandingkan berdasarkan **reference** — dua objek yang dibuat terpisah tidak akan pernah \`===\`, meskipun isinya identik.

Banyak perilaku React berawal dari sini: dependency array, \`memo\`, dan context semuanya membandingkan dengan \`Object.is\`. Objek baru atau arrow function yang dibuat saat render adalah *reference baru di setiap render*.`,
      },
      closures: {
        title: 'Closure & scope',
        body: `Closure adalah fungsi yang mengingat variabel dari scope tempat ia **dibuat**. Setiap render komponen React membuat closure baru yang menangkap props dan state milik *render itu*.

Itulah sebabnya \`setTimeout\` yang dimulai di render lama tetap melihat state lama — kasus klasik **stale closure**. Kalau kamu paham ini, hook akan terasa logis, bukan seperti sulap.`,
      },
      async: {
        title: 'Async: event loop, Promise, fetch',
        body: `JavaScript berjalan di satu thread. **Event loop** menjalankan call stack sampai habis, lalu mengosongkan **semua microtask** (callback Promise, \`queueMicrotask\`), lalu mengambil **satu macrotask** (timer, I/O, event), lalu mengulang lagi.

Pelajari \`async\`/\`await\`, \`try/catch\` di sekitar await, \`Promise.all\` untuk pekerjaan paralel, dan \`AbortController\` untuk membatalkan request — kamu akan butuh pembatalan di setiap hook data fetching.`,
      },
      'dom-events': {
        title: 'DOM & event',
        body: `Event **bubble** dari target naik sampai ke root. React memasang satu listener di root dan men-dispatch synthetic event, tapi model mentalnya tetap sama: \`stopPropagation\` menghentikan bubbling, \`preventDefault\` menghentikan aksi default browser (misalnya submit form yang me-reload halaman).`,
      },
      'html-css': {
        title: 'HTML & CSS',
        body: `HTML semantik (\`button\`, \`nav\`, \`main\`, \`label\`) memberimu aksesibilitas secara gratis. Biasakan diri dengan **Flexbox**, **Grid**, unit responsif, media query, dan CSS custom properties (variabel) — semua pendekatan styling di React dibangun di atasnya.`,
      },
    },
    projects: [
      {
        title: 'Todo dengan Vanilla JS',
        summary: 'Bangun aplikasi todo tanpa framework, supaya kamu merasakan sendiri repotnya hal-hal yang dihilangkan React.',
        tasks: [
          'Tambah, toggle, dan hapus todo',
          'Filter: semua / aktif / selesai',
          'Simpan ke localStorage dan pulihkan saat halaman dimuat',
          'Jaga DOM tetap sinkron dengan array data secara manual',
          'Tulis NOTES.md: apa yang bikin repot saat meng-update DOM secara manual?',
        ],
      },
    ],
  },
  1: {
    title: 'Dasar-Dasar React',
    tagline: 'Component, props, state, dan cara berpikir ala React.',
    checkpoint: 'Kamu bisa menjelaskan apa yang memicu re-render, kenapa memutasi state tidak berhasil, dan apa fungsi key.',
    topics: {
      setup: {
        title: 'Setup: Vite, React Compiler, ESLint',
        body: `Buat proyek dengan \`npm create vite@latest\` (React + TypeScript). Aktifkan **React Compiler** (react.dev → React Compiler → Installation) supaya memoization berjalan otomatis, dan biarkan \`eslint-plugin-react-hooks\` tetap aktif — setiap warning-nya adalah pelajaran. Tulis TypeScript secara *longgar* dulu sampai Level 3.`,
      },
      thinking: {
        title: 'Berpikir ala React',
        body: `Mulai dari sebuah mockup:

- Pecah UI menjadi **hierarki component** (satu component = satu tanggung jawab)
- Bangun versi statis dengan props saja
- Temukan state yang **minimal** (apa pun yang bisa diturunkan bukanlah state)
- Tentukan **di mana** setiap state disimpan: di parent bersama terdekat dari semua component yang membutuhkannya
- Tambahkan aliran data terbalik (oper setter/handler ke bawah)`,
      },
      jsx: {
        title: 'JSX',
        body: `JSX adalah syntax sugar untuk pemanggilan fungsi yang menghasilkan objek element. Pakai \`{}\` untuk menyisipkan **ekspresi** JS apa pun (bukan statement). Pakai \`className\`, tutup setiap tag, dan bungkus elemen-elemen sejajar dengan fragment \`<>...</>\`.`,
      },
      props: {
        title: 'Component & props',
        body: `Component adalah fungsi yang menerima **props** dan mengembalikan UI. Props bersifat read-only — sebuah component tidak boleh mengubahnya. \`children\` hanyalah prop yang berisi apa pun yang kamu sarangkan di dalam component, dan itulah kunci dari komposisi.`,
      },
      conditional: {
        title: 'Conditional rendering & list',
        body: `Pakai \`if\` dengan early return, ternary, atau \`&&\`. Hati-hati: \`{count && <Badge/>}\` akan me-render **0** saat \`count\` bernilai 0 — pakai \`count > 0 &&\`.

Render list dengan \`map\` dan beri setiap item \`key\` yang stabil dan unik — biasanya ID dari datamu, **bukan** index array.`,
      },
      purity: {
        title: 'Purity & StrictMode',
        body: `Rendering harus **pure**: input yang sama → JSX yang sama, dan tidak ada side effect (tidak memutasi variabel di luar, tidak fetch, tidak subscribe) selama render. \`StrictMode\` me-render component dua kali saat development untuk memunculkan kode yang tidak pure.`,
      },
      state: {
        title: 'State sebagai snapshot',
        body: `\`useState\` memberimu nilai **untuk render ini**. Memanggil \`setCount(count + 1)\` tidak mengubah \`count\` di render saat ini — ia menjadwalkan render baru. Beberapa update dalam satu event akan di-**batch**.

Pakai updater \`setCount(c => c + 1)\` kalau state berikutnya bergantung pada state sebelumnya.`,
      },
      sharing: {
        title: 'Berbagi state, controlled input',
        body: `Kalau dua component butuh state yang sama, **angkat state itu ke atas** (lift state up) ke parent bersama terdekatnya, lalu oper ke bawah. Input **controlled** mengambil nilainya dari state (\`value\` + \`onChange\`); input uncontrolled menyimpan nilainya sendiri di DOM (\`defaultValue\` + ref).`,
      },
      preserve: {
        title: 'Mempertahankan & me-reset state',
        body: `React mengikat state ke **posisi component di dalam tree**. Component yang sama di posisi yang sama → state dipertahankan. Tipe berbeda atau \`key\` berbeda → state di-reset. Mengganti \`key\` adalah cara idiomatis untuk me-reset sebuah component (misalnya form saat berganti user).`,
      },
    },
    projects: [
      {
        title: 'Tic-Tac-Toe',
        summary: 'Tutorial dari react.dev — lalu kembangkan sendiri.',
        tasks: [
          'Selesaikan tutorial resminya',
          'Tampilkan "You are at move #N" untuk langkah saat ini',
          'Render papan dengan dua loop, bukan kotak-kotak yang ditulis manual',
          'Toggle urutan daftar langkah naik/turun',
          'Sorot tiga kotak yang menjadi pemenang',
          'Tampilkan (baris, kolom) untuk setiap langkah di riwayat',
        ],
      },
      {
        title: 'Tabel Produk yang Bisa Difilter',
        summary: 'Bangun ulang contoh "Thinking in React" dari nol.',
        tasks: [
          'Gambar hierarki component di kertas dulu',
          'Bangun versi statis dengan props saja',
          'Identifikasi state minimal dan di mana ia disimpan',
          'Tambahkan kotak pencarian dan filter "hanya yang tersedia"',
        ],
      },
    ],
  },
  2: {
    title: 'Hook Secara Mendalam',
    tagline: 'Effect, ref, reducer, context, dan custom hook.',
    checkpoint: 'Kamu bisa menjelaskan kenapa setiap dependency effect ada di sana, dan kamu sudah membuang semua effect yang tidak perlu.',
    topics: {
      'use-effect': {
        title: 'useEffect: sinkronisasi',
        body: `Effect dipakai untuk **menyinkronkan komponen dengan sistem eksternal**: jaringan, subscription, timer, API browser, widget non-React. Effect berjalan *setelah* commit. Cleanup berjalan sebelum effect berikutnya dan saat unmount.

Dependency array bukan pilihan — isinya wajib mencantumkan setiap nilai reaktif yang dibaca effect. Kalau itu membuat effect jalan terlalu sering, ubah kodenya, bukan array-nya.`,
      },
      'no-effect': {
        title: 'Mungkin kamu tidak butuh effect',
        body: `Ini kesalahan React yang paling umum. Kamu **tidak** butuh effect untuk:

- menghitung nilai dari props/state → hitung saat render
- me-reset state saat sebuah prop berubah → pakai \`key\`
- merespons aksi pengguna → lakukan di event handler
- memberi tahu parent → panggil callback-nya di event handler
- meng-cache komputasi yang berat → \`useMemo\` (atau serahkan ke compiler)`,
      },
      'use-ref': {
        title: 'useRef',
        body: `Ref adalah kotak mutable \`{ current }\` yang bertahan antar render **tanpa** memicu render. Pakai untuk node DOM (focus, mengukur, scroll) dan untuk nilai yang tidak memengaruhi output (ID interval, nilai sebelumnya). Jangan baca atau tulis \`ref.current\` selama render.`,
      },
      'use-reducer': {
        title: 'useReducer',
        body: `Kalau state punya banyak transisi, pindahkan logikanya ke **reducer** yang pure \`(state, action) => newState\`. Modelkan action sebagai discriminated union. Reducer sangat mudah di-unit test dan membuat transisi yang mustahil jadi terlihat jelas.`,
      },
      'use-context': {
        title: 'useContext',
        body: `Context mengoper data jauh ke dalam tree tanpa prop drilling. Setiap component yang membaca sebuah context akan re-render saat value-nya berubah, jadi jaga value tetap stabil dan pisahkan data yang tidak berkaitan ke context yang berbeda.`,
      },
      'memo-hooks': {
        title: 'useMemo, useCallback, memo',
        body: `Ketiganya meng-cache sebuah nilai, fungsi, atau hasil render component di antara render. Dengan **React Compiler**, kamu jarang perlu menulisnya sendiri. Pelajari tetap, supaya bisa membaca kode yang sudah ada dan untuk kasus yang tidak bisa dioptimasi compiler.`,
      },
      'react19-hooks': {
        title: 'Hook React 19',
        body: `- \`use(promise | context)\` — membaca sebuah resource, suspend sampai siap
- \`useActionState\` — state yang digerakkan oleh form action async
- \`useFormStatus\` — status pending dari form parent
- \`useOptimistic\` — menampilkan hasil yang diharapkan sebelum server mengonfirmasi
- \`useTransition\` / \`useDeferredValue\` — menjaga UI tetap responsif saat ada update yang berat`,
      },
      rules: {
        title: 'Rules of Hooks & custom hook',
        body: `Panggil hook di top level, dengan urutan yang sama, di setiap render (jangan pernah di dalam kondisi atau loop). React menyimpan state hook **berdasarkan urutan pemanggilan**.

Custom hook (\`useSomething\`) mengekstrak *logika* stateful yang bisa dipakai ulang. Dua component yang memakai custom hook yang sama mendapat state yang **independen**.`,
      },
    },
    projects: [
      {
        title: 'Pencarian Cuaca',
        summary: 'Aplikasi pencarian yang memakai API gratis Open-Meteo.',
        tasks: [
          'Input pencarian dengan debounce memakai hook useDebounce buatanmu sendiri',
          'Hook useFetch buatanmu sendiri: state loading / error / data',
          'Batalkan request usang dengan AbortController (tanpa race condition)',
          'Pencarian terakhir lewat custom hook useLocalStorage',
          'Toggle °C/°F dengan nilai konversi yang diturunkan saat render',
        ],
      },
    ],
  },
  3: {
    title: 'TypeScript dengan React',
    tagline: 'Buat state yang mustahil tidak bisa direpresentasikan.',
    checkpoint: 'tsc lolos dalam strict mode, tidak ada satu pun `any`, dan state UI yang mustahil tidak bisa diekspresikan lewat tipe-tipemu.',
    topics: {
      'ts-basics': {
        title: 'Esensi TypeScript',
        body: `Pahami union, literal type, generic, \`unknown\` vs \`any\`, narrowing (\`typeof\`, \`in\`, discriminant), dan utility type (\`Partial\`, \`Pick\`, \`Omit\`, \`Record\`). Aktifkan \`strict\` dan \`noUncheckedIndexedAccess\`.`,
      },
      'typing-components': {
        title: 'Memberi tipe pada component',
        body: `Beri tipe props dengan type alias; \`children\` bertipe \`React.ReactNode\`. Beri tipe event dengan \`React.ChangeEvent<HTMLInputElement>\` dan sejenisnya. Perluas elemen native dengan \`ComponentProps<'button'>\` supaya Button-mu menerima semua prop button yang biasa.`,
      },
      discriminated: {
        title: 'Discriminated union untuk state UI',
        body: `Tiga boolean (\`isLoading\`, \`isError\`, \`data\`) memungkinkan 8 kombinasi, dan sebagian besar tidak masuk akal. Union hanya mengizinkan state yang valid:

\`\`\`ts
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: City[] }
\`\`\``,
      },
      'generic-components': {
        title: 'Generic component',
        body: `\`<Select<T>>\` atau \`<List<T>>\` bisa sepenuhnya type-safe: tipe \`items\` menentukan tipe argumen \`onSelect\`. Generic component inilah yang membuat library bagus terasa "ajaib".`,
      },
      zod: {
        title: 'Validasi runtime dengan Zod',
        body: `Tipe TypeScript hilang saat runtime. Data dari API, localStorage, atau URL bertipe \`unknown\` sampai **divalidasi**. Definisikan schema Zod, parse di batas (boundary) aplikasi, dan infer tipe TS dari schema tersebut supaya keduanya tidak pernah berbeda.`,
      },
    },
    projects: [
      {
        title: 'Aplikasi Cuaca Bertipe',
        summary: 'Konversi aplikasi Level 2 milikmu ke TypeScript strict.',
        tasks: [
          'Aktifkan strict dan noUncheckedIndexedAccess',
          'Hapus semua `any`',
          'Modelkan state fetch sebagai discriminated union',
          'Validasi respons API dengan Zod',
        ],
      },
    ],
  },
  4: {
    title: 'Routing, Form & Data Fetching',
    tagline: 'Aplikasi multi-halaman sungguhan dengan API sungguhan.',
    checkpoint: 'Me-refresh halaman mana pun tetap mempertahankan state-nya (dari URL), tombol back berfungsi, dan kamu bisa menjelaskan setiap request waterfall.',
    topics: {
      routing: {
        title: 'Routing',
        body: `Pelajari **React Router** (atau TanStack Router untuk type-safety): nested route dan layout, params, **search params sebagai state**, loader/action, halaman 404, protected route, dan lazy route. Kalau sebuah state UI perlu bertahan setelah refresh atau bisa dibagikan, taruh di URL.`,
      },
      'server-state': {
        title: 'Server state vs client state',
        body: `Server state adalah **cache** dari data milik pihak lain: bisa usang, dipakai bersama, dan perlu di-refetch. Client state (modal sedang terbuka, sebuah draft) adalah milikmu. Tangani keduanya dengan tool yang berbeda.`,
      },
      'tanstack-query': {
        title: 'TanStack Query',
        body: `Query key mengidentifikasi data yang di-cache. \`staleTime\` = berapa lama data dianggap fresh; \`gcTime\` = berapa lama data yang tidak dipakai tetap di memori. Mutation + **invalidation** me-refetch query yang terdampak. Pelajari optimistic update, pagination, infinite query, dan prefetching.`,
      },
      forms: {
        title: 'Form',
        body: `Bangun satu form secara manual dulu (values, errors, touched, status submit). Setelah itu pakai **React Hook Form + Zod**, dan pelajari **Actions** di React 19 dengan \`useActionState\` dan \`useFormStatus\`.`,
      },
      'forms-a11y': {
        title: 'Form yang aksesibel',
        body: `Setiap input butuh \`<label>\`. Hubungkan pesan error dengan \`aria-describedby\` dan tandai field yang tidak valid dengan \`aria-invalid\`. Saat submit gagal, pindahkan focus ke field pertama yang tidak valid.`,
      },
      auth: {
        title: 'Auth di sisi client',
        body: `Simpan token session di cookie **httpOnly, Secure, SameSite** yang di-set oleh server — JavaScript (dan karenanya XSS) tidak bisa membacanya. Token di \`localStorage\` bisa dibaca oleh script apa pun yang disusupkan. Setelah login, arahkan pengguna kembali ke halaman yang tadinya ingin ia buka.`,
      },
    },
    projects: [
      {
        title: 'Aplikasi Katalog',
        summary: 'Katalog film/buku — atau frontend untuk Rust Tasks API milikmu.',
        tasks: [
          'Halaman daftar dengan pencarian, filter, dan pagination yang disimpan di URL',
          'Halaman detail dengan nested route berupa tab',
          'Favorit dengan optimistic update',
          'Form login dan protected route',
          'Form tambah/edit dengan validasi',
          'Skeleton loading, state error, dan state kosong di setiap halaman',
        ],
      },
    ],
  },
  5: {
    title: 'State Management & Arsitektur',
    tagline: 'Taruh setiap state di tempat yang tepat.',
    checkpoint: 'Kamu bisa memberi alasan kenapa setiap state di aplikasimu disimpan di tempatnya sekarang.',
    topics: {
      placement: {
        title: 'Di mana state sebaiknya disimpan',
        body: `Dari yang paling dekat sampai paling luas: **local → lifted → URL → context → external store → server cache**. Selalu pilih level terdekat yang sudah cukup. Kebanyakan "masalah state management" muncul karena state disimpan terlalu tinggi.`,
      },
      'context-perf': {
        title: 'Performa context',
        body: `Setiap consumer re-render saat value context berubah. Pisahkan value yang tidak berkaitan ke context berbeda, pisahkan state dari dispatch, dan jaga value dari provider tetap stabil.`,
      },
      stores: {
        title: 'External store',
        body: `Pelajari **Zustand** secara mendalam: API-nya kecil, dan selector mencegah re-render yang tidak perlu. Pelajari **Redux Toolkit** secukupnya untuk codebase enterprise (slice, selector, RTK Query).`,
      },
      jotai: {
        title: 'Atomic state (Jotai)',
        body: `State berupa atom-atom kecil yang independen, dan setiap component subscribe ke atom secara individual. Cocok untuk state UI yang sangat saling terhubung, seperti editor.`,
      },
      xstate: {
        title: 'State machine (XState)',
        body: `Modelkan alur sebagai state dan transisi yang eksplisit (wizard, checkout, media player). Transisi yang mustahil memang tidak ada sama sekali.`,
      },
      structure: {
        title: 'Struktur berbasis fitur',
        body: `Organisasikan berdasarkan **fitur** (\`features/cart\`, \`features/auth\`), bukan berdasarkan jenis file. Setiap fitur mengekspos \`index.ts\` publik. UI bersama tidak pernah meng-import dari fitur — tegakkan batas ini dengan aturan lint.`,
      },
    },
    projects: [
      {
        title: 'Toko E-commerce',
        summary: 'Katalog, keranjang, dan checkout memakai DummyJSON atau FakeStore.',
        tasks: [
          'Katalog produk dengan TanStack Query',
          'Keranjang dengan Zustand, disimpan ke storage',
          'Checkout multi-langkah yang dimodelkan sebagai state machine (useReducer atau XState)',
          'Filter yang disimpan di URL',
          'Folder berbasis fitur dengan batas yang ditegakkan lint',
          'Tulis ulang keranjang dengan Redux Toolkit di sebuah branch, lalu bandingkan di NOTES.md',
        ],
      },
    ],
  },
  6: {
    title: 'Styling & Desain Component',
    tagline: 'Rancang API yang disukai developer lain — dan aksesibel sejak awal.',
    checkpoint: 'Setiap component di design system-mu bisa dipakai hanya dengan keyboard dan lolos pengecekan axe.',
    topics: {
      styling: {
        title: 'Pendekatan styling',
        body: `CSS Modules (ter-scope, tanpa runtime), **Tailwind** (utility-first, sangat populer), CSS-in-JS zero-runtime (vanilla-extract). CSS-in-JS berbasis runtime mulai ditinggalkan karena tidak cocok dengan Server Components dan memakan waktu render.`,
      },
      tokens: {
        title: 'Design token & theming',
        body: `Definisikan warna, spacing, radius, dan tipografi sebagai CSS custom properties. Theme hanyalah nilai token yang berbeda — dark mode jadi sekadar menukar variabel.`,
      },
      'api-design': {
        title: 'Desain API component',
        body: `- **Komposisi** lebih baik daripada konfigurasi: terima \`children\` alih-alih 30 prop
- **Compound component**: \`<Tabs><Tabs.List/><Tabs.Panel/></Tabs>\` yang berbagi state lewat context
- Dukung pemakaian **controlled dan uncontrolled** (\`value\` / \`defaultValue\`)
- **Polimorfisme** lewat \`as\` atau \`asChild\`
- Di React 19, \`ref\` adalah prop biasa — tidak perlu forwardRef lagi`,
      },
      headless: {
        title: 'Headless UI',
        body: `**Radix UI** dan **React Aria** memberimu perilaku dan aksesibilitas tanpa style. **shadcn/ui** menyalin component Radix yang sudah di-style ke dalam codebase-mu, sehingga sepenuhnya jadi milikmu.`,
      },
      a11y: {
        title: 'Aksesibilitas secara mendalam',
        body: `Utamakan HTML semantik; pakai ARIA hanya kalau tidak ada elemen native yang cocok. Setiap elemen interaktif harus bisa dijangkau dan dioperasikan dengan keyboard, punya style focus yang terlihat, dan punya accessible name. Dialog menjebak focus dan mengembalikannya saat ditutup. Tes dengan screen reader (NVDA di Windows) dan ikuti WAI-ARIA Authoring Practices.`,
      },
      animation: {
        title: 'Animasi',
        body: `CSS transition untuk kasus sederhana, **Motion** untuk animasi kompleks/layout, View Transitions API untuk transisi halaman. Selalu hormati \`prefers-reduced-motion\`.`,
      },
      storybook: {
        title: 'Storybook',
        body: `Kembangkan component secara terisolasi, dokumentasikan setiap state-nya, dan jalankan test aksesibilitas serta interaksi untuk setiap story.`,
      },
    },
    projects: [
      {
        title: 'Mini Design System',
        summary: 'Bangun, dokumentasikan, dan tes library component milikmu sendiri.',
        tasks: [
          'Button, Input, Select, Checkbox',
          'Dialog, Tabs, dan Menu yang dibangun TANPA library headless',
          'Tooltip dan Toast',
          'DataTable dengan sorting, pagination, dan pemilihan baris',
          'Tes semuanya hanya dengan keyboard dan NVDA',
          'Bandingkan Dialog/Menu-mu dengan Radix dan catat apa saja yang terlewat',
          'Dokumentasikan di Storybook dengan toggle light/dark',
        ],
      },
    ],
  },
  7: {
    title: 'Testing',
    tagline: 'Test yang menangkap bug dan tetap bertahan saat refactor.',
    checkpoint: 'Kamu bisa me-refactor bagian internal sebuah component tanpa merusak test, dan test gagal saat perilakunya rusak.',
    topics: {
      trophy: {
        title: 'Testing trophy',
        body: `Pengecekan statis (TypeScript, ESLint) di dasar, sedikit unit test, **sebagian besar integration test**, dan segelintir end-to-end test. Integration test memberi tingkat keyakinan paling tinggi untuk setiap menit yang kamu habiskan.`,
      },
      vitest: {
        title: 'Vitest',
        body: `Test runner yang cepat dan native untuk Vite, dengan API yang kompatibel dengan Jest. Pakai untuk logika murni (reducer, formatter, validasi) dan untuk menjalankan test component.`,
      },
      rtl: {
        title: 'React Testing Library',
        body: `Tes apa yang dilihat dan dilakukan pengguna. Query berdasarkan **role** dan **label** (\`getByRole('button', { name: /save/i })\`), berinteraksi dengan \`user-event\`, dan tunggu dengan \`findBy*\`. Jangan pernah melakukan assert pada variabel state atau method internal.`,
      },
      msw: {
        title: 'Mock Service Worker',
        body: `Mock jaringan di batas HTTP, bukan me-mock \`fetch\` atau hook-mu. Handler yang sama bisa dipakai di test, Storybook, dan browser.`,
      },
      playwright: {
        title: 'E2E dengan Playwright',
        body: `Browser sungguhan, auto-waiting, trace. Cakup alur-alur kritis (signup, checkout). Tambahkan \`@axe-core/playwright\` untuk pengecekan aksesibilitas otomatis.`,
      },
      'what-not': {
        title: 'Apa yang tidak perlu dites',
        body: `Detail implementasi, library pihak ketiga, dan snapshot test raksasa yang tidak pernah dibaca siapa pun. Kalau refactor yang tidak mengubah perilaku membuat sebuah test gagal, berarti test itu sedang mengetes implementasi.`,
      },
    },
    projects: [
      {
        title: 'Tes Toko Online',
        summary: 'Tambahkan test suite lengkap ke aplikasi e-commerce-mu.',
        tasks: [
          'Unit test untuk logika keranjang',
          'Integration test: cari → filter → tambah ke keranjang → jumlahnya ter-update (RTL + MSW)',
          'E2E test untuk checkout dengan Playwright',
          'GitHub Actions yang menjalankan lint, typecheck, dan test di setiap push',
        ],
      },
    ],
  },
  8: {
    title: 'Performa',
    tagline: 'Ukur dulu, baru optimasi — dengan bukti.',
    checkpoint: 'Kamu punya bukti dari profiler untuk setiap optimasi, dan tidak ada memoization manual yang sebenarnya sudah ditangani compiler.',
    topics: {
      measure: {
        title: 'Ukur dulu',
        body: `Pakai **Profiler** di React DevTools (aktifkan "record why each component rendered"), panel Performance di Chrome, dan Lighthouse. Pahami **Core Web Vitals**: LCP (loading), INP (responsivitas), CLS (stabilitas visual).`,
      },
      rerenders: {
        title: 'Kenapa component re-render',
        body: `Component re-render saat state-nya berubah, parent-nya re-render, atau context yang dibacanya berubah. Re-render tidak sama dengan update DOM — React hanya menyentuh DOM di bagian yang output-nya berbeda. Re-render biasanya murah; yang jadi masalah adalah re-render yang lambat.`,
      },
      fixes: {
        title: 'Perbaikan, berurutan',
        body: `- Pastikan **React Compiler** mengoptimasi component yang lambat (cari badge "Memo ✨" di DevTools)
- Pindahkan state **ke bawah**, ke component yang membutuhkannya
- Angkat konten **ke atas**: oper subtree yang berat sebagai \`children\`
- Pecah context
- \`memo\`/\`useMemo\` manual hanya di tempat yang tidak bisa dibantu compiler dan sudah terbukti lewat profiling`,
      },
      concurrent: {
        title: 'Fitur concurrent',
        body: `\`useTransition\` menandai sebuah update sebagai tidak mendesak, sehingga mengetik tetap responsif saat list yang berat sedang re-render. \`useDeferredValue\` membiarkan sebagian UI tertinggal sedikit di belakang nilai yang berubah cepat.`,
      },
      lists: {
        title: 'Virtualization',
        body: `Me-render 10.000 baris berarti membuat 10.000 node DOM. Virtualization (TanStack Virtual) hanya me-render baris yang terlihat ditambah sedikit overscan.`,
      },
      bundle: {
        title: 'Bundle & jaringan',
        body: `Lakukan code splitting dengan \`lazy\` + \`Suspense\`, pecah per route, analisis bundle, dan hindari dependency yang berat. Optimasi gambar (ukuran, format modern, lazy loading) dan font. Pindahkan pekerjaan yang berat di CPU ke Web Worker.`,
      },
    },
    projects: [
      {
        title: 'Dashboard Berat Data',
        summary: '10.000+ baris, chart, dan data live — lalu buat jadi cepat.',
        tasks: [
          'Bangun secara naif dulu',
          'Lakukan profiling dan catat angka baseline',
          'Optimasi langkah demi langkah, catat angka sebelum/sesudah',
          'Virtualisasi tabelnya',
          'Jaga agar mengetik tetap mulus (INP < 200 ms) dengan CPU throttling 4×',
        ],
      },
    ],
  },
  9: {
    title: 'Internal React',
    tagline: 'Pahami kenapa, bukan cuma bagaimana.',
    checkpoint: 'Kamu bisa menjelaskan, dengan diagram, semua yang terjadi antara setState sampai piksel di layar berubah.',
    topics: {
      reconciliation: {
        title: 'Reconciliation',
        body: `React membandingkan (diff) tree element yang baru dengan yang sebelumnya memakai dua heuristik: element dengan **tipe berbeda** menghasilkan subtree yang berbeda (unmount + mount), dan **key** mengidentifikasi children antar render. Ini membuat diffing jadi O(n), bukan O(n³).`,
      },
      fiber: {
        title: 'Arsitektur Fiber',
        body: `Setiap element menjadi sebuah **fiber** — satu unit kerja dengan tautan ke child, sibling, dan return (parent). **Fase render** menelusuri fiber (beginWork saat turun, completeWork saat naik) dan bisa dijeda. **Fase commit** menerapkan perubahan DOM secara sinkron dan menjalankan effect.`,
      },
      lanes: {
        title: 'Scheduling & lane',
        body: `Setiap update mendapat **lane** prioritas: klik itu mendesak, transition tidak. React bisa menginterupsi rendering berprioritas rendah untuk menangani pekerjaan yang mendesak, lalu melanjutkan atau mengulangnya.`,
      },
      'hook-storage': {
        title: 'Bagaimana hook disimpan',
        body: `Hook milik sebuah fiber adalah **linked list** sesuai urutan pemanggilan. Saat re-render, React menelusuri list itu dengan urutan yang sama untuk menemukan state setiap hook. Memanggil hook secara kondisional akan menggeser semua hook setelahnya — itulah alasan Rules of Hooks ada.`,
      },
      suspense: {
        title: 'Suspense',
        body: `Saat sebuah component membaca data yang belum siap (lewat \`use\` atau library yang mendukung Suspense), ia akan **suspend**; React menampilkan fallback dari boundary terdekat dan mencoba lagi saat promise-nya resolve.`,
      },
      hydration: {
        title: 'Hydration',
        body: `SSR mengirim HTML; **hydration** memasang React ke HTML tersebut. Kalau output di client berbeda dari HTML server, terjadilah mismatch. Streaming SSR dan **selective hydration** memungkinkan bagian-bagian halaman menjadi interaktif secara independen.`,
      },
      compiler: {
        title: 'React Compiler',
        body: `Plugin Babel yang bekerja saat build, menganalisis component, dan menyisipkan memoization yang granular. Compiler ini mengandalkan kodemu mengikuti aturan: render yang pure, tanpa mutasi props/state.`,
      },
    },
    projects: [
      {
        title: 'Bangun React Versimu Sendiri',
        summary: 'Ikuti pomb.us/build-your-own-react lalu kembangkan.',
        tasks: [
          'createElement dan render',
          'Work loop concurrent dengan requestIdleCallback',
          'Fiber dan reconciliation',
          'Function component dan useState',
          'Tambahkan useEffect sendiri',
          'Baca ReactFiberHooks dan ReactFiberWorkLoop di repo React',
          'Tulis NOTES.md yang menjelaskan reconciliation dan key dengan kata-katamu sendiri',
        ],
      },
    ],
  },
  10: {
    title: 'Server Components & Next.js',
    tagline: 'React full-stack. Cek versi Next.js terbaru sebelum mulai.',
    checkpoint: 'Untuk setiap bagian UI, kamu bisa menyebutkan apakah ia di-render di server atau client, apakah di-cache (\'use cache\') atau dinamis, dan tag mana yang meng-invalidate-nya.',
    topics: {
      strategies: {
        title: 'Strategi rendering',
        body: `**CSR** me-render di browser. **SSR** me-render HTML per request. **SSG** me-render saat build. **Streaming** mengirim HTML sepotong demi sepotong seiring data siap. **Partial Prerendering** langsung menyajikan shell statis lalu men-stream bagian-bagian yang dinamis.`,
      },
      rsc: {
        title: 'Server Components',
        body: `Server Components hanya berjalan di server: mereka bisa membaca database secara langsung dan mengirim **nol JS**. Client Components (\`'use client'\`) dibutuhkan untuk state, effect, dan event handler. Props yang melintasi batas server–client harus bisa diserialisasi. Oper Server Components *ke dalam* Client Components sebagai \`children\`.`,
      },
      actions: {
        title: 'Server Functions',
        body: `Fungsi \`'use server'\` bisa dipanggil dari client — artinya fungsi tersebut adalah **endpoint HTTP publik**. Validasi input dan cek otorisasi di setiap fungsi.`,
      },
      'app-router': {
        title: 'Next.js App Router',
        body: `Layout, file \`loading\`/\`error\`/\`not-found\`, route group, parallel & intercepting route, metadata, \`Image\` dan \`Font\`, serta \`proxy.ts\` (namanya \`middleware.ts\` sebelum Next.js 16).`,
      },
      'cache-components': {
        title: 'Caching dengan Cache Components',
        body: `Di Next.js versi terbaru, semuanya **dinamis secara default**. Aktifkan caching dengan directive \`'use cache'\`, atur masa berlakunya dengan \`cacheLife\`, beri tag pada entri dengan \`cacheTag\`, dan invalidate dengan \`revalidateTag\`/\`updateTag\` setelah mutation. Bungkus bagian dinamis dengan \`<Suspense>\` supaya shell statis di-stream lebih dulu. Kode lama memakai model empat cache yang implisit — kenali model itu, tapi pelajari model yang eksplisit.`,
      },
      'data-layer': {
        title: 'Data layer & auth',
        body: `Pakai ORM (Prisma atau Drizzle) dengan Postgres dan library auth (Auth.js atau Better Auth). Alternatif selain Next.js: React Router framework mode dan TanStack Start.`,
      },
    },
    projects: [
      {
        title: 'Board Full-stack',
        summary: 'Board ala Trello atau CMS blog dengan Next.js.',
        tasks: [
          'Server Components untuk membaca data, Server Actions untuk mutation',
          'Autentikasi dengan role',
          'Drag-and-drop (dnd-kit) dengan optimistic update',
          'Streaming dengan Suspense boundary',
          'Metadata SEO dan gambar Open Graph',
          'Deploy ke Vercel',
        ],
      },
    ],
  },
  11: {
    title: 'Production Engineering',
    tagline: 'Kelola codebase yang nyaman dikerjakan orang lain.',
    checkpoint: 'Developer baru bisa clone repo-mu, menjalankan satu perintah, dan semuanya langsung berjalan; setiap PR dicek secara otomatis.',
    topics: {
      quality: {
        title: 'Kualitas kode',
        body: `ESLint flat config yang dipakai bersama di seluruh monorepo (react-hooks dengan aturan compiler, jsx-a11y), Prettier atau Biome, TypeScript strict, Husky + lint-staged.`,
      },
      cicd: {
        title: 'CI/CD',
        body: `Lint → typecheck → test → build di setiap PR, dengan **preview deployment** supaya reviewer bisa mengklik dan mencoba langsung perubahannya.`,
      },
      errors: {
        title: 'Error & observability',
        body: `Error boundary di level route dan widget, pelaporan dengan Sentry, Real User Monitoring untuk Web Vitals, dan feature flag untuk rollout yang aman.`,
      },
      security: {
        title: 'Keamanan',
        body: `React meng-escape teks secara default; \`dangerouslySetInnerHTML\` melewati perlindungan itu — sanitasi dengan DOMPurify kalau kamu terpaksa memakainya. Tambahkan Content Security Policy, jangan pernah taruh secret di bundle client, dan audit dependency (Renovate/Dependabot).`,
      },
      i18n: {
        title: 'Internasionalisasi',
        body: `react-intl atau i18next, aturan plural ICU, \`Intl\` untuk tanggal/angka, dan dukungan layout right-to-left.`,
      },
      monorepo: {
        title: 'Monorepo',
        body: `pnpm workspaces + Turborepo untuk berbagi package UI dan konfigurasi antar aplikasi, dengan build yang di-cache.`,
      },
      pwa: {
        title: 'PWA & offline',
        body: `Service worker dan strategi caching untuk aplikasi yang bisa berjalan offline.`,
      },
      mfe: {
        title: 'Micro-frontend',
        body: `Module Federation memungkinkan tim-tim men-deploy bagian UI secara independen. Kompleksitasnya hanya sepadan untuk organisasi besar.`,
      },
      rn: {
        title: 'React Native',
        body: `Model mental React yang sama di iOS/Android dengan Expo.`,
      },
    },
    projects: [
      {
        title: 'Monorepo Production',
        summary: 'Ubah aplikasi Next.js-mu menjadi monorepo berkualitas production.',
        tasks: [
          'apps/web, apps/docs (Storybook), packages/ui, packages/config',
          'Pelaporan error dengan Sentry',
          'i18n: bahasa Inggris plus satu bahasa lain pilihanmu',
          'Header Content Security Policy',
          'Renovate untuk update dependency',
          'CI lengkap dengan preview deployment',
        ],
      },
    ],
  },
  12: {
    title: 'Expert & Kepemimpinan',
    tagline: 'Penilaian teknis, mengajar, dan berkontribusi balik.',
    checkpoint: 'Kamu sudah merilis sebuah package atau kontribusi OSS, dan kamu bisa memimpin diskusi teknis tentang arsitektur frontend.',
    topics: {
      'read-code': {
        title: 'Baca kode yang bagus',
        body: `Pelajari source code TanStack Query, Zustand, Radix UI, dan React Hook Form. Tanyakan "kenapa mereka mendesainnya seperti ini?"`,
      },
      oss: {
        title: 'Open source',
        body: `Mulai dari perbaikan dokumentasi dan label "good first issue" di library yang kamu pakai.`,
      },
      publish: {
        title: 'Publikasikan sebuah package',
        body: `Rilis sebuah hook atau component ke npm lengkap dengan tipe, test, dokumentasi, semantic versioning, dan changelog (Changesets).`,
      },
      teach: {
        title: 'Mengajar',
        body: `Tulis artikel, isi talk di meetup, bimbing developer junior. Saat menjelaskan, celah dalam pemahamanmu sendiri akan kelihatan.`,
      },
      review: {
        title: 'Code review',
        body: `Review dari sisi kebenaran, aksesibilitas, performa, dan maintainability — bukan cuma gaya penulisan. Bersikaplah spesifik dan santun.`,
      },
      adr: {
        title: 'Keputusan arsitektur',
        body: `Catat pilihan-pilihan penting (library state, strategi rendering, styling) sebagai ADR: konteks, opsi, keputusan, konsekuensi.`,
      },
      current: {
        title: 'Tetap up to date',
        body: `Ikuti blog React, RFC, talk di React Conf, dan This Week in React.`,
      },
      interview: {
        title: 'Kedalaman untuk interview',
        body: `Live-coding autocomplete, modal, infinite scroll, dan data table sambil menjelaskan trade-off-nya secara lisan.`,
      },
    },
    projects: [
      {
        title: 'Capstone',
        summary: 'Satu aplikasi besar yang menggabungkan semuanya (lihat halaman Capstone).',
        tasks: [
          'Pilih: board kolaboratif, dashboard SaaS, atau platform belajar',
          'TypeScript strict, tanpa satu pun any',
          'Package design system milikmu sendiri',
          'Terverifikasi WCAG 2.2 AA',
          'Unit + integration + E2E test di CI',
          'Lighthouse ≥ 90 di mobile',
          'Error monitoring dan ADR',
          'Di-deploy secara publik dengan README yang rapi',
        ],
      },
      {
        title: 'Berkontribusi Balik',
        summary: 'Berkontribusi ke ekosistem.',
        tasks: [
          'Publikasikan satu package npm',
          'Berhasil memasukkan satu kontribusi open source',
          'Tulis satu artikel blog teknis',
          'Bimbing satu orang sampai menyelesaikan sebuah proyek',
        ],
      },
    ],
  },
}
