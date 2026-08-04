import { useEffect, useState } from 'react'

const STORAGE_KEY = 'freshbrain-session'

function getStoredSession() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    if (session && (!('id' in session) || !Array.isArray(session.allowed_permissions))) return null
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
