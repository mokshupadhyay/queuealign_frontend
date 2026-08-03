/** Parse Event join QR / ticket QR / bare slug from camera decode text. */
export function parseQueueAlignScan(raw: string): { type: 'event'; slug: string } | { type: 'ticket'; slug: string; token: string } | { type: 'slug'; slug: string } | null {
  const text = raw.trim()
  if (!text) return null

  const ticketMatch = text.match(/\/e\/([^/]+)\/t\/([a-f0-9]+)/i)
  if (ticketMatch) {
    return { type: 'ticket', slug: ticketMatch[1].toLowerCase(), token: ticketMatch[2].toLowerCase() }
  }

  const eventMatch = text.match(/\/e\/([^/?#]+)/i)
  if (eventMatch) {
    return { type: 'event', slug: eventMatch[1].toLowerCase() }
  }

  try {
    const url = new URL(text)
    const ticket = url.pathname.match(/\/e\/([^/]+)\/t\/([a-f0-9]+)/i)
    if (ticket) {
      return { type: 'ticket', slug: ticket[1].toLowerCase(), token: ticket[2].toLowerCase() }
    }
    const event = url.pathname.match(/\/e\/([^/]+)/i)
    if (event) {
      return { type: 'event', slug: event[1].toLowerCase() }
    }
  } catch {
    /* not a URL */
  }

  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(text)) {
    return { type: 'slug', slug: text.toLowerCase() }
  }

  return null
}

export function extractCheckinToken(raw: string): string | null {
  const parsed = parseQueueAlignScan(raw)
  if (parsed?.type === 'ticket') return parsed.token
  if (/^[a-f0-9]{16,}$/i.test(raw.trim())) return raw.trim().toLowerCase()
  return null
}
