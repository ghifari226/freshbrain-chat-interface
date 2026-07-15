import { useContext } from 'react'
import { AuthContext } from '../lib/AuthContext.js'

export function useAuth() {
  return useContext(AuthContext)
}
