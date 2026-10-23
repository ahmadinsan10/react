import { Link } from 'react-router'
import { defineStrings, useStrings } from '../i18n'

const S = defineStrings({
  en: { text: 'This page does not exist. Maybe it was a stale closure.', back: 'Back to dashboard' },
  id: { text: 'Halaman ini tidak ada. Mungkin gara-gara stale closure.', back: 'Kembali ke dashboard' },
})

export function NotFound() {
  const s = useStrings(S)
  return (
    <div className="card" style={{ textAlign: 'center', padding: 48 }}>
      <h1>404</h1>
      <p className="muted">{s('text')}</p>
      <Link className="btn primary" to="/">
        {s('back')}
      </Link>
    </div>
  )
}
