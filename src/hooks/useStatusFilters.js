import { useCallback, useMemo, useState } from 'react'

// Two top-level tabs (2026-08-03, replacing the old flat 3-way
// production/staging/request chip row) — Live (production+staging) and
// Request. Production/Staging are now a sub-filter shown only while the
// Live tab is active, not siblings of Request at the same level.
const TABS = ['live', 'request']
const LIVE_SUB_STATUSES = ['production', 'staging']
// Request tab's own sub-filter (2026-08-04) — this exact order (not
// lifecycle order draft->posted->live), per the user. Always all three;
// no permission gates this beyond reaching the Request tab at all (see
// requestStatus's meaning in domain.ts — draft/posted/live-frozen are all
// entries the actor can already see once request_view is granted).
const REQUEST_SUB_STATUSES = ['live', 'posted', 'draft']

export function useStatusFilters({
  canViewProduction,
  canViewStaging,
  canViewRequest,
}) {
  const canViewLive = canViewProduction || canViewStaging
  const [activeTab, setActiveTab] = useState(() => (!canViewLive && canViewRequest ? 'request' : 'live'))
  const [selectedLiveStatuses, setSelectedLiveStatuses] = useState(new Set())
  const [selectedRequestStatuses, setSelectedRequestStatuses] = useState(new Set())

  const availableTabs = useMemo(
    () => TABS.filter((tab) => (tab === 'live' ? canViewLive : canViewRequest)),
    [canViewLive, canViewRequest],
  )

  const availableLiveStatuses = useMemo(
    () =>
      LIVE_SUB_STATUSES.filter(
        (status) =>
          (status === 'production' && canViewProduction) || (status === 'staging' && canViewStaging),
      ),
    [canViewProduction, canViewStaging],
  )

  // Always all three while the Request tab is reachable at all — see the
  // comment on REQUEST_SUB_STATUSES above for why there's no per-status gate.
  const availableRequestStatuses = useMemo(
    () => (canViewRequest ? REQUEST_SUB_STATUSES : []),
    [canViewRequest],
  )

  // Switching tabs clears both sub-status filters (2026-08-04) — a stale
  // Production-only selection from Live silently carrying over into
  // Request (where it means nothing) or vice versa was confusing; a fresh
  // tab starts unfiltered.
  const toggleTab = useCallback((tab) => {
    setActiveTab(tab)
    setSelectedLiveStatuses(new Set())
    setSelectedRequestStatuses(new Set())
  }, [])

  const isTabActive = useCallback((tab) => activeTab === tab, [activeTab])

  const toggleLiveStatus = useCallback((status) => {
    setSelectedLiveStatuses((current) => {
      const next = new Set(current)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }, [])

  const isLiveStatusActive = useCallback(
    (status) => selectedLiveStatuses.has(status),
    [selectedLiveStatuses],
  )

  const toggleRequestStatus = useCallback((status) => {
    setSelectedRequestStatuses((current) => {
      const next = new Set(current)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }, [])

  const isRequestStatusActive = useCallback(
    (status) => selectedRequestStatuses.has(status),
    [selectedRequestStatuses],
  )

  const isRequestActive = activeTab === 'request'

  const filterByStatus = useCallback(
    (entries) => {
      if (isRequestActive) {
        // requestStatus (not status) drives Request-tab membership — set
        // once at creation and never unset, so a promoted entry (status
        // moved on to staging/production, requestStatus frozen at 'live')
        // still shows up here as permanent history. See
        // services/freshpedia.js's getFreshpediaRequestEntries. Empty
        // sub-filter selection means "show all three", same convention as
        // the Live tab's Production/Staging sub-filter below.
        const effectiveRequestStatuses =
          selectedRequestStatuses.size === 0 ? new Set(REQUEST_SUB_STATUSES) : selectedRequestStatuses
        return entries.filter(
          (entry) => Boolean(entry.requestStatus) && effectiveRequestStatuses.has(entry.requestStatus),
        )
      }

      const effectiveStatuses =
        selectedLiveStatuses.size === 0 ? new Set(['production', 'staging']) : selectedLiveStatuses

      return entries.filter((entry) => {
        if (entry.status === 'production' && !canViewProduction) return false
        if (entry.status === 'staging' && !canViewStaging) return false
        if (entry.status === 'request') return false
        return effectiveStatuses.has(entry.status)
      })
    },
    [canViewProduction, canViewStaging, isRequestActive, selectedLiveStatuses, selectedRequestStatuses],
  )

  return {
    availableTabs,
    isTabActive,
    toggleTab,
    availableLiveStatuses,
    isLiveStatusActive,
    toggleLiveStatus,
    availableRequestStatuses,
    isRequestStatusActive,
    toggleRequestStatus,
    isRequestActive,
    filterByStatus,
  }
}
