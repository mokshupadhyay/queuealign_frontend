import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell } from '../components/Shell'

export function Landing() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  function join(e: FormEvent) {
    e.preventDefault()
    const slug = code.trim().toLowerCase()
    if (!slug) return
    navigate(`/e/${slug}`)
  }

  return (
    <Shell>
      <section className="hero">
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
        <button className="btn" type="submit">
          Join
        </button>
      </form>
      <p className="muted" style={{ marginTop: '0.75rem' }}>
        Have a registration link? Open it directly — or paste the event slug above.
      </p>
    </Shell>
  )
}
