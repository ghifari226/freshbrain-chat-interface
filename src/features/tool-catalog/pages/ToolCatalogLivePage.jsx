import { useEffect, useMemo, useState } from 'react'
import ToolCatalogFilters from '../components/ToolCatalogFilters.jsx'
import ToolCatalogTable from '../components/ToolCatalogTable.jsx'
import { LIVE_STATUSES } from '../model/toolCatalogConfig.js'
import { useAuth } from '@features/authentication'
import { useAuthorizedPage } from '@shared/hooks/useAuthorizedPage.js'
import { useT } from '@shared/i18n/useT.js'
import { canAccessToolCatalog, hasPermission } from '@features/access-control'
import { getScopeCatalog } from '@features/access-control'
import { getLiveTools } from '../api/toolCatalogApi.js'
import { errorMessage, isCanceled } from '@integrations/http/httpClient.ts'

export default function ToolCatalogLivePage() {
  const t = useT()
  const { session } = useAuth()
  const isAuthorized = useAuthorizedPage(canAccessToolCatalog(session))

  const canViewProduction = hasPermission(session, 'tools.live_view')
  const canViewStaging = hasPermission(session, 'staging.test')
  const availableLiveStatuses = LIVE_STATUSES.filter(
    (status) => (status === 'production' && canViewProduction) || (status === 'staging' && canViewStaging),
  )
  const [selectedLiveStatuses, setSelectedLiveStatuses] = useState(new Set())

  const [liveDomains, setLiveDomains] = useState([])
  const [liveLoadError, setLiveLoadError] = useState('')

  useEffect(() => {
    if (!canViewProduction && !canViewStaging) return undefined
    const controller = new AbortController()
    getLiveTools({ signal: controller.signal, token: session?.token })
      .then(setLiveDomains)
      .catch((error) => {
        if (!isCanceled(error)) setLiveLoadError(errorMessage(error))
      })
    return () => controller.abort()
  }, [session?.token, canViewProduction, canViewStaging])

  const [systems, setSystems] = useState([])
  const [selectedSystems, setSelectedSystems] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    getScopeCatalog().then((data) => {
      if (!cancelled) {
        setSystems(data.map((entry) => ({ system: entry.system, label: entry.label })))
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  function toggleLiveStatus(status) {
    setSelectedLiveStatuses((current) => {
      const next = new Set(current)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  function toggleSystemFilter(system) {
    setSelectedSystems((current) => {
      const next = new Set(current)
      if (next.has(system)) next.delete(system)
      else next.add(system)
      return next
    })
  }

  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const active = availableLiveStatuses.filter((status) => selectedLiveStatuses.has(status))
    const effectiveStatuses = active.length > 0 ? active : availableLiveStatuses
    let filtered = liveDomains
      .flatMap((group) =>
        group.tools.map((tool) => ({ ...tool, domain: group.domain, id: `${group.domain}.${tool.name}` })),
      )
      .filter((entry) => effectiveStatuses.includes(entry.status))
    if (selectedSystems.size > 0) {
      filtered = filtered.filter((entry) => selectedSystems.has(entry.domain))
    }
    if (query) {
      filtered = filtered.filter((entry) => `${entry.domain}.${entry.name}`.toLowerCase().includes(query))
    }
    return [...filtered]
      .sort(
        (a, b) =>
          a.domain.localeCompare(b.domain, 'en', { sensitivity: 'base' }) ||
          a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
      )
      .map((entry) => ({ ...entry, displayName: `${entry.domain}.${entry.name}` }))
  }, [availableLiveStatuses, liveDomains, searchQuery, selectedLiveStatuses, selectedSystems])

  if (!isAuthorized) return null

  return (
    <div className="config-section">
      <ToolCatalogFilters
        availableLiveStatuses={availableLiveStatuses}
        isLiveStatusActive={(status) => selectedLiveStatuses.has(status)}
        onToggleLiveStatus={toggleLiveStatus}
        availableRequestStatuses={[]}
        isRequestStatusActive={() => false}
        onToggleRequestStatus={() => {}}
        isRequestActive={false}
        systems={systems}
        selectedSystems={selectedSystems}
        onToggleSystem={toggleSystemFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        t={t}
      />

      {liveLoadError && <p className="config-section__notice">{liveLoadError}</p>}

      <ToolCatalogTable
        canChangeRequestStatus={false}
        canEdit={false}
        isRequestView={false}
        onChangeRequestStatus={() => {}}
        onEdit={() => {}}
        rows={visibleRows}
        t={t}
      />
    </div>
  )
}
