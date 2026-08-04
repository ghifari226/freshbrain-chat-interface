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
import { useCatalogEntries } from '../hooks/useCatalogEntries.js'
import { useT } from '../hooks/useT.js'
import { canAccessToolCatalog, canPromote, hasPermission } from '../config/permissions.js'
import { getScopeCatalog } from '../config/scopeCatalog.js'
import {
  createToolCatalogEntry,
  getToolCatalogEntries,
  getToolCatalogRequestEntries,
  promoteToolCatalogRequestEntry,
  updateToolCatalogRequestEntry,
  updateToolCatalogRequestStatus,
} from '../services/toolCatalog.js'
import { errorMessage } from '../services/api.ts'

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
  const canPromoteEntries = canPromote(session)
  const statusFilters = useStatusFilters({
    canViewProduction,
    canViewStaging,
    canViewRequest,
  })
  const { filterByStatus } = statusFilters

  const { entries, loadError, addEntry, replaceEntry } = useCatalogEntries({
    loadPublished: getToolCatalogEntries,
    loadRequests: getToolCatalogRequestEntries,
    canViewRequests: canViewRequest,
    token: session?.token,
  })
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
    let filtered = filterByStatus(entries)
    if (selectedSystems.size > 0) {
      filtered = filtered.filter((entry) => selectedSystems.has(entry.system))
    }
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      filtered = filtered.filter((entry) =>
        `${entry.system}.${entry.name}`.toLowerCase().includes(query),
      )
    }
    return [...filtered]
      .sort(
        (a, b) =>
          a.system.localeCompare(b.system, 'en', { sensitivity: 'base' }) ||
          a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
      )
      .map((entry) => ({
        ...entry,
        displayName: `${entry.system}.${entry.name}`,
      }))
  }, [entries, filterByStatus, searchQuery, selectedSystems])

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
      system: entry.system,
      name: entry.name,
      description: entry.description,
      exampleQuestions: entry.exampleQuestions,
    })
    setFormError('')
    setIsEntryReadOnly(entry.requestStatus === 'live')
    setEntryFormTarget(entry.id)
  }, [])

  async function handleSubmitEntryForm(event) {
    event.preventDefault()
    setFormError('')
    if (!isToolFormValid(form)) return

    setIsSubmitting(true)
    try {
      if (entryFormTarget === 'new') {
        const created = await createToolCatalogEntry(form, session)
        addEntry(created)
      } else {
        const updated = await updateToolCatalogRequestEntry(entryFormTarget, form, session)
        replaceEntry(updated)
      }
      setForm(EMPTY_TOOL_FORM)
      setEntryFormTarget(null)
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePromote(entry) {
    const updated = await promoteToolCatalogRequestEntry(entry.id, session)
    replaceEntry(updated)
  }

  async function handleChangeRequestStatus(entry, nextRequestStatus) {
    const updated = await updateToolCatalogRequestStatus(entry.id, nextRequestStatus, session)
    replaceEntry(updated)
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
          canPromote={canPromoteEntries}
          isRequestView={statusFilters.isRequestActive}
          onChangeRequestStatus={handleChangeRequestStatus}
          onEdit={openEditEntryDialog}
          onPromote={handlePromote}
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
