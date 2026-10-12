// Per-event credentials kept in localStorage, so someone in two events stays logged into both.

interface StoredSession {
  token?: string
  adminKey?: string
}

const key = (slug: string) => `ungiven-gifts:${slug}`

function read(slug: string): StoredSession {
  try {
    return JSON.parse(localStorage.getItem(key(slug)) ?? '{}') as StoredSession
  } catch {
    return {}
  }
}

function write(slug: string, session: StoredSession) {
  try {
    localStorage.setItem(key(slug), JSON.stringify(session))
  } catch {
    // Private browsing or storage disabled: the user just has to log in again next visit.
  }
}

export const session = {
  token: (slug: string) => read(slug).token,
  adminKey: (slug: string) => read(slug).adminKey,
  setToken: (slug: string, token: string | undefined) => write(slug, { ...read(slug), token }),
  setAdminKey: (slug: string, adminKey: string) => write(slug, { ...read(slug), adminKey }),
}
