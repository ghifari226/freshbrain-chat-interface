import { useEffect, useState } from 'react'

// popstate only fires for back/forward, not for pushState — so navigate()
// below also dispatches this so every useRoute() instance in the tree
// (App, UserMenu, config pages, ...) stays in sync, not just the caller.
const ROUTE_CHANGE_EVENT = 'freshbrain-route-change'

export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    function handleChange() {
      setPath(window.location.pathname)
    }
    window.addEventListener('popstate', handleChange)
    window.addEventListener(ROUTE_CHANGE_EVENT, handleChange)
    return () => {
      window.removeEventListener('popstate', handleChange)
      window.removeEventListener(ROUTE_CHANGE_EVENT, handleChange)
    }
  }, [])

  function navigate(nextPath) {
    if (nextPath !== window.location.pathname) {
      window.history.pushState({}, '', nextPath)
    }
    window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
  }

  return [path, navigate]
}
