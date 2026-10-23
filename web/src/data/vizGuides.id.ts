import type { VizGuide } from './types'

/**
 * Versi Bahasa Indonesia dari panduan visualisasi (lihat vizGuides.ts).
 * Blok kode dan inline `code` identik dengan versi Inggris.
 */
export const VIZ_GUIDES_ID: Record<string, VizGuide> = {
  // ───────────────────────────── Level 0 ─────────────────────────────
  'event-loop': {
    whatYouSee: `Lajur kiri atas menampilkan **kode**, dengan baris yang sedang dieksekusi disorot. Lajur kanan atas adalah **output console** yang terus bertambah. Di bawahnya ada tiga lajur: **call stack** (chip biru, frame terbaru di paling atas), **Antrean microtask** (Microtask queue, chip ungu) dan **Antrean macrotask** (Macrotask queue, chip kuning).

Konsepnya: JavaScript hanya menjalankan satu hal dalam satu waktu. Kode sinkron dijalankan sampai selesai di stack. Callback promise, lanjutan setelah \`await\` dan \`queueMicrotask\` masuk ke microtask queue; timer masuk ke macrotask queue. Begitu stack kosong, event loop menghabiskan **semua** microtask dulu, lalu mengambil **satu** macrotask, lalu mengulang. Pakai kontrol langkah (**Langkah sebelumnya**, **Langkah berikutnya**, **Putar**, **Kecepatan**) untuk menelusurinya, dan pindah antara skenario **Timer vs Promise** (Timers vs Promises) dan **async / await**.`,
    steps: [
      'Tetap di **Timer vs Promise** (Timers vs Promises) dan, sebelum menekan apa pun, tulis urutan cetak A, B, C, D dan E yang kamu perkirakan.',
      'Maju ke baris `setTimeout`: callback-nya masuk ke lajur macrotask yang kuning, bukan ke stack. Delay 0 ms tetap berarti "setelah script saat ini dan semua microtask selesai".',
      'Telusuri baris `then` dan `queueMicrotask`: keduanya masuk ke lajur microtask yang ungu, sesuai urutan dijadwalkan.',
      'Terus maju sampai stack kosong. Perhatikan C dan D sama-sama jalan sebelum B, padahal timer dijadwalkan lebih dulu: microtask dihabiskan seluruhnya sebelum macrotask mana pun dijalankan. Urutan akhirnya A E C D B.',
      'Pindah ke **async / await**. Lewati `await null`: sisa `load()` menjadi microtask "resume load()" dan kontrol kembali ke `main()`, jadi 2 tercetak sebelum 3.',
      'Tebak hasil skenario async sebelum maju sampai akhir, lalu cek: 1 2 3 4. Semua yang ada sebelum `await` pertama berjalan sinkron.',
    ],
    inCode: `Kode React berjalan di event loop yang sama, jadi urutan ini menjelaskan beberapa perilaku yang kamu temui sehari-hari:

- Update state di dalam \`setTimeout\` atau setelah \`await\` berjalan di task berikutnya, tapi React 18+ tetap mem-batch-nya.
- Kode setelah \`await fetch()\` di event handler berjalan setelah handler "selesai", jadi objek event dan snapshot render yang ditangkap closure sudah berasal dari masa lalu.
- Rantai microtask tanpa akhir (promise yang terus menjadwalkan promise lain) membuat rendering dan input kelaparan, karena browser hanya melakukan paint di antara macrotask.

\`\`\`ts
async function onSave() {
  setStatus('saving')          // queued, rendered after this handler yields
  await api.save(form)         // everything below is a microtask continuation
  setStatus('saved')           // still batched with anything else in this tick
}
\`\`\`

Kalau kamu butuh "setelah browser selesai paint", pakai \`requestAnimationFrame\` atau effect, bukan \`Promise.resolve().then\`.`,
    realCase: {
      title: 'Spinner loading yang tidak pernah muncul',
      story: `**Situasi:** sebuah tool laporan menampilkan spinner, lalu menghitung export besar dengan merangkai ribuan langkah promise kecil (\`await\` di dalam loop per baris tanpa I/O sungguhan).

**Gejala:** tombolnya membeku selama empat detik dan spinner tidak pernah tampil. Pengguna mengklik lagi, sehingga export kedua ikut berjalan.

**Akar masalah:** setiap \`await\` pada nilai yang sudah resolved hanya menjadwalkan microtask. Loop itu tidak pernah memberi event loop batas macrotask, jadi browser tidak punya kesempatan merender spinner atau menangani klik. Microtask dihabiskan seluruhnya sebelum paint.

**Perbaikan:** tim memberi jeda ke browser setiap beberapa ratus baris dengan \`await new Promise(r => setTimeout(r))\` (belakangan \`scheduler.yield()\` di browser yang mendukung), dan memindahkan pekerjaan berat ke Web Worker. Mereka juga menonaktifkan tombol selama \`status === 'exporting'\`.`,
    },
    challenges: [
      { q: 'Apa yang tercetak? `setTimeout(() => log(1)); Promise.resolve().then(() => log(2)); log(3)`', a: '3, 2, 1. Kode sinkron dulu, lalu microtask (promise), lalu macrotask (timer).' },
      { q: 'Apakah `setTimeout(fn, 0)` jalan sebelum callback `.then` yang didaftarkan setelahnya?', a: 'Tidak. Timer adalah macrotask; callback `.then` adalah microtask. Semua microtask dijalankan sebelum macrotask berikutnya, apa pun urutan pendaftarannya.' },
      { q: 'Di dalam `async function f() { log("a"); await null; log("b") }`, apakah "a" dicetak secara sinkron saat kamu memanggil `f()`?', a: 'Ya. Fungsi async berjalan sinkron sampai `await` pertamanya. Hanya kode setelah `await` yang ditunda sebagai microtask.' },
    ],
  },

  references: {
    whatYouSee: `Kolom kiri berisi daftar **variabel**; kolom kanan adalah **heap**, tempat objek tinggal. Panah menunjukkan objek mana yang ditunjuk setiap variabel. Setiap kotak objek punya id (#o1, #o2) dan warna border: biru untuk objek asli, kuning setelah dimutasi, hijau untuk salinan baru. Chip di bawah diagram mengevaluasi perbandingan seperti \`a === b\`, dan panel kode mengumpulkan baris yang sudah dijalankan.

Konsepnya: variabel yang menyimpan objek sebenarnya menyimpan **referensi**, bukan objeknya. Assignment menyalin panahnya; spread membuat kotak baru. React membandingkan state dan props dengan \`Object.is\`, yang untuk objek berarti "kotaknya sama?", jadi mutasi (kotak sama, isi baru) bisa tidak terlihat oleh React, sedangkan salinan (kotak baru) selalu dianggap perubahan.`,
    steps: [
      'Maju ke `const b = a`: sekarang dua panah menunjuk ke satu kotak, dan chip menunjukkan `a === b → true`. Tidak ada yang disalin.',
      'Maju ke `b.n = 2`: kotak yang dipakai bersama berubah kuning dan `a.n` sekarang juga 2. Inilah yang terjadi kalau kamu memutasi state secara langsung: referensi yang dibandingkan React tidak berubah.',
      'Maju ke `const c = { ...a }`: muncul kotak kedua yang hijau. `a === c` bernilai false walaupun isinya sama. Inilah "referensi baru" yang dibutuhkan React untuk mendeteksi update.',
      'Maju ke `c.n = 3`: hanya kotak hijau yang berubah. Salin-lalu-ubah membuat objek asli tetap utuh, persis seperti cara kerja update state yang immutable.',
      'Akhiri dengan `{ n: 3 } === { n: 3 }`: false. Pikirkan apa artinya untuk objek atau arrow function yang dibuat di dalam body komponen pada setiap render.',
    ],
    inCode: `Di React, update di bawah ini tidak menghasilkan perubahan apa pun di layar karena referensi array-nya tidak pernah berubah:

\`\`\`tsx
// Bug: mutates and passes the same reference back
todos.push(newTodo)
setTodos(todos)          // Object.is(old, new) → true, render bailed out

// Fix: new array, new reference
setTodos(prev => [...prev, newTodo])
setUser(prev => ({ ...prev, address: { ...prev.address, city } }))
\`\`\`

Aturan yang sama berlaku untuk dependency array dan memoization: \`useEffect(fn, [options])\` jalan ulang di setiap render kalau \`options\` adalah object literal yang dibuat saat render, dan \`memo(Child)\` tidak bisa melewati render kalau setiap kali menerima \`style={{...}}\` baru. React Compiler me-memoize nilai seperti ini secara otomatis, tapi hanya kalau kamu tidak pernah memutasinya.`,
    realCase: {
      title: 'Total checkout yang baru ter-update di klik kedua',
      story: `**Situasi:** keranjang sebuah toko online menyimpan \`items\` di \`useState\`. Tombol penambah jumlah melakukan \`item.qty++\` lalu \`setItems(items)\`.

**Gejala:** klik + seolah tidak berbuat apa-apa; klik hal lain (misalnya membuka tooltip) tiba-tiba menampilkan jumlah dan total yang benar.

**Akar masalah:** array dan objek item dimutasi langsung. React membandingkan \`items\` lama dan baru dengan \`Object.is\`, menemukan referensi yang sama, lalu melewati render. Re-render lain yang tidak berhubungan belakangan menampilkan data yang sudah termutasi.

**Perbaikan:** \`setItems(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i))\`. Tim juga mengaktifkan lint rule yang melarang mutasi state dan memindahkan keranjang ke \`useReducer\` dengan Immer untuk update bersarang.`,
    },
    challenges: [
      { q: 'Setelah `const b = a; b.n = 5`, berapa nilai `a.n`?', a: '5. `a` dan `b` mereferensikan objek yang sama, jadi mutasinya terlihat dari keduanya.' },
      { q: 'Apakah `{ ...a }` melakukan deep copy pada objek bersarang?', a: 'Tidak. Spread itu dangkal (shallow): properti tingkat atas disalin, tapi objek bersarang tetap berupa referensi yang dipakai bersama. Kamu harus melakukan spread di setiap level yang kamu ubah.' },
      { q: 'Kenapa `setList(list)` setelah `list.push(x)` bisa gagal memicu re-render?', a: 'React berhenti (bail out) kalau state baru `Object.is`-sama dengan yang lama. Push mengubah isi tapi tidak mengubah referensi, jadi React menganggap state-nya tidak berubah.' },
    ],
  },

  // ───────────────────────────── Level 1 ─────────────────────────────
  'render-tree': {
    whatYouSee: `Sebuah component tree: App → ThemeProvider → Header / Page / Footer beserta anak-anaknya. Klik sebuah node untuk mensimulasikan update. Warna di legenda: **merah** = **state berubah di sini** (state changed here), **kuning** = **di-render ulang** (re-rendered), **outline ungu** = **membaca ThemeContext** (reads ThemeContext; ThemeToggle dan Footer). Gelembung biru di setiap node adalah **jumlah render** (render count) yang terus bertambah.

Konsepnya: saat state sebuah komponen berubah, React me-render ulang komponen itu **dan, secara default, semua turunannya**, entah props-nya berubah atau tidak. Memoization (React Compiler atau \`memo\`) memungkinkan anak yang tidak berubah untuk dilewati. Mengoper elemen sebagai \`children\` dari komponen yang lebih atas juga mencegah elemen itu di-render ulang. Context berbeda: setiap consumer di-render ulang saat nilainya berubah, tidak peduli ada memoization di antaranya.`,
    steps: [
      'Dengan **setState di sebuah component** (setState in a component) terpilih dan kedua toggle mati, klik **Page**. SearchBox, ResultList dan kedua Row berubah kuning: seluruh subtree di-render ulang. Header dan Footer tidak, karena mereka saudara (sibling), bukan anak.',
      'Klik **App**. Semuanya di-render ulang. Perhatikan betapa cepatnya counter naik untuk komponen daun yang tidak pernah berubah.',
      'Nyalakan **React Compiler / memo** lalu klik Page lagi. Hanya Page yang di-render ulang: anak dengan props yang tidak berubah dilewati.',
      'Matikan memo dan nyalakan **Angkat ResultList ke atas (kirim sebagai children)** (Lift ResultList up (pass as children)). Klik Page: ResultList dan Row-nya tetap diam, karena elemen ResultList dibuat oleh App dan Page hanya menempatkannya. Tidak perlu memo.',
      'Pindah ke **Ubah nilai context** (Change context value) dan klik node mana saja. ThemeProvider plus dua consumer ungu (ThemeToggle dan Footer) di-render ulang, bahkan saat memo menyala: context menembus parent yang di-memoize.',
      'Pakai **Reset hitungan** (Reset counts) dan bandingkan totalnya untuk lima klik yang sama, dengan dan tanpa memo.',
    ],
    inCode: `Trik "angkat konten ke atas" di kode nyata:

\`\`\`tsx
// Before: every keystroke in Page re-renders ResultList
function Page() {
  const [q, setQ] = useState('')
  return <><SearchBox value={q} onChange={setQ} /><ResultList /></>
}

// After: App creates ResultList once; Page only places it
function Page({ children }: { children: React.ReactNode }) {
  const [q, setQ] = useState('')
  return <><SearchBox value={q} onChange={setQ} />{children}</>
}
<Page><ResultList /></Page>
\`\`\`

Dengan React Compiler (stabil 1.0; di Vite aktifkan lewat \`reactCompilerPreset\` + \`@rolldown/plugin-babel\`, di Next.js lewat \`reactCompiler: true\`), komponen dan JSX di-memoize otomatis, jadi kamu jarang perlu menulis \`memo\`/\`useMemo\` secara manual. Untuk context, pisahkan nilai yang jarang berubah (tema) dari yang sering berubah (posisi kursor), atau pakai store dengan selector.`,
    realCase: {
      title: 'Dashboard yang tersendat di setiap ketikan',
      story: `**Situasi:** sebuah dashboard analitik menyimpan state input teks filter di komponen paling atas, \`Dashboard\`, yang juga me-render enam komponen chart yang berat.

**Gejala:** mengetik di kotak filter terasa sangat lag; React Profiler menunjukkan setiap chart di-render ulang di setiap karakter.

**Akar masalah:** state ditaruh lebih tinggi dari yang dibutuhkan. Setiap \`setFilter\` me-render ulang \`Dashboard\` sehingga semua anaknya ikut, padahal chart hanya peduli pada filter yang sudah di-debounce dan diterapkan.

**Perbaikan:** teks draft input dipindah ke komponen kecil \`FilterBox\` dengan state-nya sendiri, yang hanya melaporkan nilai yang diterapkan ke atas saat submit. Chart juga di-compile dengan React Compiler. Mengetik yang tadinya me-render ulang sekitar empat puluh komponen per ketikan sekarang hanya satu.`,
    },
    challenges: [
      { q: 'Page di-render ulang. Apakah anaknya, SearchBox, ikut di-render ulang kalau props-nya identik dan tidak ada yang di-memoize?', a: 'Ya. Tanpa memoization, render parent akan me-render ulang semua anak yang dibuatnya, terlepas dari apakah props-nya berubah.' },
      { q: 'Kenapa mengangkat ResultList ke atas dan mengopernya sebagai `children` mencegahnya di-render ulang saat Page ter-update?', a: 'Elemen itu dibuat oleh App. Saat hanya Page yang di-render ulang, `children` adalah objek elemen yang sama seperti sebelumnya, jadi React bisa melewatinya.' },
      { q: 'Ada parent yang di-memoize di antara context provider dan consumer. Apakah consumer di-render ulang saat nilai context berubah?', a: 'Ya. Consumer context di-render ulang langsung saat nilainya berubah, menembus ancestor yang di-memoize.' },
    ],
  },

  keys: {
    whatYouSee: `Sebuah list React sungguhan berisi orang (Ana, Budi, Citra). Setiap baris adalah komponen dengan **state-nya sendiri**: input catatan dan timestamp "mounted at" yang di-set sekali saat instance komponen dibuat. Saklar **Strategi key** (Key strategy) memilih antara \`key={index}\` dan \`key={item.id}\`, dan tombol **Tambah di atas** (Add to top), **Acak** (Shuffle), **Balik urutan** (Reverse), **Hapus yang pertama** (Remove first) dan **Reset** mengatur ulang urutan data.

Konsepnya: saat reconciliation, React mencocokkan children lama dan baru berdasarkan key. Key menentukan **instance komponen mana (beserta state-nya) yang dipakai ulang** untuk setiap item. Dengan index sebagai key, identitasnya adalah "posisi", jadi state tetap di posisinya sementara datanya berpindah. Dengan ID yang stabil, state ikut berpindah bersama item-nya. Perhatikan kotak berwarna dan nama (props) dibandingkan dengan catatan dan waktu mount (state).`,
    steps: [
      'Dengan **key={index}**, ketik "Ana note" di baris Ana dan "Budi note" di baris Budi.',
      'Klik **Tambah di atas** (Add to top). Orang baru muncul di posisi 0, tapi teks "Ana note" dan waktu mount Ana tetap di posisi 0, di samping nama baru. Props berpindah; state tidak, karena bagi React posisi 0 tetap "komponen yang sama".',
      'Klik **Hapus yang pertama** (Remove first). Sekarang justru baris terakhir yang di-unmount, dan setiap catatan bergeser ke orang lain.',
      'Pindah ke **key={item.id}** (list akan di-reset), ketik catatan lagi, lalu klik **Tambah di atas**: baris baru mendapat waktu mount baru dan catatan kosong, dan catatan yang sudah ada tetap bersama pemiliknya.',
      'Klik **Acak** (Shuffle) dan **Balik urutan** (Reverse) beberapa kali. Catatan dan waktu mount mengikuti setiap orang, karena React memindahkan DOM node yang sudah ada alih-alih menulis ulang isinya.',
    ],
    inCode: `\`\`\`tsx
// Fragile: identity = position
{items.map((item, i) => <Row key={i} item={item} />)}

// Correct: identity = the item
{items.map(item => <Row key={item.id} item={item} />)}
\`\`\`

Patokan praktis:

- Pakai ID yang stabil dan unik dari data kamu (id database, UUID yang dibuat saat item dibuat).
- Jangan pernah membuat key saat render (\`key={Math.random()}\` atau \`crypto.randomUUID()\` langsung di JSX): setiap render akan me-mount komponen yang benar-benar baru dan menghapus state-nya.
- Index sebagai key hanya bisa diterima untuk list statis yang tidak pernah diurutkan ulang, disisipi atau dihapus, dan barisnya tidak menyimpan state.
- Kamu bisa memakai \`key\` dengan sengaja untuk **me-reset** komponen: \`<ProfileForm key={userId} />\` memberi setiap pengguna form yang baru.`,
    realCase: {
      title: 'Nominal pembayaran yang masuk ke invoice yang salah',
      story: `**Situasi:** sebuah aplikasi akuntansi menampilkan daftar invoice yang belum dibayar, setiap baris berisi input nominal uncontrolled, di-render dengan \`key={index}\`. Invoice baru datang lewat websocket dan disisipkan di awal list.

**Gejala:** seorang staf mengetik nominal di baris ketiga, lalu ada invoice baru masuk, dan nominal yang diketik sekarang berada di samping invoice lain. Beberapa pembayaran tercatat ke supplier yang salah sebelum ada yang sadar.

**Akar masalah:** menyisipkan di awal menggeser setiap invoice turun satu posisi, tapi DOM node input dan nilai yang sudah diketik tetap di posisinya karena key-nya adalah index.

**Perbaikan:** key diganti menjadi id invoice, input dijadikan controlled dengan nominal draft disimpan per id invoice, dan sekarang ada test end-to-end yang menyisipkan item saat sebuah baris sedang diedit.`,
    },
    challenges: [
      { q: 'Kamu me-render `<li key={i}>` yang berisi input teks. Item baru disisipkan di paling atas. Ke mana perginya teks yang sudah diketik pengguna di baris pertama?', a: 'Tetap di baris pertama, sekarang di samping item baru. Dengan index sebagai key, React memakai ulang komponen di index 0 dan hanya meng-update props-nya.' },
      { q: 'Apakah `key={crypto.randomUUID()}` di dalam `map` solusi yang baik?', a: 'Bukan. Key baru di setiap render membuat React meng-unmount dan me-mount ulang setiap baris di setiap render, sehingga state dan focus hilang dan performa turun. Key harus stabil.' },
      { q: 'Bagaimana key bisa dipakai dengan sengaja untuk me-reset state?', a: 'Ganti key sebuah komponen saat kamu ingin instance baru, misalnya `<Editor key={docId} />`. React menganggap key yang berbeda sebagai komponen yang berbeda dan me-mount-nya ulang.' },
    ],
  },

  batching: {
    whatYouSee: `Empat tombol, masing-masing menjalankan potongan update state yang berbeda (kodenya tertulis di tombol). Di bawahnya ada tiga statistik: **count** saat ini, sebuah boolean **flag**, dan **commit sejauh ini** (commits so far), yang bertambah satu setiap kali React meng-commit render. **Reset nilai** (Reset values) mengembalikan count dan flag ke nol.

Konsepnya punya dua bagian. **Snapshot:** di dalam satu render, \`count\` adalah konstanta: memanggil \`setCount(count + 1)\` tiga kali berarti mengantrekan "set ke 1" tiga kali. **Updater function** (\`c => c + 1\`) diantrekan dan masing-masing menerima hasil sebelumnya. **Batching:** React mengumpulkan semua update dari satu event (dan, sejak React 18, dari timeout dan promise juga) lalu me-render sekali. Counter commit membuktikan bahwa beberapa update menghasilkan satu render.`,
    steps: [
      'Klik **Nilai snapshot ×3** (Snapshot value ×3) mulai dari 0. count menjadi 1, bukan 3, dan commit bertambah tepat satu.',
      'Klik **Fungsi updater ×3** (Updater function ×3). count naik 3, dan commit tetap bertambah tepat satu: tiga update diantrekan, satu render.',
      'Klik **Campuran** (Mixed). Berapa pun count sebelumnya, hasil akhirnya 42: React memproses antrean secara berurutan (ganti dengan count+5, tambah 1, ganti dengan 42), jadi penggantian terakhir yang menang.',
      'Klik **Di dalam setTimeout** (Inside setTimeout). count dan flag sama-sama berubah, dengan satu commit, walaupun update-nya berjalan di luar event handler React.',
      'Tebak sebelum mengklik: dari count = 10, apa hasil Campuran? Dan Nilai snapshot ×3? (42 dan 11.)',
    ],
    inCode: `\`\`\`tsx
function handleClick() {
  setCount(count + 1)   // count is this render's snapshot, e.g. 0 → queues "set 1"
  setCount(count + 1)   // queues "set 1" again
  setCount(c => c + 1)  // queues "previous + 1" → 2
  console.log(count)    // still 0: state updates do not change the variable
}
\`\`\`

Pakai bentuk updater setiap kali nilai berikutnya bergantung pada nilai sebelumnya, terutama di kode async, interval dan apa pun yang bisa jalan lebih dari sekali per render. Kalau kamu benar-benar butuh DOM ter-update secara sinkron sebelum lanjut (jarang, misalnya untuk mengukur atau scroll), \`flushSync(() => setX(...))\` mengeluarkan update itu dari batching.`,
    realCase: {
      title: '"Like" dobel-klik yang hanya terhitung sekali',
      story: `**Situasi:** tombol like di sebuah feed sosial melakukan \`setLikes(likes + 1)\` lalu memanggil API; fitur double-tap cepat memanggil handler yang sama dua kali dalam satu gestur.

**Gejala:** double-tap menampilkan +1 di layar, tapi server mencatat +2, sehingga angkanya "loncat" saat refresh berikutnya.

**Akar masalah:** kedua panggilan terjadi sebelum re-render, jadi keduanya membaca snapshot \`likes\` yang sama dan meng-set nilai yang sama. Server, yang menambah secara atomik, menerima dua request.

**Perbaikan:** client beralih ke \`setLikes(l => l + 1)\` dan, yang lebih penting, membuat state client mengikuti total yang dikembalikan server setelah setiap request (optimistic update yang disesuaikan dengan response), sehingga keduanya tidak mungkin berbeda lagi.`,
    },
    challenges: [
      { q: 'count bernilai 5. Berapa nilainya setelah `setCount(count + 1); setCount(count + 1)` dalam satu handler?', a: '6. Kedua panggilan membaca snapshot 5 dan meng-set 6.' },
      { q: 'Berapa nilainya setelah `setCount(c => c + 1); setCount(count * 10)` saat count bernilai 5?', a: '50. Updater menghasilkan 6, lalu nilai biasa 50 menggantikannya.' },
      { q: 'Dua update state di dalam callback `setTimeout` di React 19: berapa kali render?', a: 'Sekali. Automatic batching (sejak React 18) juga berlaku untuk timeout, promise dan native event handler.' },
    ],
  },

  // ───────────────────────────── Level 2 ─────────────────────────────
  'effect-timeline': {
    whatYouSee: `Komponen \`<Chat>\` yang berjalan sungguhan dan "terhubung" ke sebuah room di dalam effect dengan \`[roomId]\` sebagai dependency. Log di bawahnya mencatat, lengkap dengan timestamp: baris abu-abu **commit** (setiap kali Chat di-render dan di-commit), baris hijau **▶ setup** (\`connect("room")\`) dan baris merah **■ cleanup** (\`disconnect("room")\`).

Kontrolnya: **Unmount/Mount <Chat>**, dropdown **roomId** (general, react, rust), **Ganti tema (bukan dependency)** (Toggle theme (not a dependency)), **Simulasikan mount StrictMode** (Simulate StrictMode mount) dan **Bersihkan log** (Clear log).

Konsepnya: effect adalah sinkronisasi dengan sistem eksternal. Setup berjalan setelah commit; cleanup berjalan sebelum setup berikutnya dan saat unmount. Effect hanya jalan ulang saat dependency berubah, jadi re-render saja tidak membuat koneksi ulang. Di development, StrictMode sengaja menjalankan setup → cleanup → setup saat mount untuk membongkar cleanup yang terlupa.`,
    steps: [
      'Klik **Bersihkan log** (Clear log), lalu ubah **roomId** dari general ke react. Kamu melihat baris commit, lalu cleanup untuk "general", lalu setup untuk "react": cleanup nilai lama selalu datang sebelum setup nilai baru.',
      'Klik **Ganti tema (bukan dependency)** (Toggle theme (not a dependency)). Muncul baris commit baru dengan tema baru, tapi tanpa setup atau cleanup: effect-nya tidak jalan ulang.',
      'Klik **Unmount <Chat>**. Satu baris cleanup merah menutup koneksi terakhir. Mount lagi untuk melihat setup baru.',
      'Nyalakan **Simulasikan mount StrictMode** (Simulate StrictMode mount). Log menunjukkan connect → disconnect → connect untuk room yang sama. Kalau cleanup kamu tidak ada, sekarang akan ada dua koneksi yang terbuka.',
      'Ganti roomId dengan cepat di antara ketiga room dan pastikan setiap setup berpasangan dengan tepat satu cleanup.',
    ],
    inCode: `\`\`\`tsx
function Chat({ roomId, theme }: { roomId: string; theme: string }) {
  useEffect(() => {
    const conn = createConnection(roomId)
    conn.connect()
    return () => conn.disconnect()   // runs before the next setup and on unmount
  }, [roomId])                       // theme is not read here, so it is not a dep
  return <ChatWindow theme={theme} />
}
\`\`\`

Kalau effect butuh nilai yang *tidak* boleh memicu koneksi ulang (misalnya mencatat tema saat ini ketika pesan masuk), React 19.2 menyediakan \`useEffectEvent\` untuk membaca nilai terbaru dari dalam effect tanpa mencantumkannya sebagai dependency. Jangan malah membungkam lint rule exhaustive-deps. Dan ingat: kalau tidak ada sistem eksternal yang terlibat (menurunkan data, merespons klik), kemungkinan besar kamu tidak butuh effect sama sekali.`,
    realCase: {
      title: 'Subscription websocket dobel setelah navigasi',
      story: `**Situasi:** dashboard harga ala aplikasi trading berlangganan channel websocket lewat \`useEffect(() => { socket.subscribe(symbol, onTick) }, [symbol])\` tanpa cleanup.

**Gejala:** setelah berpindah antara beberapa simbol, harga berkedip-kedip di antara beberapa nilai dan trafik jaringan terus naik. Di development, setiap tick datang dua kali sejak load pertama.

**Akar masalah:** setiap pergantian simbol menambah subscription baru tanpa menghapus yang sebelumnya. Double mount StrictMode di development sebenarnya sudah menunjukkan masalah ini, tapi tim mengabaikannya sebagai "React menjalankan effect dua kali".

**Perbaikan:** effect mengembalikan \`() => socket.unsubscribe(symbol, onTick)\`. Dengan adanya cleanup, double-run StrictMode jadi tidak berbahaya, dan trafik production kembali menjadi satu stream per simbol yang terlihat.`,
    },
    challenges: [
      { q: 'roomId berubah dari "a" ke "b". Dalam urutan apa log muncul?', a: 'Komponen di-render ulang dan di-commit, lalu cleanup dari effect "a" berjalan, lalu setup untuk "b".' },
      { q: 'Kenapa mengganti tema tidak membuat koneksi ulang?', a: 'theme tidak ada di dependency array (dan tidak dipakai di dalam effect), jadi React tidak menjalankan ulang effect setelah render itu.' },
      { q: 'Apakah StrictMode menjalankan effect dua kali di production?', a: 'Tidak. Tambahan setup → cleanup → setup hanya terjadi di development, untuk membongkar effect yang cleanup-nya tidak sepenuhnya membatalkan setup-nya.' },
    ],
  },

  'stale-closure': {
    whatYouSee: `Dua demo yang berjalan sungguhan, berdampingan.

**1 · Pembacaan tertunda** (1 · Delayed read): sebuah counter dengan tombol **+1** dan tombol **Baca dalam 3 dtk** (Read in 3s). Saat timer berbunyi, log mencetak nilai yang ditangkap **closure** saat klik dan nilai yang dipegang **ref** (di-update setelah setiap render) saat ini. Pill kuning menghitung timer yang masih menunggu.

**2 · Interval dengan deps (nyaris) kosong** (2 · Interval with empty-ish deps): interval yang berdetak setiap 500 ms di dalam effect yang tidak mencantumkan \`count\` sebagai dependency. Saklar **Kode interval** (Interval code) beralih antara \`setCount(count + 1)\` dan \`setCount(c => c + 1)\`; **Mulai/Berhenti** (Start/Stop) dan **Reset** mengendalikannya.

Konsepnya: setiap render membuat fungsi baru yang meng-close nilai dari **render itu**. Callback yang dijalankan belakangan tetap melihat snapshot lama. Ref memberimu nilai terbaru; updater function memungkinkan kamu menghitung dari state sebelumnya tanpa perlu membacanya sama sekali.`,
    steps: [
      'Di demo 1, klik **Baca dalam 3 dtk** (Read in 3s), lalu klik **+1** tiga kali dengan cepat. Saat timer berbunyi, nilai closure adalah count lama dan nilai ref adalah yang terbaru.',
      'Klik Baca dalam 3 dtk beberapa kali dengan klik +1 di sela-selanya. Setiap hasil menunjukkan nilai tangkapan yang berbeda: setiap klik terjadi di render yang berbeda dengan snapshot-nya sendiri.',
      'Di demo 2, pilih `setCount(count + 1)` dan tekan **Mulai** (Start). Counter naik ke 1 lalu diam di situ: interval dibuat sekali, dengan count = 0, jadi terus menghitung 0 + 1.',
      'Hentikan, pindah ke `setCount(c => c + 1)` lalu Mulai lagi. Sekarang hitungannya terus naik, karena updater menerima state terbaru dari React setiap kali.',
      'Tanya dirimu: apakah menambahkan `count` ke dependency array juga memperbaiki demo 2? (Ya, tapi interval akan dibongkar dan dibuat ulang di setiap tick.)',
    ],
    inCode: `\`\`\`tsx
// Fix 1: updater, when the new state depends on the old state
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000)
  return () => clearInterval(id)
}, [])

// Fix 2: ref, when a later callback must READ the latest value
const latest = useRef(value)
useEffect(() => { latest.current = value })
setTimeout(() => send(latest.current), 3000)

// Fix 3 (React 19.2): useEffectEvent for non-reactive logic inside effects
const onTick = useEffectEvent(() => log(count))
useEffect(() => {
  const id = setInterval(onTick, 1000)
  return () => clearInterval(id)
}, [])
\`\`\`

Jangan menulis ke ref saat render; update di dalam effect atau event handler.`,
    realCase: {
      title: 'Autosave yang menyimpan draft lama',
      story: `**Situasi:** sebuah editor catatan menjadwalkan autosave dengan \`setTimeout(() => save(text), 2000)\` di dalam change handler, dan membatalkan timer sebelumnya setiap kali.

**Gejala:** sesekali, setelah pindah halaman tepat sesudah mengetik, catatan yang tersimpan kehilangan beberapa kata terakhir.

**Akar masalah:** ada effect terpisah untuk "simpan saat unmount" yang ditulis sebagai \`useEffect(() => () => save(text), [])\`. Dengan dependency array kosong, cleanup-nya meng-close \`text\` dari render **pertama**, jadi saat unmount ia menimpa autosave yang lebih baru dengan draft awal.

**Perbaikan:** penyimpanan saat unmount membaca dari ref (\`textRef.current\`) yang disinkronkan setelah setiap render, dan penyimpanan diurutkan sehingga payload lama tidak mungkin menimpa versi yang lebih baru (server menolak write dengan nomor revisi lebih rendah).`,
    },
    challenges: [
      { q: 'Kamu klik "Baca dalam 3 dtk" saat count bernilai 2, lalu klik +1 dua kali. Apa yang dicatat closure?', a: '2. Callback timer menangkap nilai dari render saat kamu mengklik.' },
      { q: 'Kenapa `setInterval(() => setCount(count + 1))` di dalam effect dengan `[]` berhenti di 1?', a: 'Effect hanya jalan sekali, jadi callback interval selalu melihat count = 0 dan terus meng-set 1.' },
      { q: 'Kapan ref adalah solusi yang tepat dibanding updater function?', a: 'Saat kode yang tertunda perlu membaca nilai terbaru untuk keperluan selain menghitung state berikutnya, misalnya mengirimnya ke server atau mencatatnya ke log.' },
    ],
  },

  'race-condition': {
    whatYouSee: `Kotak pencarian untuk daftar buah dengan API palsu di mana **query yang lebih pendek merespons lebih lambat**, sehingga response yang datang tidak berurutan jadi hal biasa. Di bawah input: "Menampilkan hasil untuk" query yang hasilnya sedang ditampilkan, dengan badge merah **⚠ stale** kalau tidak cocok dengan input, atau pill hijau **✓ sesuai input** (✓ matches input).

**Timeline request** menggambar satu bar per request: **kuning** = sedang berjalan, **hijau** = response diterapkan ke UI, **abu-abu/pudar** = dibatalkan atau diabaikan. Saklar **Strategi fetch** (Fetch strategy) membandingkan **Fetch polos di effect** (Naive fetch in effect) dengan **Dengan cleanup (abort / ignore)** (With cleanup (abort / ignore)).

Konsepnya: setiap ketikan memulai request, dan response bisa datang dalam urutan apa saja. Tanpa cleanup, response yang datang **terakhir** yang menang, walaupun milik query yang lebih lama.`,
    steps: [
      'Pilih **Fetch polos di effect** (Naive fetch in effect) dan ketik "apple" dengan cepat. Lihat timeline: request "a" masih kuning setelah "apple" sudah hijau.',
      'Tunggu. Saat "a" selesai, bar-nya ikut hijau dan menimpa list, lalu badge merah stale muncul: UI menampilkan hasil untuk "a" sementara input berisi "apple".',
      'Tekan **Reset**, coba "pea" sebagai contoh yang lebih pendek, dan hitung berapa bar yang hijau: setiap response diterapkan, sesuai urutan kedatangannya.',
      'Pindah ke **Dengan cleanup (abort / ignore)** (With cleanup (abort / ignore)) dan ketik "apple" dengan cepat lagi. Bar sebelumnya langsung abu-abu begitu ketikan berikutnya masuk; hanya request terakhir yang hijau.',
      'Pastikan badge selalu menunjukkan "✓ sesuai input" di mode cleanup, secepat apa pun kamu mengetik.',
    ],
    inCode: `\`\`\`tsx
useEffect(() => {
  if (!query) return
  const controller = new AbortController()
  let ignore = false
  fetch(\`/api/search?q=\${encodeURIComponent(query)}\`, { signal: controller.signal })
    .then(r => r.json())
    .then(data => { if (!ignore) setResults(data) })
    .catch(err => { if (err.name !== 'AbortError') setError(err) })
  return () => { ignore = true; controller.abort() }
}, [query])
\`\`\`

\`abort()\` menghemat bandwidth; flag \`ignore\` menjamin kebenaran bahkan untuk pekerjaan yang tidak bisa dibatalkan. Di aplikasi nyata, lebih baik pakai library data: TanStack Query memberi key cache berdasarkan \`['search', query]\`, jadi response telat untuk key lama tidak mungkin tampil untuk key baru, dan library itu membatalkan atau mengabaikan request yang sudah usang untukmu. Di Next.js, Server Components dan \`use()\` dengan Suspense menghindari effect sepenuhnya.`,
    realCase: {
      title: 'Pencarian pelanggan yang membuka akun yang salah',
      story: `**Situasi:** sebuah konsol support mencari pelanggan sambil agen mengetik, lalu otomatis memilih hasil pertama dan memuat profil pelanggan tersebut.

**Gejala:** sesekali agen sudah mengetik nama belakang lengkap tapi malah masuk ke profil pelanggan lain, yang namanya hanya cocok di dua huruf pertama.

**Akar masalah:** query pendek "ma" cocok dengan ribuan record dan merespons lebih lambat daripada "martins". Effect naif menerapkan kedua response sesuai urutan kedatangan, jadi list hasil yang lambat dan luas menggantikan list yang benar, dan auto-select memilih orang yang salah.

**Perbaikan:** request dibatalkan di cleanup effect, auto-select hanya jalan saat \`results.query === input\`, dan belakangan layar itu dipindah ke TanStack Query dengan string query di dalam key plus debounce 250 ms.`,
    },
    challenges: [
      { q: 'Kenapa debounce saja bukan solusi lengkap untuk race condition?', a: 'Debounce mengurangi jumlah request, tapi dua request tetap bisa tumpang tindih dan selesai tidak berurutan. Kamu tetap perlu mengabaikan atau membatalkan response yang basi.' },
      { q: 'Apa yang dilindungi flag `ignore` yang mungkin tidak dilindungi `AbortController`?', a: 'Pekerjaan yang sudah selesai atau tidak bisa dibatalkan (misalnya panggilan SDK yang tidak mendukung abort). Flag itu memastikan hasil basi tidak pernah ditulis ke state, walaupun tetap datang.' },
      { q: 'Di versi cleanup, kapan tepatnya request sebelumnya dibatalkan?', a: 'Saat query berubah: React menjalankan cleanup effect sebelumnya sebelum menjalankan effect untuk query baru. Request juga dibatalkan saat unmount.' },
    ],
  },

  // ───────────────────────────── Level 3 ─────────────────────────────
  'ui-states': {
    whatYouSee: `Dua panel menggambarkan fitur pencarian kota yang sama.

**Kiri, tiga boolean → 8 kombinasi:** tabel berisi setiap kombinasi \`isLoading\`, \`isError\` dan \`data\`. Baris merah bertanda "✗ mustahil" (impossible) adalah kombinasi yang diizinkan oleh type tapi seharusnya tidak pernah terjadi di UI, misalnya loading **dan** error sekaligus.

**Kanan, discriminated union → hanya state yang nyata:** sebuah state machine dengan empat node (idle, loading, success, error). State saat ini diisi biru; panah yang keluar darinya disorot. Tombol event **FETCH, RESOLVE, REJECT, RETRY, RESET** nonaktif kalau transisi itu tidak diizinkan dari state saat ini. Di bawahnya, objek state mentah dan UI yang di-render.

Konsepnya: modelkan nilai yang bisa berada di salah satu dari beberapa situasi yang saling eksklusif sebagai union dengan tag \`status\`, sehingga kombinasi yang tidak valid tidak bisa ditulis dan TypeScript mempersempit (narrowing) setiap cabang.`,
    steps: [
      'Baca tabel kiri: 4 dari 8 baris mustahil, tapi komponen yang di-type dengan tiga boolean tetap harus berjaga-jaga terhadapnya (dan cepat atau lambat seseorang akan meng-set salah satunya tanpa sengaja).',
      'Di kanan, dari **idle**, perhatikan bahwa hanya FETCH yang aktif. Coba pikirkan apa arti RESOLVE saat idle: tidak ada, jadi tombolnya nonaktif.',
      'Klik **FETCH** lalu **REJECT**. JSON state sekarang punya field `error`, dan hanya RETRY dan RESET yang aktif.',
      'Klik **RETRY** lalu **RESOLVE**. JSON berisi `data` dan tidak ada `error`: error lama hilang dengan sendirinya karena hanya ada di varian error.',
      'Bandingkan dengan model boolean: apa yang harus kamu ingat untuk di-reset di sana saat retry berhasil? (isError dan pesan error-nya.)',
    ],
    inCode: `\`\`\`ts
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: City[] }

function reducer(s: State, e: Event): State {
  switch (s.status) {
    case 'loading':
      if (e.type === 'RESOLVE') return { status: 'success', data: e.data }
      if (e.type === 'REJECT') return { status: 'error', error: e.message }
      return s
    // ...
  }
}

// In JSX, TypeScript narrows for you:
if (state.status === 'success') return <List cities={state.data} />
\`\`\`

Tambahkan \`default: const _never: never = s\` yang exhaustive supaya menambah status baru langsung jadi compile error di setiap switch yang lupa menanganinya. TanStack Query memakai ide yang sama lewat \`status: 'pending' | 'error' | 'success'\`.`,
    realCase: {
      title: 'Banner error di atas hasil yang baru',
      story: `**Situasi:** halaman pencarian penerbangan melacak \`isLoading\`, \`error\` dan \`results\` dalam tiga panggilan \`useState\`.

**Gejala:** setelah pencarian gagal, retry yang berhasil menampilkan penerbangan baru **dan** banner merah "Something went wrong". Kadang spinner juga muncul bersamaan dengan hasil.

**Akar masalah:** jalur sukses meng-set \`results\` dan \`isLoading = false\` tapi lupa menghapus \`error\`. Tidak ada apa pun di type yang mencegah kombinasi mustahil itu.

**Perbaikan:** ketiga variabel diganti menjadi satu \`useReducer\` dengan discriminated union. Setiap transisi mengembalikan objek state yang sepenuhnya baru, jadi masuk ke \`success\` otomatis membuang \`error\`. Satu unit test per transisi menggantikan beberapa pengecekan tambal sulam di JSX.`,
    },
    challenges: [
      { q: 'Berapa banyak state yang bisa direpresentasikan `{ isLoading: boolean; isError: boolean; hasData: boolean }`, dan berapa yang valid untuk sebuah fetch?', a: '8 kombinasi, dan hanya 4 (idle, loading, error, success) yang bermakna.' },
      { q: 'Di dalam `if (state.status === "error")`, kenapa kamu bisa mengakses `state.error` tanpa pengecekan?', a: 'TypeScript mempersempit union ke varian `error`, satu-satunya varian yang mendeklarasikan field itu.' },
      { q: 'Bagaimana membuat TypeScript protes saat status baru ditambahkan tapi belum ditangani?', a: 'Pakai switch yang exhaustive dengan cabang `default` yang meng-assign nilainya ke `never`; varian yang belum ditangani akan gagal di-compile.' },
    ],
  },

  // ───────────────────────────── Level 4 ─────────────────────────────
  'query-cache': {
    whatYouSee: `Simulasi cache TanStack Query. Di satu sisi ada komponen yang bisa **di-mount dan di-unmount**, masing-masing berlangganan ke sebuah query key seperti \`['todos']\` atau \`['todo', 1]\`. Di sisi lain ada **cache**: satu entri per key, ditampilkan di timeline saat melewati siklus hidupnya:

- **fresh**: data lebih muda dari \`staleTime\`; me-mount observer lain akan memakai ulang data ini tanpa request.
- **stale**: data tetap langsung ditampilkan, tapi pemicu berikutnya (mount, window focus, reconnect) akan melakukan refetch di background.
- **inactive**: tidak ada komponen yang mengamati key ini; hitung mundur \`gcTime\` dimulai.
- **garbage-collected**: hitung mundur habis dan entri dihapus.

Slider mengatur **staleTime** dan **gcTime**. Kamu juga bisa menekan **Simulasikan window focus** (Simulate window focus) dan menjalankan mutation lalu invalidation lewat **Ganti nama produk (mutation)** (Rename product (mutation)). Konsepnya: server state adalah cache, dan dua timer ini menentukan kapan cache itu dipercaya dan kapan dilupakan.`,
    steps: [
      'Dengan staleTime 0, mount komponen yang memakai sebuah key. Perhatikan entrinya melakukan fetch, fresh hanya sebentar, lalu hampir langsung menjadi stale: staleTime 0 adalah default library ini.',
      'Mount komponen kedua dengan key yang sama. Keduanya berbagi satu entri cache: tidak ada request kedua, karena request di-dedup berdasarkan key.',
      'Simulasikan window focus saat entri sedang stale: refetch berjalan di background, tapi komponen tetap menampilkan data dari cache sampai data baru tiba (tanpa spinner loading).',
      'Naikkan slider staleTime (misalnya 30 dtk), refetch, lalu focus window lagi: tidak ada fetch selama entri masih fresh.',
      'Unmount semua komponen yang memakai key itu. Entri menjadi inactive dan hitung mundur gcTime dimulai. Mount ulang sebelum habis untuk mendapat data instan; biarkan habis untuk melihat entri di-garbage-collect dan state loading penuh di mount berikutnya.',
      'Jalankan mutation lalu invalidation dengan **Ganti nama produk (mutation)**: entri yang cocok langsung ditandai stale, dan yang aktif langsung di-refetch, sehingga list mencerminkan perubahannya.',
    ],
    inCode: `\`\`\`tsx
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000 } },
})

function Todos() {
  const { data, isPending, isFetching } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })
  // isPending: no data yet. isFetching: any request in flight, including background refetches.
}

function AddTodo() {
  const qc = useQueryClient()
  const { mutate } = useMutation({
    mutationFn: createTodo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}
\`\`\`

Poin penting: key harus memuat setiap variabel yang memengaruhi fetch (\`['todos', { status, page }]\`); \`invalidateQueries\` mencocokkan berdasarkan prefix; \`gcTime\` (dulu \`cacheTime\`) baru mulai menghitung setelah query tidak punya observer lagi.`,
    realCase: {
      title: 'Daftar produk yang membombardir API setiap pindah tab',
      story: `**Situasi:** sebuah tool inventaris internal bermigrasi ke TanStack Query dan membiarkan semua default. Staf membiarkan aplikasi terbuka seharian dan terus-menerus berpindah jendela.

**Gejala:** log backend menunjukkan beberapa ratus request list per pengguna per jam, dan spinner background di list berkedip setiap kali seseorang kembali dari email.

**Akar masalah:** \`staleTime\` default-nya 0, jadi setiap query langsung stale dan melakukan refetch di setiap window focus dan setiap remount. Padahal datanya hanya berubah beberapa kali sehari, dan hanya lewat form di aplikasi itu sendiri.

**Perbaikan:** tim meng-set \`staleTime\` ke lima menit untuk query katalog, mempertahankan 0 untuk level stok, dan memanggil \`invalidateQueries({ queryKey: ['products'] })\` di \`onSuccess\` setiap mutation. Volume request turun lebih dari 90% sementara hasil edit tetap langsung muncul.`,
    },
    challenges: [
      { q: 'Apa beda staleTime dan gcTime?', a: 'staleTime menentukan berapa lama data dianggap fresh (tanpa refetch otomatis). gcTime menentukan berapa lama entri yang tidak dipakai (inactive) tetap di memori sebelum dihapus. Keduanya independen.' },
      { q: 'Sebuah query sedang stale dan window kembali mendapat focus. Apakah pengguna melihat spinner loading?', a: 'Bukan state loading penuh. Data dari cache tetap di layar sementara refetch berjalan di background (`isFetching` bernilai true, `isPending` bernilai false).' },
      { q: 'Kenapa melakukan invalidate setelah mutation, bukan meng-set list baru secara manual?', a: 'Invalidation menandai setiap key yang cocok sebagai stale dan me-refetch yang aktif dari sumber kebenaran, jadi varian yang difilter, dipaginasi dan diurutkan semuanya tetap benar. Update cache manual lebih cepat, tapi kamu harus meng-update sendiri setiap key yang terdampak.' },
      { q: 'Dua komponen di-mount dengan key `["user", 7]` bersamaan. Berapa request yang dikirim?', a: 'Satu. Query di-dedup berdasarkan key, dan kedua komponen mengamati entri cache yang sama.' },
    ],
  },

  // ───────────────────────────── Level 5 ─────────────────────────────
  'state-placement': {
    whatYouSee: `Pohon keputusan interaktif. Sebuah kartu menanyakan satu pertanyaan ya/tidak setiap kali; baris breadcrumb di atasnya mencatat jalurmu (Q1 → Q2 → …), dan kamu bisa mengklik crumb sebelumnya untuk kembali. Saat sampai di ujung, kartu hijau **Rekomendasi** (Recommendation) menyebutkan di mana state sebaiknya tinggal, tool yang dipakai, alasannya, dan contoh singkat. **Klasifikasikan state lainnya** (Classify another piece of state) memulai dari awal.

Pertanyaannya berurutan dari tempat yang **paling dekat** sampai yang **paling luas**: derived (bukan state sama sekali), server state, URL state, local state, lifted state, lalu external store untuk data bersama yang sering berubah, dan terakhir context untuk nilai yang jarang berubah tapi dibaca di banyak tempat. Konsepnya: sebagian besar kerumitan state management datang dari menaruh state lebih tinggi, atau di tool yang lebih berat, daripada yang dibutuhkan.`,
    steps: [
      'Klasifikasikan total keranjang: "Bisakah dihitung dari state lain?" Ya. Hasilnya: bukan state sama sekali, hitung saat render.',
      'Klasifikasikan daftar produk dari API kamu: Tidak, lalu Ya untuk "berasal dari server". Hasilnya: server state, ditangani TanStack Query atau Server Components, bukan useState + useEffect.',
      'Klasifikasikan filter kategori aktif di halaman toko: jawab Ya untuk "bertahan setelah refresh atau bisa dibagikan". Hasilnya: URL search params.',
      'Klasifikasikan apakah sebuah dropdown sedang terbuka. Kamu seharusnya berakhir di local state dengan `useState`.',
      'Klasifikasikan nama tampilan pengguna yang login, dipakai di header dan belasan tempat lain, dan jarang berubah. Kamu seharusnya berakhir di context. Lalu coba posisi kursor live yang dipakai banyak komponen: hasilnya external store.',
      'Pakai breadcrumb untuk loncat kembali ke Q1 dan lihat bagaimana satu jawaban berbeda di awal mengubah seluruh rekomendasi.',
    ],
    inCode: `Contoh untuk setiap tempat:

\`\`\`tsx
// Derived: no useState
const total = items.reduce((s, i) => s + i.price * i.qty, 0)

// Server state
const { data } = useQuery({ queryKey: ['products', filters], queryFn })

// URL state (Next.js App Router)
const params = useSearchParams()
const sort = params.get('sort') ?? 'price'

// Local
const [open, setOpen] = useState(false)

// External store with a selector (Zustand)
const count = useCart(s => s.items.length)
\`\`\`

Tanda bahaya yang jelas adalah \`useEffect(() => setX(f(y)), [y])\`: itu derived state yang disimpan dua kali. Tanda lainnya adalah menyalin data server ke global store, di mana data itu langsung mulai basi.`,
    realCase: {
      title: 'Filter yang hilang saat refresh',
      story: `**Situasi:** sebuah situs listing properti menyimpan filter pencarian (kota, rentang harga, jumlah kamar tidur) di slice Redux global.

**Gejala:** pengguna yang me-refresh, menekan Back dari sebuah listing, atau membagikan link ke teman mendarat di halaman pertama tanpa filter. Tiket support menggambarkannya sebagai "situsnya lupa pencarian saya".

**Akar masalah:** filter itu sebenarnya state berbentuk URL (harus bertahan setelah refresh, bisa dibagikan dan dinavigasi) tapi disimpan di memori.

**Perbaikan:** filter dipindah ke search params (\`?city=bandung&min=500&beds=2\`), dibaca dengan \`useSearchParams\` dan di-update dengan \`router.replace\`. Query key memuat params yang sudah di-parse, jadi cache listing juga mengikuti URL. Slice Redux-nya dihapus.`,
    },
    challenges: [
      { q: 'Di mana `fullName` sebaiknya tinggal kalau kamu sudah punya `firstName` dan `lastName` di state?', a: 'Tidak di mana-mana: hitung saat render. Menyimpannya menciptakan dua sumber kebenaran yang bisa tidak sinkron.' },
      { q: 'Kenapa context kurang cocok untuk nilai yang berubah di setiap ketikan dan dibaca banyak komponen?', a: 'Setiap consumer di-render ulang setiap kali nilainya berubah. Store dengan selector memungkinkan setiap komponen hanya berlangganan ke bagian yang dipakainya.' },
      { q: 'State mana yang otomatis tersimpan, bisa dibagikan dan paham tombol Back tanpa usaha tambahan?', a: 'URL state: search params dan route params.' },
    ],
  },

  // ───────────────────────────── Level 6 ─────────────────────────────
  'focus-trap': {
    whatYouSee: `Sebuah modal dialog yang berjalan sungguhan plus sekumpulan toggle, satu per perilaku aksesibilitas:

- **Pindahkan focus ke dalam dialog saat dibuka** (Move focus into the dialog on open)
- **Kurung Tab / Shift+Tab di dalam dialog** (Trap Tab / Shift+Tab inside the dialog)
- **Tutup dengan Escape** (Close on Escape)
- **Kembalikan focus ke tombol pemicu saat ditutup** (Restore focus to the trigger on close)
- **role="dialog" + aria-modal + aria-labelledby** pada dialog
- **Jadikan latar belakang inert** (Make the background inert)

Log live menampilkan \`document.activeElement\` setiap kali focus berpindah, jadi kamu bisa melihat persis di mana posisi pengguna keyboard atau screen reader. Dengan semuanya mati kamu mendapat dialog **rusak** yang dirilis banyak aplikasi; dengan semuanya menyala kamu mendapat pola yang **benar**. Konsepnya: modal harus memindahkan focus ke dalam, menahannya di dalam, membiarkan pengguna keluar dengan Escape, dan mengembalikan mereka ke tempat semula, sementara teknologi bantu diberi tahu bahwa sisa halaman sedang tidak tersedia.`,
    steps: [
      'Matikan semua toggle dan buka dialog dengan keyboard (Tab ke pemicu, tekan Enter). Log menunjukkan focus masih di pemicu, di belakang dialog: pengguna screen reader bahkan tidak tahu dialognya sudah terbuka.',
      'Masih dalam kondisi rusak: tekan Tab berulang kali. Log menunjukkan focus keluar dari dialog dan mendarat di link pada halaman di belakangnya.',
      'Nyalakan pemindahan focus saat dibuka dan pengurungan Tab. Buka lagi: focus mulai di dalam, dan Tab/Shift+Tab hanya berputar di antara kontrol dialog.',
      'Tekan Escape dengan toggle Escape mati, lalu menyala. Tanpa itu, pengguna keyboard harus Tab ke tombol tutup; dengan itu, dialog langsung tertutup.',
      'Tutup dialog dengan pengembalian focus mati: log menunjukkan focus di `body`, jadi Tab berikutnya mulai dari atas halaman. Nyalakan: focus kembali ke tombol pemicu.',
      'Nyalakan **role="dialog" + aria-modal + aria-labelledby** dan **Jadikan latar belakang inert**, lalu perhatikan kontrol di background tidak bisa lagi di-focus atau diklik, dan dialog diumumkan beserta judulnya.',
    ],
    inCode: `Implementasi benar yang paling sederhana di browser modern adalah elemen native \`<dialog>\` yang dibuka dengan \`showModal()\`, yang langsung memberimu focus masuk, background inert, Escape untuk menutup dan top layer tanpa usaha tambahan:

\`\`\`tsx
function ConfirmDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} aria-labelledby="confirm-title" onClose={onClose}>
      <h2 id="confirm-title">Delete project?</h2>
      <button autoFocus onClick={onClose}>Cancel</button>
    </dialog>
  )
}
\`\`\`

Kembalikan focus dengan menyimpan \`document.activeElement\` sebelum membuka dan memanggil \`.focus()\` padanya setelah menutup (browser sering melakukannya untuk \`showModal\`, tapi tetap cek). Untuk dialog custom, library seperti Radix UI atau React Aria mengimplementasikan pola lengkapnya. Di React 19, \`inert\` adalah prop boolean biasa: \`<main inert={open}>\`.`,
    realCase: {
      title: 'Dialog preferensi cookie yang tidak bisa ditinggalkan pengguna keyboard',
      story: `**Situasi:** sebuah situs pemesanan layanan publik membuat dialog preferensinya sendiri berupa \`div\` fixed di atas halaman.

**Gejala:** audit aksesibilitas menemukan bahwa pengguna keyboard langsung melewati dialog dan masuk ke halaman di belakangnya, pengguna screen reader mendengar form pemesanan alih-alih dialognya, dan setelah ditutup focus loncat ke atas dokumen sehingga pengguna harus menelusuri seluruh header lagi dengan Tab.

**Akar masalah:** dialog itu tidak pernah memindahkan focus ke dalam dirinya, tidak punya trap, tidak punya \`role="dialog"\`/\`aria-modal\`/label, membiarkan background tetap interaktif, dan tidak mengingat pemicunya.

**Perbaikan:** tim menggantinya dengan \`<dialog>\` native yang dibuka lewat \`showModal()\`, diberi label dari heading-nya, dengan tombol pertama auto-focus dan focus dikembalikan ke pemicu saat ditutup. Pengecekan otomatis (axe di integration test) plus test Playwright yang menelusuri dialog dengan Tab sekarang menjaga dari regresi.`,
    },
    challenges: [
      { q: 'Kenapa mengurung Tab saja belum cukup untuk membuat modal aksesibel bagi pengguna screen reader?', a: 'Screen reader bisa bernavigasi dengan virtual cursor tanpa Tab. Background juga harus disembunyikan dari teknologi bantu (`aria-modal` plus membuatnya `inert`), dan dialog butuh role dan nama yang aksesibel.' },
      { q: 'Apa yang seharusnya terjadi pada focus saat modal ditutup, dan kenapa?', a: 'Focus harus kembali ke elemen yang membukanya (biasanya pemicunya), supaya pengguna keyboard bisa melanjutkan dari posisi semula alih-alih mulai dari atas halaman.' },
      { q: 'Apa efek atribut `inert` pada konten background?', a: 'Atribut itu membuat subtree tidak bisa di-focus dan tidak bisa diklik, serta menyembunyikannya dari accessibility tree, sehingga baik Tab maupun teknologi bantu tidak bisa menjangkaunya.' },
    ],
  },

  // ───────────────────────────── Level 7 ─────────────────────────────
  'testing-trophy': {
    whatYouSee: `Diagram berbentuk piala dengan empat lapisan yang bisa diklik, dari atas ke bawah: **End-to-end** (merah, tutup kecil), **Integration** (biru, mangkuk lebar), **Unit** (ungu, batang sempit) dan **Static** (hijau, alas). Mengklik sebuah lapisan akan menyorotnya dan mengisi panel samping dengan kegunaannya, **Tools** yang umum dipakai, **Kecepatan** (Speed), **Tingkat kepercayaan** (Confidence) dan **Porsi kira-kira** (Rough share).

Konsepnya: bentuknya mencerminkan seberapa banyak test dari tiap jenis yang perlu ditulis. Static analysis murah dan selalu aktif. Integration test, yang me-render sebuah fitur dan berinteraksi dengannya seperti pengguna sambil hanya me-mock network, memberi keyakinan paling besar per menit, jadi porsinya paling besar (sekitar separuh). Unit test menangani logika murni yang rumit. Test end-to-end menjalankan browser sungguhan melalui beberapa alur kritis saja, karena lambat dan lebih rapuh.`,
    steps: [
      'Klik **Static**: TypeScript dan ESLint langsung menangkap typo, type yang salah dan pelanggaran aturan hook, sebelum test apa pun dijalankan.',
      'Klik **Unit**: cepat dan presisi, tapi perhatikan keyakinan "Sempit" (Narrow): test reducer yang lolos tidak banyak memberi tahu apakah layarnya berfungsi.',
      'Klik **Integration** dan bandingkan porsinya (~50%) dengan yang lain. Di sinilah tool seperti Testing Library dan MSW berada.',
      'Klik **End-to-end**: keyakinan tertinggi, paling lambat. Pikirkan dua atau tiga alur di aplikasimu yang layak mendapatkannya (login, checkout).',
      'Pilih fitur yang baru kamu bangun dan putuskan, lapisan demi lapisan, test mana yang akan kamu tulis pertama. Biasanya jawabannya integration test.',
    ],
    inCode: `Integration test di lapisan terlebar piala, memakai Vitest, Testing Library dan MSW:

\`\`\`tsx
server.use(http.get('/api/todos', () => HttpResponse.json([{ id: 1, title: 'Write tests' }])))

test('adds a todo', async () => {
  const user = userEvent.setup()
  render(<TodoPage />, { wrapper: Providers })
  expect(await screen.findByText('Write tests')).toBeInTheDocument()
  await user.type(screen.getByRole('textbox', { name: /new todo/i }), 'Ship it')
  await user.click(screen.getByRole('button', { name: /add/i }))
  expect(await screen.findByText('Ship it')).toBeInTheDocument()
})
\`\`\`

Query berdasarkan role dan accessible name (yang dilihat pengguna dan teknologi bantu), bukan berdasarkan nama class atau test id. Hindari me-mock komponenmu sendiri; mock batas network-nya saja. Perlu dicatat, async Server Components belum didukung dengan baik oleh Testing Library, jadi tangani dengan test end-to-end.`,
    realCase: {
      title: 'Coverage unit 100%, checkout rusak',
      story: `**Situasi:** tim front-end sebuah retailer punya coverage unit hampir total: setiap komponen dites terpisah dengan children dan hook-nya di-mock.

**Gejala:** sebuah release merusak tombol checkout untuk salah satu metode pembayaran. Semua test hijau.

**Akar masalah:** unit test justru me-mock integrasi yang gagal itu: komponen metode pembayaran dan ringkasan pesanan tidak sepakat soal prop yang diganti namanya. Masing-masing lolos test-nya sendiri terhadap mock versi pihak lainnya.

**Perbaikan:** tim mengganti sebagian besar test komponen yang penuh mock dengan integration test yang me-render seluruh langkah checkout dengan handler MSW untuk API, menambah satu alur Playwright per metode pembayaran, dan mengaktifkan TypeScript yang lebih ketat, yang seharusnya sudah menandai prop yang diganti namanya saat compile.`,
    },
    challenges: [
      { q: 'Kenapa piala ini memberi porsi terbesar untuk integration test?', a: 'Integration test menjalankan banyak unit yang bekerja bersama seperti yang dialami pengguna, tapi tetap cukup cepat untuk sering dijalankan. Hasilnya keyakinan terbaik per satuan usaha.' },
      { q: 'Apa yang sebaiknya di-mock di integration test front-end?', a: 'Idealnya hanya batas network (misalnya dengan MSW), bukan komponen atau hook milikmu sendiri.' },
      { q: 'Sebutkan satu jenis bug yang ditangkap static analysis sehingga tidak perlu test.', a: 'Typo dan ketidakcocokan type (nama atau type prop yang salah), serta pelanggaran Rules of Hooks yang ditangkap ESLint.' },
    ],
  },

  // ───────────────────────────── Level 8 ─────────────────────────────
  transition: {
    whatYouSee: `Sebuah input teks memfilter **list lambat** yang disengaja (setiap item membakar CPU, jadi satu render penuh butuh beberapa ratus milidetik). Tekan **Mulai demo** (Start demo) dulu. Tiga statistik mengukur apa yang dirasakan pengguna: **rata-rata lag input** (avg input lag) dan lag **terburuk** (worst) (waktu dari ketikan sampai browser bisa paint, merah di atas 100/200 ms), serta **status list** (list status) ("memperbarui…" kuning saat list tertinggal, "sudah terbaru" hijau). List meredup selama datanya basi.

Saklar **Strategi update** (Update strategy) membandingkan **setState biasa** (Normal setState), **useTransition** dan **useDeferredValue**.

Konsepnya: tidak semua update sama mendesaknya. Mengetik harus terasa instan; list hasil filter boleh sedikit tertinggal. Transition dan deferred value menandai render yang mahal sebagai bisa diinterupsi, jadi React bisa meninggalkannya saat ketikan baru datang dan input tetap responsif.`,
    steps: [
      'Tekan **Mulai demo** (Start demo), biarkan di **setState biasa** (Normal setState) dan ketik serentetan karakter dengan cepat. Input tersendat dan lag terburuk naik jauh di atas 200 ms: setiap ketikan menunggu seluruh list.',
      'Pindah ke **useTransition** dan ketik rentetan yang sama. Input bisa mengikuti, lag tetap rendah, dan "memperbarui…" tampil selama list mengejar (inilah `isPending`).',
      'Pindah ke **useDeferredValue** dan ketik lagi. Hasilnya mirip: list di-render dengan teks lama dulu (murah, karena di-memoize), lalu dengan teks baru di background.',
      'Di salah satu mode non-blocking, ketik terus selama beberapa detik: list mungkin tidak ter-update sampai kamu berhenti, karena React terus membuang render yang sudah usang.',
      'Bandingkan angka rata-rata lag di ketiga mode. Delay inilah yang diukur metrik INP (Interaction to Next Paint).',
    ],
    inCode: `\`\`\`tsx
// useTransition: you own the state update
const [isPending, startTransition] = useTransition()
function onChange(v: string) {
  setText(v)                                // urgent
  startTransition(() => setFilter(v))       // can be interrupted
}

// useDeferredValue: you only receive a value
const deferred = useDeferredValue(text)
const stale = text !== deferred
return <div style={{ opacity: stale ? 0.5 : 1 }}><SlowList query={deferred} /></div>
\`\`\`

Child yang mahal harus di-memoize (\`memo\` atau React Compiler), kalau tidak ia ikut di-render ulang bersama update yang mendesak. Transition tidak membuat pekerjaan lebih cepat; transition membuatnya bisa diinterupsi. Di React 19, \`startTransition\` juga menerima fungsi async (Actions), dan navigasi router di Next.js adalah transition. State milik input controlled itu sendiri tidak boleh di-set di dalam transition.`,
    realCase: {
      title: 'Kolom search-as-you-type dengan ketikan 400 ms',
      story: `**Situasi:** sebuah portal HR memfilter direktori 5.000 orang di client, me-render kartu lengkap dengan avatar dan badge di setiap ketikan.

**Gejala:** di laptop kelas menengah, karakter muncul berentetan; real-user monitoring menandai INP halaman itu sebagai buruk.

**Akar masalah:** nilai input dan list hasil filter di-update di render mendesak yang sama. Setiap ketikan harus menunggu ribuan kartu selesai di-render sebelum browser bisa menampilkan karakternya.

**Perbaikan:** list menerima \`useDeferredValue(query)\` dan di-memoize, list meredup selama basi, dan kartunya di-virtualisasi. INP masuk ke kategori "good" tanpa perlu menambah debounce.`,
    },
    challenges: [
      { q: 'Kenapa list lambat harus di-memoize supaya useDeferredValue membantu?', a: 'React pertama-tama me-render ulang dengan deferred value lama. Kalau list tidak di-memoize, render mendesak itu tetap me-render seluruh list lambat, jadi tidak ada untungnya.' },
      { q: 'Haruskah kamu membungkus `setText` milik input itu sendiri dengan startTransition?', a: 'Tidak. Input harus ter-update secara mendesak; menaruh state-nya di transition membuat mengetik terasa rusak. Bungkus hanya update turunan yang mahal.' },
      { q: 'Apa beda useTransition dan useDeferredValue?', a: 'useTransition membungkus update state yang kamu kendalikan dan memberimu isPending. useDeferredValue memberimu salinan tertinggal dari nilai yang kamu terima (misalnya prop) saat kamu tidak bisa membungkus update-nya.' },
    ],
  },

  'virtual-list': {
    whatYouSee: `List pesanan yang bisa di-scroll dengan saklar **Mode rendering** (Rendering mode) (**Render semua baris** (Render every row) vs **Divirtualisasi** (Virtualized)) dan pemilih **Baris** (Rows) (1.000, 10.000 atau 30.000). Dua statistik mengukur biayanya: **Node DOM di list** (DOM nodes in list) (merah di atas 5.000) dan waktu **render + commit terakhir** (last render + commit) (merah di atas 100 ms).

Konsepnya: browser harus membuat, memberi style, dan menghitung layout setiap DOM node, bahkan yang jauh di luar layar. List yang di-virtualisasi hanya me-render baris di dalam viewport plus beberapa baris **overscan** (di sini 4), diposisikan secara absolut di dalam elemen spacer setinggi list penuh. Scrollbar-nya terlihat sama persis, tapi DOM tetap hanya berisi beberapa puluh baris, sebesar apa pun datanya.`,
    steps: [
      'Pilih **Render semua baris** (Render every row) dengan 1.000 baris dan catat jumlah node serta waktu render-nya.',
      'Ganti Baris ke 10.000, lalu 30.000. Jumlah DOM node tumbuh sampai puluhan ribu, waktu render menjadi merah, dan pergantiannya sendiri terasa lama.',
      'Pindah ke **Divirtualisasi** (Virtualized) dengan 30.000 baris. Jumlah node turun ke beberapa puluh dan waktu render ke beberapa milidetik.',
      'Scroll list yang di-virtualisasi dengan cepat. Nomor baris ter-update sambil jalan, sementara jumlah node hampir konstan: baris didaur ulang, bukan ditambah.',
      'Pikirkan apa yang jadi rusak: Find di browser (Ctrl+F) tidak bisa menemukan baris di luar layar pada list virtual, dan baris dengan tinggi berbeda-beda perlu diukur.',
    ],
    inCode: `Dengan TanStack Virtual:

\`\`\`tsx
const parentRef = useRef<HTMLDivElement>(null)
const virtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 32,
  overscan: 4,
})

return (
  <div ref={parentRef} style={{ height: 320, overflow: 'auto' }}>
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map(v => (
        <div key={v.key} style={{ position: 'absolute', top: 0, transform: \`translateY(\${v.start}px)\`, height: v.size, width: '100%' }}>
          <Row row={rows[v.index]} />
        </div>
      ))}
    </div>
  </div>
)
\`\`\`

Untuk tinggi yang bervariasi, oper \`measureElement\` sebagai ref. Sebelum memakai virtualisasi, pertimbangkan pagination atau CSS \`content-visibility: auto\`, yang lebih sederhana untuk list ukuran sedang.`,
    realCase: {
      title: 'Tabel logistik yang membeku delapan detik',
      story: `**Situasi:** layar pelacakan pengiriman memuat semua pengiriman yang masih terbuka di sebuah gudang (sekitar 20.000) ke dalam tabel HTML dengan sepuluh kolom dan ikon status.

**Gejala:** membuka halaman membuat tab membeku beberapa detik; di PC kantor yang lebih tua kadang muncul prompt "page unresponsive". Mengurutkan kolom membuatnya membeku lagi.

**Akar masalah:** setiap baris menghasilkan sekitar lima belas DOM node, jadi halaman membuat ratusan ribu node di setiap render dan pengurutan, membebani layout dan memori.

**Perbaikan:** tabel di-virtualisasi dengan tinggi baris tetap dan header sticky, sehingga hanya sekitar empat puluh baris di DOM. Tim menambahkan pencarian di sisi server karena Find di browser tidak lagi menjangkau baris di luar layar, dan menjaga navigasi keyboard tetap berfungsi dengan men-scroll baris yang sedang di-focus ke dalam tampilan.`,
    },
    challenges: [
      { q: 'Kenapa list yang di-virtualisasi butuh elemen spacer setinggi list penuh?', a: 'Supaya container scroll punya tinggi total dan scrollbar yang benar, walaupun hanya beberapa baris yang benar-benar di-render.' },
      { q: 'Untuk apa overscan?', a: 'Overscan me-render beberapa baris ekstra di atas dan di bawah viewport supaya scroll cepat tidak memperlihatkan area kosong sebelum render berikutnya.' },
      { q: 'Sebutkan satu trade-off virtualisasi.', a: 'Baris di luar layar tidak ada di DOM, jadi Find di browser, sebagian tool aksesibilitas dan fitur print tidak melihatnya, dan tinggi baris yang bervariasi perlu diukur.' },
    ],
  },

  // ───────────────────────────── Level 9 ─────────────────────────────
  fiber: {
    whatYouSee: `Sebuah fiber tree (HostRoot → App → Header/Main → …) yang dianimasikan melewati work loop React. Pill di bagian atas menunjukkan **fase** saat ini (**Fase render (bisa diinterupsi)** (Render phase (interruptible)), **Pekerjaan mendesak** (Urgent work), atau **Fase commit** (Commit phase)) dan **lane** (prioritas) pekerjaannya. Di dalam tree: outline **biru** dengan "↓ begin" menandai \`beginWork\` yang bergerak turun, outline **ungu** dengan "↑ complete" menandai \`completeWork\` yang naik kembali, dan isian warna mencatat fiber mana yang sudah di-begin atau di-complete di putaran ini. Semuanya berubah **hijau** setelah di-commit ke DOM.

Pakai kontrol langkah, dan toggle **Interupsi dengan update mendesak** (Interrupt with an urgent update).

Konsepnya: rendering adalah penelusuran depth-first yang bisa berhenti sejenak di antara fiber (setiap ~5 ms React mengecek \`shouldYield\`). Commit berjalan sinkron dan tidak pernah diinterupsi. Lane dengan prioritas lebih tinggi, seperti klik, bisa menyela sebuah transition, yang kemudian diulang dari awal.`,
    steps: [
      'Dengan toggle mati, maju pelan-pelan. Perhatikan urutannya: begin turun sampai Logo, Logo complete (ia daun), lalu Nav di-begin: depth-first, anak sebelum saudara, complete dalam perjalanan naik.',
      'Terus maju sampai App dan HostRoot complete. Sampai di sini belum ada yang menyentuh DOM: pekerjaan render murni persiapan.',
      'Masuk ke commit: seluruh tree langsung hijau sekaligus. Mutasi DOM, lalu layout effect, lalu passive effect (useEffect) dijadwalkan.',
      'Nyalakan **Interupsi dengan update mendesak** (Interrupt with an urgent update) dan maju lagi. Di tengah jalan, jatah waktunya habis dan React memberi giliran ke browser.',
      'Terus maju: update SyncLane (sebuah klik) di-render dan di-commit lebih dulu, lalu tree transition yang setengah jadi dibuang dan rendering diulang dari root.',
      'Tanya dirimu kenapa ini mengharuskan fungsi render murni (pure): sebuah komponen di putaran yang ditinggalkan sudah dipanggil, tapi hasilnya tidak pernah sampai ke layar.',
    ],
    inCode: `Kamu tidak menulis kode fiber, tapi konsekuensinya membentuk cara kamu menulis komponen:

- Fungsi render bisa dipanggil, dijeda, dibuang dan dipanggil lagi. Fungsi itu harus **pure**: tanpa subscription, network request atau mutasi variabel luar saat render.
- Side effect tempatnya di event handler atau effect, yang hanya berjalan untuk pekerjaan yang sudah di-commit.
- Prioritas diekspos lewat API: update mendesak dari event diskrit (klik, mengetik), \`startTransition\` untuk pekerjaan yang bisa diinterupsi, \`useDeferredValue\` untuk nilai yang tertinggal, dan Suspense untuk menunggu.

\`\`\`tsx
function Row({ item }: { item: Item }) {
  analytics.track('row-rendered')   // wrong: may fire for renders that never commit
  useEffect(() => { analytics.track('row-shown') }, [])  // runs only after commit
  return <li>{item.name}</li>
}
\`\`\``,
    realCase: {
      title: 'Hitungan impression yang 30% kebanyakan',
      story: `**Situasi:** sebuah marketplace menghitung "impression" produk dengan memanggil fungsi tracking langsung di dalam body render setiap kartu produk.

**Gejala:** setelah transition diaktifkan untuk perubahan filter, analitik melaporkan impression jauh lebih banyak dari produk yang benar-benar ditampilkan, dan angkanya berbeda antara development dan production.

**Akar masalah:** dengan concurrent rendering, React bisa mulai me-render sebuah transition, diinterupsi oleh ketikan, membuang pekerjaan itu, lalu me-render lagi. Setiap render yang ditinggalkan tetap memanggil fungsi tracking. Double render StrictMode di development menggelembungkan angkanya lebih jauh.

**Perbaikan:** tracking dipindah ke dalam effect (dan belakangan ke hook berbasis IntersectionObserver), sehingga hanya berjalan untuk kartu yang sudah di-commit dan terlihat.`,
    },
    challenges: [
      { q: 'Bisakah fase commit diinterupsi oleh klik?', a: 'Tidak. Commit berjalan sinkron supaya DOM tidak pernah tertinggal setengah ter-update. Hanya fase render yang bisa diinterupsi.' },
      { q: 'Dalam urutan apa `beginWork` dan `completeWork` dipanggil untuk parent dengan dua anak daun A dan B?', a: 'begin(parent), begin(A), complete(A), begin(B), complete(B), complete(parent).' },
      { q: 'Kenapa komponen harus pure agar concurrent rendering aman?', a: 'React bisa memanggil komponen lalu membuang hasilnya (setelah interupsi atau demi update berprioritas lebih tinggi). Side effect saat render akan berjalan untuk pekerjaan yang tidak pernah sampai ke layar.' },
    ],
  },

  'hooks-list': {
    whatYouSee: `Komponen \`Form\` dengan empat panggilan hook: \`useState\` untuk name dan surname, \`useEffect\` bernama persistForm, dan \`useState\` untuk age. Kolom kiri menampilkan **Daftar hook di fiber (dari mount)** (Fiber's hook list (from mount)) seperti yang tersimpan saat mount: empat slot, diberi nomor sesuai posisi. Kolom kanan memutar ulang panggilan yang terjadi saat re-render, hijau kalau setiap panggilan sejajar dengan slot tersimpannya dan merah kalau menerima data milik hook lain.

Kontrolnya: **Taruh hook di dalam if (melanggar Rules of Hooks)** (Put a hook inside an if (breaks the Rules of Hooks)), **Re-render dengan name = ''** (Re-render with name = '') dan **Reset**.

Konsepnya: di dalam React, hook tidak punya nama, hanya **posisi** di linked list pada fiber. Di setiap render React menelusuri list itu berurutan, memberikan slot tersimpan berikutnya ke panggilan hook berikutnya. Kalau ada panggilan yang terlewat, setiap hook setelahnya mendapat state milik tetangganya.`,
    steps: [
      'Dengan toggle mati, klik **Re-render dengan name = \'\'** (Re-render with name = \'\'). Keempat panggilan hijau: urutan sama, slot sama.',
      'Klik **Reset**, nyalakan toggle dan baca kode yang ter-update: `useState(\'Putri\')` sekarang ada di dalam `if (name !== \'\')`.',
      'Klik **Re-render dengan name = \'\'**. Slot #2 diberikan ke panggilan effect, slot #3 ke state age ("menerima data milik useEffect!"), dan slot #4 tidak punya panggilan sama sekali.',
      'Baca baris merah terakhir: React mendeteksi bahwa jumlah hook yang di-render lebih sedikit dari render sebelumnya dan melempar error.',
      'Pikirkan versi yang benar: panggil `useState` tanpa syarat dan taruh kondisinya di dalam effect atau di JSX.',
    ],
    inCode: `\`\`\`tsx
// Breaks the Rules of Hooks
if (name !== '') {
  const [surname, setSurname] = useState('Putri')
}

// Fine: hook always called; condition used inside
const [surname, setSurname] = useState('Putri')
useEffect(() => {
  if (name !== '') localStorage.setItem('form', name)
}, [name])
\`\`\`

Hal yang sama berlaku untuk early return sebelum hook, hook di dalam loop yang panjangnya berubah-ubah, dan hook di dalam callback. Rule \`eslint-plugin-react-hooks\` menangkap semua ini. Satu pengecualian yang disengaja: \`use()\` di React 19 bukan hook dalam pengertian ini dan boleh dipanggil secara kondisional, karena tidak menyimpan state di slot.`,
    realCase: {
      title: 'Halaman profil yang crash hanya untuk pengguna baru',
      story: `**Situasi:** sebuah komponen melakukan early return dengan \`if (!user) return <Spinner />\` dan memanggil \`useMemo\` serta \`useEffect\` setelah baris itu.

**Gejala:** sebagian besar pengguna baik-baik saja, tapi pengguna yang baru mendaftar melihat halaman kosong dengan "Rendered more hooks than during the previous render" di error tracker.

**Akar masalah:** akun baru memuat user secara async, jadi render pertama melakukan early return dengan hook lebih sedikit, dan render berikutnya saat user sudah ada memanggil hook lebih banyak. Pengguna lama biasanya sudah punya user di cache, jadi early return itu tidak pernah terjadi untuk mereka.

**Perbaikan:** semua hook dipindah ke atas early return (dengan memo dan effect menangani user yang belum ada di dalamnya), dan lint rule hooks dinaikkan dari warning menjadi error di CI.`,
    },
    challenges: [
      { q: 'Bagaimana React tahu panggilan `useState` mana yang mendapat nilai mana saat re-render?', a: 'Dari urutan pemanggilan. Hook disimpan sebagai list di fiber dan dicocokkan berdasarkan posisi, bukan nama variabel.' },
      { q: 'Apakah early `return` sebelum pemanggilan hook bermasalah?', a: 'Ya, kalau early return terjadi di sebagian render tapi tidak di render lain: jumlah dan urutan hook berubah antar-render.' },
      { q: 'Bolehkah `use(promise)` dipanggil di dalam `if`?', a: 'Boleh. `use` adalah satu-satunya API React yang didokumentasikan boleh dipanggil secara kondisional, karena tidak menempati slot hook dengan cara yang sama seperti hook yang menyimpan state.' },
    ],
  },

  // ───────────────────────────── Level 10 ─────────────────────────────
  'rendering-strategies': {
    whatYouSee: `Timeline ilustratif untuk satu kali load halaman, dengan tiga baris: **server**, **jaringan** (network) dan **browser**. Bar berwarna diputar secara real time: ungu = rendering di server, abu-abu = HTML di network, kuning = mengunduh/menjalankan JavaScript, merah = mengambil data, biru = render di client, hijau = hydration. Dua penanda putus-putus menunjukkan **FCP** (first contentful paint) dan **Interaktif** (Interactive). Di kanan, "Yang dilihat pengguna" menampilkan layar kosong, lalu konten yang terlihat tapi belum bisa dipakai ("Beli (belum bisa)" (Buy (not yet))), lalu konten interaktif ("Beli (berfungsi)" (Buy (works))).

Saklar **Strategi** (Strategy) memutar ulang load untuk **CSR**, **SSR**, **SSG**, **Streaming** dan **PPR**.

Konsepnya: strategi-strategi ini berbeda dalam hal **di mana** HTML dihasilkan dan **kapan**: di browser, per request di server, saat build, secara bertahap, atau sebagai shell statis dengan lubang dinamis. Itulah yang menentukan kapan konten muncul dan kapan bisa dipakai.`,
    steps: [
      'Putar **CSR**. Layar tetap kosong sampai JavaScript selesai diunduh, dijalankan, mengambil data dan me-render: FCP dan Interaktif datang bersamaan, dan terlambat.',
      'Putar **SSR**. Konten muncul jauh lebih awal, tapi server menunggu semua data dulu, dan di antara FCP dan Interaktif tombol Beli terlihat tapi tidak berbuat apa-apa (celah hydration).',
      'Putar **SSG**. HTML ter-cache dari CDN memberi FCP paling awal. Tanyakan: seberapa segar konten ini?',
      'Putar **Streaming**. Shell datang hampir seketika sementara data lambat masih dimuat di server; sisanya mengalir masuk sebagai chunk dan di-hydrate terpisah.',
      'Putar **PPR**. Shell statis disajikan seperti SSG sementara data dinamis mulai diproses di server secara paralel, lalu mengalir ke lubang-lubangnya. Bandingkan FCP-nya dengan SSR dan kesegarannya dengan SSG.',
    ],
    inCode: `Di Next.js 16.4 App Router, ini sebagian besar adalah pilihan soal data dan caching, bukan API yang terpisah:

\`\`\`tsx
// Static by default when there is no dynamic data (SSG-like)
export default async function Page() {
  const posts = await getPosts()   // cacheable data
  return <PostList posts={posts} />
}

// Streaming: wrap slow parts in Suspense
<Suspense fallback={<ReviewsSkeleton />}>
  <Reviews productId={id} />       {/* async Server Component */}
</Suspense>
\`\`\`

Dengan Cache Components aktif (\`cacheComponents: true\`, default di project \`create-next-app\` baru sejak 16.4), Next.js melakukan prerender pada shell statis dan men-stream bagian dinamis yang dibungkus Suspense (cookies, headers, fetch tanpa cache) saat request: itulah Partial Prerendering. Pakai \`'use cache'\` dengan \`cacheLife\`/\`cacheTag\` untuk membuat data statis, dan \`revalidateTag\` setelah mutation. CSR murni masih cocok untuk dashboard yang butuh login di mana SEO tidak penting.`,
    realCase: {
      title: 'Halaman produk yang menunggu widget paling lambatnya',
      story: `**Situasi:** halaman produk sebuah e-commerce di-render di server per request dan menunggu detail produk, harga, stok, rekomendasi dan ulasan sebelum mengembalikan HTML apa pun.

**Gejala:** time to first byte lebih dari dua detik setiap kali layanan rekomendasi lambat, dan konversi mobile turun di jam sibuk.

**Akar masalah:** SSR klasik itu semua-atau-tidak-sama-sekali: halaman tidak bisa mengirim satu byte pun sampai dependency paling lambat selesai, padahal rekomendasi ada di bawah lipatan layar.

**Perbaikan:** tim memindah halaman ke shell statis (info produk di-cache dan di-revalidate berdasarkan tag saat diedit), membungkus stok, rekomendasi dan ulasan dalam Suspense boundary terpisah yang mengalir masuk, dan memindahkan library markdown komponen ulasan ke server. First paint turun ke beberapa ratus milidetik, dan panggilan rekomendasi yang lambat sekarang hanya menunda bagiannya sendiri.`,
    },
    challenges: [
      { q: 'Kenapa halaman SSR bisa menampilkan tombol Buy yang tidak merespons klik?', a: 'HTML-nya sudah terlihat sebelum JavaScript selesai diunduh dan melakukan hydration. Sampai hydration memasang event handler, tombol itu tidak berfungsi.' },
      { q: 'Apa yang diubah streaming dibandingkan SSR klasik?', a: 'Server langsung mengirim shell dan men-stream setiap Suspense boundary saat datanya siap, alih-alih menunggu semua data sebelum mengirim apa pun.' },
      { q: 'Apa ide inti Partial Prerendering?', a: 'Satu route punya shell statis hasil prerender yang langsung disajikan dari cache, plus lubang dinamis (di dalam Suspense) yang di-render saat request dan di-stream masuk.' },
    ],
  },

  'rsc-boundary': {
    whatYouSee: `Sebuah teka-teki pada component tree halaman produk. Node **ungu** adalah Server Components (0 kb JS client); node **kuning** adalah Client Components dan menampilkan biaya bundle-nya. Setiap node diberi tag "db" kalau membaca database atau "state" kalau memakai \`useState\`/\`onClick\`. Klik sebuah node untuk menyalakan/mematikan directive \`'use client'\` padanya (ditampilkan di atas node). **Outline merah** menandai build error. **Garis putus-putus** berarti child dioper sebagai \`children\`, bukan di-import.

Panel samping menampilkan **JS yang dikirim ke client** (Client JS shipped) (merah di atas 60 kb) dan daftar **Error build** (Build errors). Checkbox **Kirim <Reviews> ke Tabs sebagai children** (Pass <Reviews> to Tabs as children) beralih antara menyelipkan Reviews dan meng-import-nya di dalam Tabs.

Konsepnya: \`'use client'\` menandai sebuah boundary; file itu dan semua yang di-**import**-nya menjadi kode client. Komponen yang dioper sebagai props atau children dari Server Component tetap berada di server.`,
    steps: [
      'Mulai dari default (Gallery dan Tabs sudah ditandai). Cek daftar error: AddToCart memakai state tapi masih Server Component. Klik **AddToCart** untuk menandainya dan menghapus error.',
      'Coba tandai **Details** alih-alih AddToCart. Error-nya hilang, tapi Price ikut tertarik ke client, dan bundle membesar. Dorong directive-nya turun ke daun.',
      'Tandai **ProductPage** itu sendiri. Semuanya menjadi kode client, bundle melonjak, dan ProductPage serta Reviews sekarang error karena membaca database.',
      'Kembali ke solusi minimal dan hilangkan centang **Kirim <Reviews> ke Tabs sebagai children** (Pass <Reviews> to Tabs as children). Reviews dan library Markdown 70 kb-nya sekarang di-import oleh Client Component, jadi keduanya masuk ke bundle dan Reviews tidak bisa lagi mengakses database.',
      'Centang lagi checkbox-nya: garis putus-putus kembali, Reviews di-render di server di dalam Tabs yang client, dan bundle menyusut. Targetkan nol error dengan bundle sekecil mungkin.',
    ],
    inCode: `\`\`\`tsx
// app/product/[id]/page.tsx  (Server Component by default)
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await db.product.find(id)
  return (
    <Tabs>                          {/* client */}
      <Reviews productId={id} />    {/* still a Server Component: passed as children */}
    </Tabs>
  )
}

// components/Tabs.tsx
'use client'
export function Tabs({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState('reviews')
  return <div>{/* tab buttons */}{tab === 'reviews' && children}</div>
}
\`\`\`

Props yang melintasi boundary harus bisa diserialisasi (tidak boleh fungsi kecuali Server Actions, tidak boleh instance class). Import \`'server-only'\` di modul yang menyentuh secret atau database, supaya import yang tidak sengaja dari client membuat build gagal.`,
    realCase: {
      title: 'Layout 300 kb gara-gara satu directive',
      story: `**Situasi:** root layout sebuah situs konten butuh pengganti tema, jadi seorang developer menambahkan \`'use client'\` di bagian atas \`layout.tsx\` supaya \`useState\` bisa dipakai.

**Gejala:** setelah deploy, JavaScript yang dikirim ke setiap halaman jadi tiga kali lipat, skor Lighthouse turun, dan modul khusus server yang membaca secret environment mulai membuat build gagal dengan error yang membingungkan.

**Akar masalah:** directive itu mengubah layout, beserta semua yang di-import-nya (navigasi, footer, renderer markdown, library tanggal), menjadi kode client. Modul secret itu sekarang ikut di-bundle untuk browser.

**Perbaikan:** \`'use client'\` dipindah ke komponen daun kecil \`ThemeToggle\`, layout kembali menjadi Server Component yang me-render-nya, dan modul secret diberi \`import 'server-only'\` supaya import dari client di masa depan langsung gagal dengan jelas.`,
    },
    challenges: [
      { q: 'Sebuah Client Component meng-import komponen tanpa directive. Komponen itu server atau client?', a: 'Client. Semua yang di-import dari modul \'use client\' menjadi bagian dari bundle client.' },
      { q: 'Bagaimana Server Component yang membaca database bisa di-render di dalam Client Component?', a: 'Render di parent yang berupa Server Component dan oper ke Client Component sebagai `children` (atau prop lain). Client menerima hasil yang sudah di-render.' },
      { q: 'Kenapa lebih baik menaruh `\'use client\'` di komponen daun?', a: 'Itu menjaga bundle client tetap kecil dan membiarkan sisa tree tetap di server, di mana ia bisa mengakses data langsung dan tidak mengirim JavaScript.' },
    ],
  },

  // ───────────────────────────── Level 11 ─────────────────────────────
  xss: {
    whatYouSee: `Ketik komentar berisi HTML di input, misalnya \`<b>hi</b><img src=x onerror="alert(1)">\`. Tiga panel me-render string yang sama dengan tiga cara:

- **1. Bawaan React** (1. React default): \`{comment}\` di JSX. Kamu melihat tanda kurung siku apa adanya sebagai teks; tidak ada yang ditafsirkan sebagai markup.
- **2. dangerouslySetInnerHTML (tanpa sanitasi)** (2. dangerouslySetInnerHTML (unsanitized)): string dimasukkan sebagai HTML. Demi keamanan, ditampilkan di dalam iframe sandbox sehingga script tidak benar-benar bisa jalan, dan bagian berbahayanya (atribut event handler, tag \`script\`, URL \`javascript:\`) disorot.
- **3. Disanitasi (allowlist)** (3. Sanitized (allowlist)): string dilewatkan ke sanitizer yang hanya mempertahankan tag dan atribut yang diizinkan, jadi format seperti bold tetap ada dan apa pun yang bisa dieksekusi dibuang.

Konsepnya: React meng-escape teks secara default, dan itu mencegah sebagian besar cross-site scripting (XSS). Risikonya kembali setiap kali kamu melewati mekanisme itu, dan cara aman untuk me-render HTML dari pengguna adalah menyanitasinya dengan allowlist.`,
    steps: [
      'Ketik teks biasa, lalu `<b>bold</b>`. Panel escaped menampilkan tag sebagai karakter; panel mentah dan tersanitasi menampilkan teks tebal.',
      'Tambahkan `<img src=x onerror="alert(1)">`. Di panel mentah atribut `onerror` disorot: di halaman sungguhan ini akan langsung jalan begitu gambar rusak gagal dimuat. Panel tersanitasi mempertahankan gambar tapi membuang `onerror` (atau membuang gambarnya sekalian, tergantung allowlist).',
      'Coba `<a href="javascript:alert(1)">click</a>`. Perhatikan bahwa skema URL-nya sendiri adalah serangannya: sanitizer harus mengecek nilai atribut, bukan hanya namanya.',
      'Coba `<script>alert(1)</script>`. Detail menarik: script yang disisipkan lewat innerHTML tidak dieksekusi, itulah kenapa serangan sungguhan lebih memilih event handler dan URL; sanitizer tetap membuang tag itu.',
      'Bandingkan panel-panelnya dan putuskan mana yang akan kamu pakai untuk ulasan produk, dan mana untuk rich text dari editor tepercaya (tetap disanitasi: kepercayaan bisa berubah).',
    ],
    inCode: `\`\`\`tsx
// Safe by default: React escapes text
<p>{comment.body}</p>

// Dangerous: only with sanitized input
import DOMPurify from 'dompurify'
const clean = DOMPurify.sanitize(comment.html, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'li'],
  ALLOWED_ATTR: ['href'],
})
<div dangerouslySetInnerHTML={{ __html: clean }} />
\`\`\`

Cara lain XSS menyelinap melewati escaping React:

- \`href\`/\`src\` yang dibangun dari input pengguna (URL \`javascript:\`). Validasi skemanya (izinkan hanya \`https:\` dan \`mailto:\`). React 19 memblokir URL \`javascript:\` di \`href\`, tapi jangan hanya mengandalkan itu.
- Menyerialisasi data ke dalam tag \`<script>\` untuk hydration tanpa meng-escape \`</script>\`.
- Rendering markdown ke HTML di server tanpa sanitasi.

Tambahkan Content-Security-Policy sebagai lapisan pertahanan tambahan (dengan \`require-trusted-types-for 'script'\`, React 19.3 menerima \`TrustedHTML\` dari policy sanitasimu), dan lakukan sanitasi di server kalau memungkinkan.`,
    realCase: {
      title: 'Chat support yang membocorkan session agen',
      story: `**Situasi:** widget help-desk mengizinkan pelanggan mengirim pesan dengan format sederhana. Untuk menampilkan bold dan link, dashboard agen me-render pesan dengan \`dangerouslySetInnerHTML\` dan regex buatan sendiri yang menghapus tag \`<script>\`.

**Gejala:** seorang peneliti keamanan melaporkan bahwa pesan berisi gambar dengan handler \`onerror\` menjalankan JavaScript di browser agen, di mana script itu bisa membaca data dashboard dan bertindak sebagai agen.

**Akar masalah:** blocklist berbasis regex itu menghapus script tapi tidak menghapus atribut event handler atau link \`javascript:\`. Blocklist melewatkan banyak cara lain HTML bisa mengeksekusi kode.

**Perbaikan:** pesan disimpan sebagai teks biasa plus subset kecil markdown, di-render ke HTML di server dan disanitasi dengan allowlist (konfigurasi DOMPurify dengan sedikit tag dan \`href\` dibatasi ke https). Dashboard menambahkan CSP ketat tanpa \`unsafe-inline\`, dan cookie session dijadikan \`HttpOnly\`.`,
    },
    challenges: [
      { q: 'Kenapa `{userInput}` di JSX aman dari XSS?', a: 'React memasukkannya sebagai text node (di-escape), jadi karakter seperti `<` dan `"` ditampilkan apa adanya dan tidak pernah di-parse sebagai HTML.' },
      { q: 'Kenapa allowlist lebih aman daripada blocklist untuk menyanitasi HTML?', a: 'Allowlist hanya mempertahankan tag dan atribut yang diketahui aman; apa pun yang baru atau tidak lazim dibuang. Blocklist harus mengantisipasi setiap konstruksi berbahaya, sementara penyerang cukup menemukan satu yang terlewat.' },
      { q: 'Amankah me-render `<a href={user.website}>` tanpa pengecekan?', a: 'Tidak sepenuhnya. URL `javascript:` bisa mengeksekusi kode saat diklik. Validasi URL-nya dan izinkan hanya skema yang aman seperti https.' },
      { q: 'Kenapa `<script>` yang disisipkan lewat innerHTML bisa tidak jalan, sementara `<img onerror>` jalan?', a: 'Browser tidak mengeksekusi elemen script yang disisipkan lewat innerHTML, tapi atribut event handler pada elemen yang disisipkan tetap terpicu, misalnya saat gambar gagal dimuat.' },
    ],
  },
}
