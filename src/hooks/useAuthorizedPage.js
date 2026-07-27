import { useEffect } from 'react'
import { useRoute } from './useRoute.js'

export function useAuthorizedPage(isAuthorized, fallbackPath = '/') {
  const [, navigate] = useRoute()

  useEffect(() => {
    if (!isAuthorized) navigate(fallbackPath)
  }, [fallbackPath, isAuthorized, navigate])

  return isAuthorized
}
