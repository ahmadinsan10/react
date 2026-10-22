import { Link } from 'react-router'

export function NotFound() {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 48 }}>
      <h1>404</h1>
      <p className="muted">This page does not exist. Maybe it was a stale closure.</p>
      <Link className="btn primary" to="/">
        Back to dashboard
      </Link>
    </div>
  )
}
