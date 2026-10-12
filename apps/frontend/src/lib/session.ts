// Per-event credentials kept in localStorage, so someone in two events stays logged into both.

interface StoredSession {
  /** Participant login. */
  token?: string
  /** Organizer login for the admin page. Kept separately, since an organizer can also play. */
  adminToken?: string
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
  adminToken: (slug: string) => read(slug).adminToken,
  setToken: (slug: string, token: string | undefined) => write(slug, { ...read(slug), token }),
  setAdminToken: (slug: string, adminToken: string | undefined) => write(slug, { ...read(slug), adminToken }),
}
