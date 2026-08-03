import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api, type EventListItem } from '../api/client'
import { QrScanner } from '../components/QrScanner'
import { Shell } from '../components/Shell'
import { parseQueueAlignScan } from '../lib/qrParse'

export function Landing() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<EventListItem[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const lastScanRef = useRef('')
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    api
      .listEvents()
      .then((rows) => {
        if (alive) setEvents(rows)
      })
      .catch((err) => {
        if (alive) setListError(err instanceof Error ? err.message : 'Could not load events')
      })
    return () => {
      alive = false
    }
  }, [])

  async function goToEvent(slugRaw: string) {
    const slug = slugRaw.trim().toLowerCase()
    if (!slug) return
    setError(null)
    setLoading(true)
    try {
      await api.getEvent(slug)
      setScanning(false)
      navigate(`/e/${slug}`)
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? 'No event with that code.'
          : err instanceof Error
            ? err.message
            : 'Could not find event',
      )
    } finally {
      setLoading(false)
    }
  }

  async function join(e: FormEvent) {
    e.preventDefault()
    await goToEvent(code)
  }

  function onScan(text: string) {
    if (lastScanRef.current === text) return
    lastScanRef.current = text
    window.setTimeout(() => {
      lastScanRef.current = ''
    }, 2000)

    const parsed = parseQueueAlignScan(text)
    if (!parsed) {
      setError('QR read, but it wasn’t a QueueAlign event code.')
      return
    }
    if (parsed.type === 'ticket') {
      setScanning(false)
      navigate(`/e/${parsed.slug}/t/${parsed.token}`)
      return
    }
    void goToEvent(parsed.slug)
  }

  return (
    <Shell>
      <section className="hero">
        <p
          className="muted"
          style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem' }}
        >
          QueueAlign
        </p>
        <h1>Fair check-in. No cutting the line.</h1>
        <p className="lede">
          Browse ongoing events or scan the event QR to join. You’ll get a queue number and a personal
          ticket QR — show it at the desk to verify who you are.
        </p>
        <div className="hero-actions">
          <Link className="btn" to="/create">
            Create event
          </Link>
          <button className="btn btn-ghost" type="button" onClick={() => setScanning((s) => !s)}>
            {scanning ? 'Stop scanner' : 'Scan to join'}
          </button>
        </div>
      </section>

      {scanning && (
        <div className="panel" style={{ marginBottom: '1.5rem' }}>
          <p className="muted" style={{ marginBottom: '0.75rem' }}>
            Point your camera at the <strong style={{ color: 'var(--ink)' }}>event QR</strong> posted
            by organizers.
          </p>
          <QrScanner active={scanning} onDecode={onScan} />
        </div>
      )}

      <section style={{ marginBottom: '2rem' }}>
        <h2 className="page-title" style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>
          Ongoing events
        </h2>
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Tap an event to join and get your queue number.
        </p>
        {listError && <p className="error">{listError}</p>}
        {!events && !listError && <p className="muted">Loading events…</p>}
        {events && events.length === 0 && (
          <div className="panel">
            <p className="muted">No open events right now. Create one, or scan an event QR.</p>
          </div>
        )}
        {events && events.length > 0 && (
          <div className="event-list">
            {events.map((ev) => (
              <Link key={ev.slug} className="event-row" to={`/e/${ev.slug}`}>
                <div>
                  <strong>{ev.name}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    {ev.waiting_count} waiting · {ev.checked_in_count} checked in · {ev.total_count}{' '}
                    total
                  </div>
                </div>
                <span className="event-row-cta">Join</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Or enter an event code</h3>
      <form id="join" className="join-row" onSubmit={join}>
        <input
          ref={codeInputRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Event code / slug"
          aria-label="Event code"
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Checking…' : 'Join'}
        </button>
      </form>
      {error && (
        <p className="error" style={{ marginTop: '0.75rem' }}>
          {error}
        </p>
      )}
    </Shell>
  )
}
