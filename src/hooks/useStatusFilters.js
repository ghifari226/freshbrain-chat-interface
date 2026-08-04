import { useCallback, useEffect, useMemo, useState } from 'react'
const TABS = ['live', 'request']
const LIVE_SUB_STATUSES = ['production', 'staging']
const DEFAULT_LIVE_STATUSES = new Set(LIVE_SUB_STATUSES)
const REQUEST_SUB_STATUSES = ['live', 'posted', 'draft']
const DEFAULT_REQUEST_STATUSES = new Set(REQUEST_SUB_STATUSES)

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

  useEffect(() => {
    if (!availableTabs.includes(activeTab) && availableTabs[0]) {
      setActiveTab(availableTabs[0])
      setSelectedLiveStatuses(new Set())
      setSelectedRequestStatuses(new Set())
    }
  }, [activeTab, availableTabs])

  const availableLiveStatuses = useMemo(
    () =>
      LIVE_SUB_STATUSES.filter(
        (status) =>
          (status === 'production' && canViewProduction) || (status === 'staging' && canViewStaging),
      ),
    [canViewProduction, canViewStaging],
  )
  const availableRequestStatuses = useMemo(
    () => (canViewRequest ? REQUEST_SUB_STATUSES : []),
    [canViewRequest],
  )
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
        const effectiveRequestStatuses =
          selectedRequestStatuses.size === 0 ? DEFAULT_REQUEST_STATUSES : selectedRequestStatuses
        return entries.filter(
          (entry) => Boolean(entry.requestStatus) && effectiveRequestStatuses.has(entry.requestStatus),
        )
      }

      const effectiveStatuses =
        selectedLiveStatuses.size === 0 ? DEFAULT_LIVE_STATUSES : selectedLiveStatuses

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
