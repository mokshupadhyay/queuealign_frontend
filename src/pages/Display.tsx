import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, type DisplayOut } from '../api/client'

const POLL_MS = 2000

export function Display() {
  const { slug = '' } = useParams()
  const [data, setData] = useState<DisplayOut | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await api.display(slug)
        if (alive) {
          setData(res)
          setError(null)
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Display unavailable')
      }
    }
    load()
    const id = window.setInterval(load, POLL_MS)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [slug])

  return (
    <div className="display-page">
      <div className="event">{data?.event_name ?? (error ? 'QueueAlign' : 'Loading…')}</div>

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
        <div className="idle">{error ?? 'Waiting for the next guest'}</div>
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
