import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, type DisplayOut } from '../api/client'
import { usePolling } from '../hooks/usePolling'

const POLL_MS = 2000

export function Display() {
  const { slug = '' } = useParams()
  const [data, setData] = useState<DisplayOut | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.display(slug)
      setData(res)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Display unavailable')
    }
  }, [slug])

  usePolling(load, POLL_MS, true)

  async function goFullscreen() {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="display-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
        <div className="event">{data?.event_name ?? (error ? 'QueueAlign' : 'Loading…')}</div>
        <button
          type="button"
          onClick={goFullscreen}
          style={{
            background: 'transparent',
            border: '1px solid rgba(238,245,243,0.25)',
            color: 'inherit',
            borderRadius: 4,
            padding: '0.4rem 0.7rem',
            cursor: 'pointer',
            opacity: 0.7,
          }}
        >
          Fullscreen
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '1rem', opacity: 0.8 }} aria-live="polite">
          {error}
        </div>
      )}

      {data?.now_serving ? (
        <>
          <div className="serving-label">Now serving</div>
          <div className="serving-num" key={data.now_serving.queue_number}>
            #{data.now_serving.queue_number}
          </div>
          <div className="serving-name">{data.now_serving.name}</div>
          {data.now_serving.team_name && (
            <div style={{ opacity: 0.65, marginTop: '0.35rem' }}>{data.now_serving.team_name}</div>
          )}
        </>
      ) : (
        <div className="idle">{error && !data ? error : 'Waiting for the next guest'}</div>
      )}

      <div className="up-next">
        <div className="label">Up next</div>
        {(data?.up_next ?? []).length === 0 && <div className="item">—</div>}
        {(data?.up_next ?? []).map((p) => (
          <div className="item" key={p.queue_number}>
            <strong>#{p.queue_number}</strong>
            {p.name}
          </div>
        ))}
      </div>

      <div className="display-meta">
        {data
          ? `${data.waiting_count} waiting · ${data.checked_in_count} checked in · ${data.total_count} total`
          : 'QueueAlign'}
      </div>
    </div>
  )
}
