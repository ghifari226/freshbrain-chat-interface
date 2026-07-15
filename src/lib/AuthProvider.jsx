import { AuthContext } from './AuthContext.js'
import { authenticate, register as registerUser } from './auth.js'

export function AuthProvider({ session, setSession, children }) {
  const value = {
    session,
    async login(username, password) {
      const nextSession = await authenticate(username, password)
      setSession(nextSession)
      return nextSession
    },
    async register(username, password, role) {
      const nextSession = await registerUser(username, password, role)
      setSession(nextSession)
      return nextSession
    },
    logout() {
      setSession(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
