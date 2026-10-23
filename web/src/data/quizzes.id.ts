import type { QuestionsId } from '../i18n/content'

export const QUESTIONS_ID: QuestionsId = {
  // Level 0
  'L0-Q1': {
    prompt: 'Angka-angka ini di-log dengan urutan apa?',
    options: ['1 2 3 4', '1 4 3 2', '1 4 2 3', '1 3 4 2'],
    explanation: 'Kode sinkron jalan duluan (1, 4). Lalu semua microtask dikosongkan (callback Promise → 3). Baru setelah itu event loop mengambil satu macrotask (timer → 2).',
  },
  'L0-Q2': {
    prompt: 'Apa yang di-log kode ini?',
    options: ['0 1 2', '3 3 3', '2 2 2', 'undefined ×3'],
    explanation: '`var` punya scope fungsi, jadi ketiga closure berbagi satu `i` yang sama, dan nilainya sudah 3 saat timer jalan. Dengan `let`, tiap iterasi punya binding sendiri sehingga hasilnya 0 1 2.',
  },
  'L0-Q3': {
    prompt: 'Method array mana yang memutasi array aslinya?',
    options: ['map', 'toSorted', 'sort', 'filter'],
    explanation: '`sort` mengurutkan di tempat (in place) dan mengembalikan array yang sama. `toSorted` (ES2023) mengembalikan salinan yang sudah terurut, dan itulah yang kamu mau untuk state React.',
  },
  'L0-Q4': {
    prompt: 'Berapa nilai `[1, 2] === [1, 2]`?',
    options: ['true', 'false', 'TypeError', 'undefined'],
    explanation: 'Array adalah objek, jadi dibandingkan berdasarkan reference. Dua array yang dibuat terpisah adalah objek yang berbeda, meskipun isinya sama.',
  },
  'L0-Q5': {
    prompt: 'Mana yang benar untuk mengubah `user.address.city` menjadi "Bandung" tanpa memutasi `user`?',
    options: [
      '{ ...user, city: "Bandung" }',
      '{ ...user, address: { city: "Bandung" } }',
      '{ ...user, address: { ...user.address, city: "Bandung" } }',
      'Object.assign(user.address, { city: "Bandung" })',
    ],
    explanation: 'Salin setiap level yang kamu ubah. Opsi 2 membuang field address lainnya; opsi 4 memutasi objek address yang sudah ada.',
  },
  'L0-Q6': {
    prompt: 'Apa hasil `value ?? "default"` kalau value bernilai `0`?',
    options: ['"default"', '0', 'undefined', 'false'],
    explanation: '`??` hanya memakai nilai cadangan kalau nilainya `null` atau `undefined`. `||` akan menganggap 0 sebagai falsy dan mengembalikan "default".',
  },
  // Level 1
  'L1-Q1': {
    prompt: 'Setelah satu kali klik, counter menampilkan angka berapa (mulai dari 0)?',
    options: ['3', '1', '0', 'Melempar error'],
    explanation: '`count` adalah snapshot: nilainya 0 sepanjang render ini, jadi setiap pemanggilan men-set 0 + 1. Pakai `setCount(c => c + 1)` tiga kali untuk mendapatkan 3.',
  },
  'L1-Q2': {
    prompt: 'Apa yang di-render saat `items.length` bernilai 0?',
    options: ['Tidak ada apa-apa', 'Angka 0', 'List kosong', 'false'],
    explanation: '`0 && x` menghasilkan 0, dan React me-render angka. Pakai `items.length > 0 &&` sebagai gantinya.',
  },
  'L1-Q3': {
    prompt: 'Kenapa index array berisiko dipakai sebagai key untuk list yang urutannya bisa berubah?',
    options: [
      'Index bukan string',
      'React akan memberi peringatan dan menolak me-render',
      'State dan DOM menempel ke item yang salah setelah urutannya berubah',
      'Rendering jadi lebih lambat di semua kasus',
    ],
    explanation: 'Key memberi tahu React item mana yang mana. Dengan key berupa index, setelah menyisipkan item di paling atas, item "0" sekarang adalah item yang berbeda tapi tetap membawa state item lama (misalnya teks di sebuah input).',
  },
  'L1-Q4': {
    prompt: 'Apa cara yang idiomatis untuk me-reset `<ProfileForm>` sepenuhnya saat user yang dipilih berganti?',
    options: [
      'useEffect yang me-reset setiap variabel state',
      '<ProfileForm key={userId} />',
      'Unmount lalu mount ulang dengan setTimeout',
      'Menyimpan state form di variabel global',
    ],
    explanation: 'Key yang berbeda membuat React menganggapnya sebagai instance komponen yang berbeda, sehingga state-nya dibuang.',
  },
  'L1-Q5': {
    prompt: 'Kenapa `StrictMode` me-render komponen dua kali saat development?',
    options: [
      'Supaya aplikasi lebih cepat',
      'Untuk memunculkan logika render yang tidak pure dan cleanup effect yang terlewat',
      'Karena ada bug di React',
      'Untuk memanaskan cache lebih awal',
    ],
    explanation: 'Komponen yang pure memberi hasil yang sama dua kali. Kalau render ganda mengubah perilaku, berarti render-nya punya side effect.',
  },
  'L1-Q6': {
    prompt: 'Kode ini menambahkan todo. Apa yang salah?',
    options: [
      'Tidak ada',
      'Kode ini memutasi state dan mengoper reference yang sama, sehingga React bisa melewatkan re-render',
      'push terlalu lambat',
      'setTodos harus di-await',
    ],
    explanation: 'React membandingkan dengan Object.is. Reference array sama → tidak ada perubahan yang terdeteksi. Pakai `setTodos([...todos, newTodo])`.',
  },
  // Level 2
  'L2-Q1': {
    prompt: 'Mana yang benar-benar butuh useEffect?',
    options: [
      'Menghitung fullName dari firstName dan lastName',
      'Subscribe ke WebSocket selama komponen ter-mount',
      'Mengirim analytics saat pengguna mengklik "Beli"',
      'Me-reset form saat prop userId berubah',
    ],
    explanation: 'Effect dipakai untuk sinkronisasi dengan sistem eksternal. Nilai turunan dihitung saat render, logika klik tempatnya di handler, dan reset memakai key.',
  },
  'L2-Q2': {
    prompt: 'Interval ini terus me-log 0 padahal count bertambah. Kenapa?',
    options: [
      'setInterval rusak di React',
      'Callback-nya menangkap count dari render pertama (stale closure)',
      'count bukan state',
      'Cleanup jalan terlalu cepat',
    ],
    explanation: 'Dengan dependency array kosong, effect hanya jalan sekali, jadi interval terus memegang closure dari render pertama. Tambahkan `count` ke deps atau baca lewat updater/ref.',
  },
  'L2-Q3': {
    prompt: 'Kapan fungsi cleanup sebuah effect dijalankan?',
    options: [
      'Hanya saat unmount',
      'Sebelum effect jalan ulang dan saat unmount',
      'Sebelum setiap render',
      'Tidak pernah, kecuali dipanggil manual',
    ],
    explanation: 'React membersihkan effect sebelumnya sebelum menjalankan yang berikutnya, dan sekali lagi saat komponen di-unmount.',
  },
  'L2-Q4': {
    prompt: 'Apa efek mengubah `ref.current`?',
    options: [
      'Memicu re-render',
      'Tidak ada yang terlihat — nilainya berubah tanpa re-render',
      'Me-reset state komponen',
      'Melempar error di StrictMode',
    ],
    explanation: 'Ref adalah kotak mutable yang bertahan antar render tapi tidak memicu render.',
  },
  'L2-Q5': {
    prompt: 'Dua komponen memanggil custom hook yang sama, `useToggle()`. Apakah mereka berbagi state?',
    options: ['Ya, selalu', 'Tidak — setiap pemanggilan punya state sendiri yang independen', 'Hanya kalau dibungkus Provider', 'Hanya di production'],
    explanation: 'Custom hook berbagi logika, bukan state. Setiap pemanggilan adalah kumpulan hook tersendiri di komponen tersebut.',
  },
  'L2-Q6': {
    prompt: 'Kenapa hook tidak boleh dipanggil di dalam `if`?',
    options: [
      'Performa',
      'React mengenali hook berdasarkan urutan pemanggilan; melewatkan satu hook akan menggeser semua hook setelahnya',
      'Itu cuma aturan gaya penulisan',
      'Karena statement if tidak boleh berisi fungsi',
    ],
    explanation: 'Hook disimpan dalam sebuah list per komponen. Kalau urutannya berubah antar render, React akan memberikan state yang salah ke setiap hook.',
  },
  // Level 3
  'L3-Q1': {
    prompt: 'Kenapa discriminated union lebih disarankan daripada field `isLoading`, `isError`, dan `data`?',
    options: [
      'Union lebih cepat saat runtime',
      'Mencegah kombinasi yang mustahil, misalnya loading DAN error sekaligus',
      'TypeScript mewajibkannya',
      'Memakai memori lebih sedikit',
    ],
    explanation: 'Tiga field independen membuka peluang kombinasi yang tidak valid. Union dari varian `{status: ...}` hanya mengizinkan state yang nyata, dan narrowing memberimu data yang sudah bertipe.',
  },
  'L3-Q2': {
    prompt: 'Apa tipe yang tepat untuk prop `children` yang bisa berisi konten apa pun yang bisa di-render?',
    options: ['JSX.Element', 'React.ReactNode', 'string', 'React.Component'],
    explanation: 'ReactNode mencakup element, string, angka, fragment, array, null, dan undefined.',
  },
  'L3-Q3': {
    prompt: 'Kenapa respons API tetap perlu divalidasi dengan Zod padahal kamu sudah punya tipe TypeScript?',
    options: [
      'Tipe TS dihapus saat runtime, jadi data aslinya tidak pernah dicek',
      'Zod membuat request lebih cepat',
      'TypeScript tidak bisa memberi tipe pada JSON',
      'fetch mewajibkannya',
    ],
    explanation: 'Anotasi tipe adalah janji yang kamu buat ke compiler. Hanya validasi saat runtime yang bisa membuktikan server menepatinya.',
  },
  'L3-Q4': {
    prompt: 'Bagaimana cara membuat `<Button>` menerima semua atribut native button?',
    options: [
      'type Props = any',
      "type Props = ComponentProps<'button'> & { variant?: 'primary' | 'ghost' }",
      'Salin setiap atribut secara manual',
      'type Props = HTMLElement',
    ],
    explanation: '`ComponentProps<\'button\'>` memberimu semua prop native, termasuk onClick, disabled, dan atribut aria-*.',
  },
  'L3-Q5': {
    prompt: 'Apa perbedaan utama antara `unknown` dan `any`?',
    options: [
      'Tidak ada',
      '`unknown` harus di-narrow sebelum dipakai; `any` mematikan pengecekan tipe',
      '`any` lebih aman',
      '`unknown` hanya bisa dipakai untuk string',
    ],
    explanation: '`unknown` memaksamu membuktikan tipenya dulu, dan itulah yang kamu butuhkan untuk data dari luar.',
  },
  // Level 4
  'L4-Q1': {
    prompt: 'Pengguna memfilter daftar produk, lalu me-refresh halaman. Di mana filter itu sebaiknya disimpan supaya tidak hilang?',
    options: ['useState', 'Sebuah ref', 'URL search params', 'Variabel di level modul'],
    explanation: 'URL bertahan setelah refresh, bisa dibagikan, dan membuat tombol back berfungsi.',
  },
  'L4-Q2': {
    prompt: 'Di TanStack Query, apa yang diatur oleh `staleTime`?',
    options: [
      'Berapa lama data yang tidak dipakai tetap disimpan di memori',
      'Berapa lama data hasil fetch dianggap fresh sebelum di-refetch di background',
      'Timeout request',
      'Seberapa sering polling dilakukan',
    ],
    explanation: 'Data yang masih fresh disajikan tanpa refetch. `gcTime` yang mengatur berapa lama data yang tidak dipakai tetap ada di cache.',
  },
  'L4-Q3': {
    prompt: 'Pengguna mengetik "re" lalu "react" dengan cepat; respons untuk "re" datang paling akhir. Apa yang mencegah hasil usang ditampilkan?',
    options: [
      'Debounce saja',
      'Mengabaikan atau membatalkan request yang sudah usang (AbortController / flag ignore)',
      'Memakai async/await',
      'Membungkus fetch dengan useMemo',
    ],
    explanation: 'Debounce mengurangi jumlah request, tapi respons tetap bisa datang tidak berurutan. Batalkan atau abaikan semua yang bukan request terbaru.',
  },
  'L4-Q4': {
    prompt: 'Di mana token session auth sebaiknya disimpan supaya tahan terhadap XSS?',
    options: ['localStorage', 'sessionStorage', 'Cookie httpOnly, Secure, SameSite', 'Variabel JS global'],
    explanation: 'Cookie httpOnly tidak bisa dibaca JavaScript, jadi script yang disusupkan tidak bisa mencurinya.',
  },
  'L4-Q5': {
    prompt: 'Atribut mana yang menghubungkan input dengan pesan error-nya untuk screen reader?',
    options: ['aria-label', 'aria-describedby', 'title', 'role="alert" di input'],
    explanation: '`aria-describedby` menunjuk ke elemen yang mendeskripsikan input tersebut; pasangkan dengan `aria-invalid="true"`.',
  },
  // Level 5
  'L5-Q1': {
    prompt: 'Hanya sebuah dropdown yang memakai `isOpen`. Di mana state itu sebaiknya disimpan?',
    options: ['Store global', 'Context di root aplikasi', 'Di dalam komponen dropdown itu sendiri', 'URL'],
    explanation: 'Simpan state sedekat mungkin dengan tempat ia dipakai. State global untuk urusan lokal menyebabkan re-render yang tidak perlu dan coupling.',
  },
  'L5-Q2': {
    prompt: 'Sebuah context menyimpan `{ user, theme, cart }`. Apa yang terjadi saat cart berubah?',
    options: [
      'Hanya consumer cart yang re-render',
      'Semua komponen yang membaca context ini ikut re-render',
      'Tidak ada yang re-render',
      'Hanya Provider yang re-render',
    ],
    explanation: 'Consumer context re-render setiap kali value-nya berubah, apa pun field yang mereka pakai. Pecah data yang tidak berkaitan ke context terpisah, atau pakai store dengan selector.',
  },
  'L5-Q3': {
    prompt: 'Kenapa selector di Zustand mengurangi re-render?',
    options: [
      'Selector meng-cache request jaringan',
      'Komponen hanya re-render saat bagian state yang dipilih berubah',
      'Selector melewati React sepenuhnya',
      'Selector mem-batch update lintas tab',
    ],
    explanation: '`useStore(s => s.count)` hanya subscribe ke `count`; perubahan lain di store tidak membuat komponen re-render.',
  },
  'L5-Q4': {
    prompt: 'Dalam struktur berbasis fitur, apa yang tidak boleh dilakukan `components/ui/Button`?',
    options: ['Menerima children', 'Meng-import dari features/cart', 'Memakai CSS', 'Punya test'],
    explanation: 'Kode bersama tidak boleh bergantung pada fitur, kalau tidak kamu akan mendapat circular dependency dan modul yang saling terikat erat.',
  },
  'L5-Q5': {
    prompt: 'Data produk yang dimuat dari API paling tepat diperlakukan sebagai…',
    options: ['Client state di Redux', 'Server state yang dikelola cache seperti TanStack Query', 'State di context', 'Sebuah ref'],
    explanation: 'Data server butuh caching, refetching, dan invalidation — persis itulah yang dikerjakan library server state.',
  },
  // Level 6
  'L6-Q1': {
    prompt: 'Elemen dasar mana yang paling tepat untuk aksi yang bisa diklik?',
    options: ['<div onClick>', '<span role="button">', '<button>', '<a href="#">'],
    explanation: 'Button native sudah bisa di-focus dan dioperasikan dengan keyboard (Enter/Space), plus role yang benar, tanpa usaha tambahan.',
  },
  'L6-Q2': {
    prompt: 'Apa yang wajib dilakukan modal dialog terhadap focus keyboard?',
    options: [
      'Tidak ada yang khusus',
      'Memindahkan focus ke dalam, menjebaknya selama terbuka, dan mengembalikannya ke pemicu saat ditutup',
      'Mem-blur halaman',
      'Mem-focus tombol tutup hanya saat diklik mouse',
    ],
    explanation: 'Tanpa focus trap, pengguna keyboard bisa ber-tab ke halaman di belakang modal; tanpa pengembalian focus, mereka kehilangan posisinya.',
  },
  'L6-Q3': {
    prompt: 'Apa itu compound component?',
    options: [
      'Komponen dengan banyak prop',
      'Sekumpulan komponen yang berbagi state secara implisit, misalnya <Tabs>, <Tabs.List>, <Tabs.Panel>',
      'Class component',
      'Dua komponen dalam satu file',
    ],
    explanation: 'Parent membagikan state lewat context, jadi pemakainya bisa menyusun bagian-bagiannya dengan bebas alih-alih mengoper prop konfigurasi.',
  },
  'L6-Q4': {
    prompt: 'Kenapa CSS-in-JS berbasis runtime mulai ditinggalkan?',
    options: [
      'Tidak bisa memakai variabel',
      'Injeksi style saat runtime memakan waktu render dan tidak cocok dengan Server Components',
      'Browser berhenti mendukungnya',
      'Tidak type-safe',
    ],
    explanation: 'Solusi zero-runtime (CSS Modules, Tailwind, vanilla-extract) menghasilkan CSS saat build.',
  },
  'L6-Q5': {
    prompt: 'Media query mana yang harus dihormati oleh animasi?',
    options: ['prefers-color-scheme', 'prefers-reduced-motion', 'hover: none', 'orientation'],
    explanation: 'Sebagian pengguna merasa mual karena gerakan; hormati preferensi OS mereka.',
  },
  // Level 7
  'L7-Q1': {
    prompt: 'Query mana yang paling mirip dengan cara pengguna menemukan tombol Save?',
    options: [
      "getByTestId('save-btn')",
      "container.querySelector('.btn-save')",
      "getByRole('button', { name: /save/i })",
      "getByText('Save').parentElement",
    ],
    explanation: 'Role + accessible name mencerminkan cara pengguna dan teknologi asistif memahami UI, sekaligus ikut menguji aksesibilitas.',
  },
  'L7-Q2': {
    prompt: 'Kenapa mock jaringan dengan MSW, bukan me-mock hook useProducts milikmu?',
    options: [
      'MSW lebih cepat',
      'Hook aslimu, parsing, dan penanganan error ikut teruji; test tetap valid setelah refactor',
      'Hook tidak bisa di-mock',
      'MSW diwajibkan oleh Vitest',
    ],
    explanation: 'Mock di batas HTTP membuat lebih banyak kode asli yang ikut teruji.',
  },
  'L7-Q3': {
    prompt: 'Sebuah refactor tidak mengubah perilaku sama sekali, tapi membuat 20 test gagal. Apa artinya?',
    options: [
      'Refactor-nya salah',
      'Test-test itu terikat pada detail implementasi',
      'Kamu butuh lebih banyak snapshot test',
      'Testing Library ada bug-nya',
    ],
    explanation: 'Test yang bagus gagal saat perilaku rusak, bukan saat bagian internal berubah.',
  },
  'L7-Q4': {
    prompt: 'Menurut testing trophy, jenis test mana yang seharusnya paling banyak?',
    options: ['Unit', 'Integration', 'End-to-end', 'Snapshot'],
    explanation: 'Integration test memberi keseimbangan terbaik antara tingkat keyakinan, kecepatan, dan biaya perawatan.',
  },
  'L7-Q5': {
    prompt: 'Query mana yang menunggu elemen yang baru muncul setelah fetch async?',
    options: ['getByText', 'queryByText', 'findByText', 'getAllByText'],
    explanation: '`findBy*` mengembalikan promise dan terus mencoba sampai elemennya muncul atau timeout.',
  },
  // Level 8
  'L8-Q1': {
    prompt: 'Sebuah parent re-render. Secara default, apa yang terjadi pada children-nya?',
    options: ['Tidak ada', 'Ikut re-render', 'Hanya children yang prop-nya berubah yang re-render', 'Di-unmount'],
    explanation: 'Tanpa memoization (manual atau lewat compiler), children ikut re-render bersama parent-nya. Biasanya itu tidak masalah — yang perlu diperhatikan hanya re-render yang lambat.',
  },
  'L8-Q2': {
    prompt: 'Kenapa mengoper `<ExpensiveTree />` sebagai `children` bisa menghindari re-render-nya saat state wrapper berubah?',
    options: [
      'children selalu di-memoize oleh React',
      'Element-nya dibuat oleh parent, jadi reference-nya tidak berubah ketika yang re-render hanya wrapper',
      'children tidak pernah re-render',
      'Cara ini mematikan state',
    ],
    explanation: 'Wrapper re-render tapi menerima objek element children yang sama, jadi React melewati subtree tersebut.',
  },
  'L8-Q3': {
    prompt: 'Apa fungsi `useTransition`?',
    options: [
      'Menganimasikan elemen',
      'Menandai update state sebagai tidak mendesak supaya update yang mendesak (mengetik) tetap responsif',
      'Men-debounce input',
      'Memindahkan pekerjaan ke Web Worker',
    ],
    explanation: 'React bisa menginterupsi render transition untuk menangani input yang lebih mendesak.',
  },
  'L8-Q4': {
    prompt: 'Core Web Vital mana yang mengukur responsivitas terhadap input pengguna?',
    options: ['LCP', 'CLS', 'INP', 'TTFB'],
    explanation: 'Interaction to Next Paint mengukur jeda dari input pengguna sampai update visual berikutnya.',
  },
  'L8-Q5': {
    prompt: 'Kamu harus me-render 50.000 baris. Perbaikan apa yang paling efektif?',
    options: ['memo di setiap baris', 'Virtualization', 'useCallback di handler', 'CSS yang lebih kecil'],
    explanation: 'Virtualization hanya me-render baris yang terlihat, memangkas node DOM dari 50.000 menjadi beberapa puluh saja.',
  },
  'L8-Q6': {
    prompt: 'Dengan React Compiler aktif, kapan kamu masih perlu menulis useMemo secara manual?',
    options: [
      'Selalu, di mana saja',
      'Tidak pernah, dalam kondisi apa pun',
      'Hanya di tempat compiler melewati sebuah komponen atau saat butuh reference yang stabil, dengan dukungan data profiling',
      'Hanya di class component',
    ],
    explanation: 'Compiler sudah menangani sebagian besar memoization. Memoization manual adalah pengecualian, bukan kebiasaan.',
  },
  // Level 9
  'L9-Q1': {
    prompt: 'Saat reconciliation, `<div>` diganti `<section>` di posisi yang sama. Apa yang terjadi?',
    options: [
      'React mengubah nama tag-nya di tempat',
      'Subtree lama di-unmount (state hilang) dan subtree baru di-mount',
      'Tidak ada yang berubah',
      'React memunculkan warning',
    ],
    explanation: 'Tipe elemen yang berbeda diasumsikan menghasilkan tree yang berbeda, jadi React membangun ulang alih-alih membandingkan lebih dalam.',
  },
  'L9-Q2': {
    prompt: 'Fase mana yang bisa dijeda dan dilanjutkan oleh React?',
    options: ['Fase commit', 'Fase render', 'Keduanya', 'Tidak keduanya'],
    explanation: 'Fase render adalah komputasi murni pada fiber dan bisa diinterupsi. Fase commit memutasi DOM dan berjalan secara sinkron.',
  },
  'L9-Q3': {
    prompt: 'Bagaimana React tahu state mana milik pemanggilan useState yang mana?',
    options: ['Dari nama variabel', 'Dari urutan pemanggilan dalam linked list di fiber', 'Dari prop key tersembunyi', 'Dari nomor baris di source code'],
    explanation: 'Hook adalah linked list yang ditelusuri secara berurutan di setiap render — itulah alasan adanya Rules of Hooks.',
  },
  'L9-Q4': {
    prompt: 'Dengan urutan apa work loop fiber mengunjungi node?',
    options: [
      'Breadth-first',
      'Depth-first: beginWork turun ke child, lalu completeWork naik / menyamping ke sibling',
      'Acak',
      'Hanya leaf terlebih dahulu',
    ],
    explanation: 'React turun dari child ke child sampai ke leaf, menyelesaikannya, pindah ke sibling-nya, lalu menyelesaikan parent sambil naik kembali.',
  },
  'L9-Q5': {
    prompt: 'Apa penyebab hydration mismatch?',
    options: [
      'Memakai CSS modules',
      'Output render di client berbeda dari HTML server (misalnya Date.now() atau pengecekan window saat render)',
      'Memakai terlalu banyak komponen',
      'Fetch data di Server Component',
    ],
    explanation: 'Hydration mengharapkan output yang identik. Nilai render yang non-deterministik harus dipindahkan ke effect atau di-render secara konsisten.',
  },
  // Level 10
  'L10-Q1': {
    prompt: 'Apa yang bisa dilakukan Server Component tapi tidak bisa dilakukan Client Component?',
    options: ['Memakai useState', 'Menangani onClick', 'Query database secara langsung tanpa mengirim kode tersebut ke browser', 'Memakai useEffect'],
    explanation: 'Server Components hanya berjalan di server dan tidak menambah JS sama sekali ke bundle; mereka tidak bisa punya state, effect, atau handler.',
  },
  'L10-Q2': {
    prompt: 'Prop mana yang tidak bisa dioper dari Server Component ke Client Component?',
    options: ['String', 'Objek biasa', 'Fungsi yang didefinisikan di Server Component (bukan Server Function)', 'Elemen JSX'],
    explanation: 'Prop yang melintasi batas server–client harus bisa diserialisasi. Fungsi biasa tidak bisa; Server Function adalah pengecualian khusus.',
  },
  'L10-Q3': {
    prompt: 'Kenapa setiap Server Function wajib memvalidasi input dan mengecek otorisasi?',
    options: [
      'Demi performa',
      'Pada dasarnya ia adalah endpoint HTTP publik yang bisa dipanggil siapa saja',
      'TypeScript mewajibkannya',
      'Kalau tidak, Next.js tidak mau compile',
    ],
    explanation: 'Siapa pun bisa mengirim request ke sana dengan argumen sembarang, bukan cuma form milikmu.',
  },
  'L10-Q4': {
    prompt: 'Di Next.js dengan Cache Components, apa perilaku default untuk halaman yang membaca data?',
    options: [
      'Di-cache selamanya',
      'Dinamis — kamu yang memilih mengaktifkan caching dengan "use cache"',
      'Statis saat build',
      'Direvalidasi setiap 60 detik',
    ],
    explanation: 'Caching bersifat eksplisit: tandai fungsi/komponen dengan "use cache" dan kendalikan dengan cacheLife dan cacheTag. Sejak Next.js 16.4, Cache Components aktif secara default di project create-next-app baru.',
  },
  'L10-Q5': {
    prompt: 'Setelah mutation, bagaimana cara me-refresh data cache yang diberi tag "posts"?',
    options: ['Restart server', 'Panggil revalidateTag/updateTag("posts")', 'Pakai window.location.reload()', 'Set staleTime ke 0'],
    explanation: 'Invalidation berbasis tag memperbarui semua entri cache yang terkait dengan tag tersebut.',
  },
  'L10-Q6': {
    prompt: 'Di Next.js 16, `middleware.ts` berganti nama menjadi apa?',
    options: ['edge.ts', 'proxy.ts', 'server.ts', 'handler.ts'],
    explanation: 'Sekarang namanya `proxy.ts` (default-nya runtime Node.js sejak 16.4); `middleware.ts` sudah deprecated, tapi kamu masih akan menemukannya di tutorial dan proyek yang lebih lama.',
  },
  // Level 11
  'L11-Q1': {
    prompt: 'Kenapa `dangerouslySetInnerHTML` berbahaya?',
    options: [
      'Lambat',
      'Ia melewati escaping bawaan React, jadi input yang tidak disanitasi bisa menjalankan script (XSS)',
      'Selalu merusak hydration',
      'Sudah deprecated',
    ],
    explanation: 'React meng-escape teks secara default. HTML mentah harus disanitasi (misalnya dengan DOMPurify) sebelum disisipkan.',
  },
  'L11-Q2': {
    prompt: 'Sebuah environment variable dipakai di kode client. Siapa yang bisa melihatnya?',
    options: ['Hanya server', 'Siapa pun yang mengunduh bundle JS', 'Hanya pengguna yang sudah login', 'Tidak ada'],
    explanation: 'Variabel yang diekspos ke client akan ditanam langsung ke dalam bundle. Jangan pernah taruh secret di sana.',
  },
  'L11-Q3': {
    prompt: 'Apa yang ditangkap oleh error boundary?',
    options: [
      'Semua error, termasuk di event handler',
      'Error yang dilempar saat me-render child tree-nya',
      'Hanya error jaringan',
      'Syntax error',
    ],
    explanation: 'Error di event handler dan kode async harus ditangkap dengan try/catch; boundary menangani error saat render.',
  },
  'L11-Q4': {
    prompt: 'Apa manfaat utama preview deployment untuk setiap pull request?',
    options: ['Hosting lebih murah', 'Reviewer bisa mencoba perubahan yang sebenarnya di browser sebelum merge', 'Build lebih cepat', 'SEO lebih baik'],
    explanation: 'Me-review perilaku, bukan hanya kode, membantu menangkap bug UI dan integrasi lebih awal.',
  },
  'L11-Q5': {
    prompt: 'Kapan micro-frontend biasanya sepadan dengan kompleksitasnya?',
    options: ['Di setiap proyek', 'Aplikasi kecil yang dikerjakan sendirian', 'Organisasi besar dengan tim-tim independen yang harus deploy secara terpisah', 'Tidak pernah'],
    explanation: 'Micro-frontend menyelesaikan masalah skala organisasi, dengan biaya teknis yang tidak kecil.',
  },
  // Level 12
  'L12-Q1': {
    prompt: 'Apa yang dicatat dalam ADR?',
    options: ['Waktu respons API', 'Konteks, opsi, keputusan, dan konsekuensi dari sebuah pilihan arsitektur', 'Setiap commit', 'Cacat aksesibilitas'],
    explanation: 'Architecture Decision Record menyimpan *alasan* di balik sebuah pilihan, supaya tim di masa depan bisa meninjaunya kembali dengan masuk akal.',
  },
  'L12-Q2': {
    prompt: 'Apa fokus terbaik dalam code review?',
    options: [
      'Hanya format',
      'Kebenaran, aksesibilitas, performa, dan maintainability — dengan feedback yang spesifik dan santun',
      'Menulis ulang dengan caramu sendiri',
      'Approve secepatnya',
    ],
    explanation: 'Gaya penulisan sudah diurus linter. Manusia sebaiknya fokus pada hal yang tidak bisa dinilai oleh tool.',
  },
  'L12-Q3': {
    prompt: 'Sebuah library merilis breaking change. Bagian semver mana yang berubah?',
    options: ['Patch', 'Minor', 'Major', 'Tidak ada'],
    explanation: 'MAJOR.MINOR.PATCH — breaking change menaikkan MAJOR.',
  },
  'L12-Q4': {
    prompt: 'Apa kontribusi open source pertama yang bagus?',
    options: ['Menulis ulang core-nya', 'Perbaikan dokumentasi atau "good first issue"', 'Fitur baru yang besar tanpa diskusi', 'Mengganti lisensi'],
    explanation: 'Kontribusi kecil dengan cakupan yang jelas mengajarkanmu proses di proyek itu dan membangun kepercayaan.',
  },
}
