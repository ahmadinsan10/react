import type { TopicDetail } from '../../types'

const details: Record<string, TopicDetail> = {
  'read-code': {
    explanation: `Membaca kode library yang bagus adalah cara tercepat untuk naik level dari "saya bisa pakai React" ke "saya paham ruang desain tempat React berada". Kode aplikasi mengajarkan kompromi satu tim saja; kode library menunjukkan solusi yang sudah diuji ribuan orang terhadap edge case yang belum pernah kamu temui.

### Kenapa kode library berbeda
Library seperti TanStack Query, Zustand, Radix UI, dan React Hook Form ditulis untuk pemanggil yang tidak dikenal. Akibatnya mereka harus peduli pada hal-hal yang biasanya diabaikan kode aplikasi: referensi yang stabil, keamanan SSR, concurrent rendering, tree-shaking, inferensi TypeScript, dan kompatibilitas ke belakang. Hampir setiap baris yang kelihatan aneh biasanya ada karena dulu ada laporan bug yang memaksanya.

### Metode yang terbukti jalan
1. **Mulai dari API publik.** Baca dokumentasi dan definisi tipenya dulu. Tulis seperti apa implementasi yang kamu *bayangkan*.
2. **Temukan intinya.** Kebanyakan library punya inti kecil dengan permukaan yang luas. Store inti Zustand sangat kecil; jantung TanStack Query ada di class \`QueryCache\`, \`Query\`, dan \`QueryObserver\`, sementara binding React-nya cuma lapisan tipis di atasnya.
3. **Telusuri satu pemanggilan dari awal sampai akhir.** Contohnya: apa yang terjadi saat \`useQuery\` di-mount? Ikuti alurnya ke observer, lalu ke cache. Pakai debugger dan step through di aplikasi reproduksi yang kecil, jangan cuma membaca kodenya secara statis.
4. **Baca test-nya.** Test mendokumentasikan perilaku yang dimaksud dan edge case jauh lebih baik daripada komentar.
5. **Baca git blame dan issue yang ditautkan** pada baris yang mengejutkan. Pertanyaan "Kenapa ada \`useSyncExternalStore\` di sini?" biasanya terjawab oleh bug tearing di masa lalu.
6. **Tanyakan "kenapa begini?"** lalu tulis jawaban satu paragraf di catatanmu.

### Pola yang akan terus kamu temui
- **External store + \`useSyncExternalStore\`**: Zustand dan TanStack Query menyimpan state di luar React lalu men-subscribe komponen. Cara ini menghindari badai re-render dari context dan aman di concurrent rendering.
- **Input uncontrolled dengan ref**: React Hook Form mendaftarkan input dan membaca nilainya dari DOM, jadi mengetik tidak membuat seluruh form re-render.
- **Compound component dan \`asChild\`**: Radix memecah satu widget menjadi beberapa bagian yang berbagi context, dan membolehkan kamu mengganti elemen yang di-render tanpa kehilangan perilaku dan aksesibilitasnya.
- **Structural sharing**: TanStack Query menjaga bagian data yang tidak berubah setelah refetch tetap identik secara referensi, sehingga consumer yang di-memoize tidak re-render.

### Kapan tidak perlu mendalam
Kamu tidak perlu membaca setiap library yang kamu install. Baca secara mendalam dua atau tiga library yang paling diandalkan aplikasimu, dan yang bug-nya terus kamu temui. Tujuannya pola yang bisa dipakai di tempat lain, bukan hafalan detail.`,
    examples: [
      {
        title: 'Ide inti Zustand dalam ~25 baris',
        code: `import { useSyncExternalStore } from 'react'

type Listener = () => void

export function createStore<T>(init: T) {
  let state = init
  const listeners = new Set<Listener>()
  return {
    getState: () => state,
    setState(partial: Partial<T> | ((s: T) => Partial<T>)) {
      const next = typeof partial === 'function' ? partial(state) : partial
      state = { ...state, ...next }          // new reference -> subscribers notice
      listeners.forEach((l) => l())
    },
    subscribe(l: Listener) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

export function useStore<T, S>(store: ReturnType<typeof createStore<T>>, select: (s: T) => S) {
  return useSyncExternalStore(store.subscribe, () => select(store.getState()))
}`,
        note: 'Mengimplementasikan ulang library dalam versi mini adalah ujian terbaik apakah kamu benar-benar paham. Perhatikan bahwa hasil selector harus stabil (primitif atau nilai yang di-memoize), kalau tidak useSyncExternalStore akan loop terus; Zustand yang asli menangani ini dengan fungsi equality.',
      },
      {
        title: 'Template catatan saat membaca kode',
        code: `// notes/tanstack-query.md (written as you read)
// Q: Why does useQuery not re-render when an unused field changes?
// A: QueryObserver tracks which result props were accessed
//    and only notifies when those change.
// Q: Why are queries classes, not hooks?
// A: The cache must outlive components and be shared across them;
//    the React bindings just subscribe to observers.`,
        note: 'Tulis catatan dalam bentuk tanya-jawab. Ini memaksamu menjelaskan desainnya, bukan sekadar mendeskripsikan kodenya.',
      },
    ],
    realCase: {
      title: 'Form yang re-render di setiap ketikan',
      story: `Sebuah tim di perusahaan asuransi fiktif membuat form klaim berisi 60 field, dengan \`useState\` per field yang di-lift ke satu parent. Mengetik jadi terasa sangat lag di laptop kelas menengah. Seorang engineer menghabiskan satu sore membaca source \`register\` dan \`useWatch\` milik React Hook Form, lalu menyadari trik utamanya: simpan nilai di ref dan DOM, dan subscribe secara sempit hanya di tempat nilai itu ditampilkan. Mereka pindah ke model itu (dan ke library-nya), dan latensi input turun dari terasa jelas menjadi tidak terasa sama sekali. Pelajarannya: solusinya bukan micro-optimization, melainkan *arsitektur* yang berbeda, yang jadi jelas setelah membaca source library-nya.`,
    },
    pitfalls: [
      'Membaca file dari atas ke bawah tanpa pertanyaan di kepala; hampir tidak ada yang nyangkut. Lebih baik telusuri satu pemanggilan yang konkret.',
      'Menyalin pola internal library ke kode aplikasi padahal batasannya tidak berlaku (misalnya membuat external store sendiri untuk state yang sebenarnya cukup dengan useState).',
      'Mengabaikan test dan riwayat issue, padahal di situlah penjelasan baris-baris yang "aneh".',
      'Hanya membaca lapisan binding React dan melewatkan inti yang framework-agnostic, tempat desain sebenarnya berada.',
    ],
    exercise: {
      task: 'Pilih TanStack Query. Buat aplikasi kecil dengan satu useQuery, pasang breakpoint di dalam library, lalu telusuri apa yang terjadi saat mount, saat window kembali fokus, dan saat data kembali. Setelah itu tulis penjelasan 200 kata tentang bagaimana refetch-on-focus dirangkai.',
      hint: 'Cari focusManager di source-nya, lalu ikuti siapa saja yang subscribe ke sana.',
      solution: `Jawaban yang baik mencakup: \`focusManager\` mendengarkan \`visibilitychange\` sekali secara global; saat fokus kembali, ia memberi tahu \`QueryClient\`, yang lalu meneruskannya ke query cache; setiap \`Query\` menanyakan observer-nya apakah mereka perlu refetch (berdasarkan \`refetchOnWindowFocus\` dan status stale); query yang stale dan punya observer aktif akan refetch; observer lalu menghitung hasil baru dan memberi tahu komponen yang subscribe lewat \`useSyncExternalStore\`.

\`\`\`ts
// minimal repro used while tracing
const { data } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos, staleTime: 0 })
\`\`\``,
    },
    interview: [
      'Pilih satu library yang sering kamu pakai. Jelaskan satu keputusan desain yang tidak kelihatan jelas di dalamnya dan masalah apa yang diselesaikannya.',
      'Kenapa banyak library state memakai useSyncExternalStore alih-alih React context?',
      'Bagaimana React Hook Form menghindari re-render seluruh form di setiap ketikan?',
    ],
  },

  oss: {
    explanation: `Berkontribusi ke open source membangun skill yang tidak didapat dari tutorial: membaca codebase yang asing, mengikuti konvensi orang lain, menulis reproduksi, dan berkomunikasi secara asinkron dengan maintainer yang sama sekali tidak berutang apa-apa padamu.

### Mulai dari mana
- **Library yang sudah kamu pakai.** Kamu sudah punya konteks, sudah merasakan bagian-bagian yang kurang mulus, dan bisa menguji perubahanmu di proyek nyata.
- **Perbaikan dokumentasi.** Contoh yang rusak, signature TypeScript yang hilang, nama API yang sudah usang. Ini benar-benar bernilai dan mengajarkan alur kontribusi dengan risiko rendah.
- **Issue berlabel "good first issue" atau "help wanted".** Komentari dulu sebelum mulai supaya tidak ada dua orang mengerjakan hal yang sama.
- **Reproduksi.** Mengubah laporan bug yang samar menjadi sandbox atau repo minimal adalah salah satu kontribusi yang paling dihargai, bahkan tanpa perlu PR.

### Alur kontribusi yang baik
1. Baca \`CONTRIBUTING.md\`, code of conduct, dan PR yang baru di-merge untuk mempelajari konvensinya.
2. Untuk apa pun yang lebih besar dari typo, buka atau komentari issue dulu dan sepakati pendekatannya.
3. Fork, buat branch, dan jalankan script test dan lint milik proyek itu di lokal.
4. Saat memperbaiki bug, tulis test yang gagal terlebih dulu.
5. Jaga PR tetap kecil dan fokus; satu urusan per PR.
6. Isi template PR: apa, kenapa, bagaimana diuji, dan screenshot untuk UI.
7. Tambahkan changeset atau entri changelog kalau repo-nya memakainya.
8. Tanggapi review dengan cepat dan tanpa defensif.

### Etika dan pola pikir
Maintainer sering kali relawan. Jangan ping berulang-ulang, jangan menuntut tenggat, dan jangan membuka refactor raksasa yang tidak diminta siapa pun. Kalau PR ditolak, tanyakan apa yang membuatnya bisa diterima, atau terima keputusan itu dengan lapang; keputusan desain ada di tangan maintainer.

### Kenapa ini penting untuk karier
PR yang di-merge adalah bukti skill yang bisa dilihat publik. Yang lebih penting, kebiasaannya (repro minimal, diff yang fokus, test dulu, komunikasi tertulis yang jelas) langsung terbawa ke pekerjaan sehari-hari dan menjadikanmu orang yang dipercaya rekan tim untuk bug yang sulit.

### Sekilas tentang lisensi
Cek lisensi sebelum menyalin kode antarproyek, dan cek kebijakan kantormu soal berkontribusi di jam kerja. Beberapa proyek mewajibkan penandatanganan Contributor Licence Agreement atau menambahkan sign-off DCO di commit.`,
    examples: [
      {
        title: '❌ issue yang samar vs ✅ issue yang bisa langsung ditindaklanjuti',
        code: `// ❌
// Title: useQuery broken
// Body: it doesn't work after upgrading, please fix asap

// ✅
// Title: useQuery returns stale data after setQueryData with select in v5.x
// Environment: @tanstack/react-query 5.x, React 19, Vite
// Repro: link to a minimal 30-line sandbox
// Steps: 1. click "Update" 2. observe list
// Expected: list shows new item
// Actual: list unchanged until refocus
// Notes: works if select is removed; suspect memoized select result`,
        note: 'Issue yang baik mencantumkan versi persis, reproduksi minimal, hasil yang diharapkan vs yang terjadi, dan dugaan penyebab. Maintainer bisa menindaklanjutinya dalam hitungan menit.',
      },
      {
        title: 'Deskripsi PR dokumentasi yang fokus',
        code: `## What
Fix the \`useMutation\` example in the optimistic updates guide.

## Why
The example calls \`queryClient.setQueryData\` with an old signature,
which fails type-checking in the current major version (see #1234).

## How tested
- Ran the snippet in a fresh Vite + TS project
- \`pnpm docs:build\` passes`,
        note: 'Cakupan kecil, issue tertaut, dan ada bukti pengujian. Begini bentuk PR yang cepat di-merge.',
      },
    ],
    realCase: {
      title: 'Dari workaround ke perbaikan di upstream',
      story: `Seorang developer di startup logistik fiktif menyimpan patch lokal (lewat patch-package) untuk sebuah library date-picker karena library itu salah menangani edge case zona waktu. Setiap upgrade, patch-nya rusak. Ia lalu menulis test yang gagal untuk mereproduksi bug itu di repo library-nya, membuka issue berisi test tersebut, kemudian PR sepanjang 12 baris. PR itu di-merge dalam seminggu; tim menghapus patch mereka dan repotnya upgrade pun hilang. Pelajarannya: mengirim perbaikan ke upstream sering lebih murah daripada merawat fork, dan test yang gagal adalah argumen paling meyakinkan yang bisa kamu bawa.`,
    },
    pitfalls: [
      'Membuka PR besar tanpa mendiskusikan pendekatannya dulu; kemungkinan besar ditolak atau mandek.',
      'Melewatkan langkah lint, test, atau changeset milik proyek, yang akhirnya menambah kerjaan maintainer.',
      'Mencampur perubahan format yang tidak berhubungan ke dalam perbaikan bug, sehingga diff-nya sulit di-review.',
      'Memasukkan komentar review ke hati, atau terus mem-ping maintainer minta di-merge.',
    ],
    exercise: {
      task: 'Temukan satu kesalahan dokumentasi atau contoh yang kurang jelas di library React yang kamu pakai. Buka PR (atau siapkan di lokal) yang memperbaikinya, dengan mengikuti panduan kontribusi repo tersebut.',
      hint: 'Salin semua contoh dari satu halaman dokumentasi ke proyek baru dengan TypeScript strict; kemungkinan ada satu yang salah.',
      solution: `Solusi yang lengkap mencakup:
- Repo hasil fork dengan branch seperti \`docs/fix-mutation-example\`
- Snippet yang sudah diperbaiki dan diverifikasi di proyek coba-coba
- Deskripsi PR berisi What / Why / How tested, dengan tautan ke issue terkait
- Changeset atau sign-off yang diwajibkan

\`\`\`bash
git checkout -b docs/fix-mutation-example
pnpm install && pnpm lint && pnpm test
git commit -s -m "docs: fix setQueryData signature in optimistic updates guide"
\`\`\``,
    },
    interview: [
      'Ceritakan kontribusi open source yang pernah kamu buat. Apa yang kamu pelajari tentang codebase-nya?',
      'Bagaimana kamu menulis laporan bug yang bisa cepat ditindaklanjuti maintainer?',
      'Kapan kamu mengirim perbaikan ke upstream, dan kapan cukup menyimpan patch lokal?',
    ],
  },

  publish: {
    explanation: `Mem-publish package React ke npm memaksamu memikirkan semua hal yang di kode aplikasi didapat gratis: format output build, peer dependency, tipe, tree-shaking, dan janji versioning kepada orang-orang yang tidak kamu kenal.

### Bentuk package
Library React modern biasanya mengirim **ESM** (opsional juga CJS), **deklarasi TypeScript**, dan mendeklarasikan React sebagai **peer dependency** supaya consumer tidak berakhir dengan dua salinan React (yang membuat hook rusak dengan error "invalid hook call").

Field \`package.json\` yang penting:
- \`exports\`: peta resmi entry point, dengan \`types\` ditaruh pertama di setiap kondisi.
- \`peerDependencies\`: \`react\` dan \`react-dom\` dengan rentang versi yang benar-benar kamu uji.
- \`sideEffects: false\` (atau daftar file CSS) supaya bundler bisa melakukan tree-shaking.
- \`files\`: hanya kirim \`dist\`, bukan test atau file source yang nyasar.

Tool seperti tsup atau Vite library mode bisa membangun semua ini untukmu. Jalankan pengecek seperti \`publint\` dan "are the types wrong" sebelum release.

### Semantic versioning
- **patch**: perbaikan bug, tanpa perubahan API.
- **minor**: fitur baru, tetap kompatibel ke belakang.
- **major**: breaking change, termasuk menghentikan dukungan satu versi React atau mengubah nilai default.

Tipe adalah bagian dari API-mu. Mempersempit tipe sebuah prop bisa membuat build consumer gagal, jadi perlakukan itu sebagai breaking change.

### Changesets
Changesets memisahkan *mendeskripsikan* perubahan dari *me-release*-nya. Setiap PR menambahkan file markdown kecil yang menyatakan package mana yang naik versi dan seberapa besar. Workflow release nanti mengumpulkannya, menaikkan versi, menulis \`CHANGELOG.md\`, lalu mem-publish. Cara ini enak dipakai di monorepo dan membuat changelog tetap ditulis manusia.

### Standar kualitas package publik
- Test (unit dengan Vitest + Testing Library; test tipe dengan \`expectTypeOf\`).
- README berisi cara install, contoh minimal, referensi API, dan catatan SSR.
- \`'use client'\` di bagian atas file entry yang memakai hook atau API browser, supaya bisa dipakai di aplikasi Server Component.
- Tidak mengakses global browser saat import (aman untuk SSR).
- Kebijakan dukungan yang jelas: versi React mana, browser mana.

### Kapan tidak perlu publish
Kalau hanya satu aplikasi internal yang memakainya, workspace package di monorepo lebih sederhana. Publish berarti menambah kontrak perawatan.`,
    examples: [
      {
        title: '❌ vs ✅ package.json untuk library hook',
        code: `// ❌ React as a dependency, no exports map, ships raw source
{
  "name": "use-debounced-value",
  "main": "src/index.ts",
  "dependencies": { "react": "^19.0.0" }
}

// ✅
{
  "name": "@acme/use-debounced-value",
  "version": "1.2.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "peerDependencies": { "react": "^18.0.0 || ^19.0.0" },
  "devDependencies": { "react": "^19.0.0", "tsup": "^8.0.0", "@changesets/cli": "^2.27.0" },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "release": "pnpm build && changeset publish"
  }
}`,
        note: 'React harus menjadi peerDependency supaya yang dipakai adalah satu-satunya salinan milik consumer. Exports map dengan types di urutan pertama memberi resolusi yang benar di module resolution TypeScript modern.',
      },
      {
        title: 'File changeset',
        code: `---
"@acme/use-debounced-value": minor
---

Add a \`leading\` option that fires the first update immediately.`,
        note: 'Ditulis di PR yang membuat perubahannya. Workflow release mengubahnya menjadi kenaikan versi dan entri changelog.',
      },
      {
        title: 'Entry yang aman di client untuk aplikasi RSC',
        code: `'use client'
import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}`,
        note: 'Directive ini menandai modul sebagai client boundary, sehingga pengguna Next.js App Router bisa meng-import-nya dari tree Server Component. Pastikan bundler-mu mempertahankan directive itu di output.',
      },
    ],
    realCase: {
      title: 'Banjir keluhan "invalid hook call"',
      story: `Sebuah tim design system fiktif mem-publish library komponen mereka dengan \`react\` di \`dependencies\`. Consumer yang memakai versi React sedikit berbeda akhirnya punya dua salinan di bundle mereka, dan setiap hook melempar "Invalid hook call". Tim itu memindahkan React ke \`peerDependencies\`, menambahkan job CI yang meng-install tarball hasil pack ke aplikasi baru di React 18 dan 19, lalu merilis patch. Pelajarannya: kesalahan packaging terlihat seperti bug runtime di mata pengguna; uji artefak yang di-publish, bukan cuma source-nya.`,
    },
    pitfalls: [
      'Menaruh react di dependencies alih-alih peerDependencies, sehingga muncul salinan React ganda.',
      'Mengubah tipe atau nilai default di rilis minor; bagi consumer, itu terasa sebagai breaking change.',
      "Lupa 'use client' (atau bundler membuangnya), sehingga consumer Server Component jadi rusak.",
      'Ikut mem-publish test atau secret karena files tidak diatur; cek dengan npm pack --dry-run.',
    ],
    exercise: {
      task: 'Kemas hook useLocalStorage sebagai library yang siap di-publish: build dengan tsup, exports map, peer deps, satu test Vitest, Changesets terkonfigurasi, lalu verifikasi dengan npm pack --dry-run dan publint.',
      hint: 'Lindungi akses ke window supaya import modul di server tidak melempar error, dan beri useSyncExternalStore sebuah server snapshot.',
      solution: `\`\`\`ts
'use client'
import { useCallback, useSyncExternalStore } from 'react'

export function useLocalStorage(key: string, initial: string) {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener('storage', cb)
    return () => window.removeEventListener('storage', cb)
  }, [])
  const value = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) ?? initial,
    () => initial, // server snapshot: no window
  )
  const set = useCallback((v: string) => {
    localStorage.setItem(key, v)
    window.dispatchEvent(new StorageEvent('storage', { key }))
  }, [key])
  return [value, set] as const
}
\`\`\`

Lalu jalankan \`pnpm changeset init\`, tambahkan field package.json dari contoh, jalankan \`npx publint\` dan \`npm pack --dry-run\`, dan pastikan hanya \`dist\` yang ikut.`,
    },
    interview: [
      'Kenapa library komponen React sebaiknya mendeklarasikan React sebagai peer dependency?',
      'Apakah mengubah tipe prop dari string menjadi union literal termasuk breaking change? Kenapa?',
      'Apa bedanya Changesets dengan menulis changelog saat release?',
    ],
  },

  teach: {
    explanation: `Mengajar sebenarnya teknik belajar yang berkedok kemurahan hati. Saat kamu mencoba menjelaskan kenapa effect berjalan dua kali di development atau kenapa key itu penting, kamu akan menemukan persis bagian mana yang selama ini cuma *kamu kira* sudah paham.

### Format, dari kecil ke besar
- **Pairing dan komentar code review**: cara mengajar paling murah, dilakukan setiap hari.
- **Dokumentasi internal dan tulisan pendek**: satu konsep, satu contoh, satu jebakan.
- **Sesi lunch-and-learn atau talk di meetup**: 15 sampai 25 menit untuk satu ide.
- **Mentoring**: hubungan berkelanjutan yang berfokus pada tujuan orang lain.

### Cara menjelaskan ide teknis dengan baik
1. **Mulai dari masalahnya**, bukan API-nya. "List kamu kehilangan focus input saat diurutkan ulang" lebih mengena daripada "key adalah identifier".
2. **Bangun model mentalnya** dengan satu diagram kecil atau analogi, baru tunjukkan kode aslinya.
3. **Tunjukkan kegagalannya dulu.** Demo yang rusak lalu diikuti perbaikannya lebih nempel di ingatan.
4. **Satu ide per materi.** Kalau sebuah tulisan butuh tiga subjudul berisi pengecualian, pecah saja.
5. **Cek akurasinya.** Jalankan setiap snippet, rujuk dokumentasi resmi, dan cantumkan tanggal di kontenmu, karena React dan Next.js terus berubah.

### Mementor junior
Mentoring yang baik sebagian besar adalah bertanya: "Apa yang sudah kamu coba? Apa yang kamu harapkan? Apa yang terjadi?" Tahan diri untuk tidak mengambil alih keyboard. Sepakati tujuan, beri feedback yang spesifik dan tepat waktu, dan rayakan progres secara terbuka. Arahkan ke sumbernya supaya mereka belajar mencari jawaban sendiri, bukan cuma bertanya padamu.

### Siklus Feynman
Tulis penjelasan seolah untuk orang yang baru mulai. Setiap kali kamu tergoda memakai jargon atau menjelaskan secara mengambang, di situlah celahnya; kembali ke sumber atau kodenya, lalu tulis ulang. Ulangi sampai penjelasannya sederhana *sekaligus* benar.

### Kenapa ini penting untuk senioritas
Engineer senior melipatgandakan output tim. Kemampuan menjelaskan trade-off dengan jelas juga persis yang diuji di interview, design review, dan ADR. Mengajar adalah latihan untuk semuanya.`,
    examples: [
      {
        title: '❌ vs ✅ menjelaskan stale closure ke junior',
        code: `// ❌ "It's a stale closure, just add it to the deps."

// ✅ Show it:
function Timer() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000) // captures count = 0 forever
    return () => clearInterval(id)
  }, [])
  return <p>{count}</p> // stuck at 1
}
// "Each render has its own count. The effect ran once, in the first render,
//  so it only ever sees count = 0. Two fixes: setCount(c => c + 1),
//  or add count to deps (which recreates the interval each tick)."`,
        note: 'Penjelasan yang baik menunjukkan kegagalannya, menyebut mekanismenya (setiap render menangkap nilainya sendiri), dan menawarkan perbaikan beserta trade-off-nya.',
      },
      {
        title: 'Kerangka outline talk',
        code: `// 20-minute talk: "Why your Next.js page is dynamic"
// 1. Hook (2m): a page that should be static is slow - live demo
// 2. Mental model (5m): static shell vs dynamic holes, diagram
// 3. Cause (5m): reading cookies() at the top of the page
// 4. Fix (5m): move it into a Suspense-wrapped component; add 'use cache'
// 5. Takeaways (3m): 3 bullets, pointer to the docs`,
        note: 'Satu masalah, satu model, satu perbaikan. Demo kegagalan di awal memberi audiens alasan untuk peduli.',
      },
    ],
    realCase: {
      title: 'Sesi mingguan 20 menit yang memangkas waktu onboarding',
      story: `Di sebuah fintech fiktif, frontend engineer baru butuh berminggu-minggu sampai berhenti membuat bug effect. Seorang senior engineer memulai sesi mingguan 20 menit "satu konsep" (key, effect, Suspense, caching), merekam setiap sesi, dan mengubah catatannya menjadi handbook internal. Dalam satu kuartal, komentar review tentang kesalahan yang sama turun drastis dan karyawan baru mulai merujuk handbook itu di PR mereka. Engineer itu juga menyadari bahwa menyiapkan setiap sesi membongkar dua miskonsepsinya sendiri tentang Strict Mode. Pelajarannya: mengajar menyebarkan pengetahuan dan sekaligus mengasah pengajarnya.`,
    },
    pitfalls: [
      'Menjelaskan API-nya, bukan masalah yang diselesaikannya.',
      'Mem-publish snippet yang tidak diuji dan sudah tidak jalan di versi React atau Next.js terbaru.',
      'Mengambil alih keyboard saat mentoring, yang mengajarkan mentee untuk menunggumu.',
      'Membahas terlalu banyak hal dalam satu talk atau tulisan.',
    ],
    exercise: {
      task: 'Tulis artikel 600 kata yang menjelaskan kenapa React butuh key di list, lengkap dengan demo yang rusak dan yang sudah diperbaiki. Minta orang yang kurang berpengalaman membacanya dan catat di bagian mana mereka bingung.',
      hint: 'Taruh input di setiap item list; urutkan ulang list yang memakai key index, lalu tunjukkan teks yang diketik tetap tertinggal di baris yang salah.',
      solution: `Struktur:
1. Masalah: todo list yang teks ketikannya muncul di baris yang salah setelah diurutkan.
2. Model: React mencocokkan children antar-render berdasarkan key; dengan key index, posisi 0 selalu dianggap "item yang sama".
3. Demo:

\`\`\`tsx
{todos.map((t, i) => <li key={i}><input defaultValue={t.text} /></li>)}   // ❌
{todos.map((t) => <li key={t.id}><input defaultValue={t.text} /></li>)}  // ✅
\`\`\`

4. Kapan key index tidak masalah (list statis yang tidak pernah diurutkan ulang).
5. Kesimpulan: key adalah identitas, bukan sekadar cara membungkam warning.`,
    },
    interview: [
      'Jelaskan beda useMemo dan useCallback ke developer junior dalam waktu kurang dari satu menit.',
      'Ceritakan saat kamu mementor seseorang. Bagaimana kamu tahu mentoring itu berhasil?',
      'Bagaimana kamu menjaga konten teknis yang kamu tulis tetap akurat saat framework terus berubah?',
    ],
  },

  review: {
    explanation: `Code review adalah tempat standar kualitas tim benar-benar ditegakkan. Reviewer yang baik memang menangkap bug, tapi dampak terbesarnya adalah menyebarkan pengetahuan dan menjaga codebase tetap koheren.

### Apa yang di-review, berurutan dari prioritas tertinggi
1. **Kebenaran**: apakah kodenya melakukan apa yang diminta tiket? Edge case: kosong, loading, error, teks sangat panjang, double-click, jaringan lambat, pengguna tanpa otorisasi.
2. **Keamanan**: Server Action dan route handler memvalidasi input dan memeriksa otorisasi; tidak ada \`dangerouslySetInnerHTML\` untuk data yang tidak tepercaya; tidak ada secret di kode client (di Next.js hanya variabel \`NEXT_PUBLIC_\` yang dimasukkan ke bundle browser, memang begitu desainnya).
3. **Aksesibilitas**: elemen semantik, label, dukungan keyboard, pengelolaan focus di dialog, kontras warna.
4. **Masalah khas React**: effect dipakai untuk derived state, cleanup yang hilang, key yang tidak stabil, state yang seharusnya ada di URL, client component yang bisa jadi server component, request waterfall.
5. **Performa**: bundle client yang besar, re-render yang tidak perlu di jalur yang sering dieksekusi, gambar yang tidak dioptimasi.
6. **Maintainability**: penamaan, kohesi, test yang menguji perilaku dan bukan implementasi.
7. **Gaya penulisan**: seharusnya diotomasi Prettier dan ESLint, jadi manusia jarang perlu mengomentarinya.

### Cara menulis komentar
- **Spesifik**: tunjuk barisnya, jelaskan akibatnya, usulkan perbaikan.
- Beri label tingkat keparahan: **blocking**, **suggestion**, **nit**, **question**. Conventional Comments adalah format yang populer.
- Bertanyalah kalau ragu ("Apakah ini bisa jalan di server?") alih-alih langsung menyimpulkan.
- Puji pekerjaan yang bagus secara konkret; ini memberi sinyal pola mana yang perlu diulang.
- Kritik kodenya, jangan pernah orangnya.

### Sebagai author
Jaga PR tetap kecil (beberapa ratus baris), tulis deskripsi berisi konteks dan screenshot, review sendiri dulu, dan tautkan preview deployment-nya. PR yang besar hanya mendapat review yang dangkal.

### Kecepatan itu penting
Review yang lambat mendorong orang menumpuk perubahan jadi PR raksasa. Banyak tim menargetkan respons pertama dalam satu hari kerja. Kalau kamu tidak sempat review secara mendalam, bilang saja dan sarankan siapa yang bisa.`,
    examples: [
      {
        title: '❌ vs ✅ komentar review',
        code: `// ❌ "This is wrong."
// ❌ "Why would you do it like this??"
// ❌ "nit: use const" (should be a lint rule)

// ✅ blocking: deleteInvoice is a Server Action, so anyone can call it
//    with any id. We need to check the session user owns the invoice
//    before deleting, e.g.
//      const session = await auth()
//      if (!session) throw new Error('Unauthorized')
//      await db.invoice.delete({ where: { id, ownerId: session.user.id } })

// ✅ suggestion: fullName is derived from first/last, so it can be
//    computed during render instead of synced with useEffect. That removes
//    an extra render and a possible flicker.

// ✅ question: should the filter live in the URL (?status=paid) so it
//    survives refresh and can be shared?`,
        note: 'Setiap komentar yang baik menyebut tingkat keparahan, akibatnya, dan perbaikan atau pertanyaan yang konkret. Urusan gaya diserahkan ke tooling.',
      },
      {
        title: 'Template deskripsi PR',
        code: `## Context
Ticket: BILL-412. Users can bulk-archive invoices.

## Changes
- New archiveInvoices Server Action (zod-validated, owner check)
- Checkbox column + bulk bar in InvoiceTable
- updateTag('invoices') after the mutation

## Screenshots / preview
Preview deployment link, before/after screenshots

## Testing
- Unit: action rejects ids the user does not own
- E2E: select 3 rows -> archive -> rows disappear

## Risks
Large selections (>500) not batched yet; follow-up BILL-415`,
        note: 'Reviewer langsung mendapat konteks, cakupan, bukti, dan risiko yang sudah diketahui, sehingga review yang mendalam jadi mungkin dilakukan.',
      },
    ],
    realCase: {
      title: 'Server Action yang lolos karena review sekilas',
      story: `Di sebuah perusahaan SaaS fiktif, PR sepanjang 1.400 baris menambahkan halaman pengaturan tim. Para reviewer cuma membacanya sekilas lalu approve. Satu Server Action, \`removeMember(teamId, userId)\`, memeriksa bahwa pemanggilnya sudah login, tapi tidak memeriksa apakah dia admin di tim *tersebut*. Seorang pelanggan menemukan bahwa ia bisa menghapus anggota tim lain dengan memanggil action itu memakai id berbeda. Perbaikannya cuma pengecekan otorisasi dua baris, ditambah dua aturan tim: PR di atas kira-kira 400 baris harus dipecah, dan setiap fungsi \`'use server'\` wajib melewati satu poin checklist keamanan saat review. Pelajarannya: PR besar menyembunyikan bug kecil yang kritis.`,
    },
    pitfalls: [
      'Menghabiskan energi review untuk format, bukan kebenaran, keamanan, dan aksesibilitas.',
      'Approve PR raksasa setelah membaca sekilas; minta PR itu dipecah.',
      'Komentar yang samar atau kasar, yang tidak menjelaskan akibatnya atau menawarkan jalan keluar.',
      'Tidak menandai tingkat keparahan, sehingga author tidak bisa membedakan blocker dari preferensi.',
    ],
    exercise: {
      task: `Review komponen berikut dan tulis minimal empat komentar beserta label tingkat keparahannya.

\`\`\`tsx
export default function Search({ items }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState(items)
  useEffect(() => { setResults(items.filter(i => i.name.includes(q))) }, [q])
  return (
    <div>
      <div onClick={() => setQ('')}>clear</div>
      <input value={q} onChange={e => setQ(e.target.value)} />
      {results.map((r, i) => <div key={i} dangerouslySetInnerHTML={{ __html: r.name }} />)}
    </div>
  )
}
\`\`\``,
      hint: 'Perhatikan derived state, dependency effect, aksesibilitas, key, XSS, dan tipe.',
      solution: `- **blocking (keamanan)**: \`dangerouslySetInnerHTML\` dengan nama item berisiko XSS; render \`{r.name}\` sebagai teks biasa.
- **blocking (bug)**: dependency effect tidak menyertakan \`items\`, jadi hasilnya basi saat items berubah. Lebih baik: hitung saat render dengan \`const results = items.filter(...)\` lalu buang state dan effect-nya.
- **blocking (a11y)**: \`div\` yang bisa diklik tidak bisa diakses lewat keyboard; pakai \`<button type="button">\`. Input-nya juga butuh label.
- **suggestion**: pakai \`key={r.id}\`, bukan index.
- **suggestion**: beri tipe pada props; pertimbangkan pencocokan yang tidak peka huruf besar-kecil dan \`useDeferredValue\` untuk list yang besar.`,
    },
    interview: [
      'Apa yang pertama kali kamu cari saat me-review pull request?',
      'Bagaimana kamu memberi feedback kritis pada PR milik rekan yang lebih senior?',
      'Apa yang secara khusus kamu cek di PR yang menambahkan Server Action?',
    ],
  },

  adr: {
    explanation: `**Architecture Decision Record** adalah dokumen pendek yang mencatat satu keputusan penting: konteksnya, opsi yang dipertimbangkan, apa yang dipilih, dan konsekuensinya. ADR menjawab pertanyaan yang cepat atau lambat pasti ditanyakan setiap anggota tim baru: "kenapa sih dulu kita bikin begini?"

### Apa yang tergolong penting
Keputusan yang mahal untuk dibatalkan atau yang membentuk banyak kode:
- Strategi rendering (SPA vs Next.js App Router vs React Router framework mode).
- Manajemen state (library cache untuk server state, store global di client, atau tidak pakai sama sekali).
- Pendekatan styling (CSS Modules, Tailwind, CSS-in-JS).
- Tooling monorepo, penyedia auth, ORM, strategi testing.

Memilih helper untuk format tanggal tidak perlu ADR.

### Anatomi
- **Judul** dengan nomor: "ADR-007: Use TanStack Query for server state".
- **Status**: proposed, accepted, deprecated, atau superseded oleh ADR yang lebih baru.
- **Konteks**: faktor-faktor yang berpengaruh: ukuran tim, batasan, masalah yang sedang dirasakan, tenggat.
- **Opsi**: dua sampai empat opsi yang realistis, dengan kelebihan dan kekurangan yang jujur.
- **Keputusan**: apa dan kenapa, dalam beberapa kalimat.
- **Konsekuensi**: positif dan negatif, termasuk pekerjaan lanjutan.

### Proses
Simpan ADR di repo (misalnya \`docs/adr/\`) supaya ikut ter-versioning bersama kode dan di-review lewat PR. ADR yang masih proposed didiskusikan di PR; setelah di-merge, ADR bersifat **immutable**. Kalau kamu berubah pikiran, tulis ADR baru yang menggantikan yang lama, lalu ubah status ADR lama. Dengan begitu sejarahnya tetap jujur.

### Kenapa ini efektif
Menulis memaksa kejelasan: kalau kamu belum bisa menuliskan opsi dan trade-off-nya, berarti kamu belum selesai memutuskan. Menulis juga membuat debat tidak jadi personal; diskusinya tentang trade-off yang tertulis, bukan siapa yang paling keras suaranya. Berbulan-bulan kemudian, ADR mencegah perdebatan ulang soal hal yang sudah diputuskan, dan membuat jelas kapan konteks awalnya sudah cukup berubah untuk ditinjau lagi.

### Buat tetap ringan
Satu sampai dua halaman. Kalau tidak ada yang membacanya, berarti terlalu panjang. Tautkan dari README dan dari komentar kode di tempat keputusan itu terlihat.`,
    examples: [
      {
        title: 'Template ADR yang sudah diisi',
        code: `# ADR-009: Adopt Next.js Cache Components for the storefront

Status: Accepted (2026-03-14)
Deciders: web platform team

## Context
Product pages are mostly static but show per-user pricing. Today the whole
route is dynamic and TTFB is ~900 ms at p75. We are on Next.js 16.

## Options
1. Keep fully dynamic rendering - simple, slow.
2. Static pages + client-fetched pricing - fast shell, layout shift, extra API.
3. Cache Components: 'use cache' for catalog data with cacheTag,
   dynamic pricing inside a Suspense boundary - fast shell, streamed hole.

## Decision
Option 3. Catalog functions use 'use cache' + cacheLife('hours') + cacheTag('product-<id>').
Admin mutations invalidate with updateTag / revalidateTag.

## Consequences
+ Static shell served instantly; pricing streams in.
- Team must learn the caching model; add docs and examples.
- Every mutation path must invalidate tags; add a test per action.
Follow-up: ADR on cache observability.`,
        note: 'Konteksnya memuat masalah yang terukur, opsinya adalah alternatif yang nyata, dan konsekuensinya mencantumkan biaya, bukan hanya manfaat.',
      },
      {
        title: '❌ vs ✅ pernyataan keputusan',
        code: `// ❌ "We chose Zustand because it's better."
// ✅ "We chose Zustand for the small amount of cross-route UI state
//     (sidebar, command palette) because it needs no provider, has
//     selector-based subscriptions, and the team already knows it.
//     Server data stays in TanStack Query; Redux was rejected as more
//     ceremony than our 3 global values justify."`,
        note: 'Keputusan yang baik mengaitkan pilihannya dengan konteks, dan menyebut apa yang ditolak beserta alasannya.',
      },
    ],
    realCase: {
      title: 'Pilihan CSS-in-JS yang tidak bisa dijelaskan siapa pun',
      story: `Frontend sebuah perusahaan retail fiktif memakai library CSS-in-JS berbasis runtime. Saat mereka mengadopsi Server Components, styled component memaksa banyak file berubah menjadi client component. Seorang lead baru ingin tahu kenapa library itu dipilih; tidak ada lagi orang yang dulu memutuskannya di tim. Mereka lalu menulis ADR-001 secara retroaktif (konteks: bertahun-tahun lalu, belum ada RSC, kebutuhan theming berat), kemudian ADR-014 yang menggantikannya dengan CSS Modules plus design token, mendokumentasikan batasan RSC dan migrasi bertahap. Debat-debat berikutnya jadi singkat karena trade-off-nya sudah tertulis.`,
    },
    pitfalls: [
      'Menulis ADR setelah kejadian hanya untuk membenarkan keputusan, tanpa mencantumkan alternatif yang sebenarnya.',
      'Mengedit ADR yang sudah accepted alih-alih menggantinya dengan yang baru, sehingga sejarahnya hilang.',
      'Membuatnya terlalu panjang sampai tidak ada yang membaca.',
      'Mencatat keputusan sepele, sehingga keputusan yang penting jadi tenggelam.',
    ],
    exercise: {
      task: 'Tulis ADR untuk proyek nyata atau hipotetis yang memilih antara TanStack Query, SWR, dan fetching biasa di Server Components.',
      hint: 'Konteksnya sebaiknya menyebut apakah kamu memakai Next.js App Router dan seberapa banyak interaktivitas di client (polling, optimistic update) yang kamu butuhkan.',
      solution: `\`\`\`text
# ADR-004: Server data fetching strategy
Status: Accepted
## Context
Next.js 16 App Router. Most pages read data once; two screens need polling
and optimistic updates (inbox, kanban).
## Options
1. Fetch in Server Components only
2. TanStack Query everywhere
3. Server Components by default + TanStack Query on the two interactive screens
## Decision
Option 3. Server-render reads; seed TanStack Query with server-fetched
initial data on the interactive screens.
## Consequences
+ Minimal client JS on most pages; rich UX where needed.
- Two patterns to learn; document when to use which.
\`\`\``,
    },
    interview: [
      'Apa itu ADR dan keputusan seperti apa yang layak dibuatkan ADR?',
      'Kenapa ADR yang sudah accepted sebaiknya immutable?',
      'Ceritakan satu keputusan arsitektur yang pernah kamu buat, alternatifnya, dan apa yang akan kamu ubah sekarang.',
    ],
  },

  current: {
    explanation: `React dan ekosistemnya bergerak cepat: React 19 membawa Actions, \`use\`, dan hook-hook form; React Compiler sudah mencapai rilis stabil; Next.js 16 membuat caching jadi eksplisit lewat Cache Components dan mengganti nama \`middleware.ts\` menjadi \`proxy.ts\`; React 19.3 membuat \`<ViewTransition>\` dan Fragment ref jadi stabil; Next.js 16.4 mengaktifkan Cache Components secara default untuk aplikasi baru; React Router v8 menghapus \`react-router-dom\`. Versi bergerak cepat, jadi cek release notes sebelum memercayai tutorial apa pun (termasuk yang ini). Tetap up to date itu sebuah skill: tahu apa yang berubah, kenapa, dan apakah itu berpengaruh untuk codebase *kamu*.

### Siapa yang menentukan arah React
Sejak Februari 2026 React dikelola oleh **React Foundation**, bagian dari Linux Foundation, bukan lagi oleh satu perusahaan. Postingan rilis di react.dev tetap jadi sumber resmi untuk apa saja yang sudah dirilis.

### Utamakan sumber primer
- **Blog dan dokumentasi React**: postingan rilis, panduan upgrade, dan penjelasan mendalam.
- **Repository RFC**: proposal beserta alasannya sebelum fiturnya dirilis.
- **Release notes dan panduan upgrade framework** untuk Next.js, React Router, TanStack.
- **React Conf dan talk di konferensi framework**: tim inti menjelaskan arah dan motivasinya.
- **Changelog dependency-mu**, idealnya muncul otomatis lewat PR dari Renovate atau Dependabot.

### Sumber sekunder yang terkurasi
Newsletter seperti This Week in React merangkum ekosistem setiap minggu. Pakai untuk *menemukan* hal baru, lalu baca sumber primernya sebelum bertindak.

### Rutinitas yang bisa dijaga
- Mingguan, 30 menit: baca sekilas satu newsletter dan release notes dependency utamamu.
- Bulanan: coba satu fitur baru di proyek coba-coba.
- Setiap rilis major: baca panduan upgrade, jalankan codemod di sebuah branch, dan catat breaking change untuk tim.

### Evaluasi, jangan ikut-ikutan
Untuk setiap hal baru, tanyakan: masalah apa yang diselesaikannya? Apakah kita punya masalah itu? Berapa biaya migrasinya? Apakah sudah stabil, atau masih experimental/canary? Banyak fitur dimulai di balik flag; adopsi di production biasanya sebaiknya menunggu rilis stabil.

### Kenali saran yang sudah usang
Banyak konten online dibuat sebelum era App Router, React 19, atau Compiler. Tanda bahaya: \`getServerSideProps\` di kode App Router yang baru, \`forwardRef\` disajikan sebagai keharusan (React 19 meneruskan \`ref\` sebagai prop biasa), \`useMemo\` manual di mana-mana pada proyek yang sudah memakai compiler, \`middleware.ts\` di tutorial Next.js 16, import \`react-router-dom\` (sudah dihapus di React Router v8), \`react({ babel: … })\` untuk compiler (sudah dihapus di \`@vitejs/plugin-react\` 6), \`onUnhandledRequest\` di MSW (sekarang \`onUnhandledFrame\`), \`<ViewTransition>\` yang disebut eksperimental, atau asumsi soal caching fetch yang implisit. Selalu cek tanggal dan versinya.

### Bagikan yang kamu pelajari
Catatan internal singkat "apa yang berubah bulan ini" membantu tim, sekaligus memaksamu memahami perubahan cukup dalam untuk bisa merangkumnya.`,
    examples: [
      {
        title: '❌ usang vs ✅ terkini: ref di React 19',
        code: `// ❌ Pre-19 pattern: still works, but no longer necessary
const Input = forwardRef<HTMLInputElement, Props>(function Input(props, ref) {
  return <input ref={ref} {...props} />
})

// ✅ React 19: ref is a regular prop on function components
function Input({ ref, ...props }: Props & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />
}`,
        note: 'Dengan tahu ini, kamu bisa menyederhanakan kode baru dan mengenali tutorial lama. Tim React sudah memberi sinyal bahwa forwardRef akan di-deprecate di versi mendatang; konfirmasi status terkininya di dokumentasi.',
      },
      {
        title: 'Rename di Next.js 16: middleware menjadi proxy',
        code: `// ❌ older tutorials: middleware.ts exporting middleware()
// ✅ Next.js 16: proxy.ts at the project root (or in src/)
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (!request.cookies.has('session')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }`,
        note: 'Nama file dan fungsinya berubah; konsepnya tidak. Sejak Next.js 16.4, proxy.ts berjalan di runtime Node.js secara default dan middleware.ts sudah deprecated. Cek panduan upgrade untuk codemod-nya.',
      },
    ],
    realCase: {
      title: 'Upgrade di branch, bukan dalam kepanikan',
      story: `Tim di sebuah perusahaan media fiktif memperbarui dokumen "tech radar" setiap bulan. Saat versi major Next.js yang baru keluar, mereka sudah tahu dari release notes bahwa default caching berubah. Mereka menjalankan codemod di sebuah branch, menemukan tiga halaman yang selama ini mengandalkan caching implisit dan kini jadi dinamis, menambahkan \`'use cache'\` dengan tag, lalu merilis upgrade itu dalam seminggu. Tim lain di perusahaan yang sama, yang upgrade tanpa membaca apa-apa, melihat lonjakan besar beban database dari halaman-halaman yang tidak lagi di-cache. Pelajarannya: membaca release notes jauh lebih murah daripada menangani insiden.`,
    },
    pitfalls: [
      'Mengadopsi fitur canary atau experimental di production karena sebuah talk membuatnya terlihat menarik.',
      'Mengikuti tutorial tanpa mengecek tanggal dan versi framework-nya.',
      'Mengandalkan rangkuman di media sosial alih-alih release notes dan panduan upgrade.',
      'Mengabaikan PR update dependency sampai upgrade major berubah jadi proyek raksasa.',
    ],
    exercise: {
      task: 'Baca postingan rilis React dan Next.js terbaru. Tulis catatan satu halaman "apa yang berubah dan apakah berpengaruh ke kita" untuk proyek nyata atau contoh, lengkap dengan daftar aksi.',
      hint: 'Kelompokkan menjadi: adopsi sekarang, coba di spike, pantau, abaikan, dan beri alasan masing-masing dalam satu kalimat.',
      solution: `Contoh struktur:
- **Adopsi sekarang**: ref sebagai prop (menyederhanakan 12 komponen forwardRef); rename ke proxy.ts lewat codemod.
- **Spike**: aktifkan React Compiler di satu route dan bandingkan jumlah re-render di Profiler.
- **Pantau**: fitur yang masih berstatus experimental atau canary.
- **Abaikan**: fitur untuk framework yang tidak kita pakai.
- **Aksi**: 1. Buat branch upgrade. 2. Jalankan codemod. 3. Perbarui aturan lint. 4. Bagikan rangkumannya ke tim.`,
    },
    interview: [
      'Apa saja perubahan di React 19 yang memengaruhi cara kamu menulis komponen sehari-hari?',
      'Bagaimana kamu memutuskan apakah akan mengadopsi fitur yang baru dirilis?',
      'Bagaimana kamu menjaga dependency di codebase besar tetap up to date tanpa upgrade besar-besaran sekaligus?',
    ],
  },

  interview: {
    explanation: `Interview React level senior jarang menguji hafalan. Yang diuji adalah apakah kamu bisa **membangun sesuatu yang nyata di bawah tekanan waktu sambil menjelaskan trade-off-nya**. Latihan klasiknya (autocomplete, modal, infinite scroll, tabel data) dipilih karena masing-masing menyimpan jebakan di async state, aksesibilitas, dan performa.

### Pendekatan yang berhasil
1. **Klarifikasi kebutuhan** (2 sampai 3 menit): sumber data, ukurannya, dukungan keyboard, mobile, kondisi error. Interviewer menghargai pertanyaan yang bagus.
2. **Rancang API komponen dan state-nya** sebelum menulis kode: props apa saja, state apa saja, apa yang bisa diturunkan (derived).
3. **Bangun happy path** dengan cepat.
4. **Perkuat**: loading, kosong, error, race condition, aksesibilitas.
5. **Diskusikan trade-off dan pengembangannya**: virtualisasi, caching, testing, apa yang akan kamu lakukan kalau punya waktu lebih.

Ceritakan apa yang kamu pikirkan sepanjang proses. Kalau kamu diam saja, interviewer sulit memberi nilai.

### Empat soal klasik dan jebakannya
- **Autocomplete**: debounce input; batalkan request yang basi dengan \`AbortController\` atau abaikan respons yang datang tidak berurutan; ikuti pola ARIA combobox (\`role="combobox"\`, \`aria-expanded\`, \`aria-activedescendant\`, opsi listbox); dukung tombol panah, Enter, dan Escape.
- **Modal**: pakai elemen native \`<dialog>\` atau portal; kurung focus di dalamnya (focus trap); kembalikan focus ke pemicunya saat ditutup; Escape menutup; beri nama yang aksesibel; cegah scroll di latar belakang.
- **Infinite scroll**: \`IntersectionObserver\` pada elemen sentinel; hindari fetch ganda selama masih ada yang berjalan; tangani akhir list dan error; pertimbangkan virtualisasi untuk list yang sangat panjang dan tombol "Load more" demi aksesibilitas.
- **Tabel data**: sorting, filtering, pagination; turunkan baris yang terlihat saat render (dengan \`useMemo\` kalau mahal); simpan sort dan filter di URL; pakai \`<table>\` semantik dengan \`aria-sort\`; key baris yang stabil.

### Sinyal yang dicari interviewer
- Kamu menurunkan state, bukan menyinkronkannya dengan effect.
- Kamu menangani race dan cleanup.
- Kamu memikirkan aksesibilitas tanpa perlu diingatkan.
- Kamu bisa bilang "Saya belum akan mengoptimasi ini, tapi kalau list-nya tumbuh sampai 10 ribu baris, saya akan pakai virtualisasi".
- Kamu menulis test, atau setidaknya mendeskripsikannya.

### Latihan
Batasi setiap latihan maksimal 45 menit, rekam dirimu, lalu tinjau di bagian mana kamu terdiam atau buntu.`,
    examples: [
      {
        title: '❌ rawan race vs ✅ fetch autocomplete yang aman dari race',
        code: `// ❌ Responses can arrive out of order: "re" results may land after "rea"
useEffect(() => {
  fetch(\`/api/search?q=\${q}\`).then((r) => r.json()).then(setResults)
}, [q])

// ✅ Debounce + abort the previous request
useEffect(() => {
  if (!q) { setResults([]); return }
  const ctrl = new AbortController()
  const id = setTimeout(async () => {
    try {
      const res = await fetch(\`/api/search?q=\${encodeURIComponent(q)}\`, { signal: ctrl.signal })
      if (!res.ok) throw new Error(String(res.status))
      setResults(await res.json())
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError('Search failed')
    }
  }, 250)
  return () => { clearTimeout(id); ctrl.abort() }
}, [q])`,
        note: 'Cleanup-nya membatalkan debounce yang tertunda sekaligus request yang sedang berjalan, jadi hanya query terbaru yang bisa mengisi results. Perhatikan juga encodeURIComponent pada input pengguna.',
      },
      {
        title: 'Modal yang aksesibel dengan elemen dialog native',
        code: `function ConfirmDialog({ open, onClose, onConfirm }: {
  open: boolean; onClose: () => void; onConfirm: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()   // inert background, Escape, top layer
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} aria-labelledby="confirm-title" onClose={onClose}>
      <h2 id="confirm-title">Delete project?</h2>
      <button onClick={onClose}>Cancel</button>
      <button onClick={onConfirm} autoFocus>Delete</button>
    </dialog>
  )
}`,
        note: 'showModal memberi semantik modal, latar belakang yang inert, dan penanganan Escape secara gratis, dan browser mengembalikan focus ke elemen yang sebelumnya fokus saat dialog ditutup. Menyebut hal ini menunjukkan kamu paham platform web.',
      },
    ],
    realCase: {
      title: 'Kandidat yang mengajukan pertanyaan yang tepat',
      story: `Dalam rangkaian interview di sebuah perusahaan fiktif, dua kandidat membangun autocomplete. Kandidat pertama menulis kode yang rapi dengan cepat, tapi tidak pernah menangani respons yang datang tidak berurutan maupun navigasi keyboard. Kandidat kedua menghabiskan tiga menit bertanya soal ukuran data dan kebutuhan aksesibilitas, membangun UI yang lebih sederhana, tapi menambahkan abort setiap input berubah dan navigasi dengan tombol panah, lalu menjelaskan bagaimana ia akan mengujinya dengan Testing Library dan MSW. Panel memilih kandidat kedua. Pelajarannya: sinyal senior datang dari pertimbangan dan kelengkapan, bukan kecepatan mengetik.`,
    },
    pitfalls: [
      'Langsung menulis kode sebelum mengklarifikasi kebutuhan.',
      'Mengabaikan race condition di UI async; ini ujian tersembunyi yang paling sering muncul.',
      'Melupakan dukungan keyboard dan screen reader.',
      'Terlalu dini memakai memoization atau library, alih-alih menjelaskan kapan semua itu dibutuhkan.',
      'Bekerja sambil diam saja.',
    ],
    exercise: {
      task: 'Dalam 45 menit, bangun list issue dengan infinite scroll dari mock API (ukuran halaman 20), lengkap dengan kondisi loading, error-retry, dan akhir list. Ceritakan apa yang kamu kerjakan sambil jalan dan rekam dirimu.',
      hint: 'Pakai IntersectionObserver pada div sentinel dan sebuah nilai status untuk mencegah loading ganda.',
      solution: `\`\`\`tsx
function IssueList() {
  const [items, setItems] = useState<Issue[]>([])
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')
  const sentinel = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (status === 'loading' || status === 'done') return
    setStatus('loading')
    try {
      const res = await fetch(\`/api/issues?page=\${page}\`)
      const next: Issue[] = await res.json()
      setItems((prev) => [...prev, ...next])
      setPage((p) => p + 1)
      setStatus(next.length < 20 ? 'done' : 'idle')
    } catch { setStatus('error') }
  }, [page, status])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) load() })
    io.observe(el)
    return () => io.disconnect()
  }, [load])

  return (
    <>
      <ul>{items.map((i) => <li key={i.id}>{i.title}</li>)}</ul>
      {status === 'error' && <button onClick={load}>Retry</button>}
      {status === 'done' ? <p>No more issues</p> : <div ref={sentinel} aria-hidden />}
      {status === 'loading' && <p role="status">Loading…</p>}
    </>
  )
}
\`\`\`
Lalu diskusikan: virtualisasi untuk ribuan baris, useInfiniteQuery dari TanStack Query, dan tombol "Load more" sebagai fallback.`,
    },
    interview: [
      'Bangun sebuah autocomplete. Bagaimana kamu menangani respons yang datang tidak berurutan?',
      'Selain tampil di atas halaman, apa lagi yang dibutuhkan sebuah modal supaya aksesibel?',
      'Kapan kamu memakai virtualisasi untuk sebuah list, dan apa biayanya?',
    ],
  },
}

export default details
