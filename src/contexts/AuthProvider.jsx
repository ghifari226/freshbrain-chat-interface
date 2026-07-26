import { AuthContext } from './AuthContext.js'
import { authenticate } from '../services/authService.js'
import { useRoute } from '../hooks/useRoute.js'

export function AuthProvider({ session, setSession, children }) {
  const [, navigate] = useRoute()

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
    logout() {
      setSession(null)
      navigate('/')
    },
    // Patches the live session in place — for when the logged-in user edits
    // their own record elsewhere (e.g. Users page) and fields like the 12
    // permission booleans need to reflect immediately, without forcing a
    // full logout/login to re-fetch via authenticate().
    updateSession(patch) {
      setSession((prev) => (prev ? { ...prev, ...patch } : prev))
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
