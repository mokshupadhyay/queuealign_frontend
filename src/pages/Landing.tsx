import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import { Shell } from '../components/Shell'

export function Landing() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function join(e: FormEvent) {
    e.preventDefault()
    const slug = code.trim().toLowerCase()
    if (!slug) return
    setError(null)
    setLoading(true)
    try {
      await api.getEvent(slug)
      navigate(`/e/${slug}`)
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? 'No event with that code.' : err instanceof Error ? err.message : 'Could not find event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell>
      <section className="hero">
        <p className="muted" style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem' }}>
          QueueAlign
        </p>
        <h1>Fair check-in. No cutting the line.</h1>
        <p className="lede">
          QueueAlign gives every participant a queue number and QR ticket. Organizers call people in
          order — on a phone, a laptop, or a lobby screen.
        </p>
        <div className="hero-actions">
          <Link className="btn" to="/create">
            Create event
          </Link>
          <a className="btn btn-ghost" href="#join">
            Join with code
          </a>
        </div>
      </section>

      <form id="join" className="join-row" onSubmit={join}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Event code / slug"
          aria-label="Event code"
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Checking…' : 'Join'}
        </button>
      </form>
      {error && <p className="error" style={{ marginTop: '0.75rem' }}>{error}</p>}
      <p className="muted" style={{ marginTop: '0.75rem' }}>
        Have a registration link? Open it directly — or paste the event slug above.
      </p>
    </Shell>
  )
}
