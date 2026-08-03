import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, api, deskTokenKey, type QueueOut } from '../api/client'
import { Shell } from '../components/Shell'
import { usePolling } from '../hooks/usePolling'
import { extractCheckinToken } from '../lib/qrParse'

const POLL_MS = 2000

export function Desk() {
  const { slug = '' } = useParams()
  const [pin, setPin] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem(deskTokenKey(slug)) ?? '')
  const [queue, setQueue] = useState<QueueOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [manualNumber, setManualNumber] = useState('')
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [scanHint, setScanHint] = useState<string | null>(null)
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null)
  const lastScanRef = useRef<string>('')
  const checkinRef = useRef<(t: string) => Promise<void>>(async () => undefined)
  const genRef = useRef(0)

  useEffect(() => {
    setToken(localStorage.getItem(deskTokenKey(slug)) ?? '')
    setQueue(null)
    setError(null)
    setScanning(false)
  }, [slug])

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
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem(deskTokenKey(slug))
        setToken('')
        setError('Session expired — unlock the desk again.')
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to load queue')
    }
  }, [slug, token])

  usePolling(loadQueue, POLL_MS, Boolean(token))

  async function unlock(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await api.authDesk(slug, pin)
      localStorage.setItem(deskTokenKey(slug), res.token)
      setToken(res.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed')
    } finally {
      setBusy(false)
    }
  }

  async function runAction(fn: () => Promise<{ message: string }>) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fn()
      showFlash(res.message)
      await loadQueue()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function checkinByToken(checkinToken: string) {
    if (!checkinToken || lastScanRef.current === checkinToken) return
    lastScanRef.current = checkinToken
    try {
      const res = await api.checkin(slug, token, { token: checkinToken })
      showFlash(res.message)
      setScanHint(null)
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
    await runAction(() => api.checkin(slug, token, { queue_number: n }))
    setManualNumber('')
  }

  useEffect(() => {
    if (!scanning) {
      const s = scannerRef.current
      if (s) {
        s.stop()
          .catch(() => undefined)
          .finally(() => {
            try {
              s.clear()
            } catch {
              /* ignore */
            }
          })
        scannerRef.current = null
      }
      return
    }

    const gen = ++genRef.current
    let cancelled = false

    ;(async () => {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (cancelled || gen !== genRef.current) return

      const scanner = new Html5Qrcode('desk-scanner')
      scannerRef.current = scanner

      const cameras = await Html5Qrcode.getCameras().catch(() => [])
      const back =
        cameras.find((c) => /back|rear|environment/i.test(c.label)) ?? cameras[0]
      const config = { fps: 8, qrbox: { width: 220, height: 220 } }

      const onScan = (decoded: string) => {
          const t = extractCheckinToken(decoded)
          if (t) void checkinRef.current(t)
          else setScanHint('QR read, but it wasn’t a participant ticket.')
      }

      try {
        if (back?.id) {
          await scanner.start(back.id, config, onScan, () => undefined)
        } else {
          try {
            await scanner.start({ facingMode: 'environment' }, config, onScan, () => undefined)
          } catch {
            await scanner.start({ facingMode: 'user' }, config, onScan, () => undefined)
          }
        }
      } catch (err) {
        if (!cancelled && gen === genRef.current) {
          setError(
            err instanceof Error
              ? `${err.message} — use HTTPS or localhost for camera, or check in by queue #.`
              : 'Camera unavailable',
          )
          setScanning(false)
        }
      }
    })()

    return () => {
      cancelled = true
      const s = scannerRef.current
      scannerRef.current = null
      if (s) {
        s.stop()
          .catch(() => undefined)
          .finally(() => {
            try {
              s.clear()
            } catch {
              /* ignore */
            }
          })
      }
    }
  }, [scanning])

  if (!token) {
    return (
      <Shell>
        <h1 className="page-title">Organizer desk</h1>
        <p className="page-sub muted">
          Enter the event PIN. Call people in order, then scan their ticket QR to verify check-in.
        </p>
        <form className="form panel" onSubmit={unlock}>
          <label>
            PIN
            <input
              type="password"
              inputMode="numeric"
              required
              minLength={4}
              maxLength={32}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Unlocking…' : 'Unlock desk'}
          </button>
        </form>
      </Shell>
    )
  }

  const serving = queue?.now_serving

  return (
    <Shell>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{queue?.event_name ?? 'Desk'}</h1>
          <p className="page-sub muted">Call next, then scan ticket QR to verify the guest</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost" to={`/e/${slug}/display`} target="_blank">
            Open display
          </Link>
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
      </div>

      {flash && <p className="success" aria-live="polite">{flash}</p>}
      {error && <p className="error" aria-live="assertive">{error}</p>}

      <div className="desk-layout" style={{ marginTop: '1rem' }}>
        <aside className="panel">
          <div className="now-box">
            <div className="label">Now serving</div>
            {serving ? (
              <>
                <div className="num" key={serving.queue_number}>
                  #{serving.queue_number}
                </div>
                <div>{serving.name}</div>
              </>
            ) : (
              <div className="num" style={{ fontSize: '1.6rem', opacity: 0.7 }}>
                —
              </div>
            )}
          </div>

          <div className="actions">
            <button
              className="btn"
              type="button"
              disabled={busy || Boolean(serving)}
              onClick={() => runAction(() => api.callNext(slug, token))}
            >
              Call next
            </button>
            <button
              className="btn"
              type="button"
              disabled={busy || !serving}
              onClick={() =>
                runAction(() =>
                  api.checkin(slug, token, { queue_number: serving!.queue_number }),
                )
              }
            >
              Check in current
            </button>
            <button
              className="btn btn-danger"
              type="button"
              disabled={busy || !serving}
              onClick={() => runAction(() => api.skip(slug, token, true))}
            >
              Skip → next
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
              <strong>{queue?.skipped_count ?? 0}</strong>
              <span>Skipped</span>
            </div>
            <div className="stat">
              <strong>{queue?.total_count ?? 0}</strong>
              <span>Total</span>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
            <button
              className="btn btn-ghost"
              type="button"
              disabled={busy}
              onClick={() =>
                runAction(() =>
                  api.updateEvent(slug, token, !(queue?.is_active ?? true)).then((e) => ({
                    message: e.is_active ? 'Registration opened' : 'Registration closed',
                  })),
                )
              }
            >
              {queue?.is_active === false ? 'Open registration' : 'Close registration'}
            </button>
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
            <button className="btn btn-ghost" type="submit" disabled={busy}>
              Check in
            </button>
          </form>

          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-ghost" type="button" onClick={() => setScanning((s) => !s)}>
              {scanning ? 'Stop camera' : 'Scan QR'}
            </button>
            {scanHint && <p className="muted" style={{ marginTop: '0.5rem' }}>{scanHint}</p>}
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
                <th />
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
                  <td>
                    {p.status !== 'checked_in' && (
                      <button
                        className="btn btn-ghost"
                        type="button"
                        disabled={busy}
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() =>
                          runAction(() =>
                            api.checkin(slug, token, { queue_number: p.queue_number }),
                          )
                        }
                      >
                        Check in
                      </button>
                    )}
                    {(p.status === 'skipped' || p.status === 'called') && (
                      <button
                        className="btn btn-ghost"
                        type="button"
                        disabled={busy}
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', marginLeft: '0.25rem' }}
                        onClick={() => runAction(() => api.requeue(slug, token, p.queue_number))}
                      >
                        Requeue
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!queue?.participants.length && (
                <tr>
                  <td colSpan={5} className="muted">
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
