import { useEffect } from 'react'
import { AuthContext } from './AuthContext.js'
import { authenticate } from '../services/authService.js'
import { setUnauthorizedHandler } from '../services/api.js'
import { useRoute } from '../hooks/useRoute.js'

export function AuthProvider({ session, setSession, children }) {
  const [, navigate] = useRoute()

  function forceLogout() {
    setSession(null)
    navigate('/')
  }

  // Registers once per mount, not per session change — a 401 firing mid-login
  // (before setSession's own closure below updates) still needs to clear
  // whatever's in localStorage and bounce home, so this doesn't depend on
  // `session` being current inside the closure the way `logout()` below does.
  useEffect(() => {
    setUnauthorizedHandler(forceLogout)
    return () => setUnauthorizedHandler(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = {
    session,
    // Both login and logout reset the URL to / — otherwise whatever path
    // happened to be in the address bar (e.g. a deep link into /config/*,
    // or wherever the previous session left off) persists across the auth
    // boundary, and the app lands on a seemingly random page instead of
    // the chat home.
    async login(email, password) {
      const nextSession = await authenticate(email, password)
      setSession(nextSession)
      navigate('/')
      return nextSession
    },
    logout: forceLogout,
    // Patches the live session in place — for when the logged-in user edits
    // their own record elsewhere (e.g. Users page) and fields like the 17
    // permission booleans need to reflect immediately, without forcing a
    // full logout/login to re-fetch via authenticate().
    updateSession(patch) {
      setSession((prev) => (prev ? { ...prev, ...patch } : prev))
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
