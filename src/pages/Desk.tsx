import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { api, deskTokenKey, type QueueOut } from '../api/client'
import { Shell } from '../components/Shell'

const POLL_MS = 2000

function extractToken(raw: string): string | null {
  const text = raw.trim()
  const pathMatch = text.match(/\/e\/[^/]+\/t\/([a-f0-9]+)/i)
  if (pathMatch) return pathMatch[1]
  if (/^[a-f0-9]{16,}$/i.test(text)) return text
  try {
    const url = new URL(text)
    const m = url.pathname.match(/\/e\/[^/]+\/t\/([a-f0-9]+)/i)
    if (m) return m[1]
  } catch {
    /* not a URL */
  }
  return null
}

export function Desk() {
  const { slug = '' } = useParams()
  const [pin, setPin] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem(deskTokenKey(slug)) ?? '')
  const [queue, setQueue] = useState<QueueOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [manualNumber, setManualNumber] = useState('')
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null)
  const lastScanRef = useRef<string>('')
  const checkinRef = useRef<(t: string) => Promise<void>>(async () => undefined)

  const showFlash = (msg: string) => {
    setFlash(msg)
    window.setTimeout(() => setFlash(null), 2500)
  }

  const loadQueue = useCallback(async () => {
    if (!token) return
    try {
      const data = await api.queue(slug, token)
      setQueue(data)
      setError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load queue'
      if (msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('token')) {
        localStorage.removeItem(deskTokenKey(slug))
        setToken('')
      }
      setError(msg)
    }
  }, [slug, token])

  useEffect(() => {
    if (!token) return
    loadQueue()
    const id = window.setInterval(loadQueue, POLL_MS)
    return () => window.clearInterval(id)
  }, [token, loadQueue])

  async function unlock(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const res = await api.authDesk(slug, pin)
      localStorage.setItem(deskTokenKey(slug), res.token)
      setToken(res.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed')
    }
  }

  async function callNext() {
    try {
      const res = await api.callNext(slug, token)
      showFlash(res.message)
      await loadQueue()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Call next failed')
    }
  }

  async function skip() {
    try {
      const res = await api.skip(slug, token)
      showFlash(res.message)
      await loadQueue()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Skip failed')
    }
  }

  async function checkinByToken(checkinToken: string) {
    if (!checkinToken || lastScanRef.current === checkinToken) return
    lastScanRef.current = checkinToken
    try {
      const res = await api.checkin(slug, token, { token: checkinToken })
      showFlash(res.message)
      await loadQueue()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed')
    } finally {
      window.setTimeout(() => {
        lastScanRef.current = ''
      }, 2500)
    }
  }

  checkinRef.current = checkinByToken

  async function manualCheckin(e: FormEvent) {
    e.preventDefault()
    const n = Number(manualNumber)
    if (!Number.isFinite(n) || n < 1) return
    try {
      const res = await api.checkin(slug, token, { queue_number: n })
      showFlash(res.message)
      setManualNumber('')
      await loadQueue()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed')
    }
  }

  useEffect(() => {
    if (!scanning) {
      const s = scannerRef.current
      if (s) {
        s.stop().catch(() => undefined)
        scannerRef.current = null
      }
      return
    }
    let cancelled = false
    ;(async () => {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (cancelled) return
      const scanner = new Html5Qrcode('desk-scanner')
      scannerRef.current = scanner
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            const t = extractToken(decoded)
            if (t) void checkinRef.current(t)
          },
          () => undefined,
        )
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Camera unavailable')
          setScanning(false)
        }
      }
    })()
    return () => {
      cancelled = true
      scannerRef.current?.stop().catch(() => undefined)
      scannerRef.current = null
    }
  }, [scanning])

  if (!token) {
    return (
      <Shell>
        <h1 className="page-title">Organizer desk</h1>
        <p className="page-sub muted">Enter the event PIN to manage the queue.</p>
        <form className="form panel" onSubmit={unlock}>
          <label>
            PIN
            <input
              type="password"
              inputMode="numeric"
              required
              minLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit">
            Unlock desk
          </button>
        </form>
      </Shell>
    )
  }

  return (
    <Shell>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{queue?.event_name ?? 'Desk'}</h1>
          <p className="page-sub muted">Live queue · updates every few seconds</p>
        </div>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => {
            localStorage.removeItem(deskTokenKey(slug))
            setToken('')
          }}
        >
          Lock
        </button>
      </div>

      {flash && <p className="success">{flash}</p>}
      {error && <p className="error">{error}</p>}

      <div className="desk-layout" style={{ marginTop: '1rem' }}>
        <aside className="panel">
          <div className="now-box">
            <div className="label">Now serving</div>
            {queue?.now_serving ? (
              <>
                <div className="num" key={queue.now_serving.queue_number}>
                  #{queue.now_serving.queue_number}
                </div>
                <div>{queue.now_serving.name}</div>
              </>
            ) : (
              <div className="num" style={{ fontSize: '1.6rem', opacity: 0.7 }}>
                —
              </div>
            )}
          </div>

          <div className="actions">
            <button className="btn" type="button" onClick={callNext}>
              Call next
            </button>
            <button className="btn btn-danger" type="button" onClick={skip} disabled={!queue?.now_serving}>
              Skip
            </button>
          </div>

          <div className="stats" style={{ marginTop: '1rem' }}>
            <div className="stat">
              <strong>{queue?.waiting_count ?? 0}</strong>
              <span>Waiting</span>
            </div>
            <div className="stat">
              <strong>{queue?.checked_in_count ?? 0}</strong>
              <span>Checked in</span>
            </div>
            <div className="stat">
              <strong>{queue?.called_count ?? 0}</strong>
              <span>Called</span>
            </div>
            <div className="stat">
              <strong>{queue?.total_count ?? 0}</strong>
              <span>Total</span>
            </div>
          </div>

          <form onSubmit={manualCheckin} style={{ marginTop: '1.25rem', display: 'grid', gap: '0.5rem' }}>
            <label>
              Check in by queue #
              <input
                value={manualNumber}
                onChange={(e) => setManualNumber(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 12"
              />
            </label>
            <button className="btn btn-ghost" type="submit">
              Check in
            </button>
          </form>

          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-ghost" type="button" onClick={() => setScanning((s) => !s)}>
              {scanning ? 'Stop camera' : 'Scan QR'}
            </button>
            {scanning && <div id="desk-scanner" className="scanner" style={{ marginTop: '0.75rem' }} />}
          </div>
        </aside>

        <div className="panel" style={{ overflowX: 'auto' }}>
          <table className="queue-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Team</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(queue?.participants ?? []).map((p) => (
                <tr key={p.id} className={p.status}>
                  <td>{p.queue_number}</td>
                  <td>{p.name}</td>
                  <td>{p.team_name ?? '—'}</td>
                  <td>
                    <span className={`status-pill ${p.status}`}>{p.status.replace('_', ' ')}</span>
                  </td>
                </tr>
              ))}
              {!queue?.participants.length && (
                <tr>
                  <td colSpan={4} className="muted">
                    No registrations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  )
}
