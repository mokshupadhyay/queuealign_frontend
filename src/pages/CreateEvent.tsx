import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, resolveAssetUrl, type EventCreated } from '../api/client'
import { Shell } from '../components/Shell'

export function CreateEvent() {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<EventCreated | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\d{4,32}$/.test(pin)) {
      setError('PIN must be 4–32 digits')
      return
    }
    setLoading(true)
    try {
      const res = await api.createEvent(name.trim(), pin)
      setCreated(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create event')
    } finally {
      setLoading(false)
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      window.prompt('Copy this:', text)
    }
  }

  return (
    <Shell>
      <h1 className="page-title">Create an event</h1>
      <p className="page-sub muted">
        Create once. Share the Event QR so participants can scan to join and get their queue number.
      </p>

      {!created ? (
        <form className="form panel" onSubmit={onSubmit}>
          <label>
            Event name
            <input
              required
              minLength={2}
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spring Hackathon Check-in"
            />
          </label>
          <label>
            Organizer PIN (digits only)
            <input
              required
              minLength={4}
              maxLength={32}
              type="password"
              inputMode="numeric"
              pattern="\d*"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="4+ digits"
              autoComplete="new-password"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create event'}
          </button>
        </form>
      ) : (
        <div className="panel">
          <h2 style={{ marginBottom: '0.35rem' }}>{created.name}</h2>
          <p className="muted" style={{ marginBottom: '1.25rem' }}>
            Code: <strong style={{ color: 'var(--ink)' }}>{created.slug}</strong>
          </p>

          <div className="qr-wrap" style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--ink)', fontWeight: 500 }}>Participants scan this to join</p>
            <img
              src={resolveAssetUrl(created.event_qr_url)}
              alt="Event join QR code"
              width={240}
              height={240}
            />
            <p className="muted" style={{ textAlign: 'center', fontSize: '0.85rem' }}>
              Print or project this QR at the venue. It opens registration for this event.
            </p>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => copyText(created.register_url, 'join')}
            >
              {copied === 'join' ? 'Copied join link' : 'Copy join link'}
            </button>
          </div>

          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Organizer tools</h3>
          <div className="link-list">
            {(
              [
                ['Organizer desk', created.desk_path],
                ['Public display', created.display_path],
              ] as const
            ).map(([label, path]) => (
              <div className="link-item" key={path}>
                <div>
                  <strong>{label}</strong>
                  <div>
                    <code>{path}</code>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => copyText(`${window.location.origin}${path}`, label)}
                  >
                    {copied === label ? 'Copied' : 'Copy'}
                  </button>
                  <Link className="btn" to={path}>
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: '1rem' }}>
            Desk PIN: <strong style={{ color: 'var(--ink)' }}>{created.pin}</strong> — keep this
            private.
          </p>
        </div>
      )}
    </Shell>
  )
}
