import { useState } from 'react'
import { Link } from 'react-router'
import { connect, disconnect, generateSyncKey, normalizeKey, syncNow, useSyncState, type SyncStatus } from '../sync/client'
import { Icon, toast } from './ui'
import { defineStrings, locale, useLang, useStrings, type Lang } from '../i18n'

const S = defineStrings({
  en: {
    st_off: 'Not syncing',
    st_syncing: 'Syncing…',
    st_synced: 'Synced',
    st_error: 'Sync problem',
    st_offline: 'Offline: will sync when back online',
    never: 'never',
    justNow: 'just now',
    secAgo: '{n}s ago',
    minAgo: '{n} min ago',
    badgeTitle: '{status} · last sync {ago}',
    badgeAria: 'Sync status: {status}',
    copied: 'Sync key copied',
    title: 'Sync across devices',
    lastSynced: 'Last synced {ago}. Progress syncs automatically about 2 seconds after each change, when you return to this tab, and every minute.',
    yourKey: 'Your sync key',
    hide: 'Hide',
    show: 'Show',
    copy: 'Copy',
    syncNow: 'Sync now',
    stopped: 'This device stopped syncing',
    stop: 'Stop syncing on this device',
    otherDevice: 'On another device, open Settings → Sync → "I have a sync key" and paste this key. Treat it like a password: anyone with the key can read and change your progress.',
    pasteKey: 'Paste the key from your other device. Progress on this device will be merged with it, so nothing is lost.',
    keyAria: 'Sync key',
    connecting: 'Connecting…',
    connect: 'Connect',
    cancel: 'Cancel',
    offIntro: "Progress is stored in this browser. Turn on sync to keep your phone, laptop and work computer in step. There's no account: a private random key identifies your progress, and only a hash of it is stored on the server.",
    settingUp: 'Setting up…',
    turnOn: 'Turn on sync (new key)',
    haveKey: 'I have a sync key',
    err_badKey: 'That does not look like a sync key (6 groups of 4 characters).',
    err_notConfigured: 'Sync is not configured on the server yet (add Upstash Redis in Vercel).',
    err_unreachable: 'Could not reach the sync server.',
  },
  id: {
    st_off: 'Tidak sinkron',
    st_syncing: 'Menyinkronkan…',
    st_synced: 'Tersinkron',
    st_error: 'Sinkronisasi bermasalah',
    st_offline: 'Offline: akan disinkronkan saat online lagi',
    never: 'belum pernah',
    justNow: 'baru saja',
    secAgo: '{n} detik lalu',
    minAgo: '{n} menit lalu',
    badgeTitle: '{status} · sinkron terakhir {ago}',
    badgeAria: 'Status sinkronisasi: {status}',
    copied: 'Kunci sinkronisasi disalin',
    title: 'Sinkronisasi antarperangkat',
    lastSynced: 'Terakhir disinkronkan {ago}. Progres tersinkron otomatis sekitar 2 detik setelah setiap perubahan, saat kamu kembali ke tab ini, dan setiap menit.',
    yourKey: 'Kunci sinkronisasimu',
    hide: 'Sembunyikan',
    show: 'Tampilkan',
    copy: 'Salin',
    syncNow: 'Sinkronkan sekarang',
    stopped: 'Perangkat ini berhenti menyinkronkan',
    stop: 'Hentikan sinkronisasi di perangkat ini',
    otherDevice: 'Di perangkat lain, buka Pengaturan → Sinkronisasi → "Aku punya kunci sinkronisasi", lalu tempel kunci ini. Perlakukan seperti password: siapa pun yang punya kunci ini bisa membaca dan mengubah progresmu.',
    pasteKey: 'Tempel kunci dari perangkatmu yang lain. Progres di perangkat ini akan digabungkan dengannya, jadi tidak ada yang hilang.',
    keyAria: 'Kunci sinkronisasi',
    connecting: 'Menghubungkan…',
    connect: 'Hubungkan',
    cancel: 'Batal',
    offIntro: 'Progres disimpan di browser ini. Aktifkan sinkronisasi supaya HP, laptop, dan komputer kantormu selalu sama. Tidak perlu akun: sebuah kunci acak yang privat menjadi penanda progresmu, dan server hanya menyimpan hash-nya.',
    settingUp: 'Menyiapkan…',
    turnOn: 'Aktifkan sinkronisasi (kunci baru)',
    haveKey: 'Aku punya kunci sinkronisasi',
    err_badKey: 'Itu sepertinya bukan kunci sinkronisasi (6 kelompok berisi 4 karakter).',
    err_notConfigured: 'Sinkronisasi belum dikonfigurasi di server (tambahkan Upstash Redis di Vercel).',
    err_unreachable: 'Server sinkronisasi tidak bisa dihubungi.',
  },
})
type Str = ReturnType<typeof useStrings<typeof S.en>>

const COLOR: Record<SyncStatus, string> = { off: 'var(--text-3)', syncing: 'var(--warn)', synced: 'var(--ok)', error: 'var(--bad)', offline: 'var(--warn)' }

