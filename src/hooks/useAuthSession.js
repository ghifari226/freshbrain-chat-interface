import { useEffect, useState } from 'react'

const STORAGE_KEY = 'freshbrain-session'

function getStoredSession() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    // Shape-sniff guard, not a migration: a session cached before the
    // resource.action permission-key refactor won't have this field at all.
    // Rather than rendering with 19 undefined (falsy) permission fields —
    // which fails safe but confusingly hides nav items until the user logs
    // out/in again — force a clean re-login instead.
    if (session && !('user.view' in session)) return null
    return session
  } catch {
    return null
  }
}

export function useAuthSession() {
  const [session, setSession] = useState(getStoredSession)

  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [session])

  return [session, setSession]
}
