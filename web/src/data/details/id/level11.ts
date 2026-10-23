import type { TopicDetail } from '../../types'

const details: Record<string, TopicDetail> = {
  quality: {
    explanation: `Tooling kualitas kode adalah cara tim mengubah opini menjadi pengecekan otomatis. Kalau diterapkan dengan benar, perdebatan soal gaya penulisan di review selesai, bug sungguhan ketahuan sebelum sampai ke CI, dan developer baru cukup menjalankan satu perintah untuk mendapat feedback yang sama dengan seorang senior.

### Lapisan-lapisannya
- **TypeScript mode strict** menangkap error tipe. Aktifkan \`strict\`, \`noUncheckedIndexedAccess\` dan \`exactOptionalPropertyTypes\` kalau codebase kamu sanggup. Tiap flag menghilangkan satu golongan bug runtime.
- **ESLint** menangkap kesalahan *semantik* yang lolos dari compiler: dependency hook yang salah, hook yang dipanggil secara kondisional, \`alt\` text yang hilang, promise yang tidak di-await. Sekarang ESLint memakai **flat config** (\`eslint.config.js\`), yaitu array objek konfigurasi yang di-merge berurutan. Format ini menggantikan \`.eslintrc\` beserta pencarian bertingkatnya.
- **Formatter** (Prettier atau Biome) mengurus spasi dan tanda kutip. Formatting bukan linting. Matikan aturan stilistik ESLint supaya kedua tool ini tidak pernah saling bertentangan.
- **Git hook** (Husky + lint-staged) menjalankan pengecekan cepat hanya pada file yang di-stage sebelum commit. CI tetap menjalankan semuanya, karena hook bisa dilewati.

### Aturan khusus React
\`eslint-plugin-react-hooks\` adalah plugin paling berharga. \`rules-of-hooks\` mencegah rusaknya linked list yang sudah kamu pelajari di materi internal React, dan \`exhaustive-deps\` menangkap stale closure. Versi terbaru juga punya aturan yang menandai kode yang tidak bisa dioptimasi React Compiler, misalnya memutasi nilai saat render atau membaca ref saat render. Cek dokumentasi plugin untuk nama preset terbaru, karena namanya sudah beberapa kali berganti antar versi major. \`eslint-plugin-jsx-a11y\` menangkap kesalahan aksesibilitas yang murah diperbaiki: \`div\` yang bisa diklik, label tanpa kontrol, dan alt text yang hilang.

### Berbagi konfigurasi di monorepo
Taruh konfigurasi di sebuah package seperti \`@acme/eslint-config\` yang meng-export array. Tiap app men-spread array itu dan menambah override lokal. Beri versi pada package ini seperti package lain, supaya perubahan aturan cukup di-review sekali, bukan di-copy-paste ke dua belas repo.

### Kapan tidak perlu repot
Prototipe akhir pekan tidak butuh lint-staged. Tapi setiap aturan yang kamu tunda makin mahal untuk dinyalakan nanti, karena kamu harus membereskan tumpukan pelanggarannya dulu. Mulai dengan strict di proyek baru. Di proyek legacy, nyalakan aturan baru sebagai warning, perbaiki kodenya pelan-pelan, lalu naikkan menjadi error.`,
    examples: [
      {
        title: 'Package flat config bersama',
        code: `// packages/eslint-config/index.js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  reactHooks.configs['recommended-latest'], // name varies by version: check the docs
  jsxA11y.flatConfigs.recommended,
  {
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  { ignores: ['dist/**', '.next/**', 'coverage/**'] },
]

// apps/web/eslint.config.js
import base from '@acme/eslint-config'
export default [...base, { files: ['src/legacy/**'], rules: { '@typescript-eslint/no-explicit-any': 'warn' } }]`,
        note: 'Flat config hanyalah sebuah array. Entri yang belakangan menimpa entri sebelumnya, dan glob `files` membatasi aturan yang dilonggarkan hanya untuk kode legacy, bukan mematikannya di semua tempat.',
      },
      {
        title: '❌ Lint semua file saat commit vs ✅ lint-staged',
        code: `// ❌ .husky/pre-commit
pnpm lint && pnpm test   // 90 seconds: people start using --no-verify

// ✅ .husky/pre-commit
pnpm exec lint-staged

// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix --max-warnings=0", "prettier --write"],
    "*.{json,md,css}": "prettier --write"
  }
}`,
        note: 'Hook harus cepat, kalau tidak orang akan melewatinya. Jalankan hanya pada file yang di-stage dan serahkan typecheck lengkap serta test ke CI.',
      },
    ],
    realCase: {
      title: 'Stale closure yang tidak bersuara',
      story: `Tim dashboard sebuah fintech mematikan \`react-hooks/exhaustive-deps\` karena warning-nya dianggap "berisik". Sebuah hook polling menangkap \`accountId\` di callback interval dengan dependency array kosong. Saat pengguna berganti akun, grafik tetap mem-polling akun pertama, sehingga nasabah melihat saldo akun yang salah sampai mereka me-reload halaman.

**Akar masalah:** aturan lint yang seharusnya menandai dependency yang hilang sedang dimatikan.

**Perbaikan:** mereka menyalakan lagi aturan itu sebagai error, membereskan sekitar 40 pelanggaran (kebanyakan dengan memindahkan fungsi ke dalam effect atau memakai functional update), dan menambah langkah CI yang gagal kalau ada warning.

**Pelajaran:** aturan lint yang "cuma" memberi warning soal hook biasanya sedang memperingatkan bug sungguhan.`,
    },
    pitfalls: [
      'Membiarkan aturan stilistik ESLint bentrok dengan Prettier. Serahkan urusan formatting ke formatter.',
      'Membungkam `exhaustive-deps` dengan komentar disable alih-alih memperbaiki desain dependency-nya.',
      'Mengandalkan pre-commit hook sebagai satu-satunya gerbang. Hook bisa dilewati, jadi CI wajib menjalankan ulang semuanya.',
      'Meng-copy-paste konfigurasi antar app sampai lama-lama berbeda. Publikasikan package konfigurasi bersama.',
      'Menyalakan aturan strict sebagai error sekaligus di codebase legacy yang besar. Naikkan bertahap, mulai dari warning.',
    ],
    exercise: {
      task: 'Buat package flat config ESLint bersama di repo dengan dua app. Aktifkan react-hooks, jsx-a11y dan aturan TypeScript type-aware, lalu tambahkan lint-staged dengan Husky supaya hanya file yang di-stage yang dicek.',
      hint: 'Aturan type-aware butuh `languageOptions.parserOptions.projectService: true`.',
      solution: `\`\`\`js
// packages/eslint-config/index.js
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,
  reactHooks.configs['recommended-latest'],
  jsxA11y.flatConfigs.recommended,
  { languageOptions: { parserOptions: { projectService: true } } },
)
\`\`\`

Lalu jalankan \`pnpm add -D husky lint-staged\` di root dan \`pnpm exec husky init\`. Isi \`.husky/pre-commit\` dengan \`pnpm exec lint-staged\` dan tambahkan blok \`lint-staged\` seperti di contoh. Uji dengan men-stage file yang berisi hook kondisional. Commit-nya harus ditolak.`,
    },
    interview: [
      'Apa beda linter dan formatter, dan kenapa keduanya tidak boleh tumpang tindih?',
      'Kenapa pre-commit hook tidak bisa menggantikan pengecekan di CI?',
      'Bagaimana cara kamu memperkenalkan aturan lint baru yang strict ke codebase 300 ribu baris?',
    ],
  },

  cicd: {
    explanation: `Continuous integration berarti setiap perubahan sering di-merge ke branch bersama dan diverifikasi secara otomatis. Continuous delivery atau deployment berarti setiap perubahan yang sudah terverifikasi *bisa* (atau memang langsung) masuk ke production tanpa langkah manual. Untuk app React, pipeline inilah jaring pengaman yang memungkinkan tim melakukan release berkali-kali sehari.

### Pipeline standar
1. **Install** dengan lockfile yang dibekukan (\`pnpm install --frozen-lockfile\`) supaya CI mendapat persis apa yang sudah kamu uji di lokal.
2. **Lint** dan **typecheck**. Keduanya cepat, murah, dan menangkap sebagian besar kesalahan. Jalankan secara paralel.
3. **Unit test dan component test** (Vitest + Testing Library).
4. **Build** bundle production. Build bisa gagal di tempat yang lolos saat mode dev, misalnya karena import server-only di client component.
5. **End-to-end test** (Playwright) terhadap app hasil build atau URL preview.
6. **Deploy**: preview untuk tiap PR, production saat merge ke \`main\`.

### Preview deployment
Preview adalah salinan penuh app yang di-deploy di URL unik untuk tiap PR. Reviewer, desainer, dan PM bisa mencoba langsung perubahannya, bukan sekadar membaca diff. Playwright bisa dijalankan terhadap preview, yang lebih mirip production daripada localhost. Preview butuh environment variable sendiri dan biasanya database yang sudah di-seed atau database per branch. Jangan pernah mengarahkan preview ke database production dengan akses tulis.

### Kecepatan itu penting
Pipeline 25 menit mengubah perilaku tim: orang menumpuk perubahan, lebih jarang merge, dan melompati antrean. Teknik yang membantu:
- Cache package store dan hasil build (misalnya \`actions/setup-node\` dengan cache, atau remote cache Turborepo).
- Di monorepo, jalankan hanya package yang terdampak (\`turbo run test --filter=...[origin/main]\`).
- Bagi (shard) Playwright ke beberapa mesin.
- Batalkan run lama di branch yang sama dengan grup \`concurrency\`.

### Release yang aman
Wajibkan status check dan review lewat branch protection. Deploy perubahan kecil, pantau error rate dan Web Vitals, dan pastikan bisa rollback dengan satu klik. Feature flag memisahkan *deploy* kode dari *release* fitur. Secret disimpan di secret store milik penyedia CI, dan workflow yang dipicu dari fork tidak boleh menerimanya.`,
    examples: [
      {
        title: 'Pipeline GitHub Actions untuk app pnpm',
        code: `# .github/workflows/ci.yml
name: ci
on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test -- --coverage
      - run: pnpm build

  e2e:
    needs: verify
    runs-on: ubuntu-latest
    strategy:
      matrix: { shard: [1, 2, 3] }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm exec playwright test --shard=\${{ matrix.shard }}/3`,
        note: 'Grup `concurrency` membatalkan run yang sudah usang. Lockfile yang dibekukan membuat install bisa direproduksi, dan matrix membagi E2E test yang lambat ke tiga runner.',
      },
      {
        title: '❌ Secret di pull_request_target vs ✅ least privilege',
        code: `# ❌ runs fork code with repository secrets available
on: pull_request_target
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
        with: { ref: \${{ github.event.pull_request.head.sha }} }
      - run: pnpm install && pnpm test   # a malicious postinstall can read secrets
        env: { DEPLOY_TOKEN: \${{ secrets.DEPLOY_TOKEN }} }

# ✅ untrusted code runs without secrets and with a read-only token
on: pull_request
permissions:
  contents: read`,
        note: '`pull_request_target` berjalan dalam konteks repo utama beserta secret-nya. Melakukan checkout dan menjalankan kode dari fork di sana sama saja menyerahkan secret kamu ke siapa pun yang membuka PR.',
      },
    ],
    realCase: {
      title: 'CI hijau, build production rusak',
      story: `Sebuah tim SaaS menjalankan lint dan test di setiap PR, tapi build hanya dijalankan saat deploy. Seorang developer meng-import helper database yang server-only ke komponen bertanda \`'use client'\`. Test tetap lolos karena modulnya di-mock. Saat merge, build production gagal dan menahan tiga release lain selama satu sore.

**Akar masalah:** pipeline tidak menjalankan langkah yang justru gagal.

**Perbaikan:** mereka menambahkan \`pnpm build\` ke pipeline PR dan ke preview deployment, sehingga setiap PR terbukti bisa di-build dan dibuka.

**Pelajaran:** CI harus menjalankan apa yang dijalankan production. Kalau sebuah langkah bisa gagal saat deploy, jalankan sebelum merge.`,
    },
    pitfalls: [
      'Melewatkan build production di CI. Mode dev dan test menyembunyikan banyak error yang baru muncul saat build.',
      'Memakai `npm install` alih-alih lockfile yang dibekukan, sehingga CI menguji versi yang berbeda dari laptop kamu.',
      'Memberi preview deployment secret production atau akses tulis ke database production.',
      'Membiarkan pipeline makin lambat tanpa caching, sharding, atau run khusus yang terdampak.',
      'Menjalankan kode PR dari fork di `pull_request_target` dengan secret yang tersedia.',
    ],
    exercise: {
      task: 'Tulis workflow GitHub Actions yang menjalankan lint, typecheck, test, dan build app React Vite di setiap PR. Batalkan run yang sudah usang dan upload folder `dist` sebagai artifact.',
      hint: 'Pakai `actions/upload-artifact` setelah langkah build dan grup `concurrency` yang di-key dengan ref.',
      solution: `\`\`\`yaml
name: ci
on: [pull_request]
concurrency: { group: ci-\${{ github.ref }}, cancel-in-progress: true }
permissions: { contents: read }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm exec tsc -b && pnpm test --run
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist }
\`\`\``,
    },
    interview: [
      'Apa yang diberikan preview deployment yang tidak diberikan oleh test suite yang hijau?',
      'Pipeline kamu butuh 30 menit. Apa yang akan kamu lakukan supaya di bawah 10 menit?',
      'Apa beda men-deploy fitur dengan me-release fitur?',
    ],
  },

  errors: {
    explanation: `App production gagal dengan cara yang tidak pernah kamu lihat di lokal: jaringan yang putus-nyambung, browser lama, data yang aneh, extension browser yang memutasi DOM. Observability adalah cara kamu mengetahuinya *sebelum* pengguna mengirim email ke tim support, dan error boundary memastikan satu widget yang rusak tidak membuat seluruh layar kosong.

### Error boundary
Error boundary adalah komponen yang menangkap error yang dilempar **saat render, di lifecycle method, dan di constructor** dari subtree-nya, lalu merender fallback sebagai gantinya. Error boundary *tidak* menangkap error di event handler, di kode async seperti callback \`setTimeout\` atau fetch, atau di boundary itu sendiri. Yang seperti itu butuh \`try/catch\` atau handler global. Di balik layar, boundary masih berupa class component (\`getDerivedStateFromError\` + \`componentDidCatch\`), jadi kebanyakan tim memakai \`react-error-boundary\`.

Pasang secara berlapis:
- **Root**: pertahanan terakhir, halaman penuh "terjadi kesalahan" dengan tombol reload.
- **Route**: di Next.js ini adalah file \`error.tsx\` per segment. Layout dan navigasi tetap bisa dipakai.
- **Widget**: di sekitar panel yang berdiri sendiri seperti grafik atau komentar, supaya kegagalan tetap lokal.

Beri boundary cara untuk **reset**: tombol retry, dan \`resetKeys\` supaya error hilang saat pengguna berpindah halaman.

### Pelaporan
React 19 menambahkan opsi \`onCaughtError\`, \`onUncaughtError\` dan \`onRecoverableError\` ke \`createRoot\` dan \`hydrateRoot\`. Opsi ini memberi kamu satu tempat untuk meneruskan error (termasuk hydration mismatch) ke layanan seperti Sentry. Upload **source map** ke layanan tersebut di CI, tapi jangan sajikan secara publik, supaya stack trace menunjuk ke kode TypeScript kamu, bukan kode yang sudah di-minify. Lampirkan konteks: versi release, route, user id (bukan email), dan feature flag.

### Real User Monitoring
Tool lab seperti Lighthouse menguji satu mesin. RUM mengumpulkan **Core Web Vitals** (LCP, INP, CLS) dari pengguna sungguhan dengan library \`web-vitals\`, sehingga kamu bisa melihat, misalnya, INP buruk di Android kelas bawah pada halaman pencarian. Pantau persentil ke-75, bukan rata-rata.

### Feature flag
Flag memungkinkan kamu mengirim kode dalam keadaan tersembunyi lalu menyalakannya untuk 1%, kemudian 10%, lalu semua orang, sambil memantau error rate. Kalau error melonjak, matikan flag-nya. Cara ini lebih cepat daripada rollback. Hapus flag setelah fitur sepenuhnya diluncurkan, kalau tidak flag itu menjadi kompleksitas permanen.`,
    examples: [
      {
        title: 'Boundary berlapis dengan reset',
        code: `import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import * as Sentry from '@sentry/react'

function WidgetFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="widget-error">
      <p>This panel failed to load.</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

export function Dashboard({ accountId }: { accountId: string }) {
  return (
    <main>
      <ErrorBoundary
        FallbackComponent={WidgetFallback}
        resetKeys={[accountId]}
        onError={(error, info) =>
          Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
        }
      >
        <RevenueChart accountId={accountId} />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={WidgetFallback}>
        <ActivityFeed accountId={accountId} />
      </ErrorBoundary>
    </main>
  )
}`,
        note: 'Tiap panel gagal secara independen. `resetKeys` menghapus error saat akun berganti, jadi pengguna tidak terjebak di state error yang sudah basi.',
      },
      {
        title: '❌ Berharap boundary menangkap error handler vs ✅ menanganinya',
        code: `// ❌ The boundary never sees this: it is thrown in an event handler
<button onClick={async () => { await saveDraft(form) }}>Save</button>

// ✅ Handle it locally, report it, and tell the user
const { showBoundary } = useErrorBoundary()
async function onSave() {
  try {
    await saveDraft(form)
  } catch (err) {
    Sentry.captureException(err)
    if (isFatal(err)) showBoundary(err) // escalate to the boundary on purpose
    else toast.error('Could not save. Your changes are kept locally.')
  }
}`,
        note: 'Boundary hanya menangkap error saat render. `useErrorBoundary().showBoundary` memungkinkan kamu dengan sengaja meneruskan error async ke boundary terdekat.',
      },
      {
        title: 'Pelaporan di level root pada React 19',
        code: `import { createRoot } from 'react-dom/client'
import { onCLS, onINP, onLCP } from 'web-vitals'

createRoot(document.getElementById('root')!, {
  onUncaughtError: (error, info) => report('uncaught', error, info.componentStack),
  onCaughtError: (error, info) => report('caught', error, info.componentStack),
  onRecoverableError: (error) => report('recoverable', error),
}).render(<App />)

const send = (metric: { name: string; value: number; id: string }) =>
  navigator.sendBeacon('/rum', JSON.stringify({ ...metric, path: location.pathname }))
onLCP(send); onINP(send); onCLS(send)`,
        note: '`sendBeacon` tetap mengirim metrik meskipun halaman sedang ditutup. Recoverable error mencakup hydration mismatch yang sudah diperbaiki React dengan me-render ulang di client.',
      },
    ],
    realCase: {
      title: 'Satu carousel menjatuhkan checkout',
      story: `Sebuah situs e-commerce menambahkan carousel "sering dibeli bersamaan" di halaman keranjang. API rekomendasi kadang mengembalikan \`null\` untuk harga, dan komponennya memanggil \`price.toFixed(2)\`. Karena hanya ada error boundary di root, seluruh halaman keranjang diganti layar error, dan konversi checkout turun selama beberapa jam sebelum ada yang sadar, karena tidak ada alert untuk error di client.

**Perbaikan:** boundary level widget di sekitar carousel (fallback: tidak merender apa pun), validasi skema untuk respons API, dan alert Sentry untuk lonjakan error baru per release.

**Pelajaran:** pasang boundary di sekitar UI yang tidak kritis supaya gagalnya sendirian, dan buat alert untuk error di client sama seperti alert untuk error 500 di server.`,
    },
    pitfalls: [
      'Berharap error boundary menangkap error di event handler, promise, atau timer. Boundary hanya menangkap error saat render dan di lifecycle.',
      'Hanya memakai satu boundary di root, sehingga kegagalan widget mana pun membuat seluruh app kosong.',
      'Meng-upload source map ke URL publik, yang membuka source code kamu. Upload hanya ke layanan error.',
      'Melaporkan rata-rata Web Vitals. Pantau persentil ke-75 per halaman dan per jenis perangkat.',
      'Tidak pernah menghapus feature flag, sehingga jalur kode mati terus menumpuk.',
    ],
    exercise: {
      task: 'Buat wrapper `SafeWidget` yang merender children di dalam error boundary, menampilkan tombol retry, melapor ke fungsi `report(error, context)` dengan nama widget, dan ter-reset saat prop `resetKey` berubah.',
      hint: 'Bungkus `react-error-boundary` dan kirim `resetKeys={[resetKey]}`.',
      solution: `\`\`\`tsx
import { ErrorBoundary } from 'react-error-boundary'
import type { ReactNode } from 'react'

export function SafeWidget({ name, resetKey, children }: { name: string; resetKey?: unknown; children: ReactNode }) {
  return (
    <ErrorBoundary
      resetKeys={[resetKey]}
      onError={(error, info) => report(error, { widget: name, stack: info.componentStack })}
      fallbackRender={({ resetErrorBoundary }) => (
        <div role="alert">
          <p>{name} is unavailable.</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
\`\`\``,
    },
    interview: [
      'Error apa saja yang tidak ditangkap error boundary, dan bagaimana kamu menanganinya?',
      'Di mana kamu akan memasang error boundary di app dashboard, dan kenapa?',
      'Bagaimana feature flag mengurangi risiko deployment?',
    ],
  },

  security: {
    explanation: `Keamanan frontend pada dasarnya soal tiga hal: jangan pernah membiarkan data yang dikendalikan penyerang berjalan sebagai kode (XSS), jangan pernah mengirim secret ke browser, dan jaga agar dependency tree kamu tetap bisa dipercaya.

### Perlindungan bawaan React
Saat kamu menulis \`{comment.body}\` di JSX, React memasangnya sebagai text node, jadi \`<script>\` hanya muncul sebagai teks yang tidak berbahaya. Itu sudah menutup sebagian besar XSS. Bug justru tinggal di jalan pintasnya:
- \`dangerouslySetInnerHTML\` menyisipkan HTML mentah. Kalau ada bagian yang berasal dari pengguna, CMS, atau API pihak ketiga, sanitasi dulu dengan **DOMPurify**, idealnya dengan allow-list yang ketat.
- **URL**: \`<a href={userUrl}>\` berisi \`javascript:alert(1)\` akan menjalankan kode saat diklik. React memberi warning untuk URL \`javascript:\` dan di beberapa versi bisa memblokirnya, tapi tetap validasi sendiri protokolnya (izinkan hanya \`http:\`, \`https:\` dan \`mailto:\`).
- Men-spread objek yang tidak tepercaya ke props (\`<div {...userProps}>\`) bisa menyusupkan \`dangerouslySetInnerHTML\` atau event handler.
- JSON yang di-render server di dalam tag script harus di-escape supaya \`</script>\` di dalam data tidak bisa menutup tag-nya.

### Content Security Policy
CSP adalah HTTP header yang memberi tahu browser sumber mana saja yang boleh menjalankan script, memuat style, frame, dan seterusnya. Kebijakan ketat berbasis **nonce** (nilai acak yang dibuat per request dan ditambahkan ke tag script yang diizinkan) berarti meskipun penyerang berhasil menyisipkan markup, browser menolak menjalankan script mereka. Di Next.js kamu membuat nonce di \`proxy.ts\` dan memasang header-nya di sana. Nonce memaksa dynamic rendering, jadi cek panduan CSP Next.js untuk trade-off terbarunya. Mulai dengan \`Content-Security-Policy-Report-Only\` untuk menemukan pelanggaran sebelum diberlakukan.

### Secret
Semua yang ada di bundle client bersifat publik. Vite mengekspos \`import.meta.env.VITE_*\` dan Next.js mengekspos \`NEXT_PUBLIC_*\` ke browser *memang sengaja begitu*. Private key hanya boleh ada di kode server: route handler, Server Action, Server Component. Pakai package \`server-only\` supaya import modul yang membaca secret dari client component membuat build gagal. Kalau secret bocor, **rotasi**. Menghapus commit-nya saja tidak cukup.

### Dependency dan auth
Jalankan Renovate atau Dependabot, review diff lockfile, dan jalankan \`pnpm audit\` di CI. Simpan session di cookie \`HttpOnly\`, \`Secure\`, \`SameSite\`, bukan di \`localStorage\` yang bisa dibaca oleh XSS apa pun. Dan ingat bahwa **setiap Server Action adalah endpoint publik**: selalu lakukan otorisasi di server, karena pengecekan di client hanya menyembunyikan tombol.`,
    examples: [
      {
        title: '❌ HTML CMS mentah vs ✅ yang sudah disanitasi',
        code: `import DOMPurify from 'isomorphic-dompurify'

// ❌ Any <img onerror=...> in the CMS runs in your users' sessions
export function ArticleBad({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

// ✅ Allow-list the tags and attributes the design actually needs
const clean = (html: string) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'a', 'strong', 'em', 'ul', 'ol', 'li', 'h2', 'h3', 'code', 'pre'],
    ALLOWED_ATTR: ['href'],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:)/i,
  })

export function Article({ html }: { html: string }) {
  return <div className="prose" dangerouslySetInnerHTML={{ __html: clean(html) }} />
}`,
        note: 'Sanitasi sedekat mungkin dengan proses render, dengan allow-list. Membatasi URI juga memblokir link `javascript:` di dalam HTML.',
      },
      {
        title: 'CSP berbasis nonce di proxy.ts Next.js',
        code: `// proxy.ts (Next.js 16; called middleware.ts in earlier versions)
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic'",
    "style-src 'self' 'nonce-" + nonce + "'",
    "img-src 'self' blob: data: https://images.acme-cdn.example",
    "connect-src 'self' https://api.acme.example",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ')

  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}`,
        note: 'Nonce baru di setiap request berarti tag script yang disusupkan tidak bisa menebaknya. `frame-ancestors none` juga memblokir clickjacking. Pastikan setup persisnya di dokumentasi CSP Next.js terbaru.',
      },
      {
        title: '❌ Secret di env client vs ✅ modul server-only',
        code: `// ❌ Ends up in the JS bundle that every visitor downloads
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!)

// ✅ lib/payments.ts
import 'server-only'
import Stripe from 'stripe'
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
// Importing this file from a 'use client' component now fails the build.`,
        note: 'Prefix `NEXT_PUBLIC_` dan `VITE_` artinya "kirim ke browser". Secret tidak boleh memakai prefix ini.',
      },
    ],
    realCase: {
      title: 'API key peta yang membayari orang lain',
      story: `Sebuah startup travel menaruh API key geocoding berbayar di \`VITE_GEOCODE_KEY\` supaya app React bisa memanggil API secara langsung. Key itu tidak punya pembatasan domain. Beberapa minggu kemudian, tagihan bulanan membengkak berkali-kali lipat dari biasanya: seseorang sudah mengekstrak key dari bundle dan memakainya untuk layanan mereka sendiri.

**Akar masalah:** kredensial yang seharusnya di server terekspos lewat env var sisi client.

**Perbaikan:** mereka merotasi key, memindahkan pemanggilan ke balik route server kecil yang menerapkan rate limit dan autentikasi, dan menambahkan pengecekan CI yang memindai folder \`dist\` hasil build untuk pola secret yang dikenal.

**Pelajaran:** kalau browser bisa membacanya, semua orang juga bisa. Anggap isi bundle itu publik.`,
    },
    pitfalls: [
      'Mengirim HTML dari CMS atau pengguna yang belum disanitasi ke `dangerouslySetInnerHTML`.',
      'Merender URL dari pengguna di `href` tanpa mengecek protokolnya.',
      'Menaruh secret di variabel `VITE_*` atau `NEXT_PUBLIC_*`.',
      'Menyimpan token auth di `localStorage`, tempat XSS apa pun bisa mencurinya.',
      'Mengecek permission hanya di UI dan tidak di Server Action atau API route.',
    ],
    exercise: {
      task: 'Tulis komponen `SafeLink` yang merender anchor hanya jika URL-nya memakai http, https, atau mailto, menambahkan `rel="noopener noreferrer"` untuk link eksternal, dan selain itu merender teks biasa.',
      hint: 'Parse dengan `new URL(href, window.location.origin)` di dalam try/catch lalu cek `.protocol`.',
      solution: `\`\`\`tsx
const ALLOWED = new Set(['http:', 'https:', 'mailto:'])

export function SafeLink({ href, children }: { href: string; children: React.ReactNode }) {
  let url: URL
  try {
    url = new URL(href, window.location.origin)
  } catch {
    return <span>{children}</span>
  }
  if (!ALLOWED.has(url.protocol)) return <span>{children}</span>
  const external = url.origin !== window.location.origin
  return (
    <a href={url.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  )
}
\`\`\``,
    },
    interview: [
      'React meng-escape output secara default. Sebutkan tiga cara XSS masih bisa terjadi di app React.',
      'Bagaimana CSP berbasis nonce mencegah script yang disusupkan berjalan?',
      'Sebuah secret key ter-commit dan ter-deploy di bundle client. Apa langkah-langkahmu?',
    ],
  },

  i18n: {
    explanation: `Internationalization (i18n) adalah menyiapkan app supaya bisa diterjemahkan dan diformat untuk locale mana pun. Localization (l10n) adalah melakukannya untuk satu locale tertentu. Menambahkan i18n belakangan itu menyakitkan, jadi makin awal kamu mendesain untuknya, makin murah biayanya.

### Message, bukan string
Jangan pernah menyusun kalimat dengan konkatenasi: \`"You have " + n + " items"\`. Urutan kata, bentuk jamak, dan tata bahasa berbeda di tiap bahasa. Sebagai gantinya, pakai **message ID** dengan **ICU MessageFormat**, yang bisa menyatakan variabel, bentuk jamak, dan pilihan di dalam satu string yang bisa diterjemahkan. Dengan begitu penerjemah mendapat kalimat utuh.

### Bentuk jamak tidak sekadar tunggal/jamak
Bahasa Inggris punya dua kategori plural (\`one\`, \`other\`). Bahasa Arab punya enam (\`zero\`, \`one\`, \`two\`, \`few\`, \`many\`, \`other\`). Bahasa Polandia membedakan \`few\` dan \`many\`. Bahasa Indonesia dan Jepang hanya memakai \`other\`. ICU \`plural\` memakai aturan CLDR (di JavaScript tersedia sebagai \`Intl.PluralRules\`) untuk memilih cabang yang tepat, dan \`=0\` memungkinkan kamu menulis kecocokan persis untuk nol. \`select\` menangani kasus seperti gender gramatikal.

### Library
- **react-intl** (FormatJS) native ICU: \`<FormattedMessage>\` dan \`useIntl().formatMessage\`.
- **i18next / react-i18next** punya ekosistem plugin yang besar. Secara default sintaks plural-nya sendiri, dan ICU tersedia lewat plugin.
- **next-intl** populer di app Next.js App Router dan bisa dipakai di Server Component.

Muat hanya message untuk locale yang aktif (dynamic import per locale) supaya kamu tidak mengirim semua bahasa ke setiap pengguna.

### Format dengan Intl
Tanggal, angka, mata uang, waktu relatif, dan daftar semuanya punya formatter bawaan: \`Intl.DateTimeFormat\`, \`Intl.NumberFormat\`, \`Intl.RelativeTimeFormat\`, \`Intl.ListFormat\`. Memformat \`1234.5\` menghasilkan \`1,234.5\` di en-US, \`1.234,5\` di de-DE dan \`1.234,5\` di id-ID. Hati-hati dengan **hydration**: kalau server memformat dalam UTC dengan satu locale sementara client memakai zona waktu pengguna, teksnya akan berbeda. Kirim locale dan zona waktu secara eksplisit di kedua sisi.

### Right-to-left
Untuk bahasa Arab dan Ibrani, set \`<html dir="rtl" lang="ar">\`. Pakai CSS **logical property** (\`margin-inline-start\`, \`padding-inline-end\`, \`inset-inline-start\`) alih-alih left/right supaya layout tercermin otomatis. Balik ikon yang punya arah seperti panah, tapi jangan logo atau kontrol media.

### Proses
Ekstrak message dengan CLI, kirim ke penerjemah atau TMS, dan buat CI gagal kalau ada key yang hilang. Pseudo-localization (misalnya \`[Ŝéţţîñĝš___]\`) membongkar string yang di-hard-code dan layout yang rusak kalau teksnya lebih panjang. Teks bahasa Jerman sering 30% lebih panjang dari bahasa Inggris.`,
    examples: [
      {
        title: '❌ Konkatenasi vs ✅ ICU plural',
        code: `// ❌ breaks for 0, for 1 in other languages, and for word order
<p>{'You have ' + count + ' new message' + (count === 1 ? '' : 's')}</p>

// ✅ messages/en.json
{
  "inbox.newMessages": "{count, plural, =0 {No new messages} one {# new message} other {# new messages}}"
}
// messages/ar.json uses zero/one/two/few/many/other branches

// Component
import { FormattedMessage } from 'react-intl'
<p><FormattedMessage id="inbox.newMessages" values={{ count }} /></p>`,
        note: '`#` diganti dengan angka yang sudah diformat sesuai locale. Penerjemah bisa menambah cabang plural sebanyak yang dibutuhkan bahasanya tanpa mengubah kode.',
      },
      {
        title: 'Format Intl dengan locale dan zona waktu eksplisit',
        code: `export function OrderSummary({ order, locale, timeZone }: {
  order: { total: number; currency: string; placedAt: string; items: string[] }
  locale: string
  timeZone: string
}) {
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: order.currency })
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone })
  const list = new Intl.ListFormat(locale, { type: 'conjunction' })

  return (
    <dl>
      <dt>Total</dt><dd>{money.format(order.total)}</dd>
      <dt>Placed</dt><dd>{date.format(new Date(order.placedAt))}</dd>
      <dt>Items</dt><dd>{list.format(order.items)}</dd>
    </dl>
  )
}`,
        note: 'Mengirim `locale` dan `timeZone` dari server (misalnya dari pengaturan pengguna) menghasilkan output yang sama di server dan client, sehingga hydration mismatch bisa dihindari.',
      },
      {
        title: 'CSS aman untuk RTL dengan logical property',
        code: `/* ❌ only correct for left-to-right */
.card { padding-left: 16px; border-left: 4px solid var(--accent); text-align: left; }

/* ✅ mirrors automatically under dir="rtl" */
.card { padding-inline-start: 16px; border-inline-start: 4px solid var(--accent); text-align: start; }
[dir='rtl'] .icon-arrow { transform: scaleX(-1); }`,
        note: 'Logical property dipetakan ke kiri atau kanan tergantung arah tulisan, jadi satu stylesheet melayani keduanya.',
      },
    ],
    realCase: {
      title: 'Bug "1 items" dalam delapan bahasa',
      story: `Sebuah perusahaan logistik meluncur di Polandia dan Timur Tengah. App mereka memakai \`t('items') + count\` dengan key \`items_singular\` dan \`items_plural\` yang dipilih berdasarkan \`count === 1\`. Pengguna Polandia melihat teks yang salah secara tata bahasa untuk 2 sampai 4 dan 22 sampai 24 item, dan pengguna berbahasa Arab melihat bentuk yang salah hampir di semua tempat. Tiket support menyebut app itu "hasil terjemahan mesin".

**Akar masalah:** logika plural bahasa Inggris di-hard-code di komponen.

**Perbaikan:** mereka bermigrasi ke ICU message sehingga pemilihan plural memakai aturan CLDR per locale, dan menambahkan build pseudo-locale untuk menangkap string hasil konkatenasi.

**Pelajaran:** aturan plural itu milik bahasa, bukan milik kode kamu. Jangan pernah bercabang berdasarkan \`count === 1\` untuk teks tampilan.`,
    },
    pitfalls: [
      'Menyambung potongan terjemahan, yang merusak urutan kata di bahasa lain.',
      'Menganggap semua bahasa hanya punya bentuk tunggal dan jamak.',
      'Memformat tanggal tanpa zona waktu eksplisit, sehingga terjadi hydration mismatch dan tanggal yang meleset.',
      'Memakai CSS `left`/`right` alih-alih logical property, sehingga layout RTL rusak.',
      'Membundel semua locale ke chunk utama alih-alih memuat yang aktif saja.',
    ],
    exercise: {
      task: 'Tulis helper `formatRelative(date, now, locale)` yang mengembalikan string seperti "3 days ago" atau "in 2 hours" dengan `Intl.RelativeTimeFormat`, memilih satuan terbesar yang masuk akal. Lalu tulis ICU message untuk "{name} liked your photo" / "{name} and {count} others liked your photo".',
      hint: 'Hitung selisihnya dalam detik lalu telusuri daftar satuan beserta ukurannya dalam detik.',
      solution: `\`\`\`ts
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000], ['month', 2592000], ['week', 604800],
  ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1],
]

export function formatRelative(date: Date, now: Date, locale: string) {
  const diff = (date.getTime() - now.getTime()) / 1000
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size || unit === 'second') return rtf.format(Math.round(diff / size), unit)
  }
  return ''
}
\`\`\`

ICU message:

\`\`\`
{count, plural, =0 {{name} liked your photo} one {{name} and # other liked your photo} other {{name} and # others liked your photo}}
\`\`\``,
    },
    interview: [
      'Kenapa konkatenasi string merugikan proses terjemahan?',
      'Bagaimana kamu menghindari hydration mismatch saat memformat tanggal di server?',
      'Perubahan apa yang dibutuhkan untuk mendukung bahasa right-to-left?',
    ],
  },

  monorepo: {
    explanation: `Monorepo menyimpan beberapa app dan package dalam satu repository. Bagi tim React, alasan yang paling umum adalah berbagi kode: satu package design system, satu konfigurasi ESLint, satu konfigurasi dasar TypeScript, dan tipe API bersama, yang dipakai oleh app pelanggan, app admin, dan situs marketing.

### Komponennya
- **pnpm workspaces** menautkan package lokal satu sama lain. \`"@acme/ui": "workspace:*"\` di \`package.json\` sebuah app mengarah ke \`packages/ui\` di disk, jadi perubahan pada sebuah tombol langsung terlihat di semua app. Layout \`node_modules\` pnpm yang strict juga mencegah package meng-import dependency yang tidak mereka deklarasikan.
- **Turborepo** adalah task runner. Kamu mendeklarasikan task di \`turbo.json\` beserta dependency-nya (\`"dependsOn": ["^build"]\` artinya "build dulu dependency workspace saya") dan output-nya. Turbo menyusun graf task, menjalankan task yang independen secara paralel, dan **meng-cache** hasilnya dengan meng-hash input (file source, env var, lockfile). Kalau tidak ada yang berubah, output diputar ulang dalam hitungan milidetik. Dengan **remote caching**, CI dan rekan setim berbagi cache yang sama.
- **Filtering**: \`turbo run test --filter=...[origin/main]\` menjalankan task hanya untuk package yang berubah sejak \`main\` beserta package yang bergantung padanya.

### Strategi package internal
1. **Package just-in-time (source)**: \`packages/ui\` langsung meng-export file \`.tsx\` dan bundler tiap app yang meng-compile-nya. Sederhana dan cepat di-setup. Next.js butuh \`transpilePackages\`.
2. **Package yang di-compile**: tiap package di-build ke \`dist\` dengan tsup atau tsc. Wajib kalau kamu mempublikasikan ke npm, dan memberi batas cache yang lebih baik.

Pakai TypeScript **project references** atau field \`exports\` supaya editor me-resolve tipe dengan benar.

### Batasan
Monorepo membuat kamu gampang meng-import apa saja dari mana saja, dan justru di situlah bahayanya. Tegakkan batasan: app boleh meng-import package, package tidak boleh meng-import app, dan package \`ui\` tidak boleh bergantung pada package \`data\`. Tool seperti aturan import ESLint atau module boundaries Nx bisa menegakkannya.

### Kapan sebaiknya tidak
Kalau dua app tidak berbagi apa pun dan punya tim serta siklus release yang berbeda, repo terpisah lebih sederhana. Monorepo butuh investasi tooling: caching CI, CODEOWNERS, dan kebijakan dependency. Manfaatnya makin besar seiring banyaknya kode yang dibagi.`,
    examples: [
      {
        title: 'Layout workspace dan turbo.json',
        code: `// pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

// apps/web/package.json (excerpt)
{ "dependencies": { "@acme/ui": "workspace:*", "@acme/api-types": "workspace:*" } }

// turbo.json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "env": ["NEXT_PUBLIC_API_URL"]
    },
    "lint": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true }
  }
}`,
        note: '`^build` artinya dependency di-build lebih dulu. Mendeklarasikan `outputs` memungkinkan Turbo memulihkannya dari cache, dan mencantumkan `env` menjadikan env var bagian dari cache key, sehingga mengubahnya akan meng-invalidate build.',
      },
      {
        title: '❌ Env var tidak dideklarasikan vs ✅ dideklarasikan di hash',
        code: `// ❌ build reads process.env.NEXT_PUBLIC_API_URL but turbo.json does not list it
// Staging and production builds hash the same, so CI restores the staging bundle
// (pointing at the staging API) for the production deploy.

// ✅ turbo.json
"build": { "dependsOn": ["^build"], "outputs": [".next/**"], "env": ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_SENTRY_DSN"] }`,
        note: 'Cache hanya benar kalau key-nya mencakup semua input. Env var yang tidak dideklarasikan adalah sumber klasik cache hit yang salah. Versi Turborepo terbaru memakai strict env mode untuk membantu menangkap masalah ini.',
      },
    ],
    realCase: {
      title: 'Production mengarah ke staging',
      story: `Sebuah tim retail memindahkan tiga app ke monorepo Turborepo dan memangkas waktu CI dari 18 menjadi 4 menit dengan remote caching. Seminggu kemudian, storefront production malah memanggil API staging. Build untuk staging berjalan lebih dulu dan di-cache. Build production punya file source yang identik, dan \`NEXT_PUBLIC_API_URL\` tidak dideklarasikan di \`turbo.json\`, jadi Turbo melaporkan cache hit dan men-deploy bundle staging.

**Perbaikan:** mereka mendeklarasikan semua env var saat build di \`env\`, menyalakan strict env mode, dan menambahkan smoke test yang mengecek URL API hasil deploy.

**Pelajaran:** caching adalah fitur kebenaran, bukan sekadar fitur kecepatan. Setiap input harus masuk ke hash.`,
    },
    pitfalls: [
      'Tidak mendeklarasikan env var di `turbo.json`, yang menyebabkan cache hit yang salah.',
      'Lupa `outputs`, sehingga cache hit hanya memulihkan log tanpa artefak build.',
      'Membiarkan package meng-import dari app, menciptakan siklus dan kepemilikan yang kusut.',
      'Memakai versi React yang berbeda di workspace yang berbeda, sehingga React terduplikasi dan hook rusak.',
    ],
    exercise: {
      task: 'Buat monorepo pnpm + Turborepo dengan `apps/web` (Vite React), `packages/ui` (komponen Button) dan `packages/tsconfig`. Buat `web` memakai `@acme/ui`, lalu jalankan `turbo run build` dua kali dan pastikan run kedua adalah full cache hit.',
      hint: 'Pakai `workspace:*` untuk dependency-nya dan beri `ui` script `build` yang menghasilkan output ke `dist`.',
      solution: `\`\`\`json
// packages/ui/package.json
{
  "name": "@acme/ui",
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "scripts": { "build": "tsup src/index.tsx --dts --format esm --external react" },
  "peerDependencies": { "react": "^19.0.0" }
}
\`\`\`

\`\`\`json
// turbo.json
{ "tasks": { "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] } } }
\`\`\`

\`pnpm turbo run build\` yang kedua seharusnya mencetak "FULL TURBO" dengan semua task ter-cache. Menjadikan React sebagai peer dependency menjaga hanya ada satu salinan React di app.`,
    },
    interview: [
      'Bagaimana Turborepo menentukan apakah sebuah task cache hit?',
      'Bandingkan package internal just-in-time dengan package yang di-compile.',
      'Kapan kamu memilih repository terpisah dibanding monorepo?',
    ],
  },

  pwa: {
    explanation: `Progressive Web App adalah web app yang bisa di-install dan tetap jalan saat jaringan buruk atau tidak ada. Dua bagian utamanya adalah **web app manifest** (nama, ikon, warna, mode tampilan) dan **service worker**.

### Service worker
Service worker adalah script yang berjalan di background, terpisah dari halaman, dan berperan sebagai proxy jaringan yang bisa diprogram. Ia bisa mencegat setiap \`fetch\` dalam scope-nya dan memutuskan menjawab dari Cache Storage, dari jaringan, atau keduanya. Ia punya lifecycle: *install* (precache app shell), *activate* (bersihkan cache lama), lalu penanganan *fetch*. Versi baru menunggu sampai semua tab yang memakai versi lama ditutup, kecuali kamu memanggil \`skipWaiting\`. Itulah sebabnya ada prompt "versi baru tersedia, silakan reload".

### Strategi caching
- **Cache first**: aset statis yang di-hash (\`app.3f9a.js\`), font. Cepat dan aman karena nama file berubah saat isinya berubah.
- **Network first**: HTML dan data API yang harus selalu segar, dengan fallback ke cache saat offline.
- **Stale-while-revalidate**: sajikan data dari cache seketika lalu perbarui di background. Cocok untuk avatar dan daftar yang tidak kritis.

Dalam praktiknya kamu jarang menulis ini sendiri. **Workbox** (atau \`vite-plugin-pwa\` yang memakainya) membuat precache manifest dan routing-nya.

### Penulisan saat offline
Membaca saat offline adalah bagian yang gampang. Untuk penulisan, masukkan ke antrean di IndexedDB lalu kirim ulang saat koneksi kembali, dan desain UI supaya pengguna bisa melihat apa yang masih tertunda. Konflik adalah keputusan produk, bukan sekadar urusan teknis.

### Kapan memakainya
PWA cocok untuk app kerja lapangan, tool internal, dan app konten. Tapi hati-hati: service worker yang bermasalah bisa menyajikan kode lama dalam waktu lama, jadi selalu sediakan cara untuk meng-update-nya, dan jangan sembarangan meng-cache respons API yang terautentikasi di cache bersama.`,
    examples: [
      {
        title: 'vite-plugin-pwa dengan runtime caching',
        code: `// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: { name: 'Field Inspections', short_name: 'Inspect', theme_color: '#0f766e', icons: [/* 192 and 512 png */] },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        runtimeCaching: [
          { urlPattern: /\\/api\\/sites/, handler: 'NetworkFirst', options: { cacheName: 'sites', networkTimeoutSeconds: 3 } },
          { urlPattern: /\\/avatars\\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'avatars' } },
        ],
      },
    }),
  ],
})`,
        note: 'Aset yang di-hash di-precache. Data API memakai network-first dengan timeout 3 detik, jadi koneksi lambat akan jatuh ke cache. `prompt` memungkinkan kamu bertanya ke pengguna sebelum mengaktifkan versi baru.',
      },
    ],
    realCase: {
      title: 'App yang tidak mau ter-update',
      story: `Sebuah perusahaan layanan lapangan merilis service worker buatan sendiri yang meng-cache \`index.html\` dengan strategi cache-first. Setelah perbaikan bug kritis, para teknisi tetap menjalankan versi lama selama berhari-hari, karena HTML yang ter-cache merujuk ke bundle lama. Perbaikannya adalah service worker baru yang memakai network-first untuk HTML, ditambah banner "Update tersedia" di dalam app. Pelajarannya: jangan pernah meng-cache entry point HTML dengan cache-first, dan selalu rencanakan jalur update sebelum release pertama.`,
    },
    pitfalls: [
      'Meng-cache `index.html` dengan cache-first, yang membekukan pengguna di versi lama.',
      'Meng-cache respons API yang personal, yang nantinya bisa dilihat pengguna lain di perangkat yang sama.',
      'Lupa bahwa penulisan saat offline butuh antrean, retry, dan penanganan konflik.',
    ],
    exercise: {
      task: 'Tambahkan `vite-plugin-pwa` ke app Vite, tampilkan toast "Update tersedia" saat ada service worker baru yang menunggu, dan reload saat diklik.',
      hint: 'Pakai hook `useRegisterSW` dari `virtual:pwa-register/react`.',
      solution: `\`\`\`tsx
import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdateToast() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div role="status">
      A new version is available.
      <button onClick={() => updateServiceWorker(true)}>Reload</button>
    </div>
  )
}
\`\`\``,
    },
    interview: [
      'Jelaskan lifecycle service worker dan kenapa versi baru harus menunggu.',
      'Strategi caching apa yang kamu pakai untuk JS yang di-hash, HTML, dan daftar dari API, dan kenapa?',
    ],
  },

  mfe: {
    explanation: `Micro-frontend memecah satu app yang dilihat pengguna menjadi bagian-bagian yang dimiliki dan di-deploy oleh tim yang berbeda. App *host* (shell) memuat *remote* saat runtime. **Module Federation** (di webpack 5, Rspack, dan lewat plugin untuk Vite) adalah teknik yang paling umum: remote mengekspos modul, host meng-import-nya dari sebuah URL saat runtime, dan library bersama seperti React dinegosiasikan supaya hanya satu salinan yang dimuat.

### Kenapa tim memakainya
Deployment yang independen. Kalau 15 tim mengerjakan satu app, satu jadwal release bersama menjadi bottleneck. Dengan micro-frontend, tim checkout bisa deploy tanpa menunggu tim search.

### Biayanya
- **Integrasi saat runtime**: error tipe dan ketidakcocokan versi baru muncul di production, bukan saat build. Kamu butuh contract test dan package tipe bersama.
- **Dependency bersama**: React harus singleton, kalau tidak hook rusak dengan error "invalid hook call". Rentang versi harus dikoordinasikan.
- **Performa**: banyak bundle, library terduplikasi, dan waterfall pemuatan remote entry.
- **Konsistensi**: UX lama-lama berbeda-beda kecuali semua memakai design system yang sama.

### Kapan sepadan
Hanya kalau masalah sebenarnya adalah skala organisasi: banyak tim, ritme release yang terpisah, mungkin juga app legacy yang dimigrasikan sedikit demi sedikit. Untuk satu atau dua tim, monorepo yang tertata dengan batasan yang baik sudah memberi sebagian besar manfaatnya dengan biaya jauh lebih kecil. Pemisahan di level route (tiap tim memiliki halaman utuh di balik reverse proxy) sering lebih sederhana daripada menyusun komponen saat runtime.`,
    examples: [
      {
        title: 'Konfigurasi host dengan React sebagai singleton',
        code: `// rsbuild.config.ts in the shell app (Module Federation 2 plugin)
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin'

export default {
  plugins: [
    pluginModuleFederation({
      name: 'shell',
      remotes: { checkout: 'checkout@https://checkout.acme.example/mf-manifest.json' },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
    }),
  ],
}

// usage in the shell
const CheckoutPage = lazy(() => import('checkout/CheckoutPage'))
<ErrorBoundary fallback={<CheckoutUnavailable />}>
  <Suspense fallback={<Spinner />}><CheckoutPage /></Suspense>
</ErrorBoundary>`,
        note: '`singleton` mencegah dua React termuat. Remote bisa mati atau rusak secara independen, jadi selalu bungkus dengan error boundary dan Suspense.',
      },
    ],
    realCase: {
      title: 'Dua React, satu halaman rusak',
      story: `Sebuah portal asuransi punya empat tim yang mengirim remote. Satu tim meng-upgrade remote mereka ke React versi major baru tanpa koordinasi, dan konfigurasi \`shared\` mereka tidak menandai React sebagai singleton. Host memuat dua salinan, dan hook di remote itu gagal dengan "Invalid hook call" di halaman klaim. Perbaikannya berupa aturan platform: React adalah singleton strict dengan rentang versi yang dimiliki tim platform, dicek di CI oleh contract test yang memuat setiap remote ke dalam shell.`,
    },
    pitfalls: [
      'Tidak membagikan React sebagai singleton, sehingga React terduplikasi dan muncul error hook.',
      'Mengadopsi micro-frontend untuk tim kecil, menanggung kompleksitasnya tanpa mendapat manfaat organisasionalnya.',
      'Memuat remote tanpa error boundary, sehingga gangguan di satu tim merusak seluruh shell.',
    ],
    exercise: {
      task: 'Rancang (dalam kode atau desain singkat) bagaimana shell memuat remote `profile`, menangani saat remote itu offline, dan berbagi tipe untuk props-nya.',
      hint: 'Pikirkan: lazy import, Suspense, error boundary, dan package tipe `@acme/profile-contract` yang dipublikasikan.',
      solution: `Publikasikan \`@acme/profile-contract\` yang meng-export \`type ProfileProps = { userId: string }\`. Shell menjalankan \`const Profile = lazy(() => import('profile/Profile'))\` dan merendernya di dalam \`<ErrorBoundary fallback={<p>Profile unavailable</p>}><Suspense fallback={<Skeleton />}><Profile userId={id} /></Suspense></ErrorBoundary>\`. CI di repo profile menjalankan contract test yang merender remote dengan props sesuai kontrak.`,
    },
    interview: [
      'Masalah apa yang diselesaikan micro-frontend, dan apa biayanya?',
      'Kenapa React harus singleton di Module Federation?',
    ],
  },

  rn: {
    explanation: `React Native memungkinkan kamu memakai model komponen React untuk membangun app native iOS dan Android. Reconciler-nya memakai ide yang sama dengan yang kamu pelajari di materi internal React, tapi host-nya berbeda: alih-alih node DOM, komponen di-render ke view native (\`View\`, \`Text\`, \`Image\`, \`ScrollView\`, \`Pressable\`). Tidak ada HTML dan tidak ada CSS: styling memakai objek JavaScript dengan layout engine Flexbox (Yoga), dan \`flexDirection\` default-nya \`column\`.

### Arsitektur baru
React Native modern memakai **Fabric** (renderer baru) dan **TurboModules** dengan **JSI**, yang memungkinkan JavaScript memanggil kode native secara langsung, bukan mengirim pesan yang diserialisasi lewat bridge asinkron yang lama. Ini membuka fitur concurrent React dan pemanggilan native yang lebih cepat. Versi terbaru menyalakannya secara default.

### Expo
Expo adalah cara yang direkomendasikan untuk memulai. Expo menyediakan toolchain terkelola, SDK besar berisi modul native (kamera, notifikasi, secure storage), **Expo Router** (routing berbasis file yang mirip App Router Next.js), build di cloud dengan EAS, dan update over-the-air untuk perubahan JavaScript.

### Apa yang terbawa dari web
Komponen, hook, state management (Zustand, TanStack Query), TypeScript, testing dengan Testing Library. Yang tidak terbawa: API DOM, CSS, \`window\` dan \`localStorage\` (pakai AsyncStorage, atau SecureStore untuk secret). List harus divirtualisasi dengan \`FlatList\` atau FlashList, karena merender 1.000 view di dalam \`ScrollView\` itu lambat.

Bagikan logika bisnis dan tipe antara web dan mobile di monorepo, tapi biasanya tidak untuk komponen UI, kecuali kamu memakai library UI lintas platform.`,
    examples: [
      {
        title: '❌ ScrollView map vs ✅ FlatList',
        code: `import { FlatList, Text, Pressable, StyleSheet } from 'react-native'

// ❌ renders every row at once: slow and memory hungry for long lists
<ScrollView>{orders.map((o) => <OrderRow key={o.id} order={o} />)}</ScrollView>

// ✅ virtualised
<FlatList
  data={orders}
  keyExtractor={(o) => o.id}
  renderItem={({ item }) => (
    <Pressable onPress={() => router.push('/orders/' + item.id)} style={styles.row}>
      <Text style={styles.title}>{item.reference}</Text>
    </Pressable>
  )}
/>

const styles = StyleSheet.create({
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 16, fontWeight: '600' },
})`,
        note: 'FlatList hanya me-mount baris yang dekat dengan viewport. Perhatikan juga bahwa teks harus selalu berada di dalam `Text`; string mentah di dalam `View` akan error.',
      },
    ],
    realCase: {
      title: 'Token di storage biasa',
      story: `Sebuah startup pengiriman memindahkan app web React-nya ke React Native dengan Expo, dan tetap membawa kebiasaan menyimpan refresh token di AsyncStorage, padanan \`localStorage\` di mobile. Review keamanan menandai bahwa AsyncStorage tidak terenkripsi. Mereka memindahkan token ke \`expo-secure-store\`, yang memakai iOS Keychain dan Android Keystore. Pelajarannya: model React memang terbawa, tapi primitif keamanan tiap platform berbeda, jadi review secara eksplisit.`,
    },
    pitfalls: [
      'Merender list panjang di ScrollView alih-alih list yang divirtualisasi.',
      'Menyimpan secret di AsyncStorage alih-alih secure storage.',
      'Berharap library khusus web yang menyentuh DOM bisa jalan di React Native.',
    ],
    exercise: {
      task: 'Buat app Expo dengan Expo Router yang menampilkan daftar produk dari API dengan pull-to-refresh, serta layar detail.',
      hint: 'FlatList punya prop `refreshing` dan `onRefresh`. Pakai TanStack Query untuk datanya.',
      solution: `\`\`\`tsx
// app/index.tsx
export default function Products() {
  const { data, isRefetching, refetch } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(p) => p.id}
      refreshing={isRefetching}
      onRefresh={refetch}
      renderItem={({ item }) => (
        <Link href={{ pathname: '/products/[id]', params: { id: item.id } }}>
          <Text>{item.name}</Text>
        </Link>
      )}
    />
  )
}
\`\`\``,
    },
    interview: [
      'Apa beda React DOM dan React Native di level reconciler?',
      'Apa yang diubah arsitektur baru (Fabric, JSI) dibanding bridge lama?',
    ],
  },
}

export default details