function ago(t: number | null, s: Str, lang: Lang) {
  if (!t) return s('never')
  const sec = Math.round((Date.now() - t) / 1000)
  if (sec < 10) return s('justNow')
  if (sec < 60) return s('secAgo', { n: sec })
  if (sec < 3600) return s('minAgo', { n: Math.round(sec / 60) })
  return new Date(t).toLocaleString(locale(lang))
}

/** The sync client reports errors in English; show known ones in the current language. */
function errorText(msg: string, s: Str) {
  if (msg.startsWith('That does not look like a sync key')) return s('err_badKey')
  if (msg.startsWith('Sync is not configured')) return s('err_notConfigured')
  if (msg.startsWith('Could not reach')) return s('err_unreachable')
  return msg
}

/** Compact indicator for the top bar. */
export function SyncBadge() {
  const st = useSyncState()
  const s = useStrings(S)
  const lang = useLang()
  if (st.status === 'off') return null
  const label = s(`st_${st.status}`)
  return (
    <Link
      to="/settings#sync"
      className="btn ghost sm"
      title={st.error ? errorText(st.error, s) : s('badgeTitle', { status: label, ago: ago(st.lastSyncedAt, s, lang) })}
      aria-label={s('badgeAria', { status: label })}
    >
      <span style={{ width: 8, height: 8, borderRadius: 4, background: COLOR[st.status], display: 'inline-block', animation: st.status === 'syncing' ? 'pop 0.8s infinite alternate' : undefined }} />
      <span className="sync-label">{label}</span>
    </Link>
  )
}

export function SyncPanel() {
  const st = useSyncState()
  const s = useStrings(S)
  const lang = useLang()
  const [mode, setMode] = useState<'idle' | 'join'>('idle')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const run = async (key: string) => {
    setBusy(true)
    setErr(null)
    try {
      await connect(key)
      setMode('idle')
      setInput('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!st.key) return
    try {
      await navigator.clipboard.writeText(st.key)
      toast(s('copied'))
    } catch {
      setReveal(true)
    }
  }

  return (
    <div className="card" id="sync" style={{ scrollMarginTop: 80 }}>
      <div className="row" style={{ marginBottom: 6 }}>
        <h3 style={{ margin: 0 }}>{s('title')}</h3>
        <span className="spacer" />
        <span className="pill" style={{ color: COLOR[st.status] }}>
          ● {s(`st_${st.status}`)}
        </span>
      </div>

      {st.key ? (
        <>
          <p className="subtle">{s('lastSynced', { ago: ago(st.lastSyncedAt, s, lang) })}</p>
          <label className="subtle" htmlFor="sync-key">
            {s('yourKey')}
          </label>
          <div className="row" style={{ flexWrap: 'nowrap', margin: '4px 0 12px' }}>
            <code id="sync-key" style={{ flex: 1, minWidth: 0, padding: '8px 10px', fontSize: '0.95rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
              {reveal ? st.key : st.key.replace(/[A-Z2-7]/g, '•').replace(/^.{4}/, st.key.slice(0, 4))}
            </code>
            <button className="btn sm" onClick={() => setReveal(r => !r)}>
              {reveal ? s('hide') : s('show')}
            </button>
            <button className="btn sm" onClick={copy}>
              {s('copy')}
            </button>
          </div>
          {st.error && <div className="explain bad">{errorText(st.error, s)}</div>}
          <div className="row">
            <button className="btn primary" onClick={() => void syncNow()} disabled={st.status === 'syncing'}>
              <Icon name="reset" size={15} /> {s('syncNow')}
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                disconnect()
                toast(s('stopped'))
              }}
            >
              {s('stop')}
            </button>
          </div>
          <p className="subtle" style={{ marginTop: 12 }}>
            {s('otherDevice')}
          </p>
        </>
      ) : mode === 'join' ? (
        <>
          <p className="subtle">{s('pasteKey')}</p>
          <input
            type="text"
            value={input}
            onChange={e => setInput(normalizeKey(e.target.value))}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
            aria-label={s('keyAria')}
            autoComplete="off"
            spellCheck={false}
            style={{ width: '100%', fontFamily: 'var(--mono)', letterSpacing: '0.05em', marginBottom: 10 }}
          />
          {err && <div className="explain bad">{errorText(err, s)}</div>}
          <div className="row">
            <button className="btn primary" disabled={busy || input.length < 29} onClick={() => void run(input)}>
              {busy ? s('connecting') : s('connect')}
            </button>
            <button className="btn ghost" onClick={() => setMode('idle')}>
              {s('cancel')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="subtle">{s('offIntro')}</p>
          {err && <div className="explain bad">{errorText(err, s)}</div>}
          <div className="row">
            <button className="btn primary" disabled={busy} onClick={() => void run(generateSyncKey())}>
              {busy ? s('settingUp') : s('turnOn')}
            </button>
            <button className="btn" onClick={() => setMode('join')}>
              {s('haveKey')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
