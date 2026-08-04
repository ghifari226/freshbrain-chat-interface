import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from './AuthContext.js'
import { authenticate } from '../services/authService.js'
import { setUnauthorizedHandler } from '../services/api.ts'

export function AuthProvider({ session, setSession, children }) {
  const navigate = useNavigate()

  const forceLogout = useCallback(() => {
    setSession(null)
    navigate('/')
  }, [navigate, setSession])
  useEffect(() => {
    setUnauthorizedHandler(forceLogout)
    return () => setUnauthorizedHandler(null)
  }, [forceLogout])

  const value = {
    session,
    async login(email, password) {
      const nextSession = await authenticate(email, password)
      setSession(nextSession)
      navigate('/')
      return nextSession
    },
    logout: forceLogout,
    updateSession(patch) {
      setSession((prev) => (prev ? { ...prev, ...patch } : prev))
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
