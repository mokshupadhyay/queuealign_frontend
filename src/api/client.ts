export type ParticipantStatus = 'waiting' | 'called' | 'checked_in' | 'skipped'

export interface Participant {
  id: number
  name: string
  email: string
  team_name: string | null
  queue_number: number
  checkin_token: string
  status: ParticipantStatus
  created_at: string
  called_at: string | null
  checked_in_at: string | null
}

export interface EventCreated {
  slug: string
  name: string
  pin: string
  register_path: string
  desk_path: string
  display_path: string
}

export interface EventPublic {
  slug: string
  name: string
  is_active: boolean
  waiting_count: number
  called_count: number
  checked_in_count: number
  total_count: number
}

export interface RegisterResponse {
  participant: Participant
  status_path: string
  qr_url: string
}

export interface ParticipantStatusOut {
  event_name: string
  event_slug: string
  participant: Participant
  people_ahead: number
  now_serving: number | null
  now_serving_name: string | null
  qr_url: string
  status_path: string
}

export interface DisplayParticipant {
  queue_number: number
  name: string
  team_name: string | null
  status: ParticipantStatus
}

export interface DisplayOut {
  event_name: string
  event_slug: string
  now_serving: DisplayParticipant | null
  up_next: DisplayParticipant[]
  waiting_count: number
  checked_in_count: number
  total_count: number
}

export interface QueueOut {
  event_name: string
  event_slug: string
  now_serving: Participant | null
  participants: Participant[]
  waiting_count: number
  called_count: number
  checked_in_count: number
  skipped_count: number
  total_count: number
}

export interface MessageOut {
  ok: boolean
  message: string
  participant: Participant | null
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? JSON.stringify(body)
      if (Array.isArray(detail)) {
        detail = detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join(', ')
      }
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === 'string' ? detail : 'Request failed')
  }
  return res.json() as Promise<T>
}

export const api = {
  createEvent: (name: string, pin: string) =>
    request<EventCreated>('/api/events', {
      method: 'POST',
      body: JSON.stringify({ name, pin }),
    }),

  getEvent: (slug: string) => request<EventPublic>(`/api/events/${slug}`),

  authDesk: (slug: string, pin: string) =>
    request<{ token: string; expires_in_hours: number }>(`/api/events/${slug}/auth`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  register: (slug: string, data: { name: string; email: string; team_name?: string }) =>
    request<RegisterResponse>(`/api/events/${slug}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  participantStatus: (slug: string, token: string) =>
    request<ParticipantStatusOut>(`/api/events/${slug}/participants/${token}`),

  display: (slug: string) => request<DisplayOut>(`/api/events/${slug}/display`),

  queue: (slug: string, deskToken: string) =>
    request<QueueOut>(`/api/events/${slug}/queue`, {
      headers: { Authorization: `Bearer ${deskToken}` },
    }),

  callNext: (slug: string, deskToken: string) =>
    request<MessageOut>(`/api/events/${slug}/call-next`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${deskToken}` },
    }),

  checkin: (slug: string, deskToken: string, body: { token?: string; queue_number?: number }) =>
    request<MessageOut>(`/api/events/${slug}/checkin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${deskToken}` },
      body: JSON.stringify(body),
    }),

  skip: (slug: string, deskToken: string) =>
    request<MessageOut>(`/api/events/${slug}/skip`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${deskToken}` },
    }),
}

export function deskTokenKey(slug: string) {
  return `queuealign_desk_${slug}`
}
