import type { TopicDetail } from '../../types'

const details: Record<string, TopicDetail> = {
  'use-effect': {
    explanation: `\`useEffect\` memungkinkan komponen **menyinkronkan diri dengan sesuatu di luar React**: koneksi network, API browser, timer, widget pihak ketiga, subscription. Ini bukan lifecycle hook untuk "jalankan kode saat mount"; ini cara untuk mengatakan "selama komponen ini tampil di layar dengan nilai-nilai ini, jaga agar hal eksternal itu tetap sinkron".

### Kapan effect berjalan

1. React me-render komponenmu (murni, tanpa effect).
2. React melakukan commit hasilnya ke DOM.
3. Browser biasanya melakukan paint.
4. React menjalankan setup effect-mu.

Di render berikutnya, kalau ada dependency yang berubah (dibandingkan dengan \`Object.is\`), React lebih dulu menjalankan cleanup effect **sebelumnya** dengan nilai *lama*, lalu setup yang baru dengan nilai baru. Saat unmount, cleanup terakhir dijalankan.

### Dependency bukan pilihan

Dependency array harus mencantumkan setiap nilai reaktif (props, state, nilai turunan dari keduanya, fungsi yang didefinisikan di komponen) yang dibaca effect. Aturan lint menghitungkannya untukmu. Kalau effect terlalu sering jalan ulang, ubah *kodenya* supaya butuh lebih sedikit dependency: pindahkan objek ke dalam effect, pakai updater function, pisahkan logika non-reaktif dengan \`useEffectEvent\`. Jangan pernah berbohong dengan menghilangkan dependency; itu menciptakan stale closure.

- Tanpa array: berjalan setelah setiap render.
- \`[]\`: setup saat mount, cleanup saat unmount (karena tidak ada nilai reaktif yang dibaca).
- \`[a, b]\`: sinkron ulang saat \`a\` atau \`b\` berubah.

### Berpikir dalam pasangan mulai/berhenti

Setiap effect sebaiknya ditulis sebagai "mulai sinkronisasi" dan "hentikan sinkronisasi". Connect/disconnect, subscribe/unsubscribe, pasang/hapus timeout, tambah/hapus listener, fetch/abaikan hasil. Kalau cleanup-nya kamu tulis dengan benar, effect akan bekerja berapa kali pun React me-mount-nya.

### Kenapa StrictMode menjalankannya dua kali

Di development, React me-mount, meng-unmount, lalu me-mount ulang setiap komponen sekali, jadi effect-mu berjalan setup → cleanup → setup. Kalau itu merusak sesuatu (koneksi ganda, listener dobel), berarti cleanup-mu tidak ada atau salah. Di production effect berjalan sekali, tapi pengguna sungguhan bisa memicu urutan yang sama lewat navigasi, Suspense, dan Activity.

### Data fetching di dalam effect

Fetching di dalam effect memang bisa, tapi kamu harus menangani race dan cleanup, dan kamu tidak mendapat caching, deduplikasi, maupun preloading. Di aplikasi sungguhan, utamakan mekanisme data loading dari framework-mu, library seperti TanStack Query, atau \`use\` di React 19 dengan promise yang di-cache. Fetching di effect tetap layak dipahami karena memperlihatkan model sinkronisasi dengan jelas.

### useLayoutEffect

API-nya sama, tapi berjalan secara sinkron setelah mutasi DOM dan *sebelum* paint. Pakai hanya untuk mengukur layout dan menyesuaikannya sebelum pengguna melihat kedipan (misalnya posisi tooltip). Karena memblokir paint, jadikan \`useEffect\` sebagai default.`,
    examples: [
      {
        title: '❌ tanpa cleanup vs ✅ pasangan mulai/berhenti',
        code: `function LiveOrderStatus({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<string>('pending')

  // ❌ opens a new socket per orderId change and never closes the old ones
  // useEffect(() => {
  //   const ws = new WebSocket(\`wss://api.example.com/orders/\${orderId}\`)
  //   ws.onmessage = e => setStatus(JSON.parse(e.data).status)
  // }, [orderId])

  // ✅ every connect has a matching disconnect
  useEffect(() => {
    const ws = new WebSocket(\`wss://api.example.com/orders/\${orderId}\`)
    ws.onmessage = e => setStatus(JSON.parse(e.data).status)
    return () => ws.close()
  }, [orderId])

  return <p>Order {orderId}: {status}</p>
}`,
        note: 'Tanpa cleanup, berpindah order membuat socket bocor, dan socket lama terus memanggil setStatus dengan status order lain. Cleanup berjalan dengan orderId sebelumnya sebelum koneksi baru dibuka.',
      },
      {
        title: 'Menyinkronkan widget pihak ketiga',
        code: `function MapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapInstance | null>(null)

  // create/destroy once
  useEffect(() => {
    const map = createMap(containerRef.current!)
    mapRef.current = map
    return () => { map.destroy(); mapRef.current = null }
  }, [])

  // sync props into the widget
  const [lat, lng] = center
  useEffect(() => {
    mapRef.current?.setView([lat, lng], zoom)
  }, [lat, lng, zoom])

  return <div ref={containerRef} className="map" />
}`,
        note: 'Effect terpisah untuk urusan yang terpisah: umur widget vs menjaga tampilannya tetap sinkron. Bergantung pada primitif (`lat`, `lng`) mencegah effect jalan ulang hanya karena array baru yang isinya sama.',
      },
    ],
    realCase: {
      title: 'Jumlah notifikasi dari workspace yang salah',
      story: `Sebuah produk team chat memungkinkan pengguna berpindah workspace. \`useEffect(() => { socket.on('unread', setUnread) }, [workspaceId])\` melakukan subscribe per workspace tanpa cleanup. Setelah beberapa kali berpindah, badge-nya berkedip-kedip di antara jumlah dari workspace yang berbeda, dan pemakaian memori terus naik sepanjang hari kerja.

Setiap perpindahan menambah satu listener lagi; semuanya terus memanggil \`setUnread\`. Perbaikannya mengembalikan \`() => socket.off('unread', handler)\` dan memfilter event berdasarkan \`workspaceId\`. Sebenarnya StrictMode sudah memperlihatkan listener dobel di development, tapi tim mengabaikannya. Pelajarannya: tulis setiap effect sebagai pasangan mulai/berhenti, dan perlakukan gejala eksekusi ganda di dev sebagai bug sungguhan.`,
    },
    pitfalls: [
      'Menghilangkan dependency supaya effect jalan "sekali saja".',
      'Tidak ada cleanup untuk subscription, timer, socket, dan listener.',
      'Membuat callback effect jadi `async` (callback harus mengembalikan cleanup atau tidak mengembalikan apa-apa).',
      'Objek/fungsi yang dibuat saat render dipakai sebagai dependency, sehingga effect jalan ulang di setiap render.',
      'Memakai effect untuk hal yang bukan sinkronisasi eksternal (lihat "You might not need an effect").',
    ],
    exercise: {
      task: 'Tulis hook `useOnlineStatus()` yang mengembalikan `true`/`false` dan tetap sinkron dengan event `online`/`offline` dari browser. Lalu tulis `useDocumentTitle(title)`. Pastikan keduanya berperilaku benar di bawah StrictMode.',
      hint: 'Nilai awal dari `navigator.onLine`; tambahkan dua listener di setup dan hapus di cleanup. (Untuk hook pertama, `useSyncExternalStore` bahkan lebih cocok — coba keduanya.)',
      solution: `\`\`\`ts
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => { document.title = previous }
  }, [title])
}
\`\`\`

Versi \`useSyncExternalStore\`: \`useSyncExternalStore(subscribe, () => navigator.onLine, () => true)\` dengan \`subscribe\` yang menambah/menghapus listener yang sama.`,
    },
    interview: [
      'Jelaskan urutan persis render, commit, cleanup, dan setup saat dependency sebuah effect berubah.',
      'Kenapa React menjalankan effect dua kali di development, dan apa artinya kalau hal itu merusak kodemu?',
      'Apa beda `useEffect` dan `useLayoutEffect`?',
    ],
  },

  'no-effect': {
    explanation: `Effect adalah pintu darurat (escape hatch) untuk menyinkronkan dengan sistem *eksternal*. Sebagian besar effect di codebase sungguhan sama sekali tidak menyentuh hal eksternal; mereka hanya memindah-mindahkan state React. Effect semacam itu membuat aplikasi lebih lambat (satu render tambahan setiap kali), lebih sulit diikuti, dan lebih rawan bug (render perantara yang tidak konsisten, loop).

### Kamu tidak butuh effect untuk...

**Mentransformasi data untuk render.** Kalau \`fullName\` berasal dari \`first\` dan \`last\`, hitung saat render: \`const fullName = first + ' ' + last\`. Effect yang men-set state \`fullName\` akan me-render sekali dengan data basi, lalu sekali lagi dengan data yang benar. Kalau komputasinya mahal, lakukan memoisasi (React Compiler melakukannya otomatis; kalau tidak, pakai \`useMemo\`).

**Menangani event pengguna.** "Saat pengguna mengklik Buy, POST order-nya lalu tampilkan toast" tempatnya di click handler. Effect yang mengawasi flag \`submitted\` lalu melakukan POST kehilangan konteks *kenapa* ia berjalan, dan bisa jalan lagi saat remount.

**Me-reset state saat prop berubah.** Pakai \`key\` pada komponen supaya React me-mount ulang dengan state yang segar.

**Menyesuaikan sebagian state saat prop berubah.** Biasanya kamu bisa menurunkannya saja (simpan \`selectedId\`, hitung \`selected\`). Dalam kasus yang jarang, kamu bisa men-set state saat render dengan penjaga berupa perbandingan dengan prop sebelumnya, tapi menyusun ulang strukturnya lebih baik.

**Berbagi logika antar event handler.** Pisahkan jadi fungsi dan panggil dari kedua handler.

**Memberi tahu parent soal perubahan state.** Panggil \`onChange\` milik parent di handler yang sama tempat kamu meng-update state lokal, atau angkat state-nya supaya parent yang memilikinya.

**Merangkai komputasi** ("saat A berubah set B, saat B berubah set C"). Hitung seluruh state berikutnya di event handler atau reducer.

**Menginisialisasi aplikasi sekali.** Kode di level module atau penjaga di level atas berjalan sekali per load; effect berjalan per mount (dua kali di dev).

**Subscribe ke external store.** Utamakan \`useSyncExternalStore\`, yang menangani concurrent rendering dan tearing.

**Fetch data.** Bisa dengan effect, tapi framework, library query, dan \`use\` menangani caching, race, dan waterfall dengan lebih baik.

### Ujiannya

Tanyakan: *kenapa* kode ini berjalan? Kalau jawabannya "karena pengguna melakukan sesuatu", tempatnya di event handler. Kalau jawabannya "karena komponen sedang tampil dan harus tetap sinkron dengan sesuatu di luar React", itu effect. Kalau jawabannya "karena state lain berubah", kemungkinan besar itu data turunan, atau tempatnya di handler yang mengubah state tersebut.`,
    examples: [
      {
        title: '❌ state turunan lewat effect vs ✅ hitung saat render',
        code: `function CartSummary({ items }: { items: CartItem[] }) {
  // ❌ extra render with a stale total, plus more state to keep in sync
  // const [total, setTotal] = useState(0)
  // useEffect(() => {
  //   setTotal(items.reduce((s, i) => s + i.price * i.qty, 0))
  // }, [items])

  // ✅ derived during render; compiler memoises if needed
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const freeShipping = total >= 50

  return <p>Total: \${total.toFixed(2)} {freeShipping && '· Free shipping'}</p>
}`,
        note: 'Versi dengan effect me-render sekali dengan total lama lalu sekali lagi. Menurunkan nilainya menghapus satu variabel state, satu effect, dan satu render.',
      },
      {
        title: '❌ logika event di effect vs ✅ di handler',
        code: `function CheckoutButton({ cart }: { cart: Cart }) {
  // ❌ fires again on remount (and twice in StrictMode); hard to trace
  // const [submitted, setSubmitted] = useState(false)
  // useEffect(() => {
  //   if (submitted) { placeOrder(cart); toast('Order placed') }
  // }, [submitted])

  // ✅ the user's click is the cause, so the handler does the work
  async function handleClick() {
    await placeOrder(cart)
    toast('Order placed')
  }
  return <button onClick={handleClick}>Place order</button>
}`,
        note: 'Effect berjalan karena render, bukan karena niat pengguna. Efek samping yang dipicu oleh interaksi tertentu tempatnya di handler interaksi itu.',
      },
      {
        title: '❌ rantai effect vs ✅ satu handler menghitung semuanya',
        code: `// ❌ card → effect sets round → effect sets gameOver: 3 renders per move
// ✅
function handlePlayCard(card: Card) {
  const nextGold = gold + card.value
  setCard(card)
  setGold(nextGold)
  if (nextGold > 100) {
    setRound(r => r + 1)
    if (round === 5) setGameOver(true)
  }
}`,
        note: 'Menghitung state berikutnya di satu tempat menghasilkan satu render yang di-batch dan menjaga sebab-akibatnya tetap terlihat bersama.',
      },
    ],
    realCase: {
      title: 'Form yang tersimpan dua kali',
      story: `Sebuah aplikasi penjadwalan layanan kesehatan memakai \`useEffect(() => { if (formState === 'submitted') saveAppointment(values) }, [formState])\`. Di development setiap janji temu dibuat dua kali (StrictMode), yang lalu "diperbaiki" tim dengan flag ref. Di production, kembali ke halaman konfirmasi me-mount ulang komponen dengan \`formState === 'submitted'\` yang dipulihkan dari cache, dan janji temu benar-benar terduplikasi untuk pasien sungguhan.

Perbaikannya memindahkan \`saveAppointment\` ke submit handler (belakangan menjadi form Action dengan \`useActionState\`) serta menghapus effect dan akal-akalan ref tadi. Pelajarannya: kalau sebuah kode ada karena pengguna mengklik sesuatu, effect adalah tempat yang salah, dan penjaga ref itu gejala, bukan obat.`,
    },
    pitfalls: [
      'Menyimpan nilai turunan di state dan menyinkronkannya dengan effect.',
      'Menjalankan request POST atau toast dari effect yang mengawasi flag "submitted".',
      'Me-reset state di effect alih-alih memakai `key`.',
      'Rantai effect yang masing-masing men-set state untuk effect berikutnya.',
      'Menambal eksekusi ganda dengan flag `useRef` alih-alih memindahkan logikanya.',
    ],
    exercise: {
      task: 'Refactor komponen ini supaya tidak punya effect sama sekali dengan perilaku yang tetap sama:\n\n```tsx\nfunction UserPicker({ users, onSelect }: Props) {\n  const [query, setQuery] = useState(\'\')\n  const [filtered, setFiltered] = useState(users)\n  const [selectedId, setSelectedId] = useState<string | null>(null)\n  useEffect(() => { setFiltered(users.filter(u => u.name.includes(query))) }, [users, query])\n  useEffect(() => { if (selectedId) onSelect(selectedId) }, [selectedId])\n  ...\n}\n```',
      hint: 'Filtered adalah data turunan; memberi tahu parent tempatnya di click handler.',
      solution: `\`\`\`tsx
function UserPicker({ users, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filtered = users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()))

  function handlePick(id: string) {
    setSelectedId(id)
    onSelect(id)
  }

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ul>
        {filtered.map(u => (
          <li key={u.id} aria-selected={u.id === selectedId} onClick={() => handlePick(u.id)}>{u.name}</li>
        ))}
      </ul>
    </>
  )
}
\`\`\``,
    },
    interview: [
      'Berikan tiga contoh effect yang seharusnya bukan effect, dan apa penggantinya.',
      'Bagaimana kamu memutuskan antara event handler dan effect untuk sebuah logika?',
      'Kenapa menyimpan data turunan di state menyebabkan render tambahan dan bug?',
    ],
  },

  'use-ref': {
    explanation: `\`useRef(initial)\` mengembalikan objek biasa \`{ current: initial }\` yang disimpan React sepanjang umur komponen. Mengubah \`ref.current\` **tidak** memicu re-render. Inilah yang menjadikan ref pintu darurat untuk nilai-nilai yang tidak perlu di-render oleh React.

### Dua kegunaan utama

**1. Merujuk ke node DOM.** Kirim ref ke atribut \`ref\` milik elemen JSX; setelah commit React mengisi \`ref.current\` dengan node DOM-nya, dan mengembalikannya ke \`null\` saat unmount. Pakai untuk memberi focus ke input, scroll ke elemen, mengukur ukuran, memutar media, atau menyerahkan node ke library non-React.

**2. Menyimpan nilai instance yang bisa berubah.** Id interval dan timeout, callback terbaru untuk listener yang berumur panjang, \`AbortController\`, nilai sebelumnya, flag "apakah pengguna sudah berinteraksi". Apa pun yang harus bertahan di antara render tapi tidak memengaruhi output.

### Ref vs state vs variabel

- **Variabel lokal** ter-reset di setiap render.
- **State** bertahan dan memicu re-render saat berubah; yang kamu baca adalah snapshot.
- **Ref** bertahan dan tidak memicu re-render; yang kamu baca selalu nilai terbaru yang bisa berubah.

Kalau perubahan nilainya harus mengubah apa yang tampil di layar, nilai itu harus berupa state.

### Jangan membaca atau menulis ref saat render

Render harus murni dan bisa diprediksi. Membaca \`ref.current\` saat render memberimu nilai yang tidak dilacak React, sehingga UI bisa menampilkan data basi dan compiler tidak bisa menalarnya. Tulis dan baca ref di event handler dan effect. Satu-satunya pengecualian yang diterima adalah lazy initialization: \`if (ref.current === null) ref.current = createExpensiveThing()\`.

### Ref callback

Alih-alih objek, kamu bisa mengirim fungsi: \`ref={node => { ... }}\`. React memanggilnya dengan node saat dipasang. Di React 19, callback ini boleh **mengembalikan fungsi cleanup**, yang berjalan saat dilepas; sangat cocok untuk memasang observer (ResizeObserver, IntersectionObserver) ke sebuah node. Ref callback juga cara untuk mengelola ref bagi list item yang dinamis (simpan node-node di \`Map\` dengan key berupa id).

### Ref ke komponen buatanmu sendiri (React 19)

\`ref\` sekarang adalah prop biasa untuk function component. Komponen yang ingin mengekspos node DOM di dalamnya cukup meneruskan \`ref\` ke node tersebut. Untuk mengekspos API imperatif yang terbatas (\`open()\`, \`scrollToBottom()\`), pakai \`useImperativeHandle(ref, () => ({ ... }))\`. Jarang-jarang saja memakai API imperatif; props tetap antarmuka utama.

### TypeScript

\`useRef<HTMLInputElement>(null)\` untuk ref DOM (dibaca sebagai mungkin \`null\`). \`useRef<number | undefined>(undefined)\` untuk nilai seperti id timer. Di React 19, \`useRef\` wajib diberi argumen.`,
    examples: [
      {
        title: 'Manajemen focus dan id interval',
        code: `function Stopwatch() {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<number | undefined>(undefined)
  const startButtonRef = useRef<HTMLButtonElement>(null)

  function start() {
    if (intervalRef.current !== undefined) return
    intervalRef.current = window.setInterval(() => setElapsed(e => e + 100), 100)
  }
  function stop() {
    window.clearInterval(intervalRef.current)
    intervalRef.current = undefined
    startButtonRef.current?.focus()
  }
  useEffect(() => () => window.clearInterval(intervalRef.current), [])

  return (
    <>
      <output>{(elapsed / 1000).toFixed(1)}s</output>
      <button ref={startButtonRef} onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </>
  )
}`,
        note: 'Id interval tidak pernah muncul di UI, jadi ia berupa ref. `elapsed` ditampilkan, jadi ia berupa state. Ref hanya dibaca di handler dan cleanup.',
      },
      {
        title: '❌ ref dibaca saat render vs ✅ state; cleanup ref di React 19',
        code: `// ❌ UI does not update when clicks.current changes
function LikeButtonBad() {
  const clicks = useRef(0)
  return <button onClick={() => clicks.current++}>Likes: {clicks.current}</button>
}

// ✅ visible value lives in state
function LikeButton() {
  const [likes, setLikes] = useState(0)
  return <button onClick={() => setLikes(l => l + 1)}>Likes: {likes}</button>
}

// ✅ React 19 ref callback with cleanup to observe size
function AutoSizeChart({ data }: { data: Point[] }) {
  const [width, setWidth] = useState(0)
  return (
    <div ref={node => {
      if (!node) return
      const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
      ro.observe(node)
      return () => ro.disconnect()
    }}>
      <Chart data={data} width={width} />
    </div>
  )
}`,
        note: 'Memutasi ref tidak pernah memicu re-render, jadi me-render `clicks.current` menampilkan angka basi. Ref callback mengembalikan cleanup yang memutus observer saat node dilepas.',
      },
    ],
    realCase: {
      title: 'Timer "save draft" yang tidak berhenti menyimpan',
      story: `Sebuah platform blogging menyimpan draf otomatis dengan \`let timer = setTimeout(save, 2000)\` sebagai variabel biasa di dalam komponen editor, dan menghapusnya di setiap ketikan dengan \`clearTimeout(timer)\`. Karena variabel itu ter-reset di setiap render, \`clearTimeout\` selalu menerima \`undefined\`, jadi setiap ketikan menjadwalkan penyimpanan dan server menerima puluhan penyimpanan yang tumpang tindih, kadang tidak berurutan, sehingga teks yang lebih baru tertimpa teks yang lebih lama.

Menyimpan id timer di \`useRef\` (dan menghapusnya saat unmount) membuat debounce-nya bekerja. Pelajarannya: nilai yang harus bertahan di antara render tanpa memengaruhi output tempatnya di ref, bukan di variabel lokal.`,
    },
    pitfalls: [
      'Membaca atau menulis `ref.current` saat render.',
      'Memakai ref untuk nilai yang seharusnya ditampilkan (tidak ada re-render saat berubah).',
      'Menyimpan id timer atau controller di variabel biasa yang ter-reset di setiap render.',
      'Lupa bahwa ref DOM bernilai `null` sebelum mount dan setelah unmount.',
      'Mengekspos API imperatif yang besar lewat ref alih-alih props.',
    ],
    exercise: {
      task: 'Buat daftar pesan chat yang otomatis scroll ke pesan terbaru saat ada yang masuk, **kecuali** pengguna sedang scroll ke atas untuk membaca riwayat. Pakai ref untuk container scroll dan untuk flag "pengguna dekat bagian bawah".',
      hint: 'Update flag-nya di handler onScroll; di effect yang bergantung pada messages.length, scroll hanya kalau flag-nya true.',
      solution: `\`\`\`tsx
function MessageList({ messages }: { messages: Message[] }) {
  const listRef = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)

  function handleScroll() {
    const el = listRef.current!
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

  useEffect(() => {
    const el = listRef.current
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight
  }, [messages.length])

  return (
    <div ref={listRef} onScroll={handleScroll} className="messages">
      {messages.map(m => <p key={m.id}>{m.text}</p>)}
    </div>
  )
}
\`\`\`

\`nearBottom\` tidak memengaruhi render, jadi memakai ref menghindari re-render di setiap event scroll.`,
    },
    interview: [
      'Bandingkan ref, state, dan variabel lokal. Kapan kamu memakai masing-masing?',
      'Kenapa kamu tidak boleh membaca `ref.current` saat render?',
      'Apa yang berubah soal ref di React 19 (ref sebagai prop, cleanup pada ref callback)?',
    ],
  },

  'use-reducer': {
    explanation: `\`useReducer(reducer, initialState)\` adalah alternatif \`useState\` yang memindahkan logika update dari event handler ke satu fungsi murni:

\`\`\`ts
const [state, dispatch] = useReducer(reducer, initialState)
\`\`\`

Handler men-\`dispatch\` **action** yang menggambarkan *apa yang terjadi* (\`{ type: 'item_added', product }\`), lalu reducer yang memutuskan *bagaimana state berubah*: \`(state, action) => nextState\`.

### Kenapa memakainya

- **Banyak transisi pada data yang saling terkait.** Keranjang dengan add, remove, ubah jumlah, pakai kupon, kosongkan: dengan \`useState\` logika itu tercecer di banyak handler. Dengan reducer, semuanya tinggal di satu switch yang mudah dibaca.
- **State berikutnya bergantung pada beberapa bagian state saat ini.** Reducer selalu menerima state terbaru, jadi tidak ada stale closure.
- **Mudah dites.** Reducer adalah fungsi murni: panggil dengan sebuah state dan action, lalu cek hasilnya. Tidak perlu render.
- **Mudah di-debug.** Mencatat action-action memberimu linimasa tentang apa saja yang terjadi.
- **dispatch yang stabil.** Identitas \`dispatch\` tidak pernah berubah, jadi mengirimkannya ke bawah (atau lewat context) tidak merusak memoisasi.

### Aturan untuk reducer

- Murni: tanpa fetch, timer, id acak, atau mutasi. React bisa memanggil reducer dua kali di StrictMode.
- Kembalikan objek baru untuk perubahan (immutability), kembalikan \`state\` yang sama kalau tidak ada yang berubah.
- Action menggambarkan event dalam istilah pengguna/domain (\`'checkout_started'\`), bukan setter (\`'set_loading_true'\`).
- Tangani action yang tidak dikenal secara eksplisit; di TypeScript pakai \`switch\` yang exhaustive dengan pengecekan \`never\`.

### Discriminated union

Di TypeScript, modelkan action sebagai union dengan kunci \`type\`. Di setiap \`case\`, TypeScript mempersempit tipe action-nya, jadi \`action.productId\` hanya ada di tempat yang seharusnya. Kamu juga bisa memodelkan *state* sebagai union (\`{ status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }\`) supaya kondisi yang mustahil tidak bisa direpresentasikan; reducer-nya pun menjadi state machine kecil.

### Lazy initialization

\`useReducer(reducer, arg, init)\` memanggil \`init(arg)\` sekali untuk membangun state awal, misalnya memuat dari \`localStorage\`.

### Kapan jangan memakainya

Satu toggle atau satu input teks lebih jelas dengan \`useState\`. Reducer menambah seremoni; pakai saat jumlah atau kerumitan transisinya memang sepadan. Sinyal yang bagus: kamu mendapati dirimu menulis beberapa pemanggilan \`setX\` sekaligus di banyak handler.

### Saat skalanya membesar

\`useReducer\` + context adalah pola global store yang ringan (context untuk state + context untuk dispatch). Konsep reducer yang sama mendasari Redux Toolkit dan banyak state machine.`,
    examples: [
      {
        title: 'Reducer keranjang dengan discriminated union',
        code: `type CartItem = { productId: string; name: string; price: number; qty: number }
type CartState = { items: CartItem[]; coupon: string | null }

type CartAction =
  | { type: 'item_added'; item: Omit<CartItem, 'qty'> }
  | { type: 'quantity_changed'; productId: string; qty: number }
  | { type: 'item_removed'; productId: string }
  | { type: 'coupon_applied'; code: string }
  | { type: 'cleared' }

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'item_added': {
      const existing = state.items.find(i => i.productId === action.item.productId)
      return existing
        ? { ...state, items: state.items.map(i => (i === existing ? { ...i, qty: i.qty + 1 } : i)) }
        : { ...state, items: [...state.items, { ...action.item, qty: 1 }] }
    }
    case 'quantity_changed':
      return action.qty <= 0
        ? { ...state, items: state.items.filter(i => i.productId !== action.productId) }
        : { ...state, items: state.items.map(i => (i.productId === action.productId ? { ...i, qty: action.qty } : i)) }
    case 'item_removed':
      return { ...state, items: state.items.filter(i => i.productId !== action.productId) }
    case 'coupon_applied':
      return { ...state, coupon: action.code.trim().toUpperCase() }
    case 'cleared':
      return { items: [], coupon: null }
    default: {
      const exhaustive: never = action
      return exhaustive
    }
  }
}`,
        note: 'Semua transisi ada di satu tempat, TypeScript mempersempit tipe di setiap case, dan pengecekan `never` membuat compile gagal kalau ada tipe action baru yang ditambahkan tapi belum ditangani.',
      },
      {
        title: '❌ setter yang tercecer vs ✅ men-dispatch event',
        code: `// ❌ each handler must remember every related update
function removeBad(id: string) {
  setItems(items.filter(i => i.productId !== id))
  if (items.length === 1) setCoupon(null)
  setLastAction('remove')
}

// ✅ handler describes what happened
const [cart, dispatch] = useReducer(cartReducer, { items: [], coupon: null })
const remove = (productId: string) => dispatch({ type: 'item_removed', productId })`,
        note: 'Dengan setter, aturan bisnis bocor ke setiap handler dan membaca nilai yang mungkin basi. Reducer memegang aturannya dan selalu melihat state terbaru.',
      },
    ],
    realCase: {
      title: 'Wizard penawaran asuransi multi-langkah',
      story: `Sebuah wizard penawaran asuransi punya tujuh langkah dan sekitar lima belas pemanggilan \`useState\`: langkah saat ini, jawaban per langkah, error validasi, loading, hasil penawaran. Bug terus bermunculan: kembali ke langkah sebelumnya setelah error membuat error-nya tetap terlihat, atau penawaran dari jawaban sebelumnya masih tertinggal.

Tim menulis ulang dengan reducer yang memakai union state (\`editing\`, \`calculating\`, \`quoted\`, \`failed\`) dan action seperti \`step_submitted\`, \`back_clicked\`, \`quote_received\`. Menghapus penawaran basi cukup satu baris di \`back_clicked\`, dan reducer-nya mendapat tiga puluh unit test yang cepat. Pelajarannya: kalau kebenaran perilaku bergantung pada beberapa nilai yang berubah bersamaan, pusatkan transisinya.`,
    },
    pitfalls: [
      'Efek samping (fetch, toast, id acak) di dalam reducer.',
      'Memutasi `state` lalu mengembalikannya.',
      'Nama action berupa setter, bukan event.',
      'Memakai reducer untuk state sepele yang lebih jelas dengan `useState`.',
      'Lupa case default/exhaustive, sehingga diam-diam mengembalikan `undefined`.',
    ],
    exercise: {
      task: 'Implementasikan reducer untuk state machine data fetching dengan state `idle | loading | success(data) | error(message)` dan action `fetch_started`, `fetch_succeeded(data)`, `fetch_failed(message)`, `reset`. Abaikan `fetch_succeeded` kecuali sedang loading. Tulis dua unit test.',
      hint: 'Modelkan state sebagai discriminated union pada `status`; cek `state.status` sebelum menerima hasil.',
      solution: `\`\`\`ts
type State<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

type Action<T> =
  | { type: 'fetch_started' }
  | { type: 'fetch_succeeded'; data: T }
  | { type: 'fetch_failed'; message: string }
  | { type: 'reset' }

export function fetchReducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case 'fetch_started': return { status: 'loading' }
    case 'fetch_succeeded': return state.status === 'loading' ? { status: 'success', data: action.data } : state
    case 'fetch_failed': return state.status === 'loading' ? { status: 'error', message: action.message } : state
    case 'reset': return { status: 'idle' }
  }
}

// tests (Vitest)
test('accepts data while loading', () => {
  expect(fetchReducer({ status: 'loading' }, { type: 'fetch_succeeded', data: 1 })).toEqual({ status: 'success', data: 1 })
})
test('ignores late data after reset', () => {
  const idle = { status: 'idle' } as const
  expect(fetchReducer(idle, { type: 'fetch_succeeded', data: 1 })).toBe(idle)
})
\`\`\``,
    },
    interview: [
      'Kapan kamu memilih `useReducer` dibanding `useState`?',
      'Kenapa reducer harus murni, dan apa yang terjadi di StrictMode?',
      'Bagaimana discriminated union meningkatkan type safety reducer?',
    ],
  },

  'use-context': {
    explanation: `Context memungkinkan sebuah komponen menyediakan nilai untuk seluruh subtree-nya tanpa harus meneruskannya lewat props ke setiap komponen perantara ("prop drilling").

### Tiga bagiannya

1. \`const ThemeContext = createContext<Theme>('light')\` membuat context dengan nilai default yang dipakai saat tidak ada provider di atasnya.
2. Provider: \`<ThemeContext value={theme}>...</ThemeContext>\`. Di React 19 objek context itu sendiri adalah provider-nya; \`<ThemeContext.Provider>\` masih bekerja tapi tidak lagi diperlukan.
3. Consumer: \`const theme = useContext(ThemeContext)\` (atau \`use(ThemeContext)\`, yang juga boleh dipanggil secara kondisional). Ia membaca nilai dari provider **terdekat** di atasnya dalam pohon.

### Cara update menyebar

Saat \`value\` sebuah provider berubah (menurut \`Object.is\`), React me-render ulang **setiap komponen yang membaca context itu**, bahkan kalau komponen itu berada di balik pembatas \`memo\`, dan bahkan kalau ia hanya memakai bagian nilai yang tidak berubah. Komponen yang tidak membaca context tidak terpengaruh oleh context itu sendiri (mereka mungkin tetap re-render karena parent-nya re-render).

Inilah jebakan performa utamanya: \`value={{ user, setUser }}\` membuat objek baru di setiap render provider, jadi setiap consumer re-render setiap kali provider-nya render. Solusinya:

- Jaga nilainya tetap stabil (React Compiler melakukan memoisasi ini otomatis; kalau tidak, pakai \`useMemo\`).
- **Pecah context** berdasarkan frekuensi update: satu untuk data yang jarang berubah (user saat ini, theme), satu lagi untuk data yang sering berubah. Pola yang umum adalah context state dan context dispatch yang terpisah, karena \`dispatch\` tidak pernah berubah.
- Pindahkan state yang sering berubah ke bawah, lebih dekat ke tempat ia dipakai.
- Untuk state global berfrekuensi tinggi dengan subscription selektif, pakai external store (Zustand, Redux) dengan selector.

### Context cocok untuk apa

Data yang dibutuhkan banyak komponen di berbagai kedalaman dan relatif jarang berubah: theme, locale, user yang sedang login, feature flag, context form-field milik design system, router. Context juga merupakan mekanisme di balik **compound component** (parent \`Tabs\` yang berbagi state dengan child \`Tab\`).

### Context bukan apa

Context bukan state manager; ia hanya alat pengantar. State tetap tinggal di sebuah komponen (\`useState\`/\`useReducer\`) dan context yang mengantarkannya. Sebelum meraih context, coba komposisi dulu: mengirim JSX sebagai \`children\` sering kali menghilangkan prop drilling sepenuhnya.

### Custom hook yang baik

Bungkus setiap context dengan hook yang melempar error kalau provider-nya tidak ada: \`useCart()\`. Ini memberi pesan error yang lebih baik, satu titik import, dan memungkinkan kamu mengganti implementasinya belakangan.`,
    examples: [
      {
        title: 'Context bertipe dengan hook penjaga (sintaks React 19)',
        code: `type AuthValue = { user: User | null; signOut: () => Promise<void> }
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const signOut = async () => { await api.signOut(); setUser(null) }
  // With the React Compiler this object is memoised automatically
  return <AuthContext value={{ user, signOut }}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}`,
        note: 'Default `null` ditambah throw di dalam hook langsung menangkap provider yang hilang, alih-alih gagal dengan "cannot read property of undefined" di tempat yang jauh.',
      },
      {
        title: '❌ satu context besar vs ✅ dipecah berdasarkan frekuensi update',
        code: `// ❌ every cursor move re-renders the toolbar, sidebar and anything reading user/theme
<AppContext value={{ user, theme, cursorPosition, setCursorPosition }}>

// ✅ separate contexts; rare data and frequent data do not mix
<UserContext value={user}>
  <ThemeContext value={theme}>
    <CursorContext value={cursorPosition}>
      <CursorDispatchContext value={setCursorPosition}>
        <Editor />
      </CursorDispatchContext>
    </CursorContext>
  </ThemeContext>
</UserContext>`,
        note: 'Consumer re-render saat context yang dibacanya berubah. Komponen yang hanya perlu *mengubah* posisi kursor membaca context dispatch yang stabil dan tidak pernah re-render saat kursor bergerak.',
      },
    ],
    realCase: {
      title: 'Tool desain yang tersendat saat drag',
      story: `Sebuah aplikasi whiteboard menyimpan semuanya di satu \`EditorContext\`: dokumen, seleksi, zoom, dan posisi pointer yang terus berubah. Menyeret sebuah shape memperbarui pointer 60 kali per detik, dan setiap komponen yang membaca context itu (toolbar, panel layer, komentar) re-render setiap kali. Drag terasa berat di laptop kelas menengah.

Profiling menunjukkan ratusan komponen re-render di setiap frame. Tim memecah context menjadi bagian yang stabil (dokumen, action) dan yang cepat berubah (pointer), lalu memindahkan pelacakan pointer ke external store dengan subscription berbasis selector. Re-render per frame turun hingga tinggal canvas-nya saja. Pelajarannya: context baik untuk data yang sesekali berubah; untuk update berfrekuensi tinggi, pecah context-nya atau pakai store dengan selector.`,
    },
    pitfalls: [
      'Menaruh state berfrekuensi tinggi di context yang dikonsumsi banyak komponen.',
      'Membuat objek value baru di setiap render provider tanpa memoisasi (kode sebelum era compiler).',
      'Memakai context hanya untuk menghindari meneruskan props satu atau dua tingkat; komposisi biasanya lebih sederhana.',
      'Lupa memasang provider dan diam-diam mendapat nilai default.',
      'Berharap `memo` menghentikan re-render yang dipicu context; tidak bisa.',
    ],
    exercise: {
      task: 'Buat compound component `Tabs`: `<Tabs defaultValue="details"><TabList><Tab value="details">Details</Tab><Tab value="reviews">Reviews</Tab></TabList><TabPanel value="details">...</TabPanel><TabPanel value="reviews">...</TabPanel></Tabs>`. Child-child-nya berkomunikasi lewat context; setiap `Tab` harus punya atribut ARIA yang benar.',
      hint: 'Tabs memegang state `active` dan menyediakan `{ active, setActive }`; Tab dan TabPanel membacanya.',
      solution: `\`\`\`tsx
const TabsContext = createContext<{ active: string; setActive: (v: string) => void } | null>(null)
const useTabs = () => {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tab components must be inside <Tabs>')
  return ctx
}

export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [active, setActive] = useState(defaultValue)
  return <TabsContext value={{ active, setActive }}>{children}</TabsContext>
}
export const TabList = ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>

export function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  const { active, setActive } = useTabs()
  return (
    <button role="tab" id={\`tab-\${value}\`} aria-selected={active === value} aria-controls={\`panel-\${value}\`} onClick={() => setActive(value)}>
      {children}
    </button>
  )
}
export function TabPanel({ value, children }: { value: string; children: React.ReactNode }) {
  const { active } = useTabs()
  if (active !== value) return null
  return <div role="tabpanel" id={\`panel-\${value}\`} aria-labelledby={\`tab-\${value}\`}>{children}</div>
}
\`\`\``,
    },
    interview: [
      'Saat nilai context berubah, komponen mana saja yang re-render? Apakah `memo` membantu?',
      'Bagaimana kamu menyusun context untuk state yang sangat sering berubah?',
      'Kapan komposisi menjadi solusi yang lebih baik daripada context untuk mengatasi prop drilling?',
    ],
  },

  'memo-hooks': {
    explanation: `React me-render ulang sebuah komponen setiap kali parent-nya re-render, state-nya berubah, atau context yang dibacanya berubah. Biasanya itu murah. Alat-alat memoisasi memungkinkan kamu melewati pekerjaan saat input-nya tidak berubah.

### Tiga alatnya

- \`useMemo(() => compute(a, b), [a, b])\` menyimpan cache sebuah **nilai hasil komputasi** di antara render dan menghitung ulang hanya saat ada dependency yang berubah (\`Object.is\`).
- \`useCallback(fn, [deps])\` menyimpan cache sebuah **referensi fungsi**. Persis sama dengan \`useMemo(() => fn, deps)\`.
- \`memo(Component)\` menyimpan cache **hasil render sebuah komponen**: kalau semua props sama menurut \`Object.is\` dengan sebelumnya, React memakai ulang hasil sebelumnya dan melewati render-nya (beserta subtree-nya, kecuali state/context di dalamnya berubah).

### Kenapa alat ini ada: kesamaan referensi

Setiap render membuat objek dan fungsi baru. Child \`memo\` yang menerima \`onSelect={() => ...}\` mendapat fungsi baru setiap kali, jadi memo-nya tidak pernah kena. \`useCallback\` menstabilkan referensinya. Begitu juga, effect yang bergantung pada objek hasil komputasi akan jalan ulang di setiap render kecuali objeknya di-memo. Jadi hook memo punya dua tujuan: **menghindari komputasi ulang yang mahal** dan **menjaga identitas** supaya optimasi lain bisa bekerja.

### React Compiler mengubah default-nya

Dengan React Compiler aktif, langkah build otomatis melakukan memoisasi nilai, callback, dan JSX dengan granularitas halus, sering kali lebih baik daripada kode tulisan tangan (compiler bisa melakukan memoisasi setelah early return dan kondisi, yang tidak bisa dilakukan hook). Di kode yang di-compile, kamu jarang perlu menambahkan \`useMemo\`/\`useCallback\`/\`memo\` sendiri. Kamu tetap perlu memahaminya untuk:

- Membaca dan merawat kode serta library yang sudah ada.
- Menangani kode yang dilewati compiler (komponen yang melanggar Rules of React).
- Mengontrol dependency effect secara presisi di tempat yang memang secara semantik membutuhkan identitas stabil.

### Kapan memoisasi manual sepadan (tanpa compiler)

- Komputasi yang terukur lambat (profiling dulu; \`console.time\` atau React Profiler). Memfilter 200 item tidak lambat; mem-parse CSV 5 MB itu lambat.
- Mengirim nilai atau callback ke komponen \`memo\` atau ke dalam dependency array.
- Komponen yang sering re-render dengan props yang sama dan render-nya sendiri mahal.

### Biaya dan batasan

Memoisasi tidak gratis: ia menyimpan nilai lama di memori, menambah kerja perbandingan, dan membuat kode berantakan. Ia juga hanya bekerja kalau dependency-nya stabil; satu objek inline di deps menggagalkan seluruh rantainya. \`useMemo\` adalah petunjuk performa, bukan jaminan semantik: React bisa membuang cache-nya. Jangan pernah mengandalkannya untuk kebenaran perilaku (seperti menjaga WebSocket tetap hidup).

### Lebih baik dari memo: struktur

Sering kali kamu bisa menghindari re-render dengan memindahkan state ke bawah (ke komponen yang membutuhkannya) atau mengangkat konten ke atas (mengirim children sebagai props sehingga dibuat oleh parent yang tidak re-render).`,
    examples: [
      {
        title: 'Memoisasi manual (kode pra-compiler yang akan kamu baca)',
        code: `const ProductRow = memo(function ProductRow({ product, onAdd }: { product: Product; onAdd: (id: string) => void }) {
  return <tr><td>{product.name}</td><td><button onClick={() => onAdd(product.id)}>Add</button></td></tr>
})

function Catalog({ products, query }: { products: Product[]; query: string }) {
  const [cart, setCart] = useState<string[]>([])

  const visible = useMemo(
    () => products.filter(p => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query],
  )
  const handleAdd = useCallback((id: string) => setCart(c => [...c, id]), [])

  return <table><tbody>{visible.map(p => <ProductRow key={p.id} product={p} onAdd={handleAdd} />)}</tbody></table>
}`,
        note: 'Tanpa `useCallback`, `handleAdd` akan menjadi fungsi baru di setiap render dan setiap baris `memo` akan re-render saat keranjang berubah. Bentuk updater membuat callback-nya tidak butuh dependency sama sekali.',
      },
      {
        title: '❌ memo rusak oleh prop inline vs ✅ memindahkan state ke bawah',
        code: `// ❌ ExpensiveChart is memoised, but options is new every render
function DashboardBad() {
  const [hovered, setHovered] = useState<string | null>(null)
  return (
    <>
      <Legend onHover={setHovered} hovered={hovered} />
      <ExpensiveChart options={{ theme: 'dark' }} />
    </>
  )
}

// ✅ no memo needed: the hover state lives where it is used
function Dashboard() {
  return (
    <>
      <InteractiveLegend />        {/* owns its hover state */}
      <ExpensiveChart options={CHART_OPTIONS} /> {/* module-level constant */}
    </>
  )
}`,
        note: 'Menyusun ulang struktur sehingga state yang sering berubah tidak tinggal di atas komponen yang mahal sering kali lebih sederhana dan lebih tangguh daripada memoisasi.',
      },
    ],
    realCase: {
      title: 'Tabel trading yang membeku di setiap tick',
      story: `Sebuah aplikasi demo bergaya broker me-render tabel posisi berisi 2.000 baris yang re-render penuh di setiap tick harga, karena parent menyimpan semua harga di satu objek state dan mengirim \`onSelect={() => ...}\` secara inline ke setiap baris.

Membungkus baris dengan \`memo\` tidak berpengaruh apa-apa sampai callback-nya distabilkan dengan \`useCallback\` dan setiap baris hanya menerima harganya sendiri sebagai prop primitif. Re-render per tick turun dari 2.000 baris menjadi segelintir baris yang berubah. Saat tim belakangan mengadopsi React Compiler, mereka menghapus sebagian besar hook manual; compiler memberi hasil yang sama, dan keuntungan yang tersisa datang dari bentuk datanya (props per baris). Pelajarannya: memoisasi hanya bekerja kalau identitas yang mengalir ke dalamnya stabil, dan bentuk data lebih penting daripada hook.`,
    },
    pitfalls: [
      'Me-memo semuanya secara default, menambah biaya dan kebisingan tanpa manfaat yang terukur.',
      'Membungkus komponen dengan `memo` sambil mengiriminya objek/fungsi inline.',
      'Mengandalkan `useMemo` untuk kebenaran perilaku; React bisa membuang cache-nya.',
      'Dependency yang terlewat atau salah, menghasilkan nilai basi.',
      'Menambahkan hook memo manual di kode yang sudah dioptimalkan React Compiler.',
    ],
    exercise: {
      task: 'Lakukan profiling pada daftar 5.000 kontak dengan kotak pencarian dan toggle "favorit" di setiap baris. Pertama, amati (React DevTools Profiler, "Highlight updates") bahwa mengetik membuat setiap baris re-render. Lalu kurangi re-render-nya, sekali dengan `memo`/`useCallback` manual, dan sekali lagi dengan mengaktifkan React Compiler lalu menghapus kode manualnya.',
      hint: 'Baris butuh props yang stabil: objek kontak (referensinya tidak berubah saat baris lain di-toggle) dan callback `onToggle(id)` yang stabil.',
      solution: `\`\`\`tsx
const ContactRow = memo(function ContactRow({ contact, onToggle }: { contact: Contact; onToggle: (id: string) => void }) {
  return <li>{contact.name} <button onClick={() => onToggle(contact.id)}>{contact.favourite ? '★' : '☆'}</button></li>
})

function Contacts({ initial }: { initial: Contact[] }) {
  const [contacts, setContacts] = useState(initial)
  const [query, setQuery] = useState('')
  const onToggle = useCallback(
    (id: string) => setContacts(cs => cs.map(c => (c.id === id ? { ...c, favourite: !c.favourite } : c))),
    [],
  )
  const visible = useMemo(() => contacts.filter(c => c.name.includes(query)), [contacts, query])
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ul>{visible.map(c => <ContactRow key={c.id} contact={c} onToggle={onToggle} />)}</ul>
    </>
  )
}
\`\`\`

Sekarang men-toggle satu kontak hanya me-render ulang baris itu, karena \`map\` mempertahankan referensi setiap kontak lainnya. Dengan compiler aktif, hapus \`memo\`, \`useCallback\`, dan \`useMemo\`, dan profiler seharusnya menunjukkan hasil yang sama.`,
    },
    interview: [
      'Apa beda `useMemo`, `useCallback`, dan `memo`?',
      'Kenapa child yang di-memo tetap re-render saat kamu mengiriminya arrow function inline?',
      'Bagaimana React Compiler mengubah kapan kamu perlu menulis memoisasi secara manual?',
    ],
  },

  'react19-hooks': {
    explanation: `React 19 menambahkan API yang menjadikan UI async, terutama form dan mutasi, sebagai warga kelas satu. Semuanya berpusat pada **Action**: fungsi async yang dijalankan di dalam transition, dengan React melacak pending state, error, dan hasilnya.

### Action dan transition

\`startTransition(async () => { ... })\` (atau \`startTransition\` dari \`useTransition\`) sekarang menerima fungsi async. Selama action berjalan, \`isPending\` bernilai true; update state di dalamnya diterapkan bersamaan saat action selesai. \`<form action={fn}>\` otomatis menjalankan \`fn(formData)\` sebagai Action, me-reset field uncontrolled setelah berhasil, dan mendukung progressive enhancement di framework yang mendukung Server Function.

### useActionState

\`const [state, formAction, isPending] = useActionState(action, initialState)\`

\`action(prevState, formData)\` milikmu mengembalikan state berikutnya, misalnya \`{ error: 'Email taken' }\` atau \`{ ok: true }\`. Kirim \`formAction\` ke \`<form action>\` atau ke \`formAction\` milik sebuah tombol. Pemanggilannya diantrekan sesuai urutan. Ini menggantikan trio klasik: \`useState\` untuk error, \`useState\` untuk loading, dan submit handler.

### useFormStatus

\`const { pending, data, method } = useFormStatus()\` dari \`react-dom\` membaca status \`<form>\` **parent**-nya. Hook ini harus dipanggil di komponen yang di-render *di dalam* form, sehingga komponen \`SubmitButton\` yang reusable bisa dibuat tanpa prop drilling.

### useOptimistic

\`const [optimisticItems, addOptimistic] = useOptimistic(items, (current, newItem) => [...current, newItem])\`

Selama sebuah Action berjalan, kamu memanggil \`addOptimistic(...)\` untuk langsung menampilkan hasil yang diharapkan. Saat Action selesai dan \`items\` yang sesungguhnya ter-update, nilai optimistic dibuang dan diganti dengan data yang benar. Kalau Action gagal, nilainya cukup kembali seperti semula. Sangat cocok untuk like, pesan chat, dan toggle.

### use

\`use(resource)\` membaca sebuah **promise** atau **context** saat render. Dengan promise, komponen akan suspend sampai promise-nya resolve (\`Suspense\` terdekat menampilkan fallback) dan error boundary terdekat menangkap rejection-nya. Berbeda dengan hook, \`use\` boleh dipanggil di dalam kondisi dan loop. Promise-nya harus **stabil**: dibuat di luar render (di loader, cache, atau Server Component parent), bukan \`use(fetch(...))\` secara inline, yang akan membuat promise baru di setiap render.

### Perubahan React 19 lain yang terkait

- \`ref\` sebagai prop; ref callback bisa mengembalikan cleanup.
- \`<Context value>\` sebagai provider.
- Metadata dokumen (\`title\`, \`meta\`, \`link\`) yang di-render di mana pun akan diangkat ke \`head\`.
- \`useEffectEvent\` dan \`Activity\` hadir di 19.2.

### Model mental

Alih-alih repot mengatur \`isLoading\`, \`error\`, dan logika rollback secara manual, kamu cukup menggambarkan pekerjaan async sebagai Action lalu membiarkan React menangani pending state, urutan, dan rekonsiliasi dengan data sebenarnya yang datang belakangan.`,
    examples: [
      {
        title: 'Form signup dengan useActionState dan useFormStatus',
        code: `import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

type State = { error?: string; ok?: boolean }

async function signup(_prev: State, formData: FormData): Promise<State> {
  const email = String(formData.get('email') ?? '')
  if (!email.includes('@')) return { error: 'Enter a valid email' }
  const res = await fetch('/api/signup', { method: 'POST', body: formData })
  if (res.status === 409) return { error: 'That email is already registered' }
  if (!res.ok) return { error: 'Something went wrong, try again' }
  return { ok: true }
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? 'Creating…' : 'Create account'}</button>
}

export function SignupForm() {
  const [state, formAction] = useActionState(signup, {})
  if (state.ok) return <p>Check your inbox to confirm.</p>
  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      {state.error && <p role="alert">{state.error}</p>}
      <SubmitButton />
    </form>
  )
}`,
        note: 'Tidak ada state loading/error manual maupun `preventDefault`. `SubmitButton` membaca status pending dari form mana pun tempat ia ditaruh.',
      },
      {
        title: 'Komentar optimistic',
        code: `function Comments({ comments, postId }: { comments: Comment[]; postId: string }) {
  const [optimistic, addOptimistic] = useOptimistic(
    comments,
    (current, text: string) => [...current, { id: 'temp-' + current.length, text, pending: true }],
  )

  async function send(formData: FormData) {
    const text = String(formData.get('text'))
    addOptimistic(text)
    await api.addComment(postId, text) // parent refetches → comments prop updates
  }

  return (
    <>
      <ul>{optimistic.map(c => <li key={c.id} style={{ opacity: c.pending ? 0.5 : 1 }}>{c.text}</li>)}</ul>
      <form action={send}><input name="text" /><button>Post</button></form>
    </>
  )
}`,
        note: 'Komentar langsung muncul dengan opacity setengah. Saat Action selesai, React membuang lapisan optimistic dan menampilkan `comments` yang sesungguhnya; kalau gagal, item sementaranya menghilang.',
      },
      {
        title: '❌ use dengan promise inline vs ✅ promise yang stabil',
        code: `// ❌ new promise every render → suspends forever / refetch loop
function ProfileBad({ id }: { id: string }) {
  const user = use(fetch(\`/api/users/\${id}\`).then(r => r.json()))
  return <h1>{user.name}</h1>
}

// ✅ promise created once (by a cache, loader or parent) and passed in
function Profile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise)
  return <h1>{user.name}</h1>
}

// parent
<Suspense fallback={<Skeleton />}>
  <Profile userPromise={getUserCached(id)} />
</Suspense>`,
        note: '`use` membaca promise; ia tidak menyimpan cache-nya. Promise-nya harus mempertahankan identitas di antara render, jadi harus berasal dari cache atau parent.',
      },
    ],
    realCase: {
      title: 'Membuang 200 baris boilerplate form',
      story: `Area pengaturan sebuah produk SaaS punya selusin form, masing-masing dengan state \`isSubmitting\`, \`error\`, \`success\`, submit handler dengan \`preventDefault\`, try/catch, dan prop disabled yang di-drill ke tombol-tombol custom. Submit ganda masih saja lolos saat pengguna menekan Enter dua kali.

Saat upgrade ke React 19, tim mengubah setiap form menjadi \`useActionState\` dengan \`SubmitButton\` bersama yang memakai \`useFormStatus\`, dan toggle "favorit" menjadi \`useOptimistic\`. Sekitar 200 baris kode pengurusan state hilang, UI pending menjadi konsisten, dan Action mengantrekan submit alih-alih membiarkannya saling balapan. Pelajarannya: hook-hook baru ini bukan sekadar sintaks; mereka merangkum pola UI async yang terus-menerus ditulis ulang secara manual oleh banyak tim.`,
    },
    pitfalls: [
      'Memanggil `use(fetch(...))` dengan promise yang dibuat saat render.',
      'Memanggil `useFormStatus` di komponen yang sama dengan yang me-render form-nya (hook ini hanya membaca form parent).',
      'Lupa bahwa action milik `useActionState` menerima `prevState` sebagai argumen pertama.',
      'Tidak membungkus komponen yang memanggil `use(promise)` dengan Suspense dan error boundary.',
      'Berharap state `useOptimistic` bertahan; ia kembali ke nilai asli begitu Action selesai.',
    ],
    exercise: {
      task: 'Buat tombol "Like" untuk sebuah post memakai `useOptimistic` dan sebuah Action. Tombol harus ter-update seketika, menampilkan jumlah sebenarnya setelah server merespons, dan kembali seperti semula kalau request gagal (simulasikan kegagalan secara acak di API palsu).',
      hint: 'Simpan `likes` yang sesungguhnya di state, panggil `addOptimistic` di dalam `startTransition`, lalu set nilai sebenarnya dari respons server.',
      solution: `\`\`\`tsx
function LikeButton({ postId, initialLikes }: { postId: string; initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes)
  const [optimisticLikes, addOptimistic] = useOptimistic(likes, (n, delta: number) => n + delta)
  const [isPending, startTransition] = useTransition()

  function like() {
    startTransition(async () => {
      addOptimistic(1)
      try {
        const real = await api.like(postId) // returns the new total
        startTransition(() => setLikes(real))
      } catch {
        // nothing to do: optimistic value reverts automatically
      }
    })
  }

  return <button onClick={like} disabled={isPending}>♥ {optimisticLikes}</button>
}
\`\`\`

Kalau \`api.like\` melempar error, \`likes\` tidak pernah berubah, jadi saat transition selesai \`optimisticLikes\` kembali ke jumlah yang sebenarnya.`,
    },
    interview: [
      'Apa itu Action di React 19, dan bagaimana `useActionState` dan `<form action>` memakainya?',
      'Bagaimana `useOptimistic` memutuskan kapan membuang nilai optimistic?',
      'Kenapa promise yang dikirim ke `use` harus stabil, dan dari mana seharusnya promise itu berasal?',
    ],
  },

  rules: {
    explanation: `Hook punya dua aturan, dan keduanya berawal dari cara React menyimpan state hook.

### Cara hook disimpan

Untuk setiap instance komponen (fiber), React menyimpan **linked list berisi slot-slot hook**. Saat render, pemanggilan \`useState\` pertama mendapat slot 1, hook kedua mendapat slot 2, dan seterusnya. Tidak ada nama; React hanya tahu "ini hook ketiga yang dipanggil". Di render berikutnya, React menelusuri list yang sama dengan urutan yang sama dan menyerahkan state yang tersimpan ke setiap pemanggilan.

### Aturan 1: panggil hook hanya di level atas

Jangan memanggil hook di dalam kondisi, loop, fungsi bersarang, setelah early return, atau di dalam blok try/catch. Kalau sebuah kondisi melewatkan satu hook di suatu render, setiap hook sesudahnya bergeser satu slot dan menerima state milik hook lain. React mendeteksi sebagian kasus ("Rendered fewer hooks than expected"), tapi aturan yang aman adalah: hook yang sama, urutan yang sama, di setiap render. Kalau kamu butuh perilaku kondisional, taruh kondisinya *di dalam* hook (misalnya di dalam effect). \`use\` adalah pengecualian: ia tidak disimpan berdasarkan urutan dan boleh dipanggil secara kondisional.

### Aturan 2: panggil hook hanya dari fungsi React

Panggil hook dari function component atau dari custom hook, jangan pernah dari fungsi biasa, class component, atau event handler. Ini menjamin React sedang me-render komponen yang benar saat hook berjalan.

Plugin lint \`eslint-plugin-react-hooks\` menegakkan kedua aturan ini; React Compiler juga bergantung padanya.

### Custom hook

Custom hook adalah fungsi yang namanya diawali \`use\` dan memanggil hook lain. Custom hook memungkinkan kamu memisahkan **logika stateful**, bukan state-nya: setiap komponen yang memanggil \`useOnlineStatus()\` mendapat state sendiri yang independen. Awalan \`use\` adalah cara manusia, linter, dan compiler tahu bahwa aturan hook berlaku.

Custom hook yang baik:

- Punya tujuan yang fokus dan dinamai berdasarkan *apa* yang dikerjakannya (\`useDebouncedValue\`, \`useMediaQuery\`, \`useCart\`), bukan lifecycle (\`useMount\`).
- Mengembalikan API seminimal mungkin: satu nilai, tuple, atau objek kecil.
- Menyembunyikan effect dan subscription di balik antarmuka deklaratif, sehingga komponen terbaca seperti deskripsi perilaku.
- Menerima nilai reaktif sebagai argumen dan menyinkronkan ulang saat nilainya berubah.

Jangan menjadikan sebuah fungsi sebagai hook hanya untuk berbagi kode; kalau ia tidak memanggil hook apa pun, ia adalah fungsi biasa dan tidak boleh diawali \`use\`.

### Kenapa desainnya begini?

Penyimpanan berbasis urutan membuat hook murah (tidak ada key yang perlu dikelola), mudah dikomposisi (custom hook hanyalah fungsi yang memanggil hook), dan bebas tabrakan nama saat dua custom hook sama-sama memakai \`useState\` di dalamnya. Harganya adalah aturan-aturan tadi, yang sekarang ditegakkan otomatis oleh tooling.`,
    examples: [
      {
        title: '❌ hook kondisional vs ✅ kondisi di dalam hook',
        code: `function OrderDetails({ orderId, isAdmin }: { orderId: string; isAdmin: boolean }) {
  // ❌ when isAdmin flips, every hook after this shifts slots
  // if (isAdmin) {
  //   const [notes, setNotes] = useState('')
  // }
  // const [tab, setTab] = useState('summary')

  // ✅ always call; decide what to do inside
  const [notes, setNotes] = useState('')
  const [tab, setTab] = useState<'summary' | 'items'>('summary')
  useEffect(() => {
    if (!isAdmin) return
    loadAdminNotes(orderId).then(setNotes)
  }, [isAdmin, orderId])
  // ...
}`,
        note: 'Hook dikenali berdasarkan posisi pemanggilannya. Pemanggilan tanpa kondisi menjaga posisinya tetap stabil; kondisinya dipindah ke dalam body hook.',
      },
      {
        title: 'Custom hook yang fokus',
        code: `export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

// usage in a search page
function ProductSearch() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 400)
  const results = useProductSearch(debouncedQuery) // another custom hook
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products" />
      <ResultsList results={results} />
    </>
  )
}`,
        note: 'Komponennya terbaca deklaratif: "debounce query-nya, lalu cari". Setiap komponen yang memanggil `useDebouncedValue` punya state dan timer sendiri.',
      },
    ],
    realCase: {
      title: 'Feature flag yang mengacak isi form',
      story: `Sebuah marketplace menambahkan \`if (flags.giftWrap) { const [giftNote, setGiftNote] = useState('') }\` ke komponen checkout-nya. Flag itu dimuat secara async, jadi bernilai false di render pertama dan true sesudahnya. Saat nilainya berganti, React melempar "Rendered more hooks than during the previous render" untuk sebagian pengguna; di jalur kode lain tempat hook yang berbeda terlewati, state metode pengiriman malah muncul di field alamat.

Aturan lint-nya ternyata dimatikan di folder itu setelah sebuah migrasi. Perbaikannya memanggil \`useState\` tanpa kondisi dan me-render input catatan hadiah secara kondisional, lalu aturan lint diaktifkan lagi di seluruh repo dengan penegakan di CI. Pelajarannya: urutan hook itu penopang struktur; jangan pernah biarkan flag atau early return mengubah hook mana yang dijalankan.`,
    },
    pitfalls: [
      'Memanggil hook setelah early return (`if (!user) return null` sebelum `useState`).',
      'Memanggil hook di dalam loop (`items.map(() => useState())`); pecah menjadi komponen child.',
      'Menamai fungsi helper biasa dengan `useSomething`, atau menamai hook tanpa `use`.',
      'Berharap dua komponen yang memakai custom hook yang sama berbagi state.',
      'Mematikan aturan lint rules-of-hooks.',
    ],
    exercise: {
      task: 'Tulis `useLocalStorage<T>(key, initial)` yang berperilaku seperti `useState` tapi menyimpan nilainya ke `localStorage`, tahan terhadap error saat parse JSON, dan sinkron antar tab browser lewat event `storage`. Pakai untuk menyimpan toggle "dark mode".',
      hint: 'Lazy initial state membaca storage sekali; satu effect menulis saat nilai berubah; effect lain mendengarkan event `storage` untuk key yang sama.',
      solution: `\`\`\`ts
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota or private mode */ }
  }, [key, value])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return
      try { setValue(JSON.parse(e.newValue) as T) } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  return [value, setValue] as const
}

// usage
const [dark, setDark] = useLocalStorage('prefers-dark', false)
\`\`\``,
    },
    interview: [
      'Kenapa hook harus dipanggil dengan urutan yang sama di setiap render? Apa yang disimpan React?',
      'Apakah dua komponen yang memanggil custom hook yang sama berbagi state? Kenapa?',
      'Kenapa `use` boleh dipanggil secara kondisional sementara `useState` tidak?',
    ],
  },
}

export default details
