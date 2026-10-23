import type { TopicDetail } from '../../types'

const details: Record<string, TopicDetail> = {
  styling: {
    explanation: `Setiap pendekatan styling sebenarnya menjawab tiga pertanyaan yang sama: **bagaimana nama class di-scope** supaya style tidak bocor ke mana-mana, **kapan CSS-nya dihasilkan** (saat build atau saat runtime), dan **bagaimana style merespons props dan tema**. Begitu kamu melihat semua opsi lewat tiga pertanyaan ini, memilih salah satunya tidak lagi soal ikut tren.

### CSS Modules
File \`.module.css\` isinya CSS biasa, tapi bundler menulis ulang setiap nama class menjadi nama unik (\`button\` jadi \`Button_button__x7f2a\`) dan memberimu objek JS yang memetakan nama asli ke nama hasil generate. Scoping terjadi saat build, output-nya stylesheet statis, dan biaya runtime-nya nol. Variant ditangani dengan mengganti class atau, lebih baik lagi, lewat atribut \`data-*\` yang dipilih oleh selector CSS. CSS Modules jalan di mana saja, termasuk Server Components, karena tidak ada yang dijalankan di browser.

### Tailwind CSS
Tailwind membalik cara berpikirnya: alih-alih memberi nama, kamu menyusun utility class kecil langsung di markup (\`px-4 py-2 rounded-md bg-blue-600\`). Compiler memindai file source dan hanya menghasilkan utility yang benar-benar kamu pakai, jadi CSS akhirnya tetap kecil dan pertumbuhannya lambat meskipun aplikasinya terus membesar. Keuntungannya: cepat, konsisten (kamu memilih dari skala yang terbatas), dan tidak ada CSS mati. Harganya: string class jadi panjang dan kamu butuh disiplin. Kamu tetap perlu mengekstrak component, dan memakai helper seperti \`clsx\` plus \`tailwind-merge\` untuk menggabungkan class kondisional dengan aman. Tailwind v4 dikonfigurasi di CSS dengan \`@theme\`, yang mengubah design token kamu menjadi utility sekaligus CSS variable.

### CSS-in-JS runtime
Library seperti styled-components dan Emotion menghasilkan CSS **saat render**: mereka men-serialize objek style, membuat hash-nya, lalu menyisipkan tag \`<style>\`. Artinya ada JavaScript tambahan, kerja tambahan di setiap render dengan props dinamis, dan penyisipan style yang bisa bentrok dengan concurrent rendering. Library ini juga butuh context di sisi client, jadi tidak cocok dengan React Server Components. Itulah sebabnya ekosistem mulai meninggalkannya untuk proyek baru.

### CSS-in-JS zero-runtime
vanilla-extract, Panda CSS, StyleX, dan Linaria memungkinkan kamu menulis style di TypeScript (token yang type-safe, style berdampingan dengan component) tapi mengekstraknya jadi CSS statis saat build. Kamu dapat kenyamanan menulisnya tanpa biaya runtime.

### Cara memilih
- Aplikasi baru, tim kecil, iterasi cepat: **Tailwind**.
- Tim sudah kuat di CSS, atau membuat library design system untuk dipakai pihak lain: **CSS Modules** atau **vanilla-extract** (pemakainya tidak perlu ikut setup Tailwind kamu).
- Hindari memulai proyek baru dengan CSS-in-JS runtime.

Apa pun pilihanmu, masukkan nilai dinamis ke **CSS custom properties** (\`style={{ '--progress': pct }}\`), jangan membuat class baru untuk setiap nilai.`,
    examples: [
      {
        title: '❌ CSS-in-JS runtime dengan style dinamis per render vs ✅ CSS Module + data attribute',
        code: `// ❌ A new style rule is serialized and injected for every distinct prop combo
const Btn = styled.button<{ $variant: 'primary' | 'ghost'; $size: number }>\`
  padding: \${p => p.$size}px;
  background: \${p => (p.$variant === 'primary' ? '#2563eb' : 'transparent')};
\`

// ✅ Button.module.css
// .button { padding: var(--btn-pad, 8px 14px); border-radius: var(--radius-md); }
// .button[data-variant='primary'] { background: var(--color-accent); color: white; }
// .button[data-variant='ghost'] { background: transparent; }
import styles from './Button.module.css'

type Props = React.ComponentProps<'button'> & { variant?: 'primary' | 'ghost' }

export function Button({ variant = 'primary', className, ...rest }: Props) {
  return (
    <button
      {...rest}
      data-variant={variant}
      className={[styles.button, className].filter(Boolean).join(' ')}
    />
  )
}`,
        note: 'Versi CSS Module menghasilkan satu stylesheet statis saat build. Variant dipilih lewat data attribute, sehingga juga mudah diperiksa di DevTools dan mudah di-test. Pemakai component tetap bisa mengoper className.',
      },
      {
        title: '✅ Tailwind dengan penggabungan class yang aman',
        code: `import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

const variants = {
  primary: 'bg-accent text-white hover:bg-accent/90',
  ghost: 'bg-transparent hover:bg-muted',
} as const

export function Button({
  variant = 'primary',
  className,
  ...rest
}: React.ComponentProps<'button'> & { variant?: keyof typeof variants }) {
  return (
    <button
      {...rest}
      className={cn('inline-flex items-center rounded-md px-4 py-2 focus-visible:outline-2', variants[variant], className)}
    />
  )
}`,
        note: 'twMerge menyelesaikan konflik, jadi kalau pemakai mengoper "px-2", class itu benar-benar menimpa "px-4". Tanpa twMerge, kedua class ada sekaligus dan pemenangnya tergantung urutan di stylesheet.',
      },
    ],
    realCase: {
      title: 'Dashboard yang makin lambat setiap kali filter diganti',
      story: `**Situasi:** Dashboard analitik internal memakai library CSS-in-JS runtime dengan style yang diinterpolasi dari props (lebar kolom, warna heat-map per sel).

**Gejala:** Mengganti filter butuh 400 ms di laptop kelas menengah. Panel Performance menunjukkan long task yang didominasi serialisasi style dan pemanggilan \`insertRule\`, dan jumlah rule \`<style>\` terus bertambah.

**Akar masalah:** Setiap warna sel yang berbeda menghasilkan class baru. Ribuan rule unik dibuat dan disisipkan saat render.

**Perbaikan:** Tim memindahkan style statis ke CSS Modules dan mengoper nilai dinamis lewat custom property: \`style={{ '--heat': value }}\` dengan \`background: color-mix(in oklch, var(--hot) calc(var(--heat) * 100%), var(--cold))\`. Cukup satu rule, tanpa generate apa pun saat runtime.

**Pelajaran:** Nilai dinamis tempatnya di CSS variable, bukan di class yang di-generate. Memilih pendekatan zero-runtime menghilangkan satu kategori masalah performa sekaligus.`,
    },
    pitfalls: [
      'Menggabungkan class Tailwind tanpa tailwind-merge: "px-4 px-2" sama-sama berlaku dan pemenangnya ditentukan urutan CSS, bukan class mana yang kamu tulis terakhir.',
      'Menyusun nama class secara dinamis seperti `bg-${color}-500` di Tailwind: compiler tidak bisa melihatnya, jadi CSS-nya tidak pernah dihasilkan.',
      'Memilih CSS-in-JS runtime untuk aplikasi baru yang memakai Server Components: library ini butuh context di client dan tidak bisa men-style component yang dirender di server.',
      'Memakai CSS global untuk style component: selector saling bertabrakan seiring aplikasi membesar, dan tidak ada yang berani menghapus apa pun.',
    ],
    exercise: {
      task: 'Buat component `Badge` dengan variant `neutral | success | danger` dan ukuran `sm | md`, di-style dengan CSS Module. Variant dan ukuran harus dinyatakan sebagai data attribute, dan pemakai harus bisa mengoper `className`.',
      hint: 'Di CSS, pilih dengan `.badge[data-variant="success"]`. Spread sisa props ke span supaya atribut `aria-*` ikut diteruskan.',
      solution: `\`\`\`tsx
// Badge.module.css
// .badge { display:inline-flex; border-radius:999px; font-weight:600; }
// .badge[data-size='sm'] { padding:2px 8px; font-size:12px; }
// .badge[data-size='md'] { padding:4px 10px; font-size:14px; }
// .badge[data-variant='neutral'] { background:var(--color-muted); }
// .badge[data-variant='success'] { background:var(--color-success-bg); color:var(--color-success-fg); }
// .badge[data-variant='danger'] { background:var(--color-danger-bg); color:var(--color-danger-fg); }
import s from './Badge.module.css'

type BadgeProps = React.ComponentProps<'span'> & {
  variant?: 'neutral' | 'success' | 'danger'
  size?: 'sm' | 'md'
}

export function Badge({ variant = 'neutral', size = 'md', className, ...rest }: BadgeProps) {
  return <span {...rest} data-variant={variant} data-size={size} className={[s.badge, className].filter(Boolean).join(' ')} />
}
\`\`\``,
    },
    interview: [
      'Kenapa CSS-in-JS runtime mulai ditinggalkan, dan masalah apa yang muncul saat dipakai bersama Server Components dan concurrent rendering?',
      'Bagaimana Tailwind menjaga output CSS-nya tetap kecil, dan kenapa `bg-${color}-500` tidak jalan?',
      'Bagaimana kamu men-style progress bar yang lebarnya berubah 60 kali per detik tanpa menghasilkan rule CSS baru?',
    ],
  },

  tokens: {
    explanation: `Design token adalah **keputusan desain yang diberi nama** dalam sebuah design system: warna, langkah spacing, radius, ukuran font, shadow, durasi. Alih-alih menulis \`#2563eb\` atau \`12px\` di component, kamu menulis \`var(--color-accent)\` atau \`var(--space-3)\`. Token inilah kontrak antara tim desain dan kode.

### Tiga lapisan
Design system yang matang memisahkan token ke beberapa lapisan:
1. **Token primitif (reference)**: palet dan skala mentah, misalnya \`--blue-600\`, \`--gray-50\`, \`--space-4: 16px\`. Token ini menjelaskan *apa saja yang tersedia*.
2. **Token semantik (system)**: makna, misalnya \`--color-bg\`, \`--color-text\`, \`--color-accent\`, \`--color-danger\`, \`--color-border\`. Token ini menunjuk ke token primitif.
3. **Token component** (opsional): \`--button-bg\`, \`--input-border\`, menunjuk ke token semantik supaya satu component bisa di-tuning sendiri.

Component sebaiknya hanya memakai token semantik atau token component. Kalau sebuah tombol langsung merujuk \`--blue-600\`, dark mode tidak bisa mengubahnya tanpa menyentuh component itu.

### Kenapa CSS custom properties
Custom property di-resolve oleh browser saat menghitung computed style dan **diwariskan ke bawah pohon DOM**. Ini memberimu theming secara gratis: definisikan ulang token semantik di \`:root[data-theme="dark"]\` atau di subtree mana pun, dan semua elemen di bawahnya langsung memakai nilai baru tanpa re-render React. Mengganti tema cukup dengan mengubah satu atribut, jadi biayanya hanya satu kali kalkulasi ulang style, bukan re-render seluruh pohon component lewat context ThemeProvider.

### Dark mode yang benar
- Default-kan ke preferensi pengguna dengan \`@media (prefers-color-scheme: dark)\`.
- Izinkan override eksplisit lewat \`data-theme\` di \`<html>\`, disimpan di \`localStorage\`.
- Terapkan tema yang tersimpan **sebelum paint pertama** dengan inline script kecil di \`<head>\`, kalau tidak pengguna akan melihat kilatan tema yang salah.
- Set \`color-scheme: light dark\` supaya kontrol native dan scrollbar ikut menyesuaikan.
- Dark mode bukan sekadar light mode yang dibalik: kurangi saturasi, tunjukkan elevasi lewat permukaan yang lebih terang, dan cek ulang kontras (WCAG AA mensyaratkan 4.5:1 untuk teks body).

### Satu sumber kebenaran
Tim besar menyimpan token dalam JSON (sering memakai format W3C Design Tokens) lalu meng-generate CSS variable, tipe TypeScript, dan file untuk platform native dengan tool seperti Style Dictionary. Blok \`@theme\` di Tailwind v4 juga bisa jadi sumber kebenaran: token yang dideklarasikan di sana menjadi CSS variable sekaligus utility.

### Kapan tidak perlu dijadikan token
Tidak semua angka adalah keputusan desain. Geseran sekali pakai seperti \`translateY(1px)\` tidak butuh token. Jadikan token untuk nilai yang berulang atau yang mungkin diubah oleh tema.`,
    examples: [
      {
        title: '✅ Token berlapis dengan tema gelap',
        code: `/* tokens.css */
:root {
  /* primitives */
  --gray-0: #ffffff; --gray-900: #111827; --gray-200: #e5e7eb; --gray-700: #374151;
  --blue-600: #2563eb; --blue-400: #60a5fa;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --radius-md: 8px;

  /* semantic */
  --color-bg: var(--gray-0);
  --color-text: var(--gray-900);
  --color-border: var(--gray-200);
  --color-accent: var(--blue-600);
  color-scheme: light;
}

:root[data-theme='dark'] {
  --color-bg: var(--gray-900);
  --color-text: var(--gray-0);
  --color-border: var(--gray-700);
  --color-accent: var(--blue-400);
  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --color-bg: var(--gray-900);
    --color-text: var(--gray-0);
    --color-border: var(--gray-700);
    --color-accent: var(--blue-400);
    color-scheme: dark;
  }
}

body { background: var(--color-bg); color: var(--color-text); }`,
        note: 'Component tidak pernah melihat kode hex. Pergantian tema hanya mendefinisikan ulang token semantik; token primitif tetap sama. Media query menghormati preferensi OS kecuali pengguna secara eksplisit memilih light.',
      },
      {
        title: '❌ Tema di React context vs ✅ tema sebagai atribut',
        code: `// ❌ Every consumer re-renders when the theme flips, and colours live in JS
const ThemeCtx = createContext(lightTheme)
function Card() {
  const t = use(ThemeCtx)
  return <div style={{ background: t.surface, color: t.text }} />
}

// ✅ React only toggles one attribute; CSS does the rest
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark' | null) ?? 'system',
  )
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])
  return [theme, setTheme] as const
}

// index.html, before any CSS-dependent paint:
// <script>try{const t=localStorage.getItem('theme');if(t&&t!=='system')document.documentElement.dataset.theme=t}catch{}</script>`,
        note: 'Inline script mencegah kilatan tema yang salah. Mengganti atribut memicu kalkulasi ulang style, tapi tidak ada satu pun component yang re-render.',
      },
    ],
    realCase: {
      title: 'Dark mode yang makan tiga sprint, padahal harusnya tiga hari',
      story: `**Situasi:** Sebuah tim SaaS diminta merilis dark mode. Component mereka memakai file palet warna secara langsung: \`colors.blue600\`, \`colors.gray100\`.

**Gejala:** Ke-140 component harus diedit manual satu per satu, dan reviewer terus menemukan teks abu-abu muda di atas putih di layar-layar yang jarang dibuka.

**Akar masalah:** Tidak ada lapisan semantik. Component menyimpan *warna apa* alih-alih *perannya apa* (background, border, teks redup).

**Perbaikan:** Mereka memperkenalkan token semantik, menulis codemod yang memetakan primitif yang paling sering dipakai ke perannya, dan menambahkan aturan lint (stylelint \`declaration-property-value-disallowed-list\`) yang melarang nilai hex mentah di CSS component. Visual regression di Storybook untuk kedua tema menangkap sisa masalah kontras.

**Pelajaran:** Lapisan token semantik itulah yang membuat theming jadi murah. Tambahkan sebelum kamu butuh tema kedua.`,
    },
    pitfalls: [
      'Component merujuk token primitif (`--blue-600`), bukan token semantik (`--color-accent`), sehingga tema tidak bisa mengubahnya.',
      'Menerapkan tema tersimpan hanya di useEffect: pengguna melihat kilatan tema terang setiap kali halaman dimuat.',
      'Lupa `color-scheme`, sehingga scrollbar dan kontrol form tetap putih di dark mode.',
      'Membalik warna secara mekanis untuk dark mode tanpa mengecek ulang rasio kontras WCAG.',
      'Menyimpan warna tema di React context dan me-re-render seluruh pohon saat tema diganti.',
    ],
    exercise: {
      task: 'Buat file token berisi token primitif dan token semantik untuk bg, surface, text, text-muted, border, dan accent. Tambahkan ThemeToggle dengan tiga opsi (System, Light, Dark) yang menyimpan pilihan dan menghindari kilatan tema saat reload.',
      hint: 'System berarti menghapus atribut supaya media query yang memutuskan. Inline script harus jalan sebelum paint pertama yang bergantung pada stylesheet.',
      solution: `\`\`\`tsx
export function ThemeToggle() {
  const [theme, setTheme] = useTheme() // from the example above
  return (
    <fieldset>
      <legend>Theme</legend>
      {(['system', 'light', 'dark'] as const).map(t => (
        <label key={t}>
          <input type="radio" name="theme" value={t} checked={theme === t} onChange={() => setTheme(t)} />
          {t[0].toUpperCase() + t.slice(1)}
        </label>
      ))}
    </fieldset>
  )
}
\`\`\`

Radio group adalah kontrol yang semantiknya tepat di sini: satu pilihan dari beberapa opsi, tombol panah berpindah antar-opsi, dan legend memberi nama yang aksesibel untuk grupnya. Uji kilatan tema dengan memilih Dark, reload dengan CPU throttling, lalu perhatikan frame pertama di panel Performance.`,
    },
    interview: [
      'Apa beda token primitif dan token semantik, dan kenapa component sebaiknya hanya memakai token semantik?',
      'Kenapa theming dengan CSS custom properties lebih murah dibanding theming lewat React context?',
      'Bagaimana cara mencegah kilatan tema yang salah saat halaman dimuat?',
    ],
  },

  'api-design': {
    explanation: `Props sebuah component adalah API publik. API yang baik itu **kecil, mudah ditebak, dan sulit disalahgunakan**. Ujiannya sederhana: bisakah rekan kerjamu memakainya dengan benar tanpa membaca source-nya, dan bisakah mereka menangani kasus yang tidak kamu antisipasi tanpa harus mem-fork-nya?

### Komposisi, bukan konfigurasi
Component "konfigurasi" menambah satu prop untuk setiap variasi: \`title\`, \`subtitle\`, \`icon\`, \`iconPosition\`, \`showClose\`, \`footerButtons\`... Setiap kebutuhan baru menambah satu prop dan satu cabang logika lagi. Component yang dikomposisi menerima \`children\` dan blok-blok kecil, sehingga layout baru tidak butuh prop baru. Patokan praktisnya: kalau kamu menambah prop bertipe string hanya untuk dirender di suatu tempat, pertimbangkan slot (\`children\` atau prop elemen bernama) sebagai gantinya.

### Compound component
Beberapa widget punya bagian-bagian yang harus bekerja sama: Tabs punya list, trigger, dan panel. Compound component mengekspos bagian-bagian itu (\`Tabs.List\`, \`Tabs.Trigger\`, \`Tabs.Panel\`) dan berbagi state lewat context yang dibuat oleh root-nya. Pemakai mengatur struktur dan markup; root mengatur perilaku dan pengkabelan ARIA (id, \`aria-controls\`, \`aria-selected\`). Lempar error yang jelas kalau sebuah bagian dipakai di luar root-nya.

### Controlled dan uncontrolled
Dukung keduanya, seperti input native:
- **Uncontrolled**: \`defaultValue\`, component memegang state-nya sendiri. Gampang langsung dipakai.
- **Controlled**: \`value\` + \`onValueChange\`, parent yang memegang state. Dibutuhkan untuk sinkronisasi ke URL atau validasi.
Hook kecil \`useControllableState\` menentukan mode mana yang berlaku berdasarkan apakah \`value\` bernilai \`undefined\`. Jangan pernah berganti mode selama component masih hidup.

### Polimorfisme
Kadang Button harus dirender sebagai link. Ada dua pola:
- Prop \`as\`: \`<Button as="a" href="/x">\`. Sederhana, tapi sulit diberi tipe yang bagus.
- \`asChild\` (gaya Radix): \`<Button asChild><Link to="/x" /></Button>\` menggabungkan props dan class milik button ke satu-satunya child. Tipenya lebih baik dan bisa dipakai dengan link dari router.

### Ref di React 19
\`ref\` sekarang adalah prop biasa untuk function component, jadi \`forwardRef\` tidak diperlukan lagi. Beri tipe dengan \`React.ComponentProps<'button'>\`, yang sudah mencakup \`ref\`, lalu spread ke node DOM. Ref callback juga boleh mengembalikan fungsi cleanup.

### Konvensi lain
- Spread sisa props (\`...rest\`) ke elemen root supaya \`aria-*\`, \`data-*\`, dan event handler berfungsi.
- Gabungkan \`className\`, jangan menimpanya.
- Beri nama callback \`onXChange\` dan boolean sebagai kata sifat (\`disabled\`, \`open\`).
- Utamakan union (\`variant: 'primary' | 'ghost'\`) dibanding beberapa boolean yang saling eksklusif.`,
    examples: [
      {
        title: '✅ Compound Tabs yang aksesibel dengan dukungan controlled/uncontrolled',
        code: `import { createContext, use, useId, useRef, useState } from 'react'

type TabsCtx = { value: string; setValue: (v: string) => void; baseId: string }
const Ctx = createContext<TabsCtx | null>(null)
const useTabs = () => {
  const c = use(Ctx)
  if (!c) throw new Error('Tabs.* must be used inside <Tabs>')
  return c
}

function useControllableState<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [inner, setInner] = useState(defaultValue)
  const isControlled = value !== undefined
  const current = isControlled ? value : inner
  const set = (v: T) => {
    if (!isControlled) setInner(v)
    onChange?.(v)
  }
  return [current, set] as const
}

type TabsProps = {
  value?: string
  defaultValue: string
  onValueChange?: (v: string) => void
  children: React.ReactNode
}

export function Tabs({ value, defaultValue, onValueChange, children }: TabsProps) {
  const [current, setValue] = useControllableState(value, defaultValue, onValueChange)
  const baseId = useId()
  return <Ctx value={{ value: current, setValue, baseId }}>{children}</Ctx>
}

function List({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const onKeyDown = (e: React.KeyboardEvent) => {
    const tabs = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role=tab]') ?? [])]
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement)
    const next =
      e.key === 'ArrowRight' ? tabs[(i + 1) % tabs.length]
      : e.key === 'ArrowLeft' ? tabs[(i - 1 + tabs.length) % tabs.length]
      : e.key === 'Home' ? tabs[0]
      : e.key === 'End' ? tabs[tabs.length - 1]
      : null
    if (next) { e.preventDefault(); next.focus(); next.click() }
  }
  return <div ref={ref} role="tablist" aria-label={label} onKeyDown={onKeyDown}>{children}</div>
}

function Trigger({ value, children }: { value: string; children: React.ReactNode }) {
  const { value: active, setValue, baseId } = useTabs()
  const selected = active === value
  return (
    <button
      role="tab"
      id={\`\${baseId}-tab-\${value}\`}
      aria-selected={selected}
      aria-controls={\`\${baseId}-panel-\${value}\`}
      tabIndex={selected ? 0 : -1}
      onClick={() => setValue(value)}
    >
      {children}
    </button>
  )
}

function Panel({ value, children }: { value: string; children: React.ReactNode }) {
  const { value: active, baseId } = useTabs()
  return (
    <div
      role="tabpanel"
      id={\`\${baseId}-panel-\${value}\`}
      aria-labelledby={\`\${baseId}-tab-\${value}\`}
      hidden={active !== value}
      tabIndex={0}
    >
      {children}
    </div>
  )
}

Tabs.List = List
Tabs.Trigger = Trigger
Tabs.Panel = Panel`,
        note: 'Roving tabindex (hanya tab yang terpilih yang masuk urutan Tab), tombol panah/Home/End, dan pengkabelan id mengikuti pola Tabs dari APG. Context disediakan dengan <Ctx value> (sintaks React 19). Pemakai menentukan markup dan urutannya; root memegang perilaku.',
      },
      {
        title: '❌ forwardRef + ledakan prop vs ✅ prop ref React 19 + komposisi',
        code: `// ❌
const Card = forwardRef<HTMLDivElement, {
  title: string; subtitle?: string; icon?: string; showFooter?: boolean; footerText?: string
}>((props, ref) => { /* ...branches for every prop... */ })

// ✅
export function Card({ className, ...rest }: React.ComponentProps<'div'>) {
  return <div {...rest} className={['card', className].filter(Boolean).join(' ')} />
}
export const CardHeader = (p: React.ComponentProps<'header'>) => <header className="card-header" {...p} />
export const CardFooter = (p: React.ComponentProps<'footer'>) => <footer className="card-footer" {...p} />

// usage: ref is just a prop
<Card ref={cardRef} aria-labelledby="plan-title">
  <CardHeader><h3 id="plan-title">Pro plan</h3></CardHeader>
  <p>Unlimited projects</p>
  <CardFooter><Button>Upgrade</Button></CardFooter>
</Card>`,
        note: 'Di React 19, ComponentProps<"div"> sudah mencakup ref, jadi spread rest otomatis meneruskannya. Layout baru tidak butuh prop baru.',
      },
    ],
    realCase: {
      title: 'Modal dengan 34 props',
      story: `**Situasi:** Modal di design system sebuah retailer skala menengah sudah membengkak sampai 34 props (\`hideHeader\`, \`headerAlign\`, \`secondaryButtonVariant\`, \`footerLeftContent\`...).

**Gejala:** Setiap permintaan dari tim produk berubah jadi PR ke design system. Tim-tim mulai menyalin source Modal ke folder masing-masing, sehingga perbaikan bug (termasuk perbaikan pengembalian focus) tidak pernah sampai ke mereka.

**Akar masalah:** API bergaya konfigurasi. Component-nya mencoba menebak semua kemungkinan layout.

**Perbaikan:** Component dibangun ulang sebagai compound component: \`Dialog\`, \`Dialog.Trigger\`, \`Dialog.Content\`, \`Dialog.Title\`, \`Dialog.Description\`, \`Dialog.Close\`. Perilaku (focus trap, Escape, pengkabelan aria) tetap di root; layout pindah ke pemakai. API lama dipertahankan sebagai wrapper tipis di atas bagian-bagian baru selama satu release, lengkap dengan peringatan deprecation.

**Pelajaran:** Kalau component-mu terus-terusan ditambahi prop layout, artinya ia minta dikomposisi. Memegang perilaku dan menyerahkan struktur ke pemakai itulah yang bisa diskalakan lintas tim.`,
    },
    pitfalls: [
      'Berganti antara controlled dan uncontrolled selama component hidup (value berubah dari undefined menjadi string): state jadi tidak konsisten dan React memberi peringatan.',
      'Tidak men-spread sisa props, sehingga pemakai tidak bisa menambahkan aria-label, data-testid, atau onFocus.',
      'Menimpa className alih-alih menggabungkannya.',
      'Masih membungkus component baru dengan forwardRef di React 19: noise yang tidak perlu, ref sekarang sudah jadi prop.',
      'Bagian compound diam saja tanpa berbuat apa-apa saat dipakai di luar root-nya, bukannya melempar error yang jelas.',
    ],
    exercise: {
      task: 'Tulis compound component `Accordion` (Accordion, Accordion.Item, Accordion.Trigger, Accordion.Content) yang mendukung `type="single" | "multiple"`, serta pemakaian controlled (`value`, `onValueChange`) maupun uncontrolled (`defaultValue`).',
      hint: 'Simpan array berisi value item yang terbuka di semua kasus. Setiap Item menyediakan value-nya sendiri lewat context bersarang supaya Trigger dan Content tahu mereka milik item yang mana. Trigger adalah button dengan aria-expanded dan aria-controls.',
      solution: `\`\`\`tsx
type Ctx = { open: string[]; toggle: (v: string) => void; id: string }
const AccCtx = createContext<Ctx | null>(null)
const ItemCtx = createContext<string | null>(null)

export function Accordion({ type = 'single', value, defaultValue = [], onValueChange, children }: {
  type?: 'single' | 'multiple'; value?: string[]; defaultValue?: string[]
  onValueChange?: (v: string[]) => void; children: React.ReactNode
}) {
  const [open, setOpen] = useControllableState(value, defaultValue, onValueChange)
  const id = useId()
  const toggle = (v: string) => {
    const isOpen = open.includes(v)
    if (type === 'single') setOpen(isOpen ? [] : [v])
    else setOpen(isOpen ? open.filter(x => x !== v) : [...open, v])
  }
  return <AccCtx value={{ open, toggle, id }}>{children}</AccCtx>
}

function Item({ value, children }: { value: string; children: React.ReactNode }) {
  return <ItemCtx value={value}><div>{children}</div></ItemCtx>
}

function Trigger({ children }: { children: React.ReactNode }) {
  const acc = use(AccCtx)!; const v = use(ItemCtx)!
  const expanded = acc.open.includes(v)
  return (
    <h3>
      <button id={\`\${acc.id}-t-\${v}\`} aria-expanded={expanded} aria-controls={\`\${acc.id}-c-\${v}\`} onClick={() => acc.toggle(v)}>
        {children}
      </button>
    </h3>
  )
}

function Content({ children }: { children: React.ReactNode }) {
  const acc = use(AccCtx)!; const v = use(ItemCtx)!
  return (
    <div role="region" id={\`\${acc.id}-c-\${v}\`} aria-labelledby={\`\${acc.id}-t-\${v}\`} hidden={!acc.open.includes(v)}>
      {children}
    </div>
  )
}
Accordion.Item = Item; Accordion.Trigger = Trigger; Accordion.Content = Content
\`\`\``,
    },
    interview: [
      'Kapan kamu memilih compound component dibanding satu component dengan banyak props? Apa trade-off-nya?',
      'Bagaimana cara mengimplementasikan component yang mendukung pemakaian controlled sekaligus uncontrolled?',
      'Bandingkan prop `as` dan pola `asChild` untuk component polimorfik.',
    ],
  },

  headless: {
    explanation: `Library component headless menyediakan **perilaku dan aksesibilitas tanpa styling visual**. Kamu mendapat state management, interaksi keyboard, manajemen focus, atribut ARIA, positioning yang sadar tabrakan (collision-aware), dan pengumuman untuk screen reader; kamu sendiri yang membawa class markup dan desainnya.

### Kenapa pemisahan ini ada
Bagian tersulit dari Menu, Combobox, atau Dialog bukan tampilannya, melainkan semua hal lainnya: typeahead di menu, focus yang kembali ke trigger, Escape yang hanya menutup lapisan paling atas, scroll locking, portal, klik di luar, \`aria-activedescendant\` di combobox, dukungan RTL, perbedaan touch vs pointer, dan puluhan keanehan screen reader. Tim yang membangun semua ini dari nol biasanya benar di jalur normal tapi gagal di deretan edge case-nya. Library headless sudah menyimpan perbaikan bertahun-tahun, sambil tetap membebaskan brand kamu.

### Opsi utama
- **Radix UI Primitives**: compound component tanpa style (\`Dialog.Root\`, \`Dialog.Trigger\`, \`Dialog.Content\`...). Memakai \`asChild\` untuk polimorfisme dan atribut \`data-state="open"\` sebagai pengait styling.
- **React Aria (Adobe)**: tersedia sebagai hook (\`useButton\`, \`useComboBox\`) dan sebagai React Aria Components. Internasionalisasi dan aksesibilitasnya sangat menyeluruh, unggul untuk widget kompleks seperti date picker dan grid.
- **Headless UI** (Tailwind Labs), **Ariakit**, dan **Base UI** juga pilihan yang solid.
- **shadcn/ui** sama sekali bukan dependency: CLI-nya menyalin component berbasis Radix yang sudah di-style (class Tailwind) ke repository kamu. Kodenya milikmu dan bisa kamu edit; untuk mengambil perbaikan dari upstream, kamu jalankan ulang CLI-nya atau membandingkan diff.

### Cara memakainya dengan baik
- Lakukan styling lewat atribut state yang disediakan library (\`[data-state=open]\`, \`[data-highlighted]\`, \`[data-disabled]\`), jangan menduplikasi state di React.
- Bungkus primitive sekali saja di design system kamu (\`<Select>\` = Radix Select + token kamu), lalu ekspos API kecil versimu sendiri. Kode produk sebaiknya tidak meng-import library headless secara langsung; dengan begitu migrasi tetap memungkinkan.
- Jaga aksesibilitas bawaannya: jangan hapus title dari dialog, jangan ganti trigger-nya dengan \`div\`.

### Kapan tidak perlu
- Component sederhana (Button, Card, Badge) tidak butuh library; HTML native sudah menyediakan perilakunya.
- Kalau kamu butuh model interaksi yang sangat tidak biasa, library level hook (React Aria hooks) memberi kontrol lebih besar dibanding component siap pakai.
- Halaman yang sensitif terhadap ukuran bundle: cek biaya per primitive; kebanyakan bisa di-tree-shake, tapi masing-masing tetap menambah beberapa kilobyte.

Membangun satu Dialog dan satu Menu sendiri (seperti yang diminta proyek level ini) adalah cara terbaik untuk menghargai apa yang dikerjakan library-library ini. Setelah itu, bandingkan dengan Radix dan catat semua yang terlewat olehmu.`,
    examples: [
      {
        title: '✅ Membungkus Radix Dialog sebagai component design system',
        code: `import * as RD from '@radix-ui/react-dialog'
import styles from './Dialog.module.css'

export const Dialog = RD.Root
export const DialogTrigger = RD.Trigger
export const DialogClose = RD.Close

export function DialogContent({
  title,
  description,
  children,
}: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <RD.Portal>
      <RD.Overlay className={styles.overlay} />
      <RD.Content className={styles.content}>
        <RD.Title className={styles.title}>{title}</RD.Title>
        {description && <RD.Description className={styles.desc}>{description}</RD.Description>}
        {children}
        <RD.Close className={styles.close} aria-label="Close">×</RD.Close>
      </RD.Content>
    </RD.Portal>
  )
}

/* Dialog.module.css
.overlay[data-state='open'] { animation: fade-in 150ms ease-out; }
.content[data-state='open'] { animation: pop-in 150ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .overlay, .content { animation: none !important; }
}
*/`,
        note: 'Menjadikan title sebagai prop wajib menjamin setiap dialog punya nama yang aksesibel. Styling memakai atribut data-state yang di-set Radix, jadi tidak ada state React yang diduplikasi.',
      },
      {
        title: '✅ ComboBox dari React Aria Components',
        code: `import { ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem } from 'react-aria-components'

export function CountryPicker({ countries }: { countries: { id: string; name: string }[] }) {
  return (
    <ComboBox defaultItems={countries} className="combo">
      <Label>Country</Label>
      <div className="combo-field">
        <Input />
        <Button aria-label="Show suggestions">▾</Button>
      </div>
      <Popover>
        <ListBox>
          {item => <ListBoxItem id={item.id}>{item.name}</ListBoxItem>}
        </ListBox>
      </Popover>
    </ComboBox>
  )
}`,
        note: 'Filtering, pengelolaan aria-activedescendant, pengumuman jumlah hasil, dan perilaku di mobile sudah ditangani library; kamu tinggal men-style-nya.',
      },
    ],
    realCase: {
      title: 'Select buatan sendiri yang gagal audit aksesibilitas',
      story: `**Situasi:** Sebuah tim fintech membuat Select custom dari \`div\` supaya sesuai brand. Tampilannya sempurna.

**Gejala:** Audit aksesibilitas eksternal sebelum kontrak dengan sektor publik menandainya sebagai pemblokir: tidak ada dukungan keyboard selain Tab, screen reader hanya mengumumkan "clickable" tanpa nama atau nilai, dan popup-nya terpotong di dalam modal yang bisa di-scroll.

**Akar masalah:** Tim hanya mengimplementasikan ulang lapisan visualnya, tapi tidak dengan perilaku listbox, role ARIA, typeahead, maupun positioning lewat portal.

**Perbaikan:** Mereka mengganti isi dalamnya dengan Radix Select yang dibungkus component \`<Select>\` milik mereka sendiri, dengan props publik yang tetap sama. Desain visualnya tidak berubah sedikit pun; temuan audit itu ditutup dalam seminggu.

**Pelajaran:** Tampilan milikmu sendiri, perilaku boleh pinjam. API wrapper yang stabil membuat pergantian ini tidak terasa sama sekali oleh tim produk.`,
    },
    pitfalls: [
      'Meng-import library headless langsung di seluruh kode produk, sehingga migrasi di masa depan jadi refactor besar-besaran.',
      'Merusak aksesibilitas bawaan dengan mengoper elemen yang tidak bisa di-focus ke asChild, atau dengan menghilangkan Title pada Dialog.',
      'Menduplikasi state open/selected di React hanya untuk styling, bukannya memakai atribut data-state.',
      'Menganggap shadcn/ui sebagai library yang memperbarui dirinya sendiri: kodenya milikmu, termasuk bug-bugnya.',
    ],
    exercise: {
      task: 'Bungkus Radix DropdownMenu menjadi `Menu` design system dengan bagian `Menu`, `Menu.Trigger`, `Menu.Content`, dan `Menu.Item`. Item harus mendukung variant `destructive` dan state disabled, di-style hanya lewat data attribute.',
      hint: 'Radix men-set data-highlighted dan data-disabled pada item. Tambahkan atribut data-variant milikmu sendiri untuk destructive.',
      solution: `\`\`\`tsx
import * as DM from '@radix-ui/react-dropdown-menu'
import s from './Menu.module.css'

export function Menu(props: DM.DropdownMenuProps) { return <DM.Root {...props} /> }
Menu.Trigger = DM.Trigger
Menu.Content = function Content(p: DM.DropdownMenuContentProps) {
  return <DM.Portal><DM.Content sideOffset={4} className={s.content} {...p} /></DM.Portal>
}
Menu.Item = function Item({ destructive, ...p }: DM.DropdownMenuItemProps & { destructive?: boolean }) {
  return <DM.Item className={s.item} data-variant={destructive ? 'destructive' : undefined} {...p} />
}
/* .item[data-highlighted] { background: var(--color-muted); }
   .item[data-disabled] { opacity: .5; pointer-events: none; }
   .item[data-variant='destructive'] { color: var(--color-danger-fg); } */
\`\`\``,
    },
    interview: [
      'Apa yang kamu dapat dari library component headless, dan apa yang sengaja tidak disediakannya?',
      'Apa bedanya shadcn/ui dengan library component npm biasa, dan apa konsekuensinya untuk maintenance?',
      'Kenapa library headless sebaiknya dibungkus dengan component sendiri, bukan dipakai langsung?',
    ],
  },

  a11y: {
    explanation: `Aksesibilitas berarti orang yang memakai keyboard, screen reader, kontrol suara, pembesar layar, atau switch device tetap bisa memahami dan mengoperasikan UI kamu. Di aplikasi React, sebagian besar kegagalan berasal dari **widget custom yang dibangun dari div** dan dari **manajemen focus** setelah perubahan dinamis.

### Accessibility tree
Browser membangun accessibility tree berdampingan dengan DOM. Setiap node punya **role** (button, link, dialog), **name** (apa yang diucapkan screen reader), **state** (expanded, checked, selected), dan **value**. Teknologi asistif hanya melihat pohon ini. \`<div onClick>\` tidak punya role, tidak punya name yang berguna dari isinya, tidak bisa di-focus, dan tidak merespons Enter atau Space. \`<button>\` mendapat semua itu secara gratis.

### Aturan berdasarkan prioritas
1. **HTML semantik dulu**: \`button\`, \`a href\`, \`label\` + \`input\`, \`fieldset\`/\`legend\`, \`nav\`, \`main\`, heading yang berurutan, \`dialog\`, \`details\`.
2. **ARIA hanya jika tidak ada elemen native yang cocok**, dan saat itu ikuti pola WAI-ARIA Authoring Practices (APG) persis. ARIA mengubah apa yang diumumkan, bukan perilaku: \`role="button"\` tidak menambahkan penanganan keyboard.
3. **Keyboard**: semuanya bisa dioperasikan dengan Tab, Shift+Tab, Enter, Space, Escape, dan tombol panah bila polanya menyebutkan begitu. Widget komposit (tabs, menu, listbox, grid) memakai **satu Tab stop** dan tombol panah di dalamnya (roving tabindex atau \`aria-activedescendant\`).
4. **Focus yang terlihat**: jangan pernah \`outline: none\` tanpa pengganti. Pakai \`:focus-visible\` supaya pengguna mouse tidak melihat ring, tapi pengguna keyboard tetap melihatnya.
5. **Nama yang aksesibel**: setiap kontrol butuh nama. Label yang terlihat lebih diutamakan; kalau tidak ada, pakai \`aria-label\` atau \`aria-labelledby\`. Tombol ikon adalah pelanggar yang paling sering.

### Manajemen focus di SPA
- **Dialog**: pindahkan focus ke dalam saat dibuka (field pertama atau dialog itu sendiri), kurung Tab di dalamnya, tutup dengan Escape, buat background inert, dan **kembalikan focus ke trigger** saat ditutup. Elemen native \`<dialog>\` dengan \`showModal()\` memberimu top layer, background inert, dan penanganan Escape.
- **Pergantian route**: pindahkan focus ke \`h1\` halaman baru atau umumkan judulnya, kalau tidak pengguna screen reader tidak tahu halamannya sudah berganti.
- **Menghapus item**: pindahkan focus ke item tetangga yang masuk akal, bukan ke \`body\`.
- **Hasil async**: umumkan lewat live region (\`role="status"\` atau \`aria-live="polite"\`) yang sudah ada di DOM sebelum isinya berubah.

### Testing
Tool otomatis (axe di Storybook, jest-axe, @axe-core/playwright) menangkap kira-kira sepertiga masalah: nama yang hilang, kontras, ARIA yang tidak valid. Sisanya harus dicek manual: cabut mouse dan selesaikan setiap alur, lalu pakai screen reader (NVDA + Firefox atau Chrome di Windows, VoiceOver di macOS). Query berbasis role di Testing Library mendorong markup yang aksesibel, karena test akan gagal kalau nama elemennya hilang.`,
    examples: [
      {
        title: '❌ Dialog dari div vs ✅ dialog native dengan pengembalian focus',
        code: `// ❌ No role, no focus move, no Escape, background still tabbable
{open && (
  <div className="modal">
    <div className="x" onClick={close}>×</div>
    <h2>Confirm payment</h2>
  </div>
)}

// ✅
import { useEffect, useRef } from 'react'

export function ConfirmDialog({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (open && !dlg.open) {
      returnFocus.current = document.activeElement as HTMLElement
      dlg.showModal() // top layer, inert background, Escape fires 'cancel'
    } else if (!open && dlg.open) {
      dlg.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onClose={() => { onClose(); returnFocus.current?.focus() }}
    >
      <h2 id="confirm-title">{title}</h2>
      {children}
      <button type="button" onClick={() => ref.current?.close()} aria-label="Close dialog">×</button>
    </dialog>
  )
}`,
        note: 'showModal() membuat seluruh halaman lain jadi inert dan menangani Escape. Handler onClose mencakup semua jalur penutupan (tombol, Escape, form method="dialog") dan mengembalikan focus ke trigger. Pakai useId untuk id judul kalau bisa ada beberapa dialog sekaligus.',
      },
      {
        title: '✅ Tombol ikon, focus-visible, dan live region',
        code: `<button type="button" aria-label="Remove Blue T-shirt from cart" onClick={() => remove(item.id)}>
  <TrashIcon aria-hidden="true" />
</button>

/* .btn:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; } */

// Rendered once, always in the DOM; only its text changes
<p role="status" className="sr-only">{statusMessage}</p>
// setStatusMessage('Blue T-shirt removed. Cart has 2 items.')`,
        note: 'Nama tombol menyertakan nama item, jadi daftar tombol "Remove" yang identik tetap bisa dibedakan. Live region harus sudah ada sebelum pesannya berubah, kalau tidak screen reader tidak akan mengumumkannya.',
      },
    ],
    realCase: {
      title: 'Dialog checkout yang gagal audit aksesibilitas',
      story: `**Situasi:** Checkout sebuah perusahaan e-commerce memakai dialog alamat custom. Audit WCAG 2.2 AA yang diwajibkan proses pengadaan harus lulus sebelum seorang pelanggan B2B besar mau tanda tangan kontrak.

**Gejala:** Auditor melaporkan: focus tetap di halaman di belakang dialog, Tab berpindah ke konten halaman yang tersembunyi, ikon tutup tidak punya nama yang aksesibel, dan setelah alamat disimpan focus melompat ke awal dokumen, sehingga pengguna NVDA harus menelusuri seluruh halaman dari awal lagi.

**Akar masalah:** Dialog-nya adalah \`div\` ber-posisi yang dirender lewat portal; tidak ada yang pernah mengujinya dengan keyboard.

**Perbaikan:** Mereka beralih ke elemen native \`dialog\` dengan \`showModal()\`, menambahkan \`aria-labelledby\`, mengembalikan focus ke tombol "Change address" saat ditutup, dan menambahkan pesan \`role="status"\` "Address updated". Sekarang ada test Playwright yang membuka dialog, menekan Tab sampai berputar, menekan Escape, lalu memastikan focus kembali ke trigger; axe dijalankan pada state terbuka.

**Pelajaran:** Manajemen focus adalah bagian dari kontrak sebuah dialog. Tuangkan ke dalam test supaya tidak pernah mundur lagi.`,
    },
    pitfalls: [
      'Menambahkan role="button" ke div lalu menganggapnya sudah aksesibel: elemen itu tetap tidak bisa di-focus dan tidak merespons Enter atau Space.',
      'Menghapus outline focus secara global dengan outline: none tanpa pengganti :focus-visible.',
      'Memakai aria-label pada elemen non-interaktif seperti div atau span tanpa role: banyak screen reader mengabaikannya.',
      'Me-mount live region bersamaan dengan pesannya: perubahannya tidak diumumkan.',
      'Hanya mengandalkan pengecekan otomatis axe, yang melewatkan sebagian besar masalah keyboard dan urutan focus.',
    ],
    exercise: {
      task: 'Buat `DisclosureMenu` untuk navigasi situs: tombol yang membuka-tutup daftar link. Component ini harus mengekspos state expanded, tertutup saat Escape dan mengembalikan focus ke tombol, serta tertutup saat focus keluar dari menu.',
      hint: 'Menu navigasi berisi link sebaiknya memakai pola disclosure (button + aria-expanded + aria-controls), bukan role="menu". Pakai onBlur di wrapper dan cek e.relatedTarget.',
      solution: `\`\`\`tsx
export function DisclosureMenu({ label, links }: { label: string; links: { href: string; text: string }[] }) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const id = useId()
  return (
    <div
      onKeyDown={e => { if (e.key === 'Escape' && open) { setOpen(false); btn.current?.focus() } }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false) }}
    >
      <button ref={btn} aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
        {label}
      </button>
      <ul id={id} hidden={!open}>
        {links.map(l => <li key={l.href}><a href={l.href}>{l.text}</a></li>)}
      </ul>
    </div>
  )
}
\`\`\`
Memakai role="menu" di sini justru salah: role itu memberi tahu screen reader untuk mengharapkan navigasi tombol panah ala aplikasi desktop, padahal pengguna navigasi situs tidak mengharapkan itu.`,
    },
    interview: [
      'Kenapa "tanpa ARIA lebih baik daripada ARIA yang buruk"? Beri contoh ketika menambahkan ARIA justru memperburuk keadaan.',
      'Jelaskan semua hal yang harus dilakukan sebuah modal dialog untuk pengguna keyboard dan screen reader.',
      'Apa itu roving tabindex, dan kapan kamu memakai aria-activedescendant sebagai gantinya?',
    ],
  },

  animation: {
    explanation: `Animasi yang baik menjelaskan perubahan: dari mana sebuah panel muncul, item mana yang dihapus, apa yang sedang dimuat. Animasi yang buruk memperlambat pengguna dan bahkan bisa membuat sebagian orang mual secara fisik. Sisi engineering-nya adalah soal **apa yang bisa dianimasikan browser dengan murah** dan **tool mana yang cocok untuk pekerjaan apa**.

### Model biaya rendering
Mengubah sebuah properti CSS bisa memicu hingga tiga tahap: **layout** (geometri), **paint** (piksel), dan **composite** (layer digabungkan di GPU). Menganimasikan \`width\`, \`height\`, \`top\`, atau \`margin\` memaksa layout di setiap frame dan rawan frame drop. Menganimasikan \`transform\` dan \`opacity\` biasanya hanya butuh compositing dan bisa berjalan di luar main thread, jadi tetap mulus meskipun JavaScript sedang sibuk. Utamakan keduanya, dan pakai \`will-change\` secukupnya untuk elemen yang akan dianimasikan.

### Memilih tool
- **CSS transition**: dari state A ke state B, dipicu oleh perubahan class atau atribut. Hover, focus, buka/tutup. Paling murah dan paling tangguh. CSS modern menambahkan \`@starting-style\` untuk transisi saat elemen masuk dan \`transition-behavior: allow-discrete\` untuk menganimasikan \`display\` dan top layer.
- **CSS keyframes**: efek berulang atau bertahap (spinner, shimmer pada skeleton).
- **Web Animations API** (\`element.animate()\`): kontrol imperatif, tetap ramah compositor.
- **Motion** (dulu Framer Motion): deklaratif \`<motion.div animate>\`, fisika spring, gesture, **animasi exit** lewat \`AnimatePresence\` (normalnya React langsung menghapus elemen), dan **animasi layout** (prop \`layout\`) yang memakai teknik FLIP untuk menganimasikan perubahan posisi dan ukuran dengan transform.
- **View Transitions API**: \`document.startViewTransition(() => update())\` mengambil snapshot state lama dan baru, lalu melakukan cross-fade atau morph di antaranya. Sangat cocok untuk pergantian route dan pengurutan ulang list. React punya component eksperimental \`<ViewTransition>\`; router seperti React Router menyediakan opsi \`viewTransition\`.

### FLIP dalam satu paragraf
First: ukur posisi lama elemen. Last: terapkan perubahan dan ukur posisi barunya. Invert: terapkan transform supaya elemen terlihat seolah masih di posisi lama. Play: animasikan transform kembali ke nol. Perubahan layout pun berubah jadi animasi transform yang murah. Prop \`layout\` milik Motion melakukan ini untukmu.

### Reduced motion
Sebagian pengguna punya gangguan vestibular; gerakan besar, parallax, dan zoom bisa memicu mual. Hormati \`prefers-reduced-motion: reduce\`: ganti gerakan dengan fade atau hilangkan gerakannya, tapi jangan pernah menghilangkan informasinya. Di Motion, pakai \`useReducedMotion()\` atau \`<MotionConfig reducedMotion="user">\`.

### Pedoman
- Feedback UI: 100–200 ms; transisi yang lebih besar: 200–400 ms. Ease-out untuk elemen yang masuk, ease-in untuk yang keluar.
- Jangan pernah memblokir interaksi sampai animasi selesai.
- Animasi tidak boleh menyebabkan layout shift (CLS) atau menunda konten (LCP).`,
    examples: [
      {
        title: '❌ Menganimasikan height/left vs ✅ transform + reduced motion',
        code: `/* ❌ Layout every frame */
.drawer { left: -320px; transition: left 300ms; }
.drawer[data-open='true'] { left: 0; }

/* ✅ Compositor-only */
.drawer {
  transform: translateX(-100%);
  transition: transform 250ms cubic-bezier(.2,.8,.2,1);
}
.drawer[data-open='true'] { transform: translateX(0); }

@media (prefers-reduced-motion: reduce) {
  .drawer { transition: opacity 150ms; transform: none; opacity: 0; }
  .drawer[data-open='true'] { opacity: 1; }
}`,
        note: 'Dengan reduced motion, perubahan tetap tersampaikan (lewat fade), hanya gerakan besarnya yang dihilangkan.',
      },
      {
        title: '✅ Motion: animasi exit dan layout untuk tumpukan toast',
        code: `import { AnimatePresence, motion, MotionConfig } from 'motion/react'

export function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <MotionConfig reducedMotion="user">
      <ol className="toasts" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map(t => (
            <motion.li
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            >
              {t.message}
              <button aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>×</button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </MotionConfig>
  )
}`,
        note: 'AnimatePresence menahan item yang dihapus tetap ter-mount sampai animasi exit-nya selesai; layout membuat toast yang tersisa bergeser ke tempatnya dengan FLIP. Keduanya butuh key yang stabil.',
      },
      {
        title: '✅ View Transition untuk pengurutan list',
        code: `function sortBy(field: 'name' | 'price') {
  const update = () => flushSync(() => setSort(field))
  if (!document.startViewTransition) return update()
  document.startViewTransition(update)
}
/* CSS: each row gets a unique name so it morphs to its new position
   .row { view-transition-name: var(--vt-name); }  (set --vt-name per row in style) */`,
        note: 'flushSync memastikan React meng-commit perubahan DOM di dalam callback transition, sehingga browser menangkap snapshot baru yang benar.',
      },
    ],
    realCase: {
      title: 'Side panel patah-patah di perangkat Android kelas bawah',
      story: `**Situasi:** Panel detail pesanan di sebuah aplikasi delivery muncul dengan menganimasikan \`width\` dari 0 ke 400px memakai library animasi JS.

**Gejala:** Di HP Android kelas bawah, animasinya hanya sekitar 15 fps, dan tap selama animasi berjalan diabaikan; INP untuk interaksi "buka pesanan" di atas 500 ms berdasarkan data lapangan.

**Akar masalah:** Menganimasikan width memicu layout seluruh daftar pesanan di setiap frame, di main thread, bersamaan dengan React yang juga sedang merender isi panel.

**Perbaikan:** Panel dirender langsung di lebar akhirnya dan dianimasikan dengan \`transform: translateX\`; render isinya dibungkus \`startTransition\` supaya respons klik langsung ter-paint. Pengguna dengan reduced motion melihat panel langsung muncul.

**Pelajaran:** Pilih properti yang ramah compositor dan jangan biarkan animasi berebut main thread dengan rendering yang mendesak.`,
    },
    pitfalls: [
      'Menganimasikan properti layout (width, height, top, margin) alih-alih transform dan opacity.',
      'Mengabaikan prefers-reduced-motion, atau menanganinya dengan menghilangkan informasi, bukan gerakannya.',
      'Memakai index array sebagai key bersama AnimatePresence, sehingga item yang salah yang dianimasikan keluar.',
      'Animasi masuk yang terlalu lama sehingga menunda LCP atau memblokir klik.',
    ],
    exercise: {
      task: 'Buat item FAQ yang bisa dibuka-tutup dengan animasi mulus, tanpa library animasi JavaScript, dan menghormati reduced motion.',
      hint: 'Pakai trik grid: animasikan grid-template-rows dari 0fr ke 1fr dengan elemen dalam ber-overflow:hidden. Pasangkan dengan button yang punya aria-expanded.',
      solution: `\`\`\`tsx
export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="faq" data-open={open}>
      <h3><button aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>{q}</button></h3>
      <div id={id} className="faq-body" inert={!open}><div><p>{a}</p></div></div>
    </div>
  )
}
/* .faq-body { display:grid; grid-template-rows:0fr; transition:grid-template-rows 200ms ease-out; }
   .faq-body > div { overflow:hidden; }
   .faq[data-open='true'] .faq-body { grid-template-rows:1fr; }
   @media (prefers-reduced-motion: reduce) { .faq-body { transition:none; } } */
\`\`\`
\`inert\` menjauhkan link di bagian yang tertutup dari urutan Tab dan accessibility tree (di React 19, atribut ini menerima boolean).`,
    },
    interview: [
      'Kenapa transform dan opacity lebih murah dianimasikan dibanding width atau top?',
      'Jelaskan teknik FLIP dan bagaimana library animasi layout memanfaatkannya.',
      'Bagaimana seharusnya aplikasi berperilaku saat pengguna mengaktifkan prefers-reduced-motion?',
    ],
  },

  storybook: {
    explanation: `Storybook adalah bengkel kerja untuk component: aplikasi terpisah tempat setiap component dirender secara terisolasi dalam semua state yang penting. Sebuah **story** adalah state yang diberi nama dan dirender: \`Primary\`, \`Disabled\`, \`Loading\`, \`WithLongLabel\`, \`ErrorState\`. Story ditulis dalam **Component Story Format (CSF)**: sebuah default export berisi metadata dan beberapa named export, masing-masing berupa objek \`args\`.

### Kenapa isolasi itu penting
Di dalam aplikasi, untuk mencapai state "pembayaran gagal dengan pesan error berbahasa Jerman yang sangat panjang" kamu butuh sepuluh klik dan backend tiruan. Di Storybook cukup satu URL. Edge case jadi terlihat oleh desainer, QA, dan reviewer, dan component dipaksa lepas dari state global aplikasi: kalau sebuah component sulit dibuatkan story, kemungkinan besar ia terlalu terikat dengan bagian lain.

### Apa yang diberikan Storybook
- **Args dan controls**: ubah props secara langsung; tipe args diambil dari component kamu.
- **Autodocs**: halaman dokumentasi yang dibuat dari tipe dan story component.
- **Decorator**: pembungkus untuk tema, router, provider. Global di toolbar bisa mengganti light/dark dengan men-set \`data-theme\`.
- **Loader dan MSW**: dengan msw-storybook-addon, story mendeklarasikan network handler sehingga component yang melakukan fetch data bisa merender state yang realistis.

### Story sebagai test
Di sinilah Storybook naik kelas dari sekadar dokumentasi menjadi tool untuk kualitas:
- **Interaction test**: fungsi \`play\` memakai query ala Testing Library dan user event terhadap story yang dirender, dengan assertion lewat \`expect\` dari \`storybook/test\`. Setiap langkahnya terlihat di panel Interactions.
- **Accessibility test**: addon a11y menjalankan axe di setiap story. Kamu bisa membuat pelanggaran aksesibilitas menggagalkan test run.
- **Integrasi Vitest**: dengan addon Vitest dari Storybook, story dijalankan sebagai test di browser sungguhan (Vitest browser mode), jadi CI mengeksekusi render, fungsi play, dan pengecekan a11y dari setiap story.
- **Visual regression**: layanan seperti Chromatic (atau screenshot diffing yang di-host sendiri) membandingkan screenshot setiap story dengan baseline, menangkap regresi CSS yang tidak bisa ditangkap unit test.

### Kebiasaan menulis story yang baik
- Satu story untuk setiap state yang bermakna, bukan untuk setiap kombinasi prop.
- Sertakan kasus ekstrem: teks panjang, list kosong, RTL, viewport kecil, tema gelap.
- Letakkan story dekat dengan component-nya (\`Button.stories.tsx\` di sebelah \`Button.tsx\`).
- Pakai ulang story di unit test dengan \`composeStories\` supaya setup test tidak diduplikasi.

### Kapan berlebihan
Aplikasi kecil tanpa library component bersama mungkin tidak membutuhkannya. Storybook baru terasa manfaatnya ketika beberapa orang membangun UI di atas component bersama, atau ketika desainer ikut me-review state-state component.`,
    examples: [
      {
        title: '✅ Story CSF3 dengan interaction test + a11y test',
        code: `import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Tabs } from './Tabs'

const meta = {
  title: 'Navigation/Tabs',
  component: Tabs,
  parameters: { a11y: { test: 'error' } },
  render: args => (
    <Tabs {...args}>
      <Tabs.List label="Account settings">
        <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
        <Tabs.Trigger value="billing">Billing</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Panel value="profile">Profile form</Tabs.Panel>
      <Tabs.Panel value="billing">Billing details</Tabs.Panel>
    </Tabs>
  ),
  args: { defaultValue: 'profile' },
} satisfies Meta<typeof Tabs>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const KeyboardNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const profile = canvas.getByRole('tab', { name: 'Profile' })
    await userEvent.click(profile)
    await userEvent.keyboard('{ArrowRight}')
    const billing = canvas.getByRole('tab', { name: 'Billing' })
    await expect(billing).toHaveFocus()
    await expect(billing).toHaveAttribute('aria-selected', 'true')
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('Billing details')
  },
}`,
        note: 'Fungsi play adalah test sungguhan yang berjalan di browser; a11y test "error" menggagalkan run kalau ada pelanggaran axe. Story yang sama berfungsi sebagai dokumentasi sekaligus regression test.',
      },
      {
        title: '✅ Decorator tema yang dikendalikan global di toolbar',
        code: `// .storybook/preview.tsx
import type { Preview } from '@storybook/react-vite'
import '../src/tokens.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: { icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, ctx) => {
      document.documentElement.dataset.theme = ctx.globals.theme
      return <Story />
    },
  ],
}
export default preview`,
        note: 'Karena tema hanyalah nilai token, decorator cukup mengganti satu atribut. Visual test bisa menangkap kedua tema untuk setiap story.',
      },
    ],
    realCase: {
      title: 'Regresi visual yang lolos dari test suite yang serba hijau',
      story: `**Situasi:** Tim design system di sebuah perusahaan travel punya coverage unit test 90%, tapi tim produk terus melaporkan layout yang rusak setiap habis release.

**Gejala:** Pergantian nama sebuah token membuat border input menjadi transparan di dark mode; semua test tetap lulus karena test-nya hanya meng-query role dan teks, bukan tampilan.

**Akar masalah:** Tidak ada test yang melihat piksel, dan dark mode hanya dicek manual di segelintir layar.

**Perbaikan:** Setiap component dibuatkan story untuk semua state-nya di kedua tema, dan CI menjalankan perbandingan screenshot di setiap pull request. Reviewer harus menyetujui diff visual secara eksplisit. Addon a11y diatur agar gagal bila ada pelanggaran, dan di minggu pertama langsung menangkap dua regresi kontras.

**Pelajaran:** Test perilaku dan test visual menangkap jenis bug yang berbeda. Story adalah tempat termurah untuk menjalankan keduanya.`,
    },
    pitfalls: [
      'Story yang bergantung pada state global aplikasi atau API sungguhan, sehingga rusak secara acak; mock-lah dengan decorator dan handler MSW.',
      'Menulis satu story untuk setiap kombinasi prop, bukan untuk setiap state yang bermakna: terlalu banyak noise sampai kasus penting tertutupi.',
      'Menganggap Storybook hanya sebagai dokumentasi dan tidak pernah menjalankan story di CI.',
      'Membiarkan story makin jauh dari pemakaian nyata karena tidak dipakai ulang di test (pakai composeStories).',
    ],
    exercise: {
      task: 'Tulis story untuk `UserCard` yang melakukan fetch ke `/api/users/:id`: Loading, Success, NotFound (404), dan ServerError (500), memakai handler MSW per story. Tambahkan fungsi play di story Success yang memastikan heading nama pengguna terlihat.',
      hint: 'Dengan msw-storybook-addon, taruh handler di parameters.msw.handlers. Pakai delay("infinite") untuk state loading.',
      solution: `\`\`\`tsx
import { http, HttpResponse, delay } from 'msw'
import { expect, within } from 'storybook/test'

const meta = { component: UserCard, args: { id: '42' } } satisfies Meta<typeof UserCard>
export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = {
  parameters: { msw: { handlers: [http.get('/api/users/:id', async () => { await delay('infinite') })] } },
}
export const Success: Story = {
  parameters: { msw: { handlers: [http.get('/api/users/:id', () => HttpResponse.json({ id: '42', name: 'Ada Lovelace' }))] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByRole('heading', { name: 'Ada Lovelace' })).toBeVisible()
  },
}
export const NotFound: Story = {
  parameters: { msw: { handlers: [http.get('/api/users/:id', () => new HttpResponse(null, { status: 404 }))] } },
}
export const ServerError: Story = {
  parameters: { msw: { handlers: [http.get('/api/users/:id', () => HttpResponse.json({ message: 'boom' }, { status: 500 }))] } },
}
\`\`\``,
    },
    interview: [
      'Bagaimana story di Storybook bisa dipakai sebagai test, bukan sekadar dokumentasi?',
      'Bug jenis apa yang bisa ditangkap visual regression testing tapi tidak tertangkap test Testing Library?',
      'Bagaimana cara membuat component yang melakukan fetch data bisa dirender di Storybook tanpa backend sungguhan?',
    ],
  },
}

export default details
