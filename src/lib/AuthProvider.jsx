import { AuthContext } from './AuthContext.js'
import { authenticate } from './auth.js'

export function AuthProvider({ session, setSession, children }) {
  const value = {
    session,
    async login(email, password) {
      const nextSession = await authenticate(email, password)
      setSession(nextSession)
      return nextSession
    },
    logout() {
      setSession(null)
    },
    // Patches the live session in place — for when the logged-in user edits
    // their own record elsewhere (e.g. Users page) and fields like
    // allowed_permissions/allowed_scopes need to reflect immediately,
    // without forcing a full logout/login to re-fetch via authenticate().
    updateSession(patch) {
      setSession((prev) => (prev ? { ...prev, ...patch } : prev))
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
