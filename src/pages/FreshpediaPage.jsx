import { useMemo, useState } from 'react'
import { Button } from '@mui/material'
import SectionToggle from '../components/catalog/SectionToggle.jsx'
import FreshpediaEntryDialog from './freshpedia/FreshpediaEntryDialog.jsx'
import FreshpediaEntryList from './freshpedia/FreshpediaEntryList.jsx'
import FreshpediaFilters from './freshpedia/FreshpediaFilters.jsx'
import {
  EMPTY_FRESHPEDIA_FORM,
  TRANSITION_BY_STATUS,
  isFreshpediaFormValid,
} from './freshpedia/freshpediaConfig.js'
import { useAuth } from '../hooks/useAuth.js'
import { useAuthorizedPage } from '../hooks/useAuthorizedPage.js'
import { useStatusFilters } from '../hooks/useStatusFilters.js'
import { useCatalogEntries } from '../hooks/useCatalogEntries.js'
import { useT } from '../hooks/useT.js'
import { canAccessFreshpedia, canChangeFreshpediaStatus, canPromote, hasPermission } from '../config/permissions.js'
import {
  createFreshpediaEntry,
  getFreshpediaEntries,
  getFreshpediaRequestEntries,
  promoteFreshpediaRequestEntry,
  updateFreshpediaEntryStatus,
  updateFreshpediaEntry,
  updateFreshpediaRequestEntry,
  updateFreshpediaRequestStatus,
} from '../services/freshpedia.js'
import { errorMessage } from '../services/api.ts'

