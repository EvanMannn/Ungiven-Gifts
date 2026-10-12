import type {
  AdminView,
  Dashboard,
  EventCreate,
  EventCreated,
  EventPublic,
  EventUpdate,
  LoginResponse,
} from './types'

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  // The HTTP status, or 0 when the server couldn't be reached at all (no response to read).
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * Tagged template for URL paths: every ${value} is percent-encoded, so a value containing
 * "/", "?" or "#" can't change which endpoint is hit. The literal parts are left alone.
 */
function path(strings: TemplateStringsArray, ...values: string[]): string {
  return strings.reduce((out, str, i) => out + encodeURIComponent(values[i - 1]) + str)
}

interface RequestOptions {
  method?: string
  body?: unknown
  token?: string
  adminKey?: string
}

async function request<T>(url: string, { method = 'GET', body, token, adminKey }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  if (adminKey) headers['X-Admin-Key'] = adminKey

  let res: Response
  try {
    res = await fetch(`${BASE_URL}/api${url}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // fetch only rejects when no response arrived: offline, DNS failure, server down, or CORS.
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }
  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res))
  }
  // 204 No Content has no body, so res.json() would throw.
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data.detail === 'string') return data.detail
    // FastAPI validation errors: [{ loc, msg }, ...]
    if (Array.isArray(data.detail)) {
      return data.detail.map((d: { loc?: unknown[]; msg: string }) => `${d.loc?.slice(1).join('.')}: ${d.msg}`).join('\n')
    }
  } catch {
    // fall through
  }
  return `Request failed (${res.status})`
}

export const api = {
  createEvent: (body: EventCreate) => request<EventCreated>('/events', { method: 'POST', body }),
  getEvent: (slug: string) => request<EventPublic>(path`/events/${slug}`),

  login: (slug: string, participantId: string, password: string) =>
    request<LoginResponse>(path`/events/${slug}/login`, {
      method: 'POST',
      body: { participant_id: participantId, password },
    }),
  dashboard: (slug: string, token: string) => request<Dashboard>(path`/events/${slug}/me`, { token }),
  chooseRestriction: (slug: string, token: string, restriction: string) =>
    request<Dashboard>(path`/events/${slug}/me/restriction`, { method: 'POST', token, body: { restriction } }),
  finishOnboarding: (slug: string, token: string) =>
    request<Dashboard>(path`/events/${slug}/me/onboarded`, { method: 'POST', token }),

  adminView: (slug: string, adminKey: string) => request<AdminView>(path`/events/${slug}/admin`, { adminKey }),
  updateEvent: (slug: string, adminKey: string, body: EventUpdate) =>
    request<AdminView>(path`/events/${slug}/admin`, { method: 'PATCH', adminKey, body }),
  resetPassword: (slug: string, adminKey: string, participantId: string) =>
    request<AdminView>(path`/events/${slug}/admin/participants/${participantId}/reset-password`, {
      method: 'POST',
      adminKey,
    }),
}
