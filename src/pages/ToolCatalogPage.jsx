import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@mui/material'
import SectionToggle from '../components/catalog/SectionToggle.jsx'
import ToolCatalogFilters from './tool-catalog/ToolCatalogFilters.jsx'
import ToolCatalogTable from './tool-catalog/ToolCatalogTable.jsx'
import ToolEntryDialog from './tool-catalog/ToolEntryDialog.jsx'
import {
  EMPTY_TOOL_FORM,
  isToolFormValid,
} from './tool-catalog/toolCatalogConfig.js'
import { useAuth } from '../hooks/useAuth.js'
import { useAuthorizedPage } from '../hooks/useAuthorizedPage.js'
import { useStatusFilters } from '../hooks/useStatusFilters.js'
import { useT } from '../hooks/useT.js'
import { canAccessToolCatalog, hasPermission } from '../config/permissions.js'
import { getScopeCatalog } from '../config/scopeCatalog.js'
import {
  createToolRequest,
  getLiveTools,
  getToolRequests,
  updateToolRequest,
  updateToolRequestStatus,
} from '../services/toolCatalog.js'
import { errorMessage, isCanceled } from '../services/api.ts'
import { replaceById } from '../utils/collections.js'

export default function ToolCatalogPage() {
  const t = useT()
  const { session } = useAuth()
  const isAuthorized = useAuthorizedPage(canAccessToolCatalog(session))

  const canViewProduction = hasPermission(session, 'tools.live_view')
  const canViewStaging = hasPermission(session, 'staging.test')
  const canViewRequest = hasPermission(session, 'tools.request_view')
  const canAddRequest = hasPermission(session, 'tools.request_add')
  const canEditRequest = hasPermission(session, 'tools.request_edit')
  const canChangeRequestStatus = hasPermission(session, 'tools.request_status')
  const statusFilters = useStatusFilters({
    canViewProduction,
    canViewStaging,
    canViewRequest,
  })

  // Live tools (code-owned, GET /tools) and tool requests (Postgres-owned,
  // /tool-requests) are two independent sources — no merged list, matching
  // the backend's actual architecture. Loaded separately, filtered locally
  // below rather than through the shared useStatusFilters/useCatalogEntries
  // merged-list machinery (that machinery stays exactly as Freshpedia uses
  // it — this page just stops relying on it).
  const [liveDomains, setLiveDomains] = useState([])
  const [liveLoadError, setLiveLoadError] = useState('')
  const [requests, setRequests] = useState([])
  const [requestsLoadError, setRequestsLoadError] = useState('')

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

  useEffect(() => {
    if (!canViewRequest) return undefined
    const controller = new AbortController()
    getToolRequests({ signal: controller.signal, token: session?.token })
      .then(setRequests)
      .catch((error) => {
        if (!isCanceled(error)) setRequestsLoadError(errorMessage(error))
      })
    return () => controller.abort()
  }, [session?.token, canViewRequest])

  function addRequest(entry) {
    setRequests((current) => [...current, entry])
  }

  function replaceRequest(entry) {
    setRequests((current) => replaceById(current, entry))
  }

  const [systems, setSystems] = useState([])
  const [selectedSystems, setSelectedSystems] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [entryFormTarget, setEntryFormTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_TOOL_FORM)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEntryReadOnly, setIsEntryReadOnly] = useState(false)

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

  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (statusFilters.isRequestActive) {
      const active = statusFilters.availableRequestStatuses.filter(statusFilters.isRequestStatusActive)
      const effectiveStatuses = active.length > 0 ? active : statusFilters.availableRequestStatuses
      let filtered = requests.filter((entry) => effectiveStatuses.includes(entry.status))
      if (selectedSystems.size > 0) {
        filtered = filtered.filter((entry) => selectedSystems.has(entry.domain))
      }
      if (query) {
        filtered = filtered.filter((entry) => entry.title.toLowerCase().includes(query))
      }
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }))
    }

    const active = statusFilters.availableLiveStatuses.filter(statusFilters.isLiveStatusActive)
    const effectiveStatuses = active.length > 0 ? active : statusFilters.availableLiveStatuses
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
  }, [
    liveDomains,
    requests,
    searchQuery,
    selectedSystems,
    statusFilters.availableLiveStatuses,
    statusFilters.availableRequestStatuses,
    statusFilters.isLiveStatusActive,
    statusFilters.isRequestActive,
    statusFilters.isRequestStatusActive,
  ])

  const loadError = statusFilters.isRequestActive ? requestsLoadError : liveLoadError

  function toggleSystemFilter(system) {
    setSelectedSystems((current) => {
      const next = new Set(current)
      if (next.has(system)) next.delete(system)
      else next.add(system)
      return next
    })
  }
  function handleToggleTab(tab) {
    statusFilters.toggleTab(tab)
    setSelectedSystems(new Set())
    setSearchQuery('')
  }

  function openAddEntryDialog() {
    setForm(EMPTY_TOOL_FORM)
    setFormError('')
    setIsEntryReadOnly(false)
    setEntryFormTarget('new')
  }

  const openEditEntryDialog = useCallback((entry) => {
    setForm({
      title: entry.title,
      domain: entry.domain,
      description: entry.description,
    })
    setFormError('')
    setIsEntryReadOnly(entry.status === 'live')
    setEntryFormTarget(entry.id)
  }, [])

  async function handleSubmitEntryForm(event) {
    event.preventDefault()
    setFormError('')
    if (!isToolFormValid(form)) return

    setIsSubmitting(true)
    try {
      if (entryFormTarget === 'new') {
        const created = await createToolRequest(form, session)
        addRequest(created)
      } else {
        const updated = await updateToolRequest(entryFormTarget, form, session)
        replaceRequest(updated)
      }
      setForm(EMPTY_TOOL_FORM)
      setEntryFormTarget(null)
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleChangeRequestStatus(entry, nextStatus) {
    const updated = await updateToolRequestStatus(entry.id, nextStatus, session)
    replaceRequest(updated)
  }

  if (!isAuthorized) return null

  const isEditMode = Boolean(entryFormTarget) && entryFormTarget !== 'new'

  return (
    <>
      <div className="config-section">
        <div className="section-toggle-row">
          <SectionToggle
            options={statusFilters.availableTabs}
            isActive={statusFilters.isTabActive}
            onSelect={handleToggleTab}
            labelForOption={(tab) => t(`toolCatalog.${tab}TabLabel`)}
            ariaLabel={t('toolCatalog.filterByTabLabel')}
          />
          {canAddRequest && statusFilters.isRequestActive && (
            <Button
              className="section-toggle-row__action"
              variant="contained"
              size="small"
              onClick={openAddEntryDialog}
            >
              {t('toolCatalog.addEntry')}
            </Button>
          )}
        </div>

        <ToolCatalogFilters
          availableLiveStatuses={statusFilters.availableLiveStatuses}
          isLiveStatusActive={statusFilters.isLiveStatusActive}
          onToggleLiveStatus={statusFilters.toggleLiveStatus}
          availableRequestStatuses={statusFilters.availableRequestStatuses}
          isRequestStatusActive={statusFilters.isRequestStatusActive}
          onToggleRequestStatus={statusFilters.toggleRequestStatus}
          isRequestActive={statusFilters.isRequestActive}
          systems={systems}
          selectedSystems={selectedSystems}
          onToggleSystem={toggleSystemFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          t={t}
        />

        {loadError && <p className="config-section__notice">{loadError}</p>}

        <ToolCatalogTable
          canChangeRequestStatus={canChangeRequestStatus}
          canEdit={canEditRequest}
          isRequestView={statusFilters.isRequestActive}
          onChangeRequestStatus={handleChangeRequestStatus}
          onEdit={openEditEntryDialog}
          rows={visibleRows}
          t={t}
        />
      </div>

      <ToolEntryDialog
        form={form}
        formError={formError}
        isEditMode={isEditMode}
        isOpen={Boolean(entryFormTarget)}
        isReadOnly={isEntryReadOnly}
        isSubmitting={isSubmitting}
        onClose={() => setEntryFormTarget(null)}
        onSubmit={handleSubmitEntryForm}
        setForm={setForm}
        systems={systems}
        t={t}
      />
    </>
  )
}
