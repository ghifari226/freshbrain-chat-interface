import { useEffect, useMemo, useState } from 'react'
import { Button } from '@mui/material'
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
import { useT } from '../hooks/useT.js'
import { canAccessFreshpedia, canChangeFreshpediaStatus, hasPermission } from '../config/permissions.js'
import {
  createFreshpediaEntry,
  getFreshpediaEntries,
  getFreshpediaRequestEntries,
  updateFreshpediaEntryStatus,
  updateFreshpediaEntry,
  updateFreshpediaRequestEntry,
} from '../services/freshpedia.js'
import { errorMessage, isCanceled } from '../services/api.ts'

export default function FreshpediaPage({ language }) {
  const t = useT()
  const { session } = useAuth()
  const isAuthorized = useAuthorizedPage(canAccessFreshpedia(session))

  const canViewProduction = hasPermission(session, 'freshpedia.view')
  const canViewStaging = hasPermission(session, 'staging.test')
  const canViewRequest = hasPermission(session, 'freshpedia.request')
  const canChangeStatus = canChangeFreshpediaStatus(session)
  const statusFilters = useStatusFilters({
    canViewProduction,
    canViewStaging,
    canViewRequest,
  })
  const { filterByStatus } = statusFilters

  const [entries, setEntries] = useState([])
  const [entriesLoaded, setEntriesLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [selectedTypes, setSelectedTypes] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [entryFormTarget, setEntryFormTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FRESHPEDIA_FORM)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Two collections, one list: /freshpedia (published) and
  // /freshpedia-request (pending) are fetched separately and merged into
  // one `entries` array — everything downstream (visibleEntries, the
  // Production/Staging/Request chips) already treats entries uniformly by
  // `.status` regardless of which endpoint they came from. The request
  // fetch only fires when canViewRequest is already true, same gate the
  // "Request" chip and Add Entry button use — matches the access the old
  // single-endpoint fetch effectively had.
  useEffect(() => {
    const controller = new AbortController()
    const requests = [getFreshpediaEntries({ signal: controller.signal, token: session?.token })]
    if (canViewRequest) {
      requests.push(getFreshpediaRequestEntries({ signal: controller.signal, token: session?.token }))
    }
    Promise.all(requests)
      .then((results) => {
        setEntries(results.flat())
        setEntriesLoaded(true)
      })
      .catch((error) => {
        if (!isCanceled(error)) {
          setLoadError(errorMessage(error))
          setEntriesLoaded(true)
        }
      })
    return () => controller.abort()
  }, [session?.token, canViewRequest])

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

  function openAddEntryDialog() {
    statusFilters.openRequestView()
    setForm(EMPTY_FRESHPEDIA_FORM)
    setFormError('')
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
        setEntries((current) => [...current, created])
      } else {
        // Which PATCH endpoint depends on which collection the entry is
        // currently in — a request-status entry lives in
        // /freshpedia-request, everything else in /freshpedia.
        const target = entries.find((entry) => entry.id === entryFormTarget)
        const update = target?.status === 'request' ? updateFreshpediaRequestEntry : updateFreshpediaEntry
        const updated = await update(entryFormTarget, form, session)
        setEntries((current) =>
          current.map((entry) => (entry.id === entryFormTarget ? updated : entry)),
        )
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
    setEntries((current) =>
      current.map((candidate) => (candidate.id === entry.id ? updated : candidate)),
    )
  }

  if (!isAuthorized) return null

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
              {t('freshpedia.addEntry')}
            </Button>
          </div>
        )}

        <FreshpediaFilters
          availableStatuses={statusFilters.availableStatuses}
          isStatusActive={statusFilters.isStatusActive}
          onToggleStatus={statusFilters.toggleStatus}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTypes={selectedTypes}
          onToggleType={toggleTypeFilter}
          t={t}
        />

        {loadError && <p className="config-section__notice">{loadError}</p>}

        {entriesLoaded && (
          <FreshpediaEntryList
            canChangeStatus={canChangeStatus}
            canViewRequest={canViewRequest}
            entries={entries}
            onEdit={openEditEntryDialog}
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
