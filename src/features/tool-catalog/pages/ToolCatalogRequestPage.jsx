import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@mui/material'
import ToolCatalogFilters from '../components/ToolCatalogFilters.jsx'
import ToolCatalogTable from '../components/ToolCatalogTable.jsx'
import ToolEntryDialog from '../components/ToolEntryDialog.jsx'
import { EMPTY_TOOL_FORM, REQUEST_STATUSES, isToolFormValid } from '../model/toolCatalogConfig.js'
import { useAuth } from '@features/authentication'
import { useAuthorizedPage } from '@shared/hooks/useAuthorizedPage.js'
import { useT } from '@shared/i18n/useT.js'
import { canAccessToolRequests, hasPermission } from '@features/access-control'
import { getScopeCatalog } from '@features/access-control'
import {
  createToolRequest,
  getToolRequests,
  updateToolRequest,
  updateToolRequestStatus,
} from '../api/toolCatalogApi.js'
import { errorMessage, isCanceled } from '@integrations/http/httpClient.ts'
import { replaceById } from '@shared/lib/collections.js'

export default function ToolCatalogRequestPage() {
  const t = useT()
  const { session } = useAuth()
  const isAuthorized = useAuthorizedPage(canAccessToolRequests(session))

  const canAddRequest = hasPermission(session, 'tools.request_add')
  const canEditRequest = hasPermission(session, 'tools.request_edit')
  const canChangeRequestStatus = hasPermission(session, 'tools.request_status')
  const [selectedRequestStatuses, setSelectedRequestStatuses] = useState(new Set())

  const [requests, setRequests] = useState([])
  const [requestsLoadError, setRequestsLoadError] = useState('')

  useEffect(() => {
    if (!isAuthorized) return undefined
    const controller = new AbortController()
    getToolRequests({ signal: controller.signal, token: session?.token })
      .then(setRequests)
      .catch((error) => {
        if (!isCanceled(error)) setRequestsLoadError(errorMessage(error))
      })
    return () => controller.abort()
  }, [session?.token, isAuthorized])

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

  function toggleRequestStatus(status) {
    setSelectedRequestStatuses((current) => {
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
    const active = REQUEST_STATUSES.filter((status) => selectedRequestStatuses.has(status))
    const effectiveStatuses = active.length > 0 ? active : REQUEST_STATUSES
    let filtered = requests.filter((entry) => effectiveStatuses.includes(entry.status))
    if (selectedSystems.size > 0) {
      filtered = filtered.filter((entry) => selectedSystems.has(entry.domain))
    }
    if (query) {
      filtered = filtered.filter((entry) => entry.title.toLowerCase().includes(query))
    }
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }))
  }, [requests, searchQuery, selectedRequestStatuses, selectedSystems])

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
        {canAddRequest && (
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
          availableLiveStatuses={[]}
          isLiveStatusActive={() => false}
          onToggleLiveStatus={() => {}}
          availableRequestStatuses={REQUEST_STATUSES}
          isRequestStatusActive={(status) => selectedRequestStatuses.has(status)}
          onToggleRequestStatus={toggleRequestStatus}
          isRequestActive
          systems={systems}
          selectedSystems={selectedSystems}
          onToggleSystem={toggleSystemFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          t={t}
        />

        {requestsLoadError && <p className="config-section__notice">{requestsLoadError}</p>}

        <ToolCatalogTable
          canChangeRequestStatus={canChangeRequestStatus}
          canEdit={canEditRequest}
          isRequestView
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
