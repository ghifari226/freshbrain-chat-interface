import { useEffect, useState } from 'react'
import { errorMessage, isCanceled } from '../services/api.ts'
import { mergeById, replaceById } from '../utils/collections.js'

// Shared by FreshpediaPage.jsx/ToolCatalogPage.jsx — same shape both
// pages needed: two collections, one list. The published and request-
// pipeline entries are fetched separately (loadPublished/loadRequests)
// and merged into one `entries` array by id — everything downstream
// (visibleEntries, the Live/Request tabs) already treats entries
// uniformly regardless of which endpoint they came from. The request
// fetch only fires when canViewRequests is already true, same gate the
// Request tab and Add Entry button use. Merging by id (mergeById) matters
// because a promoted entry satisfies both endpoints' predicates at once
// (status!=='request' for the published list, requestStatus truthy for
// the request list) — naively concatenating would render it twice.
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
