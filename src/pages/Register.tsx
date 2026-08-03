import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type EventPublic } from '../api/client'
import { Shell } from '../components/Shell'

export function Register() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState<EventPublic | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [team, setTeam] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api
      .getEvent(slug)
      .then((e) => {
        if (alive) setEvent(e)
      })
      .catch((err) => {
        if (alive) setLoadError(err instanceof Error ? err.message : 'Event not found')
      })
    return () => {
      alive = false
    }
  }, [slug])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.register(slug, {
        name: name.trim(),
        email: email.trim(),
        team_name: team.trim() || undefined,
      })
      navigate(res.status_path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell>
      {loadError ? (
        <div className="panel">
          <h1 className="page-title">Event not found</h1>
          <p className="muted">{loadError}</p>
          <Link className="btn" to="/" style={{ marginTop: '1rem', width: 'fit-content' }}>
            Back home
          </Link>
        </div>
      ) : (
        <>
          <h1 className="page-title">{event?.name ?? 'Loading…'}</h1>
          <p className="page-sub muted">
            Register for check-in. You’ll get a queue number and QR ticket — keep that page open or
            bookmark it.
          </p>
          {event && (
            <p className="muted" style={{ marginBottom: '1rem' }}>
              {event.waiting_count} waiting · {event.checked_in_count} checked in · {event.total_count}{' '}
              total
            </p>
          )}
          <form className="form panel" onSubmit={onSubmit}>
            <label>
              Full name
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              Team (optional)
              <input value={team} onChange={(e) => setTeam(e.target.value)} />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn" type="submit" disabled={loading || !event}>
              {loading ? 'Joining…' : 'Get my queue number'}
            </button>
          </form>
        </>
      )}
    </Shell>
  )
}
