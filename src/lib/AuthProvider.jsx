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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
