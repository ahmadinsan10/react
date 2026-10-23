import type { TopicDetail } from '../../types'

const details: Record<string, TopicDetail> = {
  trophy: {
    explanation: `Test suite itu ibarat portofolio investasi. Setiap jenis test punya biaya (waktu menulis, waktu jalan, maintenance, flakiness) dan memberi imbal hasil (keyakinan bahwa pengguna bisa melakukan apa yang mereka butuhkan). **Testing trophy** adalah patokan praktis untuk membagi investasi itu di aplikasi frontend.

### Empat lapisan
1. **Static analysis** (alasnya): TypeScript dan ESLint menangkap salah ketik, tipe prop yang salah, dependency hook yang terlewat, dan kode yang tidak pernah tercapai, di setiap ketikan. Hampir gratis, jadi maksimalkan: \`strict: true\`, \`eslint-plugin-react-hooks\`, \`jsx-a11y\`.
2. **Unit test**: fungsi murni dan modul kecil yang diuji terpisah: perhitungan harga, reducer, format tanggal, schema validasi. Cepat dan presisi, tapi hanya membuktikan bahwa potongan-potongan itu jalan sendiri-sendiri.
3. **Integration test** (bagian terlebar): render potongan UI yang berarti (satu halaman atau satu fitur) dengan child aslinya, state management asli, dan routing asli, hanya network yang di-mock. Berinteraksilah seperti pengguna dan lakukan assertion pada apa yang terlihat. Test ini menangkap bug yang benar-benar terjadi: salah sambung, props yang salah dioper antar-component, state yang tidak ter-update di tempat yang tepat.
4. **End-to-end test** (puncaknya): browser sungguhan terhadap aplikasi yang sedang berjalan, idealnya dengan backend asli di environment test. Keyakinan per test paling tinggi, tapi paling lambat dan paling rawan flaky, jadi simpan untuk alur-alur kritis saja.

### Kenapa integration di tengah
Makin mirip test kamu dengan cara software itu dipakai, makin besar keyakinan yang diberikannya. Unit test untuk hook \`useCart\` bisa lulus padahal tombol "Add to cart" tersambung ke produk yang salah. Integration test yang mengklik tombol itu lalu mengecek badge keranjang tidak akan lolos. Integration test juga **tahan refactor**: kamu bisa memecah component, mengganti library state, atau mengganti nama bagian internal tanpa menyentuh test-nya, karena test hanya tahu soal role, label, dan teks.

### Dibandingkan dengan piramida
Piramida test klasik (banyak unit, lebih sedikit integration, sedikit test UI) lahir dari sistem backend, tempat test UI lambat dan rapuh. Dengan jsdom/happy-dom dan Testing Library, merender pohon component cukup cepat sehingga integration test bisa jadi porsi terbesar suite frontend. Trophy bukan hukum mutlak; library yang isinya algoritma murni sebaiknya didominasi unit test.

### Keyakinan per menit
Saat memutuskan test apa yang mau ditulis, tanyakan:
- Apa yang akan merugikan pengguna atau bisnis kalau rusak?
- Test termurah apa yang bisa menangkap kerusakan itu?
- Apakah test ini hanya gagal ketika perilakunya rusak, atau juga gagal ketika saya refactor?

Pantau beberapa sinyal: tingkat flaky test, durasi suite, dan bug yang lolos per kategori. Kalau bug lolos di bagian penyambungan, tambah integration test; kalau lolos lintas service, tambah E2E atau contract test.`,
    examples: [
      {
        title: 'Satu fitur, diuji di setiap lapisan',
        code: `// Static: the type system rejects invalid quantities at compile time
type CartLine = { sku: string; qty: number; unitPrice: number }

// Unit: pure logic, many edge cases cheaply
test('applies 10% discount over 100', () => {
  expect(cartTotal([{ sku: 'a', qty: 2, unitPrice: 60 }])).toBe(108)
})

// Integration: real components, network mocked with MSW
test('adding a product updates the cart badge', async () => {
  const user = userEvent.setup()
  render(<App />, { wrapper: TestProviders })
  await user.click(await screen.findByRole('button', { name: /add blue t-shirt to cart/i }))
  expect(screen.getByRole('link', { name: /cart, 1 item/i })).toBeInTheDocument()
})

// E2E (Playwright): the money path in a real browser
test('guest can check out', async ({ page }) => {
  await page.goto('/products/blue-t-shirt')
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await page.getByRole('link', { name: /cart/i }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  // ...fill test address, use payment provider test card...
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible()
})`,
        note: 'Setiap lapisan menangani apa yang paling ia kuasai: tipe mencegah state yang mustahil, unit menangani edge case aritmetika, integration menangani penyambungan, dan E2E menguji seluruh sistem untuk satu alur yang menghasilkan uang.',
      },
    ],
    realCase: {
      title: '1.200 unit test, dan checkout tetap rusak',
      story: `**Situasi:** Frontend sebuah marketplace punya unit coverage tinggi: setiap hook dan component diuji terpisah dengan child dan hook yang di-mock.

**Gejala:** Sebuah release merusak checkout untuk pengguna yang punya alamat tersimpan. Ke-1.200 test semuanya hijau.

**Akar masalah:** \`AddressPicker\` di-refactor sehingga memanggil \`onChange(address.id)\`, bukan lagi \`onChange(address)\`. Unit test-nya sendiri sudah diperbarui; test milik parent me-mock \`AddressPicker\` sepenuhnya, jadi tidak ada yang mengecek apakah keduanya masih sepakat.

**Perbaikan:** Tim mengganti test component yang penuh mock dengan integration test per halaman yang memakai child asli dan MSW untuk API, lalu menambahkan satu test Playwright untuk checkout dengan alamat tersimpan. Jumlah test turun sepertiga; bug yang lolos juga ikut turun.

**Pelajaran:** Me-mock component milikmu sendiri berarti yang kamu uji adalah mock-nya. Integration test menangkap kontrak yang rusak antar-component.`,
    },
    pitfalls: [
      'Mengejar persentase coverage: line coverage 100% dengan test dangkal yang penuh mock tetap bisa melewatkan penyambungan yang rusak.',
      'Me-mock child component atau hook milikmu sendiri di test component, yang menyembunyikan bug integrasi.',
      'Memasukkan semua skenario ke E2E test, sehingga suite jadi lambat dan flaky sampai orang terbiasa mengabaikannya.',
      'Melewatkan lapisan static (tsconfig yang longgar, tanpa aturan lint hooks), padahal itu penangkap bug paling murah yang ada.',
    ],
    exercise: {
      task: 'Ambil satu fitur yang pernah kamu buat (misalnya "cari produk lalu tambahkan ke keranjang") dan tulis rencana test-nya: daftar perilaku mana yang akan kamu cover dengan static check, unit test, integration test, dan E2E test, beserta alasannya.',
      hint: 'Mulai dari kegagalan yang akan merugikan pengguna. Untuk masing-masing, pilih lapisan termurah yang benar-benar bisa menangkapnya.',
      solution: `Contoh rencana:

- **Static**: TypeScript \`strict\` untuk tipe response API (di-generate dari OpenAPI), \`react-hooks/exhaustive-deps\`, aturan \`jsx-a11y\`.
- **Unit**: \`parseSearchParams\` (kosong, nomor halaman tidak valid, karakter ter-encode), \`cartReducer\` (menambah SKU yang sama dua kali menggabungkan jumlahnya, menghapus item terakhir), \`formatPrice\` per locale.
- **Integration (RTL + MSW)**: mengetik query menampilkan hasil yang cocok; hasil kosong menampilkan empty state; response 500 menampilkan pesan retry dan retry-nya berfungsi; filter + tambah ke keranjang meng-update badge; URL ter-update sesuai query.
- **E2E (Playwright)**: cari → produk → tambah → checkout dengan kartu test; satu scan aksesibilitas di halaman hasil pencarian.

Alasannya: penyambungan dan state yang terlihat pengguna ditangani integration; logika kombinatorial ditangani unit; hanya alur lintas sistem yang layak dijadikan E2E.`,
    },
    interview: [
      'Kenapa testing trophy menempatkan integration test di bagian terlebarnya, dan kapan kamu akan menyimpang dari itu?',
      'Apa yang membuat sebuah test tahan terhadap refactor?',
      'Bagaimana kamu memutuskan apakah sebuah bug sebaiknya di-cover oleh unit test, integration test, atau E2E test?',
    ],
  },

  vitest: {
    explanation: `Vitest adalah test runner yang dibangun di atas Vite. Ia memakai ulang konfigurasi Vite kamu (alias, plugin, transformasi TypeScript dan JSX), jadi test berjalan lewat pipeline yang sama dengan aplikasimu tanpa setup Babel atau ts-jest terpisah. API-nya kompatibel dengan Jest (\`describe\`, \`it\`, \`expect\`, \`vi.fn\`, \`vi.mock\`), sehingga sebagian besar pengetahuanmu bisa langsung dipakai.

### Cara kerjanya
- File test ditransformasi sesuai kebutuhan oleh Vite dan dieksekusi di worker thread atau child process, paralel antar-file. Test di dalam satu file berjalan berurutan secara default.
- **Watch mode** memakai module graph milik Vite: saat kamu menyimpan file, hanya test yang meng-import file itu (langsung maupun tidak langsung) yang dijalankan ulang. Itulah kenapa feedback-nya terasa instan.
- **Environment**: \`node\` secara default. Untuk component, set \`environment: 'jsdom'\` atau \`'happy-dom'\` supaya ada DOM simulasi. Untuk kebutuhan fidelitas tinggi, **browser mode** menjalankan test di browser sungguhan lewat Playwright.

### Setup untuk React
Konfigurasikan di \`vite.config.ts\` (atau \`vitest.config.ts\`) dengan blok \`test\`: environment, dan entri \`setupFiles\` yang meng-import \`@testing-library/jest-dom/vitest\` (menambahkan matcher seperti \`toBeInTheDocument\`), menyalakan server MSW, dan memanggil \`cleanup\` kalau globals dimatikan.

### Apa yang di-unit test dengan Vitest
Logika murni adalah tempat unit test paling bersinar: reducer, selector, formatter, schema validasi, parsing URL, pengecekan permission. Pakai tabel \`it.each\` / \`test.each\` untuk meng-cover banyak edge case secara ringkas.

### Mock, spy, dan fake
- \`vi.fn()\` membuat spy; \`vi.spyOn(obj, 'method')\` membungkus method yang sudah ada.
- \`vi.mock('./module')\` mengganti sebuah modul; pemanggilan ini **di-hoist** ke atas import. Pakai \`vi.hoisted\` untuk nilai yang dibutuhkan factory-nya.
- \`vi.useFakeTimers()\` dengan \`vi.advanceTimersByTime\` untuk logika debounce dan polling; \`vi.setSystemTime\` untuk kode yang bergantung pada tanggal.
- Pulihkan di antara test: \`restoreMocks: true\` di config, atau \`vi.restoreAllMocks()\` di \`afterEach\`.

Utamakan mock di batas sistem (network dengan MSW, waktu, keacakan), bukan modul milikmu sendiri.

### Fitur berguna lainnya
- **In-source testing**, dukungan **snapshot** (pakai secukupnya), \`expect.soft\`, \`expect.poll\`.
- **Coverage** lewat V8 (\`--coverage\`), dengan threshold di config.
- **Type testing** dengan \`expectTypeOf\` untuk pembuat library.
- **Projects** (workspace) untuk menjalankan environment node dan browser dalam satu perintah.

### Tips performa yang umum
Hindari import barrel yang besar di test, jaga \`setupFiles\` tetap ringan, dan pilih \`happy-dom\` kalau test kamu tidak bergantung pada perilaku khusus jsdom. Pakai \`--reporter=verbose\` atau \`--ui\` untuk melihat apa yang lambat.`,
    examples: [
      {
        title: '✅ Unit test berbasis tabel untuk reducer murni',
        code: `import { describe, expect, it } from 'vitest'
import { cartReducer, type CartState } from './cart'

const empty: CartState = { lines: [] }

describe('cartReducer', () => {
  it('adds a new line', () => {
    const s = cartReducer(empty, { type: 'add', sku: 'tee-blue', unitPrice: 20 })
    expect(s.lines).toEqual([{ sku: 'tee-blue', qty: 1, unitPrice: 20 }])
  })

  it('merges quantity when adding the same sku', () => {
    const s1 = cartReducer(empty, { type: 'add', sku: 'tee-blue', unitPrice: 20 })
    const s2 = cartReducer(s1, { type: 'add', sku: 'tee-blue', unitPrice: 20 })
    expect(s2.lines[0].qty).toBe(2)
  })

  it.each([
    [0, []],
    [-1, []],
    [3, [{ sku: 'tee-blue', qty: 3, unitPrice: 20 }]],
  ])('setQty(%i) gives %j', (qty, expected) => {
    const start: CartState = { lines: [{ sku: 'tee-blue', qty: 1, unitPrice: 20 }] }
    expect(cartReducer(start, { type: 'setQty', sku: 'tee-blue', qty }).lines).toEqual(expected)
  })

  it('does not mutate the previous state', () => {
    const frozen = Object.freeze({ lines: Object.freeze([]) }) as unknown as CartState
    expect(() => cartReducer(frozen, { type: 'add', sku: 'x', unitPrice: 1 })).not.toThrow()
  })
})`,
        note: 'Edge case (nol, negatif) murah untuk didaftar dengan it.each. Membekukan input menangkap mutasi yang tidak disengaja, yang bisa merusak update state React.',
      },
      {
        title: '✅ Fake timer untuk helper debounce',
        code: `import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { debounce } from './debounce'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('calls once after the quiet period with the last args', () => {
  const fn = vi.fn()
  const d = debounce(fn, 300)
  d('r'); d('re'); d('rea')
  vi.advanceTimersByTime(299)
  expect(fn).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(fn).toHaveBeenCalledExactlyOnceWith('rea')
})`,
        note: 'Tidak ada waktu tunggu sungguhan, sepenuhnya deterministik. Selalu kembalikan ke real timer supaya test lain tidak terpengaruh.',
      },
      {
        title: 'Config untuk test component React',
        code: `// vite.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    coverage: { provider: 'v8', thresholds: { lines: 80 } },
  },
})

// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => { cleanup(); server.resetHandlers() })
afterAll(() => server.close())`,
        note: 'onUnhandledRequest "error" membuat setiap panggilan network yang tidak di-mock langsung gagal dengan jelas, bukannya diam-diam menggantung.',
      },
    ],
    realCase: {
      title: 'Test lulus di lokal, gagal di CI menjelang tengah malam',
      story: `**Situasi:** Sebuah aplikasi booking punya test untuk logika "tanggal yang tersedia".

**Gejala:** CI gagal beberapa kali dalam sebulan, selalu antara pukul 23:00 dan 01:00 UTC; kalau dijalankan ulang, lulus.

**Akar masalah:** Kodenya memakai \`new Date()\` secara langsung, dan test mengharapkan "besok" relatif terhadap tanggal lokal mesin. Ketika tanggal UTC di runner CI berbeda dengan timezone yang diasumsikan fixture test, hari yang diharapkan meleset satu.

**Perbaikan:** Test mengunci waktu dengan \`vi.setSystemTime(new Date('2025-03-10T12:00:00Z'))\` dan men-set \`TZ=UTC\` di script test. Kode produksinya di-refactor agar menerima parameter \`now\` supaya lebih mudah di-test.

**Pelajaran:** Waktu, keacakan, dan network adalah input yang tidak deterministik. Kendalikan secara eksplisit di test.`,
    },
    pitfalls: [
      'Lupa bahwa vi.mock di-hoist, lalu merujuk variabel yang dideklarasikan belakangan di file itu dari dalam factory.',
      'Membiarkan fake timer atau mock tetap aktif di antara test, sehingga muncul kegagalan yang bergantung pada urutan test.',
      'Menjalankan test component di environment node default lalu mendapat "document is not defined".',
      'Me-mock modul milikmu sendiri di mana-mana alih-alih menguji perilaku asli dengan mock di batas sistem.',
    ],
    exercise: {
      task: 'Tulis fungsi `validatePassword(pw)` yang mengembalikan daftar aturan yang gagal (minimal 12 karakter, ada angka, ada huruf kapital, tidak mengandung "password"). Cover dengan suite Vitest berbasis tabel.',
      hint: 'Kembalikan id aturan, bukan pesan, supaya test tetap stabil saat copy-nya berubah.',
      solution: `\`\`\`ts
export type Rule = 'length' | 'digit' | 'upper' | 'common'
export function validatePassword(pw: string): Rule[] {
  const failed: Rule[] = []
  if (pw.length < 12) failed.push('length')
  if (!/\\d/.test(pw)) failed.push('digit')
  if (!/[A-Z]/.test(pw)) failed.push('upper')
  if (pw.toLowerCase().includes('password')) failed.push('common')
  return failed
}

test.each<[string, Rule[]]>([
  ['short', ['length', 'digit', 'upper']],
  ['Longenoughbutnodigit', ['digit']],
  ['MyPassword12345', ['common']],
  ['Correct-Horse-9-Battery', []],
])('validatePassword(%s)', (pw, expected) => {
  expect(validatePassword(pw)).toEqual(expected)
})
\`\`\``,
    },
    interview: [
      'Apa kelebihan Vitest dibanding Jest di proyek Vite?',
      'Bagaimana hoisting vi.mock bekerja, dan masalah apa yang bisa ditimbulkannya?',
      'Bagaimana kamu menguji kode yang bergantung pada tanggal saat ini atau pada setTimeout?',
    ],
  },

  rtl: {
    explanation: `React Testing Library (RTL) merender component ke dalam DOM dan memberimu query untuk menemukan elemen **dengan cara yang sama seperti pengguna dan teknologi asistif**. Ide dasarnya: makin mirip test kamu dengan cara software dipakai, makin besar keyakinan yang diberikannya. Pengguna tidak tahu soal variabel state atau nama component kamu; yang mereka lihat adalah tombol berlabel "Save" dan heading "Order confirmed".

### Prioritas query
1. \`getByRole\` dengan \`name\`: \`getByRole('button', { name: /save/i })\`. Memakai accessibility tree, jadi sekaligus memverifikasi bahwa markup kamu aksesibel.
2. \`getByLabelText\` untuk field form.
3. \`getByPlaceholderText\`, \`getByText\`, \`getByDisplayValue\`.
4. \`getByAltText\`, \`getByTitle\`.
5. \`getByTestId\` sebagai pilihan terakhir, kalau tidak ada hal yang terlihat pengguna yang bisa mengidentifikasi elemennya.

### Varian query
- \`getBy*\`: elemen harus ada saat itu juga; kalau tidak, melempar error. Pakai untuk hal yang sudah dirender.
- \`queryBy*\`: mengembalikan \`null\` kalau tidak ada. Pakai hanya untuk memastikan elemen **tidak ada**.
- \`findBy*\`: mengembalikan promise yang terus mencoba sampai elemennya muncul (default 1 detik). Pakai untuk apa pun yang async: loading data, transisi, lazy component.
- Versi \`*AllBy*\` mengembalikan array.
Pakai \`within(container)\` untuk membatasi query ke area tertentu, misalnya satu baris tabel atau satu dialog.

### user-event, bukan fireEvent
\`fireEvent.click\` hanya mengirim satu event sintetis. Pengguna sungguhan menghasilkan rangkaian event: pointerdown, mousedown, focus, pointerup, mouseup, click; mengetik menghasilkan keydown, keypress, input, keyup per karakter. \`@testing-library/user-event\` mensimulasikan rangkaian lengkap itu dan menghormati hal seperti elemen disabled dan \`pointer-events: none\`. Selalu buat sekali per test dengan \`const user = userEvent.setup()\` dan \`await\` setiap interaksi.

### Async dan act
RTL sudah membungkus render dan user-event dengan \`act\` untukmu. Peringatan update yang "not wrapped in act" biasanya berarti test selesai sebelum suatu pekerjaan async rampung: tunggu \`findBy\` untuk state akhir UI. Pakai \`waitFor\` hanya untuk assertion yang bukan soal munculnya elemen, dan taruh satu assertion saja di dalamnya; jangan pernah taruh side effect di dalam \`waitFor\`.

### Provider
Component sering butuh router, query client, atau tema. Tulis \`render\` custom yang membungkus semuanya, dan buat **QueryClient baru untuk setiap test** dengan retry dimatikan supaya test tidak berbagi cache.

### Apa yang di-assert
Assert hasil yang bisa diamati pengguna: teks muncul, tombol jadi disabled, dialog tertutup dan focus kembali, URL berubah. Pakai matcher jest-dom: \`toBeVisible\`, \`toBeDisabled\`, \`toHaveAccessibleName\`, \`toHaveFocus\`, \`toHaveValue\`. Hindari assertion pada nama class, state component, props yang dioper ke child, atau jumlah pemanggilan fungsi internal.`,
    examples: [
      {
        title: '❌ Test detail implementasi vs ✅ test perilaku',
        code: `// ❌ Breaks if you rename state, switch to useReducer, or change markup
const { container } = render(<LoginForm onSubmit={onSubmit} />)
fireEvent.change(container.querySelector('#email')!, { target: { value: 'a@b.co' } })
fireEvent.click(container.querySelector('.btn-primary')!)
expect(onSubmit).toHaveBeenCalled()

// ✅ Only knows what a user knows
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('submits trimmed credentials and disables the button while pending', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn(() => new Promise<void>(r => setTimeout(r, 50)))
  render(<LoginForm onSubmit={onSubmit} />)

  await user.type(screen.getByLabelText(/email/i), '  ada@example.com ')
  await user.type(screen.getByLabelText(/password/i), 'correct-horse')
  await user.click(screen.getByRole('button', { name: /sign in/i }))

  expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'correct-horse' })
  expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  expect(await screen.findByRole('button', { name: /sign in/i })).toBeEnabled()
})`,
        note: 'Callback onSubmit adalah prop publik, jadi boleh di-assert. Query lewat label akan gagal kalau input kehilangan label-nya, sehingga test ini sekaligus menjaga aksesibilitas.',
      },
      {
        title: '✅ Render custom dengan provider yang selalu baru',
        code: `import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { render, type RenderOptions } from '@testing-library/react'

export function renderWithProviders(
  ui: React.ReactElement,
  { route = '/', ...options }: { route?: string } & RenderOptions = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    ),
    ...options,
  })
}`,
        note: 'QueryClient baru per test mencegah cache bocor antar-test; retry: false membuat state error langsung muncul, bukan setelah tiga kali retry.',
      },
      {
        title: '✅ Membatasi query dengan within dan memastikan elemen hilang',
        code: `const row = screen.getByRole('row', { name: /blue t-shirt/i })
await user.click(within(row).getByRole('button', { name: /remove/i }))
expect(screen.queryByRole('row', { name: /blue t-shirt/i })).not.toBeInTheDocument()
expect(screen.getByRole('status')).toHaveTextContent(/removed/i)`,
        note: 'within mengarah ke tombol di baris yang benar; queryBy hanya dipakai untuk pengecekan bahwa elemen sudah tidak ada.',
      },
    ],
    realCase: {
      title: 'Test suite yang menghambat setiap refactor',
      story: `**Situasi:** Sebuah tim memigrasikan halaman pengaturan dari class component dan test bergaya Enzyme ke function component.

**Gejala:** Mengonversi satu component merusak 40 test, padahal halamannya berperilaku persis sama di browser. Developer mulai menghapus test supaya PR bisa di-merge.

**Akar masalah:** Test melakukan assertion pada state internal (\`wrapper.state('isOpen')\`), memanggil method instance, dan memilih elemen lewat class CSS.

**Perbaikan:** Test ditulis ulang dengan RTL, query lewat role dan label, dan interaksi lewat user-event. Penulisan ulang ini juga memunculkan tiga bug aksesibilitas sungguhan: dua input tanpa label dan satu tombol ikon tanpa nama, karena \`getByRole\` tidak bisa menemukannya.

**Pelajaran:** Test yang terikat pada implementasi menghukum refactor dan melewatkan bug sungguhan. Query berbasis role sekaligus berfungsi sebagai pengecekan aksesibilitas.`,
    },
    pitfalls: [
      'Memakai getBy untuk konten async lalu mendapat "unable to find element"; pakai findBy.',
      'Membungkus pemanggilan user-event dengan act atau waitFor secara manual; mereka sudah dibungkus dan di-await.',
      'Memakai fireEvent padahal user-event akan memunculkan bug (misalnya klik pada tombol disabled tetap terpicu dengan fireEvent).',
      'Menaruh banyak assertion atau side effect di dalam waitFor, sehingga lambat dan membingungkan saat gagal.',
      'Langsung memakai getByTestId duluan, sehingga kehilangan sinyal aksesibilitas yang diberikan query berbasis role.',
    ],
    exercise: {
      task: 'Uji component Tabs dari level 6: mengklik tab menampilkan panel-nya, ArrowRight memindahkan focus dan pilihan ke tab berikutnya, dan hanya tab yang terpilih yang masuk urutan Tab.',
      hint: 'Pakai getByRole("tab", { name }), toHaveAttribute("aria-selected", "true"), toHaveFocus, dan user.tab().',
      solution: `\`\`\`tsx
test('tabs follow the APG keyboard pattern', async () => {
  const user = userEvent.setup()
  render(
    <Tabs defaultValue="profile">
      <Tabs.List label="Settings">
        <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
        <Tabs.Trigger value="billing">Billing</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Panel value="profile">Profile form</Tabs.Panel>
      <Tabs.Panel value="billing">Billing details</Tabs.Panel>
    </Tabs>,
  )
  await user.tab()
  expect(screen.getByRole('tab', { name: 'Profile' })).toHaveFocus()

  await user.keyboard('{ArrowRight}')
  const billing = screen.getByRole('tab', { name: 'Billing' })
  expect(billing).toHaveFocus()
  expect(billing).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Billing details')

  await user.tab()
  expect(screen.getByRole('tabpanel')).toHaveFocus() // next Tab stop is the panel, not the other tab
})
\`\`\``,
    },
    interview: [
      'Jelaskan perbedaan getBy, queryBy, dan findBy, serta kapan memakai masing-masing.',
      'Kenapa user-event lebih disarankan daripada fireEvent?',
      'Apa penyebab peringatan "not wrapped in act(...)" dan bagaimana cara memperbaikinya dengan benar?',
    ],
  },

  msw: {
    explanation: `Mock Service Worker (MSW) mencegat request network dan menjawabnya dengan handler yang kamu definisikan. Alih-alih me-mock \`fetch\`, \`axios\`, atau hook data kamu, yang kamu mock adalah **API-nya itu sendiri**. Component kamu, library data (TanStack Query, SWR, RTK Query), dan wrapper fetch kamu semuanya berjalan sungguhan; hanya server-nya yang palsu.

### Cara kerjanya
- **Di browser** (Storybook, development lokal), MSW mendaftarkan Service Worker yang melihat setiap request keluar dan bertanya ke handler kamu apakah perlu menjawabnya.
- **Di Node** (Vitest, Jest), \`setupServer\` dari \`msw/node\` mem-patch modul pembuat request (\`http\`, \`https\`, \`fetch\` global) di level rendah untuk mencapai pencegatan yang sama.
Definisi handler yang sama berlaku di keduanya, jadi satu set mock bisa melayani test, story, dan development offline.

### API v2
Handler dibuat dengan \`http.get\`, \`http.post\`, dan seterusnya (atau \`graphql.query\`). Resolver menerima \`{ request, params, cookies }\` dan mengembalikan \`Response\` standar Fetch API, biasanya lewat helper \`HttpResponse\`: \`HttpResponse.json(data, { status })\`, \`HttpResponse.text()\`, \`HttpResponse.error()\` untuk kegagalan network. Pakai \`delay()\` untuk mensimulasikan latensi. Membaca body memakai \`await request.json()\` standar.

### Siklus hidup test
1. \`server.listen({ onUnhandledRequest: 'error' })\` sebelum semua test, supaya request apa pun tanpa handler langsung menggagalkan test dengan jelas.
2. \`server.use(...)\` di dalam test tertentu untuk **menimpa** handler khusus skenario itu (list kosong, 500, response lambat).
3. \`server.resetHandlers()\` setelah setiap test menghapus penimpaan tersebut.
4. \`server.close()\` setelah semuanya selesai.

Jadikan handler "jalur normal" sebagai default, lalu timpa per test untuk edge case.

### Kenapa tidak me-mock fetch atau hook?
- Me-mock \`useProducts\` melewatkan query key, penanganan error, retry, caching, dan parsing kamu: justru kode yang paling mungkin ada bug-nya.
- Me-mock \`fetch\` membuat test terikat pada client yang kamu pakai; pindah dari fetch ke ky akan merusak semua test.
- MSW me-mock di level kontrak HTTP, jadi test bertahan saat refactor internal dan memverifikasi request yang benar-benar kamu kirim (method, URL, query param, body).

### Assertion pada request
Utamakan assertion pada hasil yang terlihat. Kalau request-nya sendiri penting (misalnya query string harus benar), tangkap di handler lalu assert, atau buat handler merespons berbeda tergantung param supaya UI yang membuktikan bahwa request yang benar sudah dikirim.

### Menjaga mock tetap jujur
Mock lama-lama melenceng dari API aslinya. Cara mengatasinya: generate tipe (atau handler-nya sekalian) dari OpenAPI, validasi payload mock dengan schema Zod yang sama dengan yang dipakai aplikasi, dan pertahankan sejumlah kecil E2E atau contract test terhadap backend asli.`,
    examples: [
      {
        title: '✅ Handler bersama dan server Node',
        code: `// src/mocks/handlers.ts
import { http, HttpResponse, delay } from 'msw'

export const products = [
  { id: 'p1', name: 'Blue T-shirt', price: 20 },
  { id: 'p2', name: 'Red Hoodie', price: 45 },
]

export const handlers = [
  http.get('/api/products', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? ''
    return HttpResponse.json(products.filter(p => p.name.toLowerCase().includes(q)))
  }),
  http.post('/api/cart', async ({ request }) => {
    const body = (await request.json()) as { productId: string }
    await delay(50)
    return HttpResponse.json({ items: [{ productId: body.productId, qty: 1 }] }, { status: 201 })
  }),
]

// src/test/server.ts
import { setupServer } from 'msw/node'
import { handlers } from '../mocks/handlers'
export const server = setupServer(...handlers)`,
        note: 'Handler GET benar-benar memfilter berdasarkan parameter q, jadi test yang melakukan pencarian membuktikan bahwa UI mengirim query string yang benar.',
      },
      {
        title: '✅ Integration test: pencarian, error, dan retry',
        code: `import { http, HttpResponse } from 'msw'
import { server } from '../test/server'

test('search shows matching products', async () => {
  const user = userEvent.setup()
  renderWithProviders(<ProductSearch />)
  await user.type(screen.getByRole('searchbox', { name: /search products/i }), 'hoodie')
  expect(await screen.findByRole('listitem', { name: /red hoodie/i })).toBeVisible()
  expect(screen.queryByRole('listitem', { name: /blue t-shirt/i })).not.toBeInTheDocument()
})

test('shows an error and recovers on retry', async () => {
  const user = userEvent.setup()
  let calls = 0
  server.use(
    http.get('/api/products', () => {
      calls++
      return calls === 1
        ? HttpResponse.json({ message: 'Internal error' }, { status: 500 })
        : HttpResponse.json([{ id: 'p1', name: 'Blue T-shirt', price: 20 }])
    }),
  )
  renderWithProviders(<ProductSearch />)
  await user.click(await screen.findByRole('button', { name: /try again/i }))
  expect(await screen.findByRole('listitem', { name: /blue t-shirt/i })).toBeVisible()
})`,
        note: 'server.use menimpa default hanya untuk test ini; resetHandlers di afterEach memulihkannya. Hook query asli, error boundary, dan logika retry semuanya ikut berjalan.',
      },
      {
        title: '❌ Me-mock hook',
        code: `vi.mock('../hooks/useProducts', () => ({
  useProducts: () => ({ data: [{ id: 'p1', name: 'Blue T-shirt' }], isLoading: false }),
}))
// The test passes even if useProducts builds the wrong URL,
// ignores the search term, or crashes on a 500.`,
        note: 'Ini menguji component terhadap hook khayalan. Bug di lapisan data jadi tidak terlihat sama sekali.',
      },
    ],
    realCase: {
      title: 'Query string yang salah ikut rilis meski test hijau',
      story: `**Situasi:** Halaman riwayat pesanan punya filter berdasarkan status. Test me-mock \`useOrders\` agar mengembalikan data tetap.

**Gejala:** Setelah sebuah refactor, filter "Shipped" di production malah menampilkan semua pesanan. Test-nya hijau.

**Akar masalah:** Hook-nya mulai mengirim \`?state=shipped\`, bukan \`?status=shipped\`. Hook yang di-mock tidak pernah membangun URL, jadi test tidak mungkin menyadarinya.

**Perbaikan:** Tim beralih ke handler MSW yang memfilter berdasarkan parameter \`status\` seperti API aslinya, menghapus mock hook, dan men-set \`onUnhandledRequest: 'error'\`. Regression test-nya sekarang gagal kalau parameter yang salah dikirim, karena list-nya tidak akan terfilter.

**Pelajaran:** Mock di batas network supaya kode yang membangun request ikut teruji.`,
    },
    pitfalls: [
      'Lupa server.resetHandlers() setelah setiap test, sehingga override error bocor ke test-test berikutnya.',
      'Membiarkan onUnhandledRequest di default warning, sehingga request yang tidak di-mock diam-diam menggantung atau malah mengakses network.',
      'Memakai sintaks MSW v1 (rest.get, res(ctx.json())) dengan v2; API-nya sudah berubah menjadi http dan HttpResponse.',
      'Payload mock yang makin melenceng dari bentuk API asli; validasi dengan schema bersama atau generate dari OpenAPI.',
    ],
    exercise: {
      task: 'Tulis integration test untuk tombol "Add to cart" yang melakukan POST ke /api/cart: pastikan badge keranjang ter-update saat sukses, dan response 409 "out of stock" menampilkan alert berisi pesan dari server.',
      hint: 'Pakai server.use dengan http.post yang mengembalikan HttpResponse.json({ message }, { status: 409 }). Alert-nya dicari lewat role "alert".',
      solution: `\`\`\`tsx
test('adds to cart', async () => {
  const user = userEvent.setup()
  renderWithProviders(<ProductPage id="p1" />)
  await user.click(await screen.findByRole('button', { name: /add to cart/i }))
  expect(await screen.findByRole('link', { name: /cart, 1 item/i })).toBeVisible()
})

test('shows out-of-stock error', async () => {
  server.use(http.post('/api/cart', () => HttpResponse.json({ message: 'Blue T-shirt is out of stock' }, { status: 409 })))
  const user = userEvent.setup()
  renderWithProviders(<ProductPage id="p1" />)
  await user.click(await screen.findByRole('button', { name: /add to cart/i }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Blue T-shirt is out of stock')
  expect(screen.getByRole('link', { name: /cart, 0 items/i })).toBeVisible()
})
\`\`\``,
    },
    interview: [
      'Kenapa me-mock di lapisan network lebih baik daripada me-mock fetch atau hook data kamu?',
      'Bagaimana MSW mencegat request di browser dibandingkan di Node?',
      'Bagaimana cara menguji skenario error untuk satu test saja tanpa memengaruhi test lain?',
    ],
  },

  playwright: {
    explanation: `Playwright mengendalikan browser sungguhan (Chromium, Firefox, WebKit) lewat protokol otomasinya. End-to-end test dengan Playwright memverifikasi bahwa seluruh sistem bekerja: frontend hasil build, routing, panggilan network sungguhan, cookie, backend (atau environment test-nya), dan perilaku browser yang tidak bisa disimulasikan jsdom (layout, scrolling, focus, upload file, banyak tab).

### Locator dan auto-waiting
**Locator** adalah deskripsi lazy tentang cara menemukan sebuah elemen: \`page.getByRole('button', { name: 'Checkout' })\`. Belum ada query apa pun sampai kamu melakukan aksi terhadapnya. Setiap aksi (click, fill) otomatis menunggu sampai elemennya terpasang, terlihat, stabil (tidak sedang beranimasi), enabled, dan menerima pointer event. **Web-first assertion** seperti \`await expect(locator).toBeVisible()\` terus mencoba sampai lulus atau timeout. Kombinasi keduanya menghilangkan hampir semua kebutuhan menunggu secara manual. Kalau kamu menulis \`page.waitForTimeout(2000)\`, ada yang salah.

Utamakan locator berorientasi pengguna yang sama dengan Testing Library: \`getByRole\`, \`getByLabel\`, \`getByText\`, lalu \`getByTestId\`. Hindari CSS dan XPath yang terikat pada layout.

### Isolasi dan kecepatan
Setiap test mendapat **browser context** baru: cookie dan storage-nya sendiri, seperti profil incognito baru, dibuat dalam hitungan milidetik. Test berjalan paralel di beberapa worker. Supaya tidak perlu login lewat UI di setiap test, sebuah **setup project** login sekali (dengan kredensial environment test) lalu menyimpan \`storageState\` ke file yang dipakai ulang oleh project lain.

### Kontrol network
\`page.route('**/api/recommendations', route => route.fulfill({ json: [] }))\` men-stub endpoint tertentu, berguna untuk layanan pihak ketiga atau panggilan yang tidak kritis. Biarkan jalur kritis tetap asli; tujuan E2E justru untuk menguji integrasinya.

### Debugging
- Mode \`--ui\`: menelusuri setiap langkah maju-mundur seperti mesin waktu.
- **Trace Viewer**: dengan \`trace: 'on-first-retry'\`, run CI yang gagal menghasilkan trace berisi snapshot DOM, log network, console, dan screenshot untuk setiap aksi. Ini tool terbaik untuk mendiagnosis kegagalan yang flaky.
- Codegen (\`npx playwright codegen\`) merekam interaksi menjadi locator sebagai titik awal.

### Pengecekan aksesibilitas
\`@axe-core/playwright\` menjalankan axe terhadap halaman yang benar-benar dirender: \`new AxeBuilder({ page }).analyze()\`. Jalankan di halaman-halaman kunci dan di state penting (dialog terbuka, error form tampil).

### Apa yang di-cover
E2E test itu mahal, jadi pilih alur-alur kritis: sign-up, login, checkout, "pekerjaan utama" yang jadi alasan pengguna datang. Sepuluh test yang andal lebih baik daripada seratus test yang flaky. Pakai seed data atau panggilan API khusus test untuk menyiapkan prasyarat, jangan mengklik layar-layar setup satu per satu.

### Sumber flakiness
Data test yang dipakai bersama oleh test yang berjalan paralel, ketergantungan pada timing, animasi, script pihak ketiga, dan assertion pada nilai yang tidak di-retry (\`expect(await locator.textContent()).toBe(...)\` alih-alih \`await expect(locator).toHaveText(...)\`).`,
    examples: [
      {
        title: '✅ Spec checkout dengan locator role, web-first assertion, dan axe',
        code: `import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('checkout', () => {
  test.beforeEach(async ({ request }) => {
    // Arrange via API, not UI: seed a cart for the logged-in test user
    await request.post('/api/test/seed-cart', { data: { items: [{ sku: 'tee-blue', qty: 1 }] } })
  })

  test('pays with a test card and sees confirmation', async ({ page }) => {
    await page.goto('/cart')
    await page.getByRole('button', { name: 'Checkout' }).click()

    await page.getByLabel('Full name').fill('Test Customer')
    await page.getByLabel('Address line 1').fill('1 Test Street')
    await page.getByLabel('Postcode').fill('10001')
    await page.getByRole('button', { name: 'Continue to payment' }).click()

    // payment provider iframe in test mode
    const card = page.frameLocator('iframe[title*="card"]')
    await card.getByLabel('Card number').fill('4242 4242 4242 4242')
    await card.getByLabel('Expiration').fill('12 / 34')
    await card.getByLabel('CVC').fill('123')

    await page.getByRole('button', { name: /pay/i }).click()
    await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible()
    await expect(page).toHaveURL(/\\/orders\\/[a-z0-9-]+$/)
  })

  test('checkout page has no detectable a11y violations', async ({ page }) => {
    await page.goto('/checkout')
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()
    expect(results.violations).toEqual([])
  })
})`,
        note: 'Tidak ada wait manual: klik otomatis menunggu, dan toBeVisible/toHaveURL terus mencoba ulang. Prasyarat disiapkan lewat API. Nomor kartunya adalah nomor test resmi yang dipublikasikan payment provider, dan hanya dipakai di mode test-nya.',
      },
      {
        title: '❌ Pola yang bikin flaky vs ✅ perbaikannya',
        code: `// ❌ arbitrary sleep, non-retrying assertion, brittle selector
await page.click('#app > div:nth-child(3) .btn')
await page.waitForTimeout(3000)
expect(await page.locator('.toast').textContent()).toBe('Saved')

// ✅
await page.getByRole('button', { name: 'Save' }).click()
await expect(page.getByRole('status')).toHaveText('Saved')`,
        note: 'toHaveText terus mencoba sampai teksnya cocok atau timeout habis; textContent() hanya membaca sekali dan balapan dengan UI.',
      },
      {
        title: '✅ Login sekali dengan setup project',
        code: `// playwright.config.ts (excerpt)
projects: [
  { name: 'setup', testMatch: /auth\\.setup\\.ts/ },
  { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
],
use: { baseURL: 'http://localhost:4173', trace: 'on-first-retry' },

// auth.setup.ts
import { test as setup, expect } from '@playwright/test'
setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.E2E_USER!)
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('navigation', { name: 'Account' })).toBeVisible()
  await page.context().storageState({ path: 'playwright/.auth/user.json' })
})`,
        note: 'Kredensial test berasal dari secret CI untuk user test khusus, bukan akun sungguhan. Tambahkan folder .auth ke .gitignore.',
      },
    ],
    realCase: {
      title: 'Suite E2E dengan tingkat flaky 20%',
      story: `**Situasi:** Sebuah tim SaaS punya 60 test Playwright yang gagal secara acak; engineer menjalankan ulang CI sampai hijau.

**Gejala:** Kegagalan menumpuk di test yang mengedit "pengaturan project" dan di assertion toast.

**Akar masalah:** Ada dua masalah. Test yang berjalan paralel memakai satu project hasil seed yang sama, jadi satu test mengganti namanya sementara test lain sedang meng-assert nama tersebut. Selain itu, assertion toast memakai \`textContent()\` plus \`waitForTimeout\`.

**Perbaikan:** Setiap test membuat project-nya sendiri lewat fixture API dengan nama unik, lalu menghapusnya setelah selesai. Semua assertion dikonversi ke web-first assertion, dan \`trace: 'on-first-retry'\` diaktifkan supaya kegagalan yang tersisa datang lengkap dengan trace. Tingkat flaky turun di bawah 1%.

**Pelajaran:** Sebagian besar flakiness E2E berasal dari state bersama atau asumsi timing. Isolasi data per test dan biarkan Playwright yang mengurus menunggu.`,
    },
    pitfalls: [
      'Memakai waitForTimeout alih-alih web-first assertion dan auto-waiting.',
      'Berbagi data test yang bisa berubah antar-test yang berjalan paralel.',
      'Login lewat UI di setiap test alih-alih memakai ulang storageState.',
      'Mencoba meng-cover semua edge case di E2E, padahal bisa di integration test yang lebih cepat.',
      'Menjalankan E2E terhadap dev server di CI, bukan build production, sehingga bug yang hanya muncul di build terlewat.',
    ],
    exercise: {
      task: 'Tulis test Playwright untuk Dialog design system kamu di sebuah halaman demo: buka dengan keyboard, pastikan focus pindah ke dalam, tekan Escape, lalu pastikan focus kembali ke trigger. Tambahkan scan axe selagi dialog terbuka.',
      hint: 'Pakai page.keyboard.press, expect(locator).toBeFocused(), dan AxeBuilder dengan .include("dialog").',
      solution: `\`\`\`ts
test('dialog manages focus and is accessible', async ({ page }) => {
  await page.goto('/demo/dialog')
  const trigger = page.getByRole('button', { name: 'Edit address' })
  await trigger.focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'Edit address' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Address line 1')).toBeFocused()

  const results = await new AxeBuilder({ page }).include('dialog').analyze()
  expect(results.violations).toEqual([])

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})
\`\`\``,
    },
    interview: [
      'Apa itu auto-waiting di Playwright, dan apa bedanya web-first assertion dengan membaca sebuah nilai lalu meng-assert-nya?',
      'Bagaimana menjaga E2E test tetap terisolasi dan cepat ketika butuh user yang sudah login?',
      'Bagaimana kamu men-debug test yang hanya gagal di CI?',
    ],
  },

  'what-not': {
    explanation: `Setiap test adalah kode yang harus kamu maintain. Sebuah test bernilai ketika ia **gagal jika dan hanya jika perilaku yang dipedulikan pengguna rusak**. Test yang gagal karena refactor yang tidak berbahaya (false positive) atau lulus padahal fiturnya rusak (false negative) lebih mahal daripada manfaatnya, karena membuat tim belajar untuk tidak percaya dan mengabaikan suite-nya.

### Detail implementasi
Detail implementasi adalah apa pun yang tidak bisa diamati oleh pemakai component (pengguna akhir atau developer yang memakai props-nya): nama variabel state, hook mana yang dipakai, fungsi helper internal, hierarki component, nama class CSS, berapa kali sesuatu re-render. Test yang terikat pada hal-hal ini akan rusak saat kamu beralih dari \`useState\` ke \`useReducer\`, mengekstrak child component, atau mengganti nama class.

Pengecekan yang berguna: **apakah test ini tetap lulus kalau component-nya kutulis ulang dari nol dengan perilaku yang sama?** Kalau tidak, berarti yang diuji adalah implementasinya.

Component punya dua "pengguna": orang yang berinteraksi dengan UI, dan developer yang merendernya dengan props. Menguji bahwa \`onChange\` dipanggil dengan nilai yang benar itu sah; itu kontrak publik.

### Hal yang biasanya tidak perlu di-test
- **Library pihak ketiga**: jangan menguji bahwa React Router bisa bernavigasi atau Zod bisa memvalidasi email. Uji konfigurasi *milikmu* atas library itu lewat perilakunya.
- **Jaminan framework**: bahwa \`useState\` ter-update, bahwa sebuah prop dirender.
- **Kode trivial**: component yang hanya merender string statis, re-export, konstanta.
- **Styling**: warna hasil komputasi dan posisi piksel tempatnya di visual regression test, bukan unit test.
- **Snapshot besar**: snapshot halaman sepanjang 400 baris berubah setiap kali markup diutak-atik sedikit; reviewer menekan "update" tanpa membacanya. Inline snapshot yang kecil dan fokus untuk data yang di-serialize (misalnya objek pesan error yang di-generate) masih bisa oke.

### Terlalu banyak mock
Me-mock child component, hook, atau modul milikmu sendiri menghasilkan test yang memverifikasi mock-nya. Mock batas-batas yang tidak kamu kendalikan: network (MSW), waktu, keacakan, API browser yang tidak dimiliki jsdom (\`IntersectionObserver\`, \`matchMedia\`).

### Coverage itu sinyal, bukan tujuan
Coverage menunjukkan apa yang **belum** di-test. Angka yang tinggi tidak banyak bercerita soal kualitas assertion. Test yang merender tanpa meng-assert hasil yang berarti memang menaikkan coverage, tapi tambahan keyakinannya nol. Mutation testing (misalnya Stryker) adalah ukuran yang lebih baik untuk menilai apakah test benar-benar mendeteksi perubahan.

### Menghapus test itu boleh
Kalau dalam enam bulan terakhir sebuah test hanya pernah gagal karena refactor, tulis ulang atau hapus. Ganti tiga test implementasi dengan satu test perilaku.`,
    examples: [
      {
        title: '❌ Menguji implementasi vs ✅ menguji perilaku',
        code: `// ❌ Breaks if the hook is renamed, if state moves to a reducer,
//    or if the child is restructured. Passes even if the UI is broken.
vi.mock('./useToggle', () => ({ useToggle: vi.fn(() => [true, vi.fn()]) }))
test('passes isOpen to Panel', () => {
  render(<Accordion />)
  expect(Panel).toHaveBeenCalledWith(expect.objectContaining({ isOpen: true }), undefined)
})

// ✅ Survives any internal rewrite with the same behaviour
test('expands a section when its header is clicked', async () => {
  const user = userEvent.setup()
  render(<Accordion items={[{ title: 'Shipping', body: 'Ships in 2 days' }]} />)
  const header = screen.getByRole('button', { name: 'Shipping' })
  expect(header).toHaveAttribute('aria-expanded', 'false')
  await user.click(header)
  expect(header).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('Ships in 2 days')).toBeVisible()
})`,
        note: 'aria-expanded adalah bagian dari kontrak yang bisa diamati dan aksesibel, jadi meng-assert-nya bukan termasuk detail implementasi.',
      },
      {
        title: '❌ Snapshot raksasa vs ✅ assertion yang terarah',
        code: `// ❌ 600 lines nobody reviews
expect(render(<InvoicePage />).container).toMatchSnapshot()

// ✅ The things that matter
renderWithProviders(<InvoicePage id="inv-7" />)
expect(await screen.findByRole('heading', { name: 'Invoice INV-7' })).toBeVisible()
expect(screen.getByRole('row', { name: /total/i })).toHaveTextContent('€1,234.50')
expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled()`,
        note: 'Assertion yang eksplisit mendokumentasikan maksudnya; kalau ada yang gagal, kamu langsung tahu perilaku mana yang rusak.',
      },
    ],
    realCase: {
      title: 'Lelah dengan snapshot',
      story: `**Situasi:** Sebuah library component punya snapshot untuk setiap component dan story, sekitar 900 file snapshot.

**Gejala:** Perubahan bersama apa pun (misalnya menambahkan atribut \`data-state\` ke sebuah primitive) meng-update ratusan snapshot. PR rutin berisi update \`-u\`. Sebuah regresi sungguhan, \`aria-label\` yang hilang di tombol tutup, ikut disetujui di tengah diff snapshot sepanjang 3.000 baris.

**Akar masalah:** Snapshot menangkap segalanya, jadi tidak memberi sinyal apa pun; manusia tidak sanggup me-review volume sebesar itu.

**Perbaikan:** Test snapshot dihapus. Tim menambahkan test perilaku berbasis role untuk setiap component, pengecekan axe per story, dan visual regression untuk tampilan. Label yang hilang tadi sekarang akan menggagalkan \`getByRole('button', { name: /close/i })\`.

**Pelajaran:** Test yang berubah di setiap edit hanyalah noise. Assert hal yang penting, secara eksplisit.`,
    },
    pitfalls: [
      'Meng-assert state component, pemanggilan fungsi internal, atau child component mana yang menerima props apa.',
      'Menulis snapshot DOM yang besar lalu meng-update-nya tanpa melihat.',
      'Menguji perilaku library (apakah router-nya bernavigasi?) alih-alih cara kamu memakainya.',
      'Menjadikan persentase coverage sebagai tujuan, sehingga muncul test tanpa assertion yang berarti.',
    ],
    exercise: {
      task: 'Cari tiga test di sebuah proyek (milikmu atau proyek open-source) yang menguji detail implementasi. Tulis ulang masing-masing menjadi test perilaku, atau beri alasan kenapa test itu sebaiknya dihapus.',
      hint: 'Cari mock dari modul milik sendiri, .toHaveBeenCalledWith pada fungsi internal, container.querySelector, selector berbasis nama class, dan snapshot besar.',
      solution: `Contoh penulisan ulang yang umum:

\`\`\`tsx
// Before: spies on an internal formatter
const spy = vi.spyOn(utils, 'formatPrice')
render(<PriceTag amount={1234.5} currency="EUR" />)
expect(spy).toHaveBeenCalledWith(1234.5, 'EUR')

// After: asserts the visible outcome
render(<PriceTag amount={1234.5} currency="EUR" />)
expect(screen.getByText('€1,234.50')).toBeInTheDocument()
\`\`\`

Hapus saja alih-alih menulis ulang kalau test-nya hanya mengecek bahwa component statis berhasil dirender, atau menduplikasi test di lapisan lain tanpa menambah keyakinan.`,
    },
    interview: [
      'Bagaimana kamu mendefinisikan detail implementasi dalam konteks test component?',
      'Kapan snapshot test merupakan ide yang bagus, kalau memang ada?',
      'Tim kamu ingin coverage 100%. Apa tanggapanmu?',
    ],
  },
}

export default details
