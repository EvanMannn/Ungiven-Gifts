import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from './client'

function mockFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('turns a network failure into an ApiError with status 0', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')))

    const error = await api.getEvent('abc').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0, message: expect.stringMatching(/can't reach the server/i) })
  })

  it('returns undefined for 204 No Content instead of parsing an empty body', async () => {
    mockFetch(() => Promise.resolve(new Response(null, { status: 204 })))

    await expect(api.finishOnboarding('abc', 'token')).resolves.toBeUndefined()
  })

  it('encodes values placed in the URL', async () => {
    const fetchMock = mockFetch(() => Promise.resolve(Response.json({})))

    await api.resetPassword('a/b', 'key', 'id?x#y')
    expect(fetchMock).toHaveBeenCalledWith('/api/events/a%2Fb/admin/participants/id%3Fx%23y/reset-password', expect.anything())
  })

  it('reads FastAPI error details', async () => {
    mockFetch(() => Promise.resolve(Response.json({ detail: 'Event not found.' }, { status: 404 })))

    await expect(api.getEvent('abc')).rejects.toMatchObject({ status: 404, message: 'Event not found.' })
  })
})
