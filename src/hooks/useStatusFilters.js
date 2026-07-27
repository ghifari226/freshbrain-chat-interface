import { useCallback, useMemo, useState } from 'react'

const STATUS_FILTERS = ['production', 'staging', 'request']

export function useStatusFilters({
  canViewProduction,
  canViewStaging,
  canViewRequest,
}) {
  const [selectedStatuses, setSelectedStatuses] = useState(new Set())
  const [isRequestActive, setIsRequestActive] = useState(
    () => !(canViewProduction || canViewStaging) && canViewRequest,
  )

  const availableStatuses = useMemo(
    () =>
      STATUS_FILTERS.filter(
        (status) =>
          (status === 'production' && canViewProduction) ||
          (status === 'staging' && canViewStaging) ||
          (status === 'request' && canViewRequest),
      ),
    [canViewProduction, canViewRequest, canViewStaging],
  )

  const toggleStatus = useCallback(
    (status) => {
      if (status === 'request') {
        setIsRequestActive((current) => {
          const next = !current
          if (!next) setSelectedStatuses(new Set())
          return next
        })
        return
      }

      if (isRequestActive) {
        setIsRequestActive(false)
        setSelectedStatuses(new Set([status]))
        return
      }

      setSelectedStatuses((current) => {
        const next = new Set(current)
        if (next.has(status)) next.delete(status)
        else next.add(status)
        return next
      })
    },
    [isRequestActive],
  )

  const isStatusActive = useCallback(
    (status) =>
      status === 'request'
        ? isRequestActive
        : !isRequestActive && selectedStatuses.has(status),
    [isRequestActive, selectedStatuses],
  )

  const filterByStatus = useCallback(
    (entries) => {
      if (isRequestActive) {
        return entries.filter((entry) => entry.status === 'request')
      }

      const effectiveStatuses =
        selectedStatuses.size === 0
          ? new Set(['production', 'staging'])
          : selectedStatuses

      return entries.filter((entry) => {
        if (entry.status === 'production' && !canViewProduction) return false
        if (entry.status === 'staging' && !canViewStaging) return false
        if (entry.status === 'request') return false
        return effectiveStatuses.has(entry.status)
      })
    },
    [canViewProduction, canViewStaging, isRequestActive, selectedStatuses],
  )

  const openRequestView = useCallback(() => setIsRequestActive(true), [])

  return {
    availableStatuses,
    filterByStatus,
    isRequestActive,
    isStatusActive,
    openRequestView,
    toggleStatus,
  }
}
