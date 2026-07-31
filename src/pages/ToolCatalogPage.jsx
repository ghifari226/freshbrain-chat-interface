import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@mui/material'
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
  createToolCatalogEntry,
  getToolCatalogEntries,
  getToolCatalogRequestEntries,
  updateToolCatalogRequestEntry,
} from '../services/toolCatalog.js'
import { errorMessage, isCanceled } from '../services/api.ts'

export default function ToolCatalogPage() {
  const t = useT()
  const { session } = useAuth()
  const isAuthorized = useAuthorizedPage(canAccessToolCatalog(session))

  const canViewProduction = hasPermission(session, 'tools.view')
  const canViewStaging = hasPermission(session, 'staging.test')
  const canViewRequest = hasPermission(session, 'tools.request')
  const statusFilters = useStatusFilters({
    canViewProduction,
    canViewStaging,
    canViewRequest,
  })
  const { filterByStatus } = statusFilters

  const [entries, setEntries] = useState([])
  const [systems, setSystems] = useState([])
  const [loadError, setLoadError] = useState('')
  const [selectedSystems, setSelectedSystems] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [entryFormTarget, setEntryFormTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_TOOL_FORM)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Two collections, one list — same pattern as FreshpediaPage.jsx:
  // /tool-catalog (published) and /tool-catalog-request (pending) are
  // fetched separately and merged into one `entries` array. The request
  // fetch only fires when canViewRequest is already true, same gate the
  // "Request" chip and Add Entry button use.
  useEffect(() => {
    const controller = new AbortController()
    const requests = [getToolCatalogEntries({ signal: controller.signal, token: session?.token })]
    if (canViewRequest) {
      requests.push(getToolCatalogRequestEntries({ signal: controller.signal, token: session?.token }))
    }
    Promise.all(requests)
      .then((results) => setEntries(results.flat()))
      .catch((error) => {
        if (!isCanceled(error)) setLoadError(errorMessage(error))
      })
    return () => controller.abort()
  }, [session?.token, canViewRequest])

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

  function openAddEntryDialog() {
    statusFilters.openRequestView()
    setForm(EMPTY_TOOL_FORM)
    setFormError('')
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
        setEntries((current) => [...current, created])
      } else {
        // Only ever a request-status entry — openEditEntryDialog is only
        // reachable from the Request view (ToolCatalogTable.jsx's
        // isRequestView guard on the edit button), unlike Freshpedia
        // there's no published-entry edit path to branch to.
        const updated = await updateToolCatalogRequestEntry(entryFormTarget, form, session)
        setEntries((current) =>
          current.map((entry) => (entry.id === entryFormTarget ? updated : entry)),
        )
      }
      setForm(EMPTY_TOOL_FORM)
      setEntryFormTarget(null)
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthorized) return null

  const isEditMode = Boolean(entryFormTarget) && entryFormTarget !== 'new'

  return (
    <>
      <div className="config-section">
        {canViewRequest && (
          <div className="config-section__title-row">
            <Button
              className="config-section__title-action"
              variant="contained"
              size="small"
              onClick={openAddEntryDialog}
            >
              {t('toolCatalog.addEntry')}
            </Button>
          </div>
        )}

        <ToolCatalogFilters
          availableStatuses={statusFilters.availableStatuses}
          isStatusActive={statusFilters.isStatusActive}
          onToggleStatus={statusFilters.toggleStatus}
          systems={systems}
          selectedSystems={selectedSystems}
          onToggleSystem={toggleSystemFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          t={t}
        />

        {loadError && <p className="config-section__notice">{loadError}</p>}

        <ToolCatalogTable
          isRequestView={statusFilters.isRequestActive}
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
