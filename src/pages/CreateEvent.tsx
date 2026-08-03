import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, type EventCreated } from '../api/client'
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

  async function copyPath(path: string, label: string) {
    const url = `${window.location.origin}${path}`
    await navigator.clipboard.writeText(url)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <Shell>
      <h1 className="page-title">Create an event</h1>
      <p className="page-sub muted">Set a name and a desk PIN. You’ll get shareable links for register, desk, and display.</p>

      {!created ? (
        <form className="form panel" onSubmit={onSubmit}>
          <label>
            Event name
            <input
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spring Hackathon Check-in"
            />
          </label>
          <label>
            Organizer PIN
            <input
              required
              minLength={4}
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
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
          <p className="muted">
            Code: <strong style={{ color: 'var(--ink)' }}>{created.slug}</strong> · Desk PIN saved
            offline — store it securely.
          </p>
          <div className="link-list">
            {(
              [
                ['Register', created.register_path],
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
                  <button className="btn btn-ghost" type="button" onClick={() => copyPath(path, label)}>
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
            PIN reminder: <strong style={{ color: 'var(--ink)' }}>{created.pin}</strong>
          </p>
        </div>
      )}
    </Shell>
  )
}
