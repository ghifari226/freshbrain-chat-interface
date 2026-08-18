import { useEffect, useState } from 'react'
import { errorMessage, isCanceled } from '@integrations/http/httpClient.ts'
import { mergeById, replaceById } from '@shared/lib/collections.js'
export function useCatalogEntries({ loadPublished, loadRequests, canViewRequests, token }) {
  const [entries, setEntries] = useState([])
  const [entriesLoaded, setEntriesLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const options = { signal: controller.signal, token }
    const requests = [loadPublished(options)]
    if (canViewRequests) requests.push(loadRequests(options))

    Promise.all(requests)
      .then((results) => {
        setEntries(mergeById(results))
        setEntriesLoaded(true)
      })
      .catch((error) => {
        if (!isCanceled(error)) {
          setLoadError(errorMessage(error))
          setEntriesLoaded(true)
        }
      })

    return () => controller.abort()
  }, [canViewRequests, loadPublished, loadRequests, token])

  function addEntry(entry) {
    setEntries((current) => [...current, entry])
  }

  function replaceEntry(entry) {
    setEntries((current) => replaceById(current, entry))
  }

  return { entries, entriesLoaded, loadError, addEntry, replaceEntry }
}
