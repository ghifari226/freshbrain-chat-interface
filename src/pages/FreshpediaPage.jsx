import { useEffect, useMemo, useState } from 'react'
import { Button } from '@mui/material'
import StandalonePageLayout from './StandalonePageLayout.jsx'
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
import { canAccessFreshpedia, canChangeFreshpediaStatus } from '../config/permissions.js'
import {
  createFreshpediaEntry,
  listFreshpediaEntries,
  setFreshpediaEntryStatus,
  updateFreshpediaEntry,
} from '../services/freshpedia.js'

export default function FreshpediaPage({ language }) {
  const t = useT()
  const { session } = useAuth()
  const isAuthorized = useAuthorizedPage(canAccessFreshpedia(session))

  const canViewProduction = Boolean(session?.['freshpedia.view'])
  const canViewStaging = Boolean(session?.['staging.test'])
  const canViewRequest = Boolean(session?.['freshpedia.request'])
  const canChangeStatus = canChangeFreshpediaStatus(session)
  const statusFilters = useStatusFilters({
    canViewProduction,
    canViewStaging,
    canViewRequest,
  })
  const { filterByStatus } = statusFilters

  const [entries, setEntries] = useState([])
  const [entriesLoaded, setEntriesLoaded] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [entryFormTarget, setEntryFormTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FRESHPEDIA_FORM)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    listFreshpediaEntries().then((data) => {
      if (!cancelled) {
        setEntries(data)
        setEntriesLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

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
        const updated = await updateFreshpediaEntry(entryFormTarget, form, session)
        setEntries((current) =>
          current.map((entry) => (entry.id === entryFormTarget ? updated : entry)),
        )
      }
      setForm(EMPTY_FRESHPEDIA_FORM)
      setEntryFormTarget(null)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleTransition(entry) {
    const transition = TRANSITION_BY_STATUS[entry.status]
    const updated = await setFreshpediaEntryStatus(
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
    <StandalonePageLayout titleKey="freshpedia.title">
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
    </StandalonePageLayout>
  )
}
