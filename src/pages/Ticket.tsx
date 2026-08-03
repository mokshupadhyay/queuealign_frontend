import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, resolveAssetUrl, type ParticipantStatusOut } from '../api/client'
import { Shell } from '../components/Shell'
import { usePolling } from '../hooks/usePolling'

const POLL_MS = 2000

export function Ticket() {
  const { slug = '', token = '' } = useParams()
  const [data, setData] = useState<ParticipantStatusOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.participantStatus(slug, token)
      setData(res)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load ticket')
    }
  }, [slug, token])

  usePolling(load, POLL_MS, true)

  const p = data?.participant
  const yourTurn = p?.status === 'called'
  const done = p?.status === 'checked_in'

  async function shareTicket() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: 'QueueAlign ticket', url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy your ticket link:', url)
    }
  }

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
          {error && data && (
            <p className="error" style={{ marginBottom: '0.75rem' }}>
              Connection issue — showing last update. {error}
            </p>
          )}

          {yourTurn && (
            <div className="your-turn" style={{ marginBottom: '1rem' }}>
              <strong>You’re up.</strong>
              <p className="muted">
                Head to the check-in desk
                {data?.now_serving_name ? ` (now serving ${data.now_serving_name})` : ''} and show
                your QR.
              </p>
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
                      ? 'You’re next.'
                      : `${data?.people_ahead ?? '—'} ahead of you`}
                    {data?.now_serving != null
                      ? ` · Now serving #${data.now_serving}${data.now_serving_name ? ` (${data.now_serving_name})` : ''}`
                      : ' · Desk idle'}
                  </p>
                )}
                {done && <p className="success">You’re checked in. Welcome in.</p>}
                {p?.status === 'skipped' && (
                  <p className="muted">
                    Marked as skipped — talk to an organizer if you’re still here.
                  </p>
                )}
                <button className="btn btn-ghost" type="button" onClick={shareTicket} style={{ width: 'fit-content' }}>
                  {copied ? 'Link copied' : 'Share / save ticket link'}
                </button>
              </div>
            </div>

            <div className="qr-wrap">
              {data && (
                <img
                  src={resolveAssetUrl(data.qr_url)}
                  alt="Check-in QR code"
                  width={220}
                  height={220}
                />
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