export default function FreshpediaPage({ language }) {
  const t = useT()
  const { session } = useAuth()
  const isAuthorized = useAuthorizedPage(canAccessFreshpedia(session))

  const canViewProduction = hasPermission(session, 'freshpedia.live_view')
  const canViewStaging = hasPermission(session, 'staging.test')
  const canViewRequest = hasPermission(session, 'freshpedia.request_view')
  const canAddRequest = hasPermission(session, 'freshpedia.request_add')
  const canEditRequest = hasPermission(session, 'freshpedia.request_edit')
  const canEditLive = hasPermission(session, 'freshpedia.live_edit')
  const canChangeStatus = canChangeFreshpediaStatus(session)
  const canChangeRequestStatus = hasPermission(session, 'freshpedia.request_status')
  const canPromoteEntries = canPromote(session)
  const statusFilters = useStatusFilters({
    canViewProduction,
    canViewStaging,
    canViewRequest,
  })
  const { filterByStatus } = statusFilters

  const { entries, entriesLoaded, loadError, addEntry, replaceEntry } = useCatalogEntries({
    loadPublished: getFreshpediaEntries,
    loadRequests: getFreshpediaRequestEntries,
    canViewRequests: canViewRequest,
    token: session?.token,
  })
  const [selectedTypes, setSelectedTypes] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [entryFormTarget, setEntryFormTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FRESHPEDIA_FORM)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEntryReadOnly, setIsEntryReadOnly] = useState(false)

  const visibleEntries = useMemo(() => {
    const locale = language === 'id' ? 'id' : 'en'
    let filtered = filterByStatus(entries)
    if (selectedTypes.size > 0) {
      filtered = filtered.filter((entry) => selectedTypes.has(entry.type))
    }
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      filtered = filtered.filter((entry) => entry.title.toLowerCase().includes(query))
    }
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title, locale))
  }, [entries, filterByStatus, language, searchQuery, selectedTypes])

  const isEditMode = Boolean(entryFormTarget) && entryFormTarget !== 'new'

  function toggleTypeFilter(type) {
    setSelectedTypes((current) => {
      const next = new Set(current)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }
  function handleToggleTab(tab) {
    statusFilters.toggleTab(tab)
    setSelectedTypes(new Set())
    setSearchQuery('')
  }

  function openAddEntryDialog() {
    setForm(EMPTY_FRESHPEDIA_FORM)
    setFormError('')
    setIsEntryReadOnly(false)
    setEntryFormTarget('new')
  }

  function openEditEntryDialog(entry) {
    setForm({
      title: entry.title,
      type: entry.type,
      content:
        typeof entry.content === 'string'
          ? entry.content
          : (entry.content?.[language] ?? ''),
      fileName: entry.fileName ?? '',
      aliasTargetId: entry.aliasTargetId ?? null,
      aliasPhrase: entry.aliasPhrase ?? '',
    })
    setFormError('')
    setIsEntryReadOnly(entry.requestStatus === 'live')
    setEntryFormTarget(entry.id)
  }

  async function handleSubmitEntryForm(event) {
    event.preventDefault()
    setFormError('')
    if (!isFreshpediaFormValid(form)) return

    setIsSubmitting(true)
    try {
      if (entryFormTarget === 'new') {
        const created = await createFreshpediaEntry(form, session)
        addEntry(created)
      } else {
        const target = entries.find((entry) => entry.id === entryFormTarget)
        const update = target?.status === 'request' ? updateFreshpediaRequestEntry : updateFreshpediaEntry
        const updated = await update(entryFormTarget, form, session)
        replaceEntry(updated)
      }
      setForm(EMPTY_FRESHPEDIA_FORM)
      setEntryFormTarget(null)
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleTransition(entry) {
    const transition = TRANSITION_BY_STATUS[entry.status]
    const updated = await updateFreshpediaEntryStatus(
      entry.id,
      transition.toStatus,
      session,
    )
    replaceEntry(updated)
  }

  async function handlePromote(entry) {
    const updated = await promoteFreshpediaRequestEntry(entry.id, session)
    replaceEntry(updated)
  }

  async function handleChangeRequestStatus(entry, nextRequestStatus) {
    const updated = await updateFreshpediaRequestStatus(entry.id, nextRequestStatus, session)
    replaceEntry(updated)
  }

  if (!isAuthorized) return null

  return (
    <>
      <div className="config-section">
        <div className="section-toggle-row">
          <SectionToggle
            options={statusFilters.availableTabs}
            isActive={statusFilters.isTabActive}
            onSelect={handleToggleTab}
            labelForOption={(tab) => t(`freshpedia.${tab}TabLabel`)}
            ariaLabel={t('freshpedia.filterByTabLabel')}
          />
          {canAddRequest && statusFilters.isRequestActive && (
            <Button
              className="section-toggle-row__action"
              variant="contained"
              size="small"
              onClick={openAddEntryDialog}
            >
              {t('freshpedia.addEntry')}
            </Button>
          )}
        </div>

        <FreshpediaFilters
          availableLiveStatuses={statusFilters.availableLiveStatuses}
          isLiveStatusActive={statusFilters.isLiveStatusActive}
          onToggleLiveStatus={statusFilters.toggleLiveStatus}
          availableRequestStatuses={statusFilters.availableRequestStatuses}
          isRequestStatusActive={statusFilters.isRequestStatusActive}
          onToggleRequestStatus={statusFilters.toggleRequestStatus}
          isRequestActive={statusFilters.isRequestActive}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTypes={selectedTypes}
          onToggleType={toggleTypeFilter}
          t={t}
        />

        {loadError && <p className="config-section__notice">{loadError}</p>}

        {entriesLoaded && (
          <FreshpediaEntryList
            canChangeRequestStatus={canChangeRequestStatus}
            canChangeStatus={canChangeStatus}
            canEditLive={canEditLive}
            canEditRequest={canEditRequest}
            canPromote={canPromoteEntries}
            entries={entries}
            isRequestActive={statusFilters.isRequestActive}
            onChangeRequestStatus={handleChangeRequestStatus}
            onEdit={openEditEntryDialog}
            onPromote={handlePromote}
            onTransition={handleTransition}
            t={t}
            visibleEntries={visibleEntries}
          />
        )}
      </div>

      <FreshpediaEntryDialog
        form={form}
        formError={formError}
        isEditMode={isEditMode}
        isOpen={Boolean(entryFormTarget)}
        isReadOnly={isEntryReadOnly}
        isSubmitting={isSubmitting}
        entries={entries}
        onClose={() => setEntryFormTarget(null)}
        onSubmit={handleSubmitEntryForm}
        setForm={setForm}
        t={t}
      />
    </>
  )
}
