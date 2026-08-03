import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type ParticipantStatusOut } from '../api/client'
import { Shell } from '../components/Shell'

const POLL_MS = 2000

export function Ticket() {
  const { slug = '', token = '' } = useParams()
  const [data, setData] = useState<ParticipantStatusOut | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await api.participantStatus(slug, token)
        if (alive) {
          setData(res)
          setError(null)
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load ticket')
      }
    }
    load()
    const id = window.setInterval(load, POLL_MS)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [slug, token])

  const p = data?.participant
  const yourTurn = p?.status === 'called'

  return (
    <Shell>
      {error && !data ? (
        <div className="panel">
          <h1 className="page-title">Ticket not found</h1>
          <p className="error">{error}</p>
          <Link className="btn" to={`/e/${slug}`} style={{ marginTop: '1rem', width: 'fit-content' }}>
            Register
          </Link>
        </div>
      ) : (
        <>
          <p className="muted" style={{ marginBottom: '0.5rem' }}>
            {data?.event_name ?? '…'}
          </p>
          <h1 className="page-title">Your check-in ticket</h1>

          {yourTurn && (
            <div className="your-turn" style={{ marginBottom: '1rem' }}>
              <strong>You’re up.</strong>
              <p className="muted">Head to the check-in desk and show your QR.</p>
            </div>
          )}

          <div className="ticket">
            <div className="panel">
              <p className="muted">Queue number</p>
              <div className="queue-number" key={p?.queue_number}>
                {p ? `#${p.queue_number}` : '—'}
              </div>
              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
                <span className={`status-pill ${p?.status ?? ''}`}>
                  {p?.status?.replace('_', ' ') ?? '…'}
                </span>
                <p>
                  <strong style={{ color: 'var(--ink)' }}>{p?.name}</strong>
                  {p?.team_name ? ` · ${p.team_name}` : ''}
                </p>
                {p?.status === 'waiting' && (
                  <p className="muted">
                    {data && data.people_ahead === 0
                      ? 'You’re next after the current person.'
                      : `${data?.people_ahead ?? '—'} ahead of you`}
                    {data?.now_serving != null
                      ? ` · Now serving #${data.now_serving}`
                      : ' · Desk idle'}
                  </p>
                )}
                {p?.status === 'checked_in' && (
                  <p className="success">You’re checked in. Welcome in.</p>
                )}
                {p?.status === 'skipped' && (
                  <p className="muted">Marked as skipped — talk to an organizer if you’re still here.</p>
                )}
              </div>
            </div>

            <div className="qr-wrap">
              {data && (
                <img src={data.qr_url} alt="Check-in QR code" width={220} height={220} />
              )}
              <p className="muted" style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                Show this at the desk. This page updates live.
              </p>
            </div>
          </div>
        </>
      )}
    </Shell>
  )
}
