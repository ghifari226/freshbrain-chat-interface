import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useAuthorizedPage(isAuthorized, fallbackPath = '/') {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthorized) navigate(fallbackPath)
  }, [fallbackPath, isAuthorized, navigate])

  return isAuthorized
}
