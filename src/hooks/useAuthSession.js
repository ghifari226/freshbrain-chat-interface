import { useEffect, useState } from 'react'

const STORAGE_KEY = 'freshbrain-session'

function getStoredSession() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    // Shape-sniff guard, not a migration: a session cached before the
    // user_id -> id rename or the flat-booleans -> allowed_permissions
    // collapse (2026-07-27, auth-contract.md) won't have these fields at
    // all. Rather than rendering with `allowed_permissions` silently
    // undefined (every hasPermission() check fails closed, confusingly
    // hiding nav items until the user logs out/in again) — force a clean
    // re-login instead.
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
