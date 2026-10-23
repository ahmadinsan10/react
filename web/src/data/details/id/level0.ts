import type { TopicDetail } from '../../types'

const details: Record<string, TopicDetail> = {
  'modern-syntax': {
    explanation: `Kode React modern hampir seluruhnya ditulis dengan JavaScript ES2015+. Kalau ada baris komponen yang terlihat membingungkan, biasanya itu cuma gabungan beberapa fitur sintaks yang ditumpuk. Membiasakan diri membacanya dengan lancar adalah cara tercepat supaya kamu tidak lagi "bergulat" dengan kode React.

### Perkakas inti

- **\`const\` / \`let\`**: binding dengan cakupan blok. Pakai \`const\` sebagai default; \`const\` tidak membuat nilai jadi immutable, ia hanya mencegah *binding*-nya di-assign ulang. \`const user = {}\` tetap membolehkan kamu mengubah \`user.name\`.
- **Arrow function**: \`(a, b) => a + b\`. Arrow function tidak punya \`this\` dan \`arguments\` sendiri, makanya cocok untuk event handler dan callback. Body dalam tanda kurung \`() => ({ id: 1 })\` mengembalikan object literal; tanpa tanda kurung, kurung kurawalnya dibaca sebagai body fungsi.
- **Destructuring**: \`const { name, email = 'n/a' } = user\` dan \`const [first, ...rest] = items\`. Setiap komponen React yang ditulis \`function Card({ title, children })\` sebenarnya sedang men-destructure objek props-nya.
- **Spread dan rest**: \`...\` menyalin (spread) atau mengumpulkan (rest). \`{ ...user, name }\` membuat objek baru, dan inilah tulang punggung update immutable.
- **Template literal**: string dengan backtick dan interpolasi \`\${expr}\`, dipakai untuk nama class dan URL.
- **Optional chaining \`?.\` dan nullish coalescing \`??\`**: \`order?.customer?.name ?? 'Guest'\`. \`??\` hanya memakai nilai cadangan untuk \`null\`/\`undefined\`, beda dengan \`||\` yang juga mengganti \`0\` dan \`''\`.
- **ES module**: \`export default\`, named export, \`import { useState } from 'react'\`. Bundler seperti Vite memakai graf import yang statis ini untuk tree shaking.

### Kenapa ini penting untuk React

React sangat bergantung pada *expression*. JSX hanya menerima expression di dalam \`{}\`, jadi ternary, \`?.\`, \`??\`, dan \`.map()\` menggantikan statement \`if\` dan loop. Update state ditulis dengan spread karena React butuh objek baru. Hook mengembalikan tuple yang kamu destructure: \`const [count, setCount] = useState(0)\`.

### Tambahan baru yang layak diketahui

ES2022–ES2024 menambahkan \`Array.prototype.at(-1)\` untuk elemen terakhir, \`Object.hasOwn\`, \`structuredClone\` untuk deep copy, \`Object.groupBy\` untuk mengelompokkan list, serta method array yang tidak memutasi (\`toSorted\`, \`toSpliced\`, \`with\`). Logical assignment (\`a ??= b\`) berguna di luar render.

### Kapan jangan sok pintar

Sintaks itu untuk kejelasan. Destructuring bersarang lima tingkat lengkap dengan default di signature fungsi lebih sulit dibaca daripada dua baris biasa. Pilih bentuk yang langsung dipahami rekan setimmu sekali lihat.`,
    examples: [
      {
        title: '❌ || menelan nilai nol yang valid vs ✅ ??',
        code: `type Product = { name: string; stock?: number; discount?: number | null }

// ❌ A product with stock 0 shows "Unknown", discount 0 becomes 10
function labelBad(p: Product) {
  const stock = p.stock || 'Unknown'
  const discount = p.discount || 10
  return \`\${p.name}: \${stock} left, \${discount}% off\`
}

// ✅ Only null/undefined fall back
function labelGood(p: Product) {
  const stock = p.stock ?? 'Unknown'
  const discount = p.discount ?? 10
  return \`\${p.name}: \${stock} left, \${discount}% off\`
}`,
        note: '`||` menganggap semua nilai falsy (0, string kosong, false, NaN) sebagai "tidak ada". Di stok barang, harga, dan counter, 0 itu data sungguhan, jadi yang kamu maksud hampir selalu `??`.',
      },
      {
        title: 'Destructuring props dengan default dan rest',
        code: `type ButtonProps = {
  variant?: 'primary' | 'ghost'
  size?: 'sm' | 'md'
  children: React.ReactNode
} & React.ComponentProps<'button'>

export function Button({ variant = 'primary', size = 'md', children, ...rest }: ButtonProps) {
  return (
    <button className={\`btn btn-\${variant} btn-\${size}\`} {...rest}>
      {children}
    </button>
  )
}`,
        note: 'Nilai default ditaruh di pola destructuring, dan `...rest` meneruskan sisanya (onClick, disabled, aria-*) ke elemen aslinya. Pola sederhana ini menjadi dasar sebagian besar komponen design system.',
      },
    ],
    realCase: {
      title: 'Gratis ongkir yang tidak pernah muncul',
      story: `Tim sebuah toko grocery online menampilkan "Shipping: {fee || 'Calculated at checkout'}" di halaman keranjang. Waktu tim marketing meluncurkan promo gratis ongkir (fee = 0), pelanggan malah melihat "Calculated at checkout", bukan "Free". Tiket support melonjak karena orang mengira ada biaya tersembunyi.

Akar masalahnya: \`||\` menganggap \`0\` sebagai nilai kosong. Perbaikannya memakai \`fee ?? 'Calculated at checkout'\` ditambah cabang eksplisit yang me-render "Free" saat \`fee === 0\`. Tim juga menambahkan aturan lint (\`@typescript-eslint/prefer-nullish-coalescing\`) supaya kesalahan ini tidak terulang. Pelajarannya: pilih operator berdasarkan nilai mana yang *bermakna* di domainmu, bukan mana yang paling pendek ditulis.`,
    },
    pitfalls: [
      'Mengembalikan objek dari arrow function tanpa tanda kurung: `() => { id: 1 }` mengembalikan undefined karena kurung kurawalnya dianggap blok.',
      'Mengira `const` membuat objek immutable; yang dikunci hanya binding-nya, bukan isinya.',
      'Memakai `||` untuk default padahal 0, false, atau string kosong adalah nilai yang valid.',
      'Spread itu dangkal (shallow): `{ ...user }` masih berbagi `user.address` dengan objek aslinya.',
      'Menaburkan `?.` di mana-mana untuk menutupi data yang seharusnya tidak pernah kosong; crash yang jelas berubah jadi UI kosong tanpa pesan.',
    ],
    exercise: {
      task: 'Tulis `formatOrder(order)` untuk order berbentuk `{ id: string; customer?: { name?: string }; items: { price: number; qty: number }[]; coupon?: { percent: number } | null }`. Kembalikan string seperti "#A12 for Dana: $45.00 (10% off)". Gunakan destructuring, optional chaining, nullish coalescing, dan template literal. Kalau nama tidak ada, pakai "Guest"; kalau tidak ada kupon, tidak usah pakai akhiran.',
      hint: 'Destructure `id`, `items`, `coupon` langsung di parameter, hitung subtotal dengan reduce, lalu susun akhirannya dengan ternary.',
      solution: `\`\`\`ts
type Order = {
  id: string
  customer?: { name?: string }
  items: { price: number; qty: number }[]
  coupon?: { percent: number } | null
}

export function formatOrder({ id, customer, items, coupon }: Order) {
  const name = customer?.name ?? 'Guest'
  const subtotal = items.reduce((sum, { price, qty }) => sum + price * qty, 0)
  const percent = coupon?.percent ?? 0
  const total = subtotal * (1 - percent / 100)
  const suffix = percent > 0 ? \` (\${percent}% off)\` : ''
  return \`#\${id} for \${name}: $\${total.toFixed(2)}\${suffix}\`
}
\`\`\`

Perhatikan pengecekan \`percent > 0\`: kupon 0% tidak perlu mencetak "(0% off)".`,
    },
    interview: [
      'Apa beda `??` dan `||`? Berikan contoh di React di mana salah memilih operator menimbulkan bug.',
      'Kenapa `const` tidak mencegah `user.name = "x"`? Bagaimana cara membuat objek benar-benar read-only?',
      'Jelaskan langkah demi langkah apa yang dilakukan `function Card({ title, ...rest })`.',
    ],
  },

  arrays: {
    explanation: `Hampir setiap layar di aplikasi React berisi list: produk, pesan, baris tabel, notifikasi. Method array adalah kosakata yang kamu pakai untuk mengubah data mentah menjadi UI, jadi kamu perlu tahu apa yang dikembalikan tiap method dan apakah ia mengubah array aslinya.

### Transformasi, seleksi, agregasi

- \`map(fn)\` mengembalikan array baru dengan panjang yang sama. Di JSX, \`map\` mengubah data menjadi elemen: \`items.map(i => <Row key={i.id} item={i} />)\`.
- \`filter(fn)\` mengembalikan array baru yang lebih pendek, berisi item yang callback-nya mengembalikan nilai truthy. Kotak pencarian dan tab pada dasarnya adalah filter.
- \`reduce(fn, initial)\` melipat array menjadi satu nilai: total, hitungan, lookup map. Selalu berikan nilai awal; tanpa itu, array kosong akan melempar error.
- \`find\` / \`findIndex\` / \`findLast\` mengembalikan kecocokan pertama (atau \`undefined\` / \`-1\`). \`some\` dan \`every\` menjawab pertanyaan ya/tidak dan berhenti lebih awal.
- \`flatMap\` melakukan map lalu meratakan satu tingkat, berguna kalau satu item bisa menghasilkan nol atau banyak output.

### Memutasi vs tidak memutasi

Bagian inilah yang paling penting untuk React. Beberapa method mengubah array di tempat: \`push\`, \`pop\`, \`shift\`, \`unshift\`, \`splice\`, \`sort\`, \`reverse\`, \`fill\`. Kalau kamu memanggilnya pada state, referensi array tetap sama, pengecekan \`Object.is\` milik React melihat "tidak ada perubahan", dan UI-mu tidak ter-update (atau ter-update secara tidak konsisten).

Masing-masing punya padanan yang tidak memutasi:

- \`push(x)\` → \`[...arr, x]\`
- \`splice(i, 1)\` → \`arr.filter((_, idx) => idx !== i)\` atau \`arr.toSpliced(i, 1)\`
- \`sort(cmp)\` → \`arr.toSorted(cmp)\` (ES2023)
- \`reverse()\` → \`arr.toReversed()\`
- \`arr[i] = x\` → \`arr.with(i, x)\`

### Intuisi soal performa

Merangkai \`filter().map()\` membuat array perantara. Untuk list beberapa ribu item, biaya ini sangat kecil dibanding me-render DOM. Utamakan keterbacaan dulu; beralih ke satu \`reduce\` atau loop \`for...of\` hanya kalau hasil profiling memang menunjukkan perlu.

### Turunkan, jangan simpan

Kebiasaan yang sangat berguna: simpan array sumber di state, lalu *turunkan* tampilan yang sudah difilter, diurutkan, atau dikelompokkan saat render. Menyimpan \`filteredProducts\` di state terpisah hanya mengundang dua salinan itu jadi tidak sinkron.`,
    examples: [
      {
        title: '❌ sort memutasi state vs ✅ toSorted',
        code: `function ProductTable({ products }: { products: Product[] }) {
  const [sortBy, setSortBy] = useState<'price' | 'name'>('name')

  // ❌ sorts the parent's array in place during render
  // const rows = products.sort((a, b) => compare(a, b, sortBy))

  // ✅ new array, original untouched
  const rows = products.toSorted((a, b) =>
    sortBy === 'price' ? a.price - b.price : a.name.localeCompare(b.name),
  )

  return (
    <table>
      <tbody>{rows.map(p => <ProductRow key={p.id} product={p} />)}</tbody>
    </table>
  )
}`,
        note: '`sort` memutasi array props, padahal array itu milik parent. Komponen lain yang membaca array yang sama tiba-tiba melihat urutan berbeda. `toSorted` menghasilkan tampilan baru tanpa efek samping.',
      },
      {
        title: 'reduce untuk menyusun ringkasan keranjang',
        code: `type Line = { sku: string; price: number; qty: number; category: string }

function summarize(lines: Line[]) {
  return lines.reduce(
    (acc, line) => {
      const amount = line.price * line.qty
      acc.total += amount
      acc.byCategory[line.category] = (acc.byCategory[line.category] ?? 0) + amount
      return acc
    },
    { total: 0, byCategory: {} as Record<string, number> },
  )
}`,
        note: 'Memutasi accumulator di sini aman karena objeknya baru dibuat oleh pemanggilan ini, bukan state yang dipakai bersama. Nilai awalnya sekaligus menentukan tipe hasil.',
      },
    ],
    realCase: {
      title: 'Leaderboard yang mengacak urutan panel riwayat',
      story: `Sebuah aplikasi fitness menampilkan leaderboard "Top runs" dan riwayat "Recent runs" berdampingan, keduanya membaca array \`runs\` yang sama dari store. Komponen leaderboard menjalankan \`runs.sort((a, b) => b.distance - a.distance)\` saat render.

Gejalanya: panel "Recent runs" kadang terurut berdasarkan jarak, bukan tanggal, tapi hanya setelah leaderboard di-render, sehingga bug-nya terlihat acak. Akar masalahnya: \`sort\` memutasi array yang dipakai bersama. Perbaikannya: \`runs.toSorted(...)\`, ditambah membekukan data store dengan \`Object.freeze\` di mode development supaya mutasi di masa depan langsung melempar error. Pelajarannya: setiap method yang memutasi adalah bug shared state yang tinggal menunggu pembaca kedua.`,
    },
    pitfalls: [
      'Memanggil `sort`/`reverse` pada props atau state; keduanya memutasi di tempat dan mengembalikan referensi yang sama.',
      'Lupa memberi nilai awal pada `reduce`, sehingga error pada array kosong dan tipe hasilnya mengejutkan.',
      'Memakai `map` untuk efek samping dan mengabaikan hasilnya; pakai `forEach` atau `for...of`.',
      'Memakai `find` dan lupa bahwa ia bisa mengembalikan `undefined`.',
      'Menyimpan array turunan (hasil filter/sort) di state alih-alih menghitungnya dari sumber.',
    ],
    exercise: {
      task: 'Diberikan `tasks: { id: number; title: string; done: boolean; priority: 1 | 2 | 3 }[]`, tulis fungsi-fungsi murni: `toggle(tasks, id)`, `remove(tasks, id)`, `openByPriority(tasks)` (task yang belum selesai, diurutkan berdasarkan prioritas, tertinggi = 1 di depan), dan `countDone(tasks)`. Tidak boleh ada yang memutasi input.',
      hint: 'map untuk toggle, filter untuk remove, filter + toSorted untuk tampilan, reduce atau filter().length untuk hitungan.',
      solution: `\`\`\`ts
type Task = { id: number; title: string; done: boolean; priority: 1 | 2 | 3 }

export const toggle = (tasks: Task[], id: number) =>
  tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t))

export const remove = (tasks: Task[], id: number) => tasks.filter(t => t.id !== id)

export const openByPriority = (tasks: Task[]) =>
  tasks.filter(t => !t.done).toSorted((a, b) => a.priority - b.priority)

export const countDone = (tasks: Task[]) =>
  tasks.reduce((n, t) => (t.done ? n + 1 : n), 0)
\`\`\`

Uji dengan membekukan input (\`Object.freeze\`) dan pastikan tidak ada yang melempar error.`,
    },
    interview: [
      'Method array mana saja yang memutasi? Apa alternatif non-mutasinya di ES2023?',
      'Kenapa `items.sort()` di dalam komponen adalah bug, meskipun UI-nya kelihatan baik-baik saja?',
      'Kapan kamu memilih `reduce` dibanding `filter` + `map`, dan kapan loop biasa lebih jelas?',
    ],
  },

  immutability: {
    explanation: `Immutability berarti kamu tidak pernah mengubah data yang sudah ada; kamu membuat versi baru yang sudah berisi perubahannya. Di React, ini bukan soal selera gaya, melainkan cara library ini mendeteksi perubahan.

### Kenapa React membutuhkannya

Saat kamu memanggil \`setState(next)\`, React membandingkan \`next\` dengan nilai sebelumnya memakai \`Object.is\`. Kalau referensinya sama, React berhenti dan bisa melewati render. Komponen yang di-memo (\`memo\`, memoisasi otomatis dari React Compiler) juga membandingkan props berdasarkan referensi. Jadi kalau kamu memutasi objek lalu mengirim objek yang sama lagi, React benar-benar tidak bisa melihat ada yang berubah.

Immutability juga memberimu snapshot: state di setiap render adalah satu momen yang membeku. Inilah yang memungkinkan fitur seperti undo/redo, time-travel debugging, concurrent rendering, dan transition; React bisa menyimpan pohon lama dan pohon baru berdampingan karena data lama tidak ditimpa.

### Cara update secara immutable

Salin setiap tingkat yang kamu ubah, dan pakai ulang setiap tingkat yang tidak diubah:

- Field objek: \`{ ...user, name }\`
- Field bersarang: \`{ ...user, address: { ...user.address, city } }\`
- Tambah ke array: \`[...items, item]\`
- Hapus dari array: \`items.filter(i => i.id !== id)\`
- Ganti item array: \`items.map(i => i.id === id ? { ...i, qty } : i)\`

Perhatikan structural sharing-nya: item yang tidak berubah tetap memakai referensi lama, sehingga baris yang di-memo bisa melewati re-render.

### Deep copy bukan jawabannya

\`structuredClone(state)\` atau \`JSON.parse(JSON.stringify(...))\` membuat pohon yang serba baru, di mana *semua* referensi berubah. Akibatnya memoisasi jadi sia-sia dan waktu terbuang. Salin hanya jalur yang kamu ubah.

### Kalau nesting mulai menyiksa

Kalau update butuh spread empat tingkat, pertimbangkan meratakan (normalisasi) state, misalnya menyimpan entitas berdasarkan id, atau memakai \`useReducer\` untuk memusatkan logika update. Library seperti Immer memungkinkan kamu menulis kode yang "memutasi" sebuah draft lalu menghasilkan hasil yang immutable; itu alat bantu, bukan pengganti pemahaman prinsipnya.

### Mutasi lokal itu aman

Memutasi sesuatu yang *baru saja kamu buat* di dalam fungsi (accumulator, array baru yang kamu susun sebelum di-return) tidak berbahaya. Aturannya adalah jangan memutasi data yang mungkin sudah dipegang pihak lain: state, props, nilai context, data store.`,
    examples: [
      {
        title: '❌ memutasi state vs ✅ menyalin jalurnya',
        code: `type Cart = { items: { id: string; qty: number }[]; coupon: string | null }

function CartPage() {
  const [cart, setCart] = useState<Cart>({ items: [], coupon: null })

  // ❌ same object reference: React may not re-render
  function incrementBad(id: string) {
    const item = cart.items.find(i => i.id === id)!
    item.qty += 1
    setCart(cart)
  }

  // ✅ new cart, new items array, new item; other items reused
  function increment(id: string) {
    setCart(c => ({
      ...c,
      items: c.items.map(i => (i.id === id ? { ...i, qty: i.qty + 1 } : i)),
    }))
  }
  // ...
}`,
        note: 'Di versi yang salah, `setCart(cart)` mengirim referensi yang identik, jadi `Object.is` menganggap tidak ada perubahan. Versi yang benar menyalin cart → items → satu item itu saja, tidak lebih.',
      },
      {
        title: 'Update profil yang bersarang',
        code: `type Profile = { name: string; settings: { notifications: { email: boolean; sms: boolean } } }

const toggleSms = (p: Profile): Profile => ({
  ...p,
  settings: {
    ...p.settings,
    notifications: { ...p.settings.notifications, sms: !p.settings.notifications.sms },
  },
})`,
        note: 'Setiap objek di jalur dari root sampai field yang berubah ikut disalin. Kalau terasa berat, itu tanda untuk meratakan state atau memakai reducer atau Immer.',
      },
    ],
    realCase: {
      title: 'Total checkout yang macet setelah jumlah diubah',
      story: `Halaman checkout sebuah situs penjualan tiket memungkinkan pengguna mengubah jumlah kursi. QA melaporkan total order kadang tidak ter-update sampai pengguna mengklik tempat lain. Handler-nya menjalankan \`order.lines[i].qty = newQty; setOrder({ ...order })\`.

Salinan di tingkat atas memang memicu render halaman, tapi child \`OrderLines\` dibungkus \`memo\` dan menerima \`order.lines\`, yang referensi array-nya masih sama. Komponen itu melewati re-render, sehingga total per baris basi sementara grand total (dihitung di parent) benar. Perbaikannya menyalin jalurnya dengan benar: \`lines: order.lines.map((l, idx) => idx === i ? { ...l, qty: newQty } : l)\`. Pelajarannya: salinan dangkal di tingkat atas belum bisa disebut immutability; setiap tingkat yang kamu sentuh harus baru.`,
    },
    pitfalls: [
      'Hanya menyalin tingkat atas (`{ ...state }`) sambil memutasi sesuatu yang bersarang di dalamnya.',
      'Memakai `push`, `splice`, atau assignment lewat index pada array state.',
      'Melakukan deep clone seluruh state di setiap update, yang merusak memoisasi dan membuang waktu.',
      'Memutasi props atau nilai context yang diterima dari parent.',
      'Mengira `Object.freeze` membekukan sampai dalam; padahal hanya dangkal.',
    ],
    exercise: {
      task: 'Tulis `moveCard(board, cardId, fromColumnId, toColumnId)` yang immutable untuk papan Kanban berbentuk `{ columns: { id: string; cardIds: string[] }[] }`. Hanya dua kolom yang terdampak dan array columns yang boleh mendapat referensi baru.',
      hint: 'Map semua kolom: untuk kolom asal, filter id-nya keluar; untuk kolom tujuan, tambahkan id-nya; selain itu kembalikan kolom apa adanya.',
      solution: `\`\`\`ts
type Board = { columns: { id: string; cardIds: string[] }[] }

export function moveCard(board: Board, cardId: string, from: string, to: string): Board {
  if (from === to) return board
  return {
    ...board,
    columns: board.columns.map(col => {
      if (col.id === from) return { ...col, cardIds: col.cardIds.filter(id => id !== cardId) }
      if (col.id === to) return { ...col, cardIds: [...col.cardIds, cardId] }
      return col
    }),
  }
}
\`\`\`

Mengembalikan \`board\` apa adanya saat \`from === to\` membuat React bisa langsung berhenti tanpa render.`,
    },
    interview: [
      'Kenapa React mengandalkan kesamaan referensi alih-alih perbandingan mendalam (deep comparison)?',
      'Apa itu structural sharing dan kenapa penting bagi komponen yang di-memo?',
      'Kapan memutasi objek di dalam aplikasi React masih bisa diterima?',
    ],
  },

  references: {
    explanation: `Nilai di JavaScript terbagi menjadi dua keluarga. **Primitif** (string, number, boolean, null, undefined, bigint, symbol) dibandingkan berdasarkan nilainya: \`'a' === 'a'\` bernilai true. **Objek** (termasuk array, fungsi, date, map) dibandingkan berdasarkan *identitas*: dua objek hanya sama kalau keduanya benar-benar objek yang sama di memori.

### Model mental

Bayangkan variabel yang berisi objek sebenarnya menyimpan sebuah *alamat*. \`const a = { x: 1 }; const b = a\` menyalin alamatnya, jadi \`a === b\` dan mengubah \`b.x\` juga mengubah apa yang dilihat \`a\`. \`const c = { x: 1 }\` membuat objek baru di alamat baru, jadi \`a === c\` bernilai false walaupun isinya terlihat sama.

### Kenapa ini sentral di React

React dan tooling-nya membandingkan berdasarkan referensi terus-menerus:

- \`setState\` berhenti kalau \`Object.is(prev, next)\`.
- \`memo\` membandingkan setiap prop dengan \`Object.is\`.
- Dependency array di \`useEffect\`, \`useMemo\`, \`useCallback\` membandingkan setiap item dengan \`Object.is\`.
- Consumer context re-render saat referensi \`value\` dari provider berubah.

Artinya, **setiap literal objek, array, atau fungsi yang ditulis di dalam body komponen adalah baru di setiap render**. \`style={{ color: 'red' }}\`, \`options={[1, 2]}\`, \`onClick={() => ...}\` semuanya menghasilkan referensi baru setiap kali. Biasanya ini tidak masalah; render itu murah. Masalah muncul saat nilai seperti itu masuk ke dependency array (effect jalan ulang di setiap render) atau dikirim ke child yang di-memo (memo-nya tidak pernah kena).

### Object.is vs ===

\`Object.is\` berperilaku seperti \`===\`, kecuali \`Object.is(NaN, NaN)\` bernilai true dan \`Object.is(0, -0)\` bernilai false. React memakai \`Object.is\`.

### Perbaikan, urut dari yang paling disarankan

1. Pindahkan objek konstan ke luar komponen (module scope) supaya hanya dibuat sekali.
2. Bergantunglah pada primitif, bukan objek: \`[user.id]\` alih-alih \`[user]\`.
3. Buat objeknya *di dalam* effect yang membutuhkannya.
4. Biarkan React Compiler yang melakukan memoisasi, atau pakai \`useMemo\`/\`useCallback\` secara manual kalau perlu.

Memahami referensi menjelaskan satu kategori penuh bug "kenapa effect ini jalan terus" dan "kenapa memo ini tidak bekerja".`,
    examples: [
      {
        title: '❌ objek di deps bikin loop vs ✅ deps primitif',
        code: `function OrdersList({ customerId }: { customerId: string }) {
  const [orders, setOrders] = useState<Order[]>([])

  // ❌ new object every render → effect runs every render → setOrders → render → ...
  const query = { customerId, status: 'open' }
  useEffect(() => {
    fetchOrders(query).then(setOrders)
  }, [query])

  // ✅ depend on the primitive; build the object inside
  useEffect(() => {
    let ignore = false
    fetchOrders({ customerId, status: 'open' }).then(o => { if (!ignore) setOrders(o) })
    return () => { ignore = true }
  }, [customerId])
  // ...
}`,
        note: '`query` adalah referensi baru di setiap render, jadi `Object.is(prevQuery, query)` selalu false. String dibandingkan berdasarkan nilai, jadi `[customerId]` hanya berubah kalau id-nya benar-benar berubah.',
      },
      {
        title: 'Mengangkat konstanta keluar dari komponen',
        code: `// ✅ created once at module load
const CHART_OPTIONS = { responsive: true, legend: { position: 'bottom' } } as const

export function RevenueChart({ data }: { data: Point[] }) {
  return <LineChart data={data} options={CHART_OPTIONS} />
}`,
        note: 'Konfigurasi statis tidak punya alasan untuk tinggal di dalam render. Di module scope identitasnya stabil selamanya, jadi chart yang di-memo hanya re-render saat `data` berubah.',
      },
    ],
    realCase: {
      title: 'Dashboard analytics yang membombardir API-nya sendiri',
      story: `Tim analytics sebuah produk SaaS menyadari endpoint metrics mereka menerima sekitar 60 request per detik dari satu tab dashboard yang terbuka. Hook \`useMetrics(filters)\` berisi \`useEffect(fetch, [filters])\`, dan halaman mengirim \`filters={{ range, region }}\` secara inline.

Setiap render membuat objek \`filters\` baru, effect jalan, response memanggil \`setState\`, yang memicu re-render dan membuat objek baru lagi. Perbaikannya mengubah hook agar bergantung pada \`[filters.range, filters.region]\`, lalu belakangan fetching dipindah ke library cache dengan key berupa filter yang diserialisasi. Pelajarannya: dependency array membandingkan identitas, jadi kirimkan primitif atau referensi yang stabil.`,
    },
    pitfalls: [
      'Memasukkan props objek/array/fungsi inline ke dependency array.',
      'Mengharapkan `{a: 1} === {a: 1}` atau `[] === []` bernilai true.',
      'Meng-assign objek ke variabel baru lalu mengira objeknya sudah tersalin.',
      'Mengirim objek inline ke child yang di-memo lalu bingung kenapa memo tidak pernah kena.',
    ],
    exercise: {
      task: 'Tebak output-nya, lalu jalankan:\n\n```js\nconst a = { n: 1 }\nconst b = a\nconst c = { ...a }\nb.n = 2\nconsole.log(a.n, c.n, a === b, a === c, Object.is(NaN, NaN), NaN === NaN)\n```\n\nLalu tulis `shallowEqual(x, y)` yang mengembalikan true kalau dua plain object punya key yang sama dan nilai yang sama menurut `Object.is`.',
      hint: 'Bandingkan jumlah key dulu, lalu cek setiap key dengan Object.is dan Object.hasOwn.',
      solution: `Output: \`2 1 true false true false\`.

\`\`\`ts
export function shallowEqual(x: Record<string, unknown>, y: Record<string, unknown>) {
  if (Object.is(x, y)) return true
  const kx = Object.keys(x)
  const ky = Object.keys(y)
  if (kx.length !== ky.length) return false
  return kx.every(k => Object.hasOwn(y, k) && Object.is(x[k], y[k]))
}
\`\`\`

Pada dasarnya beginilah cara \`memo\` membandingkan props secara default.`,
    },
    interview: [
      'Kenapa prop berupa arrow function inline membuat `memo` tidak bekerja?',
      'Apa beda `Object.is` dan `===`?',
      'Sebuah effect dengan `[options]` di deps-nya jalan di setiap render. Sebutkan tiga cara memperbaikinya.',
    ],
  },

  closures: {
    explanation: `Closure adalah fungsi yang terbungkus bersama variabel-variabel yang ada dalam cakupannya saat fungsi itu dibuat. Fungsi tersebut tetap bisa membaca variabel itu lama setelah fungsi luarnya selesai dijalankan.

### Cara kerjanya

Saat JavaScript menjalankan sebuah fungsi, ia membuat *scope* baru (environment record) yang menampung variabel lokalnya. Setiap fungsi dalam yang dibuat selama pemanggilan itu menyimpan referensi ke scope tersebut. Selama fungsi dalam itu masih bisa dijangkau, scope-nya tetap hidup. Setiap pemanggilan membuat scope *baru*, jadi dua pemanggilan menghasilkan dua closure yang independen.

\`\`\`js
function makeCounter() {
  let n = 0
  return () => ++n
}
const a = makeCounter(); a(); a() // 2
const b = makeCounter(); b()      // 1, separate n
\`\`\`

### Closure di React: setiap render adalah satu pemanggilan

Function component dipanggil sekali per render. Setiap pemanggilan punya \`props\` sendiri dan nilai state sendiri dari \`useState\`. Setiap handler, effect, dan callback yang dibuat selama render itu menangkap nilai dari *render tersebut*. Ini memang fitur: event handler selalu melihat state yang konsisten dengan UI yang diklik pengguna.

Ini juga sumber **stale closure**: fungsi yang dibuat di render awal lalu tetap berjalan belakangan masih melihat nilai lama. Kasus klasiknya:

- \`setInterval\` di dalam effect dengan deps \`[]\` yang membaca \`count\`: selamanya ia melihat \`count\` awal.
- Handler async yang melakukan await lalu membaca state: ia melihat nilai saat handler mulai berjalan.
- Event listener yang dipasang sekali ke \`window\` dan membaca props.

### Perbaikan

- **Updater function**: \`setCount(c => c + 1)\` tidak butuh nilai terkini dari closure; React yang mengirimkan nilai terbaru.
- **Dependency yang benar**: daftarkan nilai yang dibaca effect supaya effect dibuat ulang dengan closure yang segar.
- **Ref** untuk "nilai terbaru" tanpa subscribe ulang: simpan di \`ref.current\` dan baca di dalam callback yang berumur panjang.
- **\`useEffectEvent\`** (React 19.2) untuk logika di dalam effect yang harus membaca props terbaru tanpa menjadi dependency.

### Loop dan \`var\`

Dengan \`var\`, semua callback yang dibuat di dalam loop berbagi satu variabel berscope fungsi. Dengan \`let\`, setiap iterasi mendapat binding baru. Pertanyaan interview klasik ini idenya sama: closure menangkap *binding*, bukan snapshot nilai; state React terlihat seperti snapshot hanya karena setiap render membuat binding baru.`,
    examples: [
      {
        title: '❌ interval basi vs ✅ updater function',
        code: `function SessionTimer() {
  const [seconds, setSeconds] = useState(0)

  // ❌ closure from the first render: seconds is always 0, so it shows 1 forever
  useEffect(() => {
    const id = setInterval(() => setSeconds(seconds + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // ✅ no dependency on the captured value
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return <span>{seconds}s</span>
}`,
        note: 'Callback interval dibuat sekali dan terus memegang `seconds` dari render pertama (0). Bentuk updater menerima nilai terbaru dari React, bukan dari closure.',
      },
      {
        title: 'Membaca nilai terbaru di listener yang berumur panjang',
        code: `function useHotkey(key: string, onPress: () => void) {
  const latest = useRef(onPress)
  useEffect(() => { latest.current = onPress })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === key) latest.current() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [key])
}`,
        note: 'Listener hanya subscribe sekali per key, tapi selalu memanggil `onPress` terbaru lewat ref. Stale closure terhindar, subscribe ulang terus-menerus juga terhindar.',
      },
    ],
    realCase: {
      title: 'Pesan chat terkirim ke room sebelumnya',
      story: `Sebuah aplikasi chat support memungkinkan agen berpindah-pindah percakapan. Listener "kirim dengan Ctrl+Enter" dipasang di \`useEffect(() => { window.addEventListener('keydown', onKey) }, [])\`, dan \`onKey\` memakai \`roomId\` dari props.

Sesekali agen mengirim balasan ke pelanggan yang sebelumnya mereka layani. Listener itu menangkap \`roomId\` dari render pertama. Perbaikannya menambahkan \`roomId\` ke dependency (lengkap dengan cleanup yang benar), lalu belakangan di-refactor ke pola ref di atas. Pelajarannya: callback yang didaftarkan sekali tidak boleh membaca nilai yang berubah-ubah langsung dari closure-nya.`,
    },
    pitfalls: [
      'Dependency array kosong pada effect yang membaca props atau state.',
      'Membaca state setelah `await` dan berharap mendapat nilai terbaru.',
      'Membungkam aturan lint exhaustive-deps alih-alih memperbaiki closure-nya.',
      'Memakai `var` di loop yang membuat callback.',
    ],
    exercise: {
      task: 'Buat `SearchBox` yang mencatat log "searching: <term>" 500 ms setelah pengguna berhenti mengetik (debounce). Pastikan hanya term terakhir yang dicatat dan timer dibersihkan saat unmount.',
      hint: 'Effect yang bergantung pada `term`, memasang timeout, dan mengembalikan cleanup yang menghapusnya.',
      solution: `\`\`\`tsx
function SearchBox() {
  const [term, setTerm] = useState('')

  useEffect(() => {
    if (!term) return
    const id = setTimeout(() => console.log('searching:', term), 500)
    return () => clearTimeout(id)
  }, [term])

  return <input value={term} onChange={e => setTerm(e.target.value)} />
}
\`\`\`

Setiap ketikan membuat effect baru yang closure-nya memegang \`term\` dari render tersebut; cleanup membatalkan timer sebelumnya, jadi hanya timer terakhir yang jalan.`,
    },
    interview: [
      'Apa itu stale closure di React, dan bagaimana updater function menghindarinya?',
      'Kenapa setiap render komponen punya event handler-nya sendiri?',
      'Jelaskan output klasik `for (var i...) setTimeout(() => console.log(i))` dan bagaimana `let` memperbaikinya.',
    ],
  },

  async: {
    explanation: `JavaScript menjalankan kodemu di satu thread. Asynchrony adalah cara JavaScript menunggu hal-hal yang lambat (network, timer, input pengguna) tanpa membekukan halaman.

### Event loop

1. Jalankan kode sinkron dari task saat ini sampai call stack kosong.
2. Kosongkan **microtask queue** sepenuhnya: callback \`.then\` dari Promise, kode setelah \`await\`, \`queueMicrotask\`. Microtask yang masuk antrean selama langkah ini juga ikut dijalankan saat itu juga.
3. Browser boleh melakukan render (style, layout, paint).
4. Ambil **macrotask** berikutnya (timer, event network, klik) lalu ulangi.

Konsekuensinya: \`setTimeout(fn, 0)\` berjalan *setelah* semua callback promise yang tertunda; rantai microtask yang tak berujung bisa memblokir render; loop sinkron yang panjang memblokir klik dan paint.

### Promise dan async/await

Promise merepresentasikan nilai yang baru akan ada nanti; statusnya pending, lalu fulfilled atau rejected tepat satu kali. Fungsi \`async\` selalu mengembalikan Promise; \`await\` menjeda fungsi tersebut (bukan thread-nya) dan melanjutkannya sebagai microtask. Bungkus await dengan \`try/catch\`, dan pakai \`Promise.all\` untuk menjalankan request yang independen secara paralel, bukan di-await satu per satu. \`Promise.allSettled\` mengumpulkan yang sukses dan yang gagal; \`Promise.race\`/\`any\` mengambil yang pertama.

### Detail fetch

\`fetch\` hanya reject saat network gagal. Respons 404 atau 500 tetap *resolve*; kamu wajib mengecek \`res.ok\`. Body-nya adalah stream yang hanya bisa dibaca sekali dengan \`res.json()\`. Pembatalan memakai \`AbortController\`: kirim \`signal\` lalu panggil \`abort()\`, yang membuat promise reject dengan \`AbortError\`.

### Kenapa developer React perlu peduli

- **Race condition**: kalau pengguna mengetik "re" lalu "react", respons untuk "re" bisa datang paling akhir dan menimpa hasil yang lebih baru. Abaikan atau batalkan request yang sudah basi.
- **Komponen yang sudah unmount**: respons yang datang setelah navigasi tidak boleh meng-update state. Cleanup effect menangani hal ini.
- **Urutan eksekusi**: update state setelah \`await\` terjadi di tick berikutnya; React 18+ tetap mem-batch-nya secara otomatis.
- **React modern** memindahkan banyak urusan ini ke framework, library data (TanStack Query), dan primitif React 19 (\`use\` dengan Suspense, Actions dengan pending state), tapi semuanya dibangun di atas event loop yang sama.`,
    examples: [
      {
        title: '❌ fetch tanpa pengecekan vs ✅ helper request yang tangguh',
        code: `// ❌ treats 500 HTML error pages as JSON, never cancellable
async function getUserBad(id: string) {
  const res = await fetch(\`/api/users/\${id}\`)
  return res.json()
}

// ✅ checks status, supports abort, typed result
export async function getUser(id: string, signal?: AbortSignal): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`, { signal })
  if (!res.ok) throw new Error(\`GET user \${id} failed: \${res.status}\`)
  return (await res.json()) as User
}`,
        note: '`fetch` tetap resolve untuk error HTTP. Tanpa `res.ok`, halaman error ikut kamu parse sebagai data. Menerima `signal` memungkinkan pemanggil membatalkan request yang sudah basi.',
      },
      {
        title: 'Effect pencarian yang bebas race condition',
        code: `function useSearch(term: string) {
  const [results, setResults] = useState<Hit[]>([])
  useEffect(() => {
    if (!term) { setResults([]); return }
    const controller = new AbortController()
    fetch(\`/api/search?q=\${encodeURIComponent(term)}\`, { signal: controller.signal })
      .then(r => r.json())
      .then(setResults)
      .catch(err => { if (err.name !== 'AbortError') console.error(err) })
    return () => controller.abort()
  }, [term])
  return results
}`,
        note: 'Setiap term baru membatalkan request sebelumnya lewat cleanup, jadi respons lama yang lebih lambat tidak akan pernah menimpa hasil yang lebih baru.',
      },
      {
        title: 'Await paralel, bukan berurutan',
        code: `// ❌ ~3x slower: each waits for the previous
const user = await getUser(id)
const orders = await getOrders(id)
const tickets = await getTickets(id)

// ✅ independent requests start together
const [user2, orders2, tickets2] = await Promise.all([getUser(id), getOrders(id), getTickets(id)])`,
        note: 'Await berurutan menciptakan waterfall. Kalau request-request itu tidak saling bergantung, mulai semuanya sekaligus lalu await bersama.',
      },
    ],
    realCase: {
      title: 'Hasil pencarian yang berkedip kembali ke query lama',
      story: `Kotak pencarian di sebuah situs listing properti mengirim satu request per ketikan. Pengguna yang mengetik "san f" dengan cepat kadang melihat hasil untuk "sa" muncul setelah hasil yang benar, karena backend menjawab query pendek lebih lambat (lebih banyak baris yang cocok).

Effect-nya hanya menjalankan \`fetch(...).then(setResults)\` tanpa cleanup. Perbaikannya membatalkan request sebelumnya di cleanup effect dan men-debounce input selama 250 ms. Belakangan tim pindah ke library query yang menyimpan cache berdasarkan term pencarian. Pelajarannya: respons tidak datang sesuai urutan request dikirim; setiap UI async butuh strategi untuk menangani hasil yang basi.`,
    },
    pitfalls: [
      'Mengira `fetch` reject untuk 4xx/5xx.',
      'Meng-await request yang independen secara berurutan (waterfall).',
      'Mengabaikan race condition antar request yang tumpang tindih.',
      'Membuat callback `useEffect` itu sendiri `async`; callback itu harus mengembalikan fungsi cleanup, bukan Promise.',
      'Lupa bahwa `setTimeout(fn, 0)` berjalan setelah microtask, bukan langsung.',
    ],
    exercise: {
      task: 'Tebak urutan log-nya:\n\n```js\nconsole.log(1)\nsetTimeout(() => console.log(2), 0)\nPromise.resolve().then(() => console.log(3))\nqueueMicrotask(() => console.log(4))\n;(async () => { console.log(5); await null; console.log(6) })()\nconsole.log(7)\n```\n\nLalu tulis `fetchWithTimeout(url, ms)` yang reject kalau request butuh waktu lebih dari `ms`.',
      hint: 'Kode sinkron dulu, lalu microtask sesuai urutan antrean, lalu timer. Untuk timeout, pakai AbortSignal.timeout atau AbortController dengan setTimeout.',
      solution: `Urutannya: \`1 5 7 3 4 6 2\`. Body fungsi async berjalan secara sinkron sampai \`await\` pertamanya.

\`\`\`ts
export async function fetchWithTimeout(url: string, ms: number) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) })
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`)
  return res.json()
}
\`\`\``,
    },
    interview: [
      'Jelaskan microtask vs macrotask dan sebutkan urutan output dari contoh campuran.',
      'Bagaimana kamu mencegah race condition saat fetching di dalam effect React?',
      'Kenapa `fetch` resolve pada respons 500, dan bagaimana kode pemanggil seharusnya menanganinya?',
    ],
  },

  'dom-events': {
    explanation: `Pengguna berinteraksi dengan halaman melalui event. Memahami cara browser mengirimkan event menjawab sebagian besar teka-teki seperti "kenapa click handler-ku jalan dua kali" atau "kenapa form-nya me-reload halaman".

### Fase propagasi

Saat kamu mengklik tombol di dalam card di dalam sebuah list, event-nya melewati tiga fase:

1. **Capture**: dari \`window\` turun melewati para ancestor sampai ke target.
2. **Target**: di elemen yang diklik (\`event.target\`).
3. **Bubble**: naik kembali dari target melewati setiap ancestor.

Secara default listener berjalan di fase bubble. \`event.currentTarget\` adalah elemen yang listener-nya sedang berjalan; \`event.target\` adalah tempat event bermula. \`stopPropagation()\` menghentikan perjalanannya; \`preventDefault()\` membatalkan aksi bawaan browser (membuka link, men-submit form, mencentang checkbox) tapi tidak menghentikan propagasi. Keduanya independen.

### Event delegation

Karena event menggelembung (bubble) ke atas, satu listener di parent bisa menangani klik untuk ribuan child dengan memeriksa \`event.target\`. Ini lebih murah daripada memasang listener di setiap baris.

### Cara React melakukannya

React memakai delegation dalam skala besar: ia memasang satu listener per jenis event di **root container** (sejak React 17) lalu mengirim *synthetic event* ke handler \`onClick\`, \`onChange\` milikmu. Synthetic event membungkus event native (\`e.nativeEvent\`) dengan API yang konsisten. Handler capture juga ada: \`onClickCapture\`. Beberapa perbedaan yang penting:

- \`onChange\` React pada input jalan di setiap ketikan (seperti event native \`input\`), bukan saat blur.
- \`stopPropagation\` di handler React menghentikan propagasi React; listener native di \`document\` mungkin masih melihat event-nya, tergantung timing.
- Event menggelembung melewati **pohon React**, bukan pohon DOM, jadi event di dalam portal tetap sampai ke parent React-nya walaupun node DOM-nya berada di tempat lain.

### Aturan praktis

- Form: tangani \`onSubmit\` di \`form\` dan panggil \`e.preventDefault()\` (atau pakai form Actions di React 19, yang menangani ini untukmu).
- Gunakan \`button type="button"\` untuk tombol di dalam form yang tidak dimaksudkan untuk submit; type default-nya adalah submit.
- Pakai \`stopPropagation\` seperlunya saja; ia merusak analytics, deteksi klik di luar elemen, dan delegation di tempat lain. Sering kali mengecek \`e.target\` atau menyusun ulang markup lebih bersih.
- Passive listener (\`{ passive: true }\`) untuk scroll/touch meningkatkan performa.`,
    examples: [
      {
        title: '❌ klik bersarang memicu navigasi baris vs ✅ penanganan yang disengaja',
        code: `function OrderRow({ order, onOpen, onDelete }: RowProps) {
  return (
    <tr onClick={() => onOpen(order.id)}>
      <td>{order.number}</td>
      <td>
        {/* ❌ clicking delete also bubbles to <tr> and opens the order */}
        {/* <button onClick={() => onDelete(order.id)}>Delete</button> */}

        {/* ✅ stop only this event from reaching the row */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onDelete(order.id) }}
        >
          Delete
        </button>
      </td>
    </tr>
  )
}`,
        note: 'Karena bubbling, handler baris berjalan setelah handler tombol. Menghentikan propagasi wajar di sini karena dua aksinya bertabrakan; desain yang lebih bersih adalah link "Open" khusus, bukan baris yang bisa diklik.',
      },
      {
        title: 'Submit form tanpa reload halaman',
        code: `function NewsletterForm() {
  const [email, setEmail] = useState('')
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    subscribe(email)
  }
  return (
    <form onSubmit={handleSubmit}>
      <label>Email <input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <button>Subscribe</button>
    </form>
  )
}`,
        note: 'Menangani `onSubmit` (bukan klik tombol) juga mencakup saat pengguna menekan Enter di field. `preventDefault` menghentikan submit native yang me-reload seluruh halaman.',
      },
    ],
    realCase: {
      title: 'Dropdown yang tertutup sebelum opsinya terpilih',
      story: `Sebuah tool manajemen proyek membuat komponen select custom. Komponen itu menutup dirinya dengan listener \`mousedown\` di \`document\` yang mengecek "apakah kliknya di luar menu?". Menu-nya di-render dalam portal di akhir \`body\`, jadi pengecekan DOM \`menuRef.current.contains(e.target)\` terhadap wrapper trigger mengembalikan false untuk klik pada opsi.

Gejalanya: mengklik sebuah opsi menutup menu sebelum \`onClick\` opsi itu jalan, sehingga tidak ada yang terpilih. Perbaikannya: masukkan node portal ke dalam pengecekan containment, dan dengarkan \`click\` alih-alih \`mousedown\`. Pelajarannya: synthetic event React mengikuti pohon komponen, sedangkan listener DOM native dan \`contains\` mengikuti pohon DOM; portal membuat keduanya berbeda.`,
    },
    pitfalls: [
      'Tertukar antara `preventDefault` (membatalkan aksi bawaan) dan `stopPropagation` (menghentikan bubbling).',
      'Lupa bahwa tombol di dalam form default-nya `type="submit"`.',
      'Memakai `e.target` padahal yang dimaksud `e.currentTarget` (target bisa saja ikon yang bersarang).',
      'Memanggil handler alih-alih mengirimkannya: `onClick={save()}` jalan saat render.',
      'Terlalu sering memakai `stopPropagation` sampai merusak listener klik-di-luar atau analytics.',
    ],
    exercise: {
      task: 'Buat `TodoList` yang memakai satu `onClick` di `ul` (event delegation) untuk menangani tombol "toggle" dan "delete" di setiap `li`. Gunakan atribut `data-id` dan `data-action`.',
      hint: 'Pakai `(e.target as HTMLElement).closest(\'button\')` untuk menemukan tombol yang diklik lalu baca dataset-nya.',
      solution: `\`\`\`tsx
function TodoList({ todos, onToggle, onDelete }: Props) {
  function handleClick(e: React.MouseEvent<HTMLUListElement>) {
    const btn = (e.target as HTMLElement).closest('button')
    if (!btn) return
    const { id, action } = btn.dataset
    if (!id) return
    if (action === 'toggle') onToggle(id)
    if (action === 'delete') onDelete(id)
  }
  return (
    <ul onClick={handleClick}>
      {todos.map(t => (
        <li key={t.id}>
          {t.title}
          <button type="button" data-id={t.id} data-action="toggle">Toggle</button>
          <button type="button" data-id={t.id} data-action="delete">Delete</button>
        </li>
      ))}
    </ul>
  )
}
\`\`\`

Di React, handler per item biasanya sudah cukup; latihan ini menunjukkan mekanisme yang dipakai React sendiri.`,
    },
    interview: [
      'Jelaskan fase capture, target, dan bubble.',
      'Di mana React memasang event listener-nya, dan bagaimana portal memengaruhi propagasi?',
      'Apa beda `event.target` dan `event.currentTarget`?',
    ],
  },

  'html-css': {
    explanation: `React me-render HTML, lalu browser memberi style dengan CSS. Tidak ada component library yang menghapus kebutuhan memahami keduanya; library hanya membuatkannya untukmu.

### Utamakan HTML semantik

Elemen membawa makna yang dipakai browser, screen reader, dan mesin pencari:

- \`button\` bisa menerima focus, aktif dengan Enter dan Space, dan memperkenalkan dirinya sebagai tombol. \`div onClick\` tidak melakukan satu pun dari itu.
- \`a href\` untuk navigasi; \`button\` untuk aksi.
- \`label\` yang terhubung ke input (dibungkus, atau pakai \`htmlFor\`) membuat label bisa diklik dan memberi input nama yang aksesibel.
- Landmark (\`header\`, \`nav\`, \`main\`, \`footer\`, \`aside\`) memungkinkan pengguna teknologi bantu melompat antarbagian.
- Tingkat heading (\`h1\`–\`h6\`) membentuk kerangka dokumen; jangan memilihnya demi ukuran font.
- \`fieldset\`/\`legend\` mengelompokkan radio button; \`table\` untuk data tabular.

Semantik yang benar memberimu sebagian besar aksesibilitas secara gratis; ARIA untuk mengisi celah, bukan menggantikan elemen native.

### Layout: Flexbox dan Grid

- **Flexbox** itu satu dimensi: satu baris atau satu kolom. Cocok untuk toolbar, nav bar, centering, dan membagi ruang dengan \`gap\`, \`justify-content\`, \`align-items\`, \`flex: 1\`.
- **Grid** itu dua dimensi: baris dan kolom sekaligus. Cocok untuk layout halaman, galeri card (\`grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))\`), dan dashboard.

### Box model dan ukuran

Setiap elemen terdiri dari content + padding + border + margin. Set \`box-sizing: border-box\` secara global supaya width sudah termasuk padding dan border. Pakai \`rem\` untuk teks dan spacing (menghormati ukuran font pilihan pengguna), \`%\`/\`fr\`/\`vw\` untuk layout yang fleksibel, serta \`min()\`, \`max()\`, \`clamp()\` untuk nilai responsif tanpa media query.

### Desain responsif

Desain mulai dari mobile: style dasar untuk layar kecil, lalu \`@media (min-width: ...)\` untuk memperkaya tampilan. Container query (\`@container\`) memungkinkan komponen merespons lebar *dirinya sendiri*, yang lebih cocok untuk komponen React yang reusable dibanding query berdasarkan viewport.

### Custom property

\`--color-accent: #4f46e5\` yang didefinisikan di \`:root\` dan dipakai lewat \`var(--color-accent)\` memungkinkan theming (dark mode dengan mendefinisikan ulang variabelnya), dan nilainya bisa diubah saat runtime dari React dengan \`style={{ '--progress': '40%' }}\`.

### Specificity dan cascade

Aturan yang bertabrakan diselesaikan berdasarkan origin, layer, specificity, lalu urutan. Jaga specificity tetap rendah (satu class saja), hindari \`!important\`, dan pakai \`@layer\` untuk mengurutkan reset, base, component, dan utility. Setiap pendekatan styling di React (CSS Modules, Tailwind, CSS-in-JS) pada dasarnya adalah strategi untuk mengelola cascade ini.`,
    examples: [
      {
        title: '❌ div jadi tombol vs ✅ button sungguhan',
        code: `// ❌ not focusable, no keyboard support, not announced as a button
<div className="btn" onClick={addToCart}>Add to cart</div>

// ✅ keyboard, focus, screen-reader role all built in
<button type="button" className="btn" onClick={addToCart}>Add to cart</button>`,
        note: 'Membuat ulang tombol dari div butuh `role`, `tabIndex`, dan handler keyboard, dan biasanya tetap saja bermasalah. Elemen native-nya gratis dan sudah benar.',
      },
      {
        title: 'Grid produk responsif dengan Grid dan custom property',
        code: `/* products.css */
:root { --gap: 1rem; --card-min: 220px; }

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-min), 1fr));
  gap: var(--gap);
}

.product-card {
  display: flex;
  flex-direction: column;
  padding: clamp(0.75rem, 2vw, 1.25rem);
}
.product-card .price { margin-top: auto; } /* pushes price to the bottom */`,
        note: 'Tidak perlu media query: Grid memuat kolom sebanyak yang muat di lebar yang tersedia. Di dalam setiap card, Flexbox dengan `margin-top: auto` meratakan posisi harga antar card yang tingginya berbeda.',
      },
    ],
    realCase: {
      title: 'Audit aksesibilitas sebelum kontrak instansi pemerintah',
      story: `Sebuah platform booking yang ikut tender kontrak pemerintah kota gagal dalam audit aksesibilitas: pengguna keyboard tidak bisa membuka date picker atau men-submit form, dan screen reader hanya mengucapkan "clickable, clickable" tanpa label. UI-nya dibangun dengan \`div\` yang di-style seperti tombol, dan memakai placeholder sebagai pengganti label.

Tim mengganti div yang bisa diklik dengan \`button\`, menambahkan elemen \`label\` ke setiap input, membenahi hierarki heading, dan menambahkan style focus yang terlihat. Sebagian besar masalah hilang tanpa ARIA sama sekali. Pelajarannya: HTML semantik adalah pekerjaan aksesibilitas termurah yang bisa kamu lakukan, dan jauh lebih sulit kalau baru dipasang belakangan.`,
    },
    pitfalls: [
      'Memakai `div`/`span` dengan `onClick` alih-alih `button` atau `a`.',
      'Menjadikan placeholder satu-satunya label untuk input.',
      'Menghapus outline focus (`outline: none`) tanpa pengganti yang terlihat.',
      'Memakai trik Flexbox untuk layout dua dimensi yang bisa diselesaikan langsung oleh Grid.',
      'Menaikkan specificity atau memakai `!important` demi memenangkan konflik style.',
    ],
    exercise: {
      task: 'Buat form pendaftaran yang responsif dan aksesibel: nama, email, grup radio paket (Free/Pro), dan tombol submit. Di layar lebar, field nama dan email bersebelahan; di layar sempit, keduanya bertumpuk. Setiap kontrol harus bisa dijangkau dan dioperasikan hanya dengan keyboard.',
      hint: 'Pakai `label`, `fieldset` + `legend` untuk radio, dan Grid dengan `repeat(auto-fit, minmax(240px, 1fr))` untuk field-nya.',
      solution: `\`\`\`tsx
export function SignupForm() {
  return (
    <form className="signup">
      <div className="fields">
        <label>Name <input name="name" autoComplete="name" required /></label>
        <label>Email <input name="email" type="email" autoComplete="email" required /></label>
      </div>
      <fieldset>
        <legend>Plan</legend>
        <label><input type="radio" name="plan" value="free" defaultChecked /> Free</label>
        <label><input type="radio" name="plan" value="pro" /> Pro</label>
      </fieldset>
      <button>Create account</button>
    </form>
  )
}
\`\`\`

\`\`\`css
.fields { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.signup label { display: flex; flex-direction: column; gap: .25rem; }
.signup :focus-visible { outline: 2px solid var(--accent, #4f46e5); outline-offset: 2px; }
\`\`\``,
    },
    interview: [
      'Kapan kamu memilih Grid dibanding Flexbox?',
      'Kenapa `button` lebih baik daripada `div` dengan onClick? Apa saja yang perlu ditambahkan supaya div itu setara?',
      'Apa beda container query dan media query, dan kenapa container query cocok untuk UI berbasis komponen?',
    ],
  },
}

export default details
