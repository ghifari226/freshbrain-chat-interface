import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@mui/material'
import StandalonePageLayout from './StandalonePageLayout.jsx'
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
import { canAccessToolCatalog } from '../config/permissions.js'
import { getScopeCatalog } from '../config/scopeCatalog.js'
import {
  createToolCatalogEntry,
  listToolCatalogEntries,
  updateToolCatalogEntry,
} from '../services/toolCatalog.js'

export default function ToolCatalogPage() {
  const t = useT()
  const { session } = useAuth()
  const isAuthorized = useAuthorizedPage(canAccessToolCatalog(session))

  const canViewProduction = Boolean(session?.['tool.view'])
  const canViewStaging = Boolean(session?.['staging.test'])
  const canViewRequest = Boolean(session?.['tool.request'])
  const statusFilters = useStatusFilters({
    canViewProduction,
    canViewStaging,
    canViewRequest,
  })
  const { filterByStatus } = statusFilters

  const [entries, setEntries] = useState([])
  const [systems, setSystems] = useState([])
  const [selectedSystems, setSelectedSystems] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [entryFormTarget, setEntryFormTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_TOOL_FORM)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    listToolCatalogEntries().then((data) => {
      if (!cancelled) setEntries(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

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
      .sort((a, b) => a.name.localeCompare(b.name))
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
        const updated = await updateToolCatalogEntry(entryFormTarget, form, session)
        setEntries((current) =>
          current.map((entry) => (entry.id === entryFormTarget ? updated : entry)),
        )
      }
      setForm(EMPTY_TOOL_FORM)
      setEntryFormTarget(null)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthorized) return null

  const isEditMode = Boolean(entryFormTarget) && entryFormTarget !== 'new'

  return (
    <StandalonePageLayout titleKey="toolCatalog.title">
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
    </StandalonePageLayout>
  )
}
