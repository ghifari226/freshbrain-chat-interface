import { useEffect, useMemo, useState } from 'react'
import { Button } from '@mui/material'
import FreshpediaEntryDialog from '../components/FreshpediaEntryDialog.jsx'
import FreshpediaEntryList from '../components/FreshpediaEntryList.jsx'
import FreshpediaFilters from '../components/FreshpediaFilters.jsx'
import { EMPTY_FRESHPEDIA_FORM, STATUSES, isFreshpediaFormValid } from '../model/freshpediaConfig.js'
import { useAuth } from '@features/authentication'
import { useAuthorizedPage } from '@shared/hooks/useAuthorizedPage.js'
import { useT } from '@shared/i18n/useT.js'
import { canAccessFreshpedia, hasPermission } from '@features/access-control'
import {
  createFreshpediaEntry,
  getFreshpediaEntries,
  updateFreshpediaEntry,
  updateFreshpediaEntryStatus,
} from '../api/freshpediaApi.js'
import { errorMessage, isCanceled } from '@integrations/http/httpClient.ts'
import { replaceById } from '@shared/lib/collections.js'

export default function FreshpediaPage({ language }) {
  const t = useT()
  const { session } = useAuth()
  const isAuthorized = useAuthorizedPage(canAccessFreshpedia(session))

  const canAddEntry = hasPermission(session, 'freshpedia.request_add')
  const canEditEntry = hasPermission(session, 'freshpedia.request_edit')
  const canChangeStatus = hasPermission(session, 'freshpedia.request_status')

  const [entries, setEntries] = useState([])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!isAuthorized) return undefined
    const controller = new AbortController()
    getFreshpediaEntries({ signal: controller.signal, token: session?.token })
      .then(setEntries)
      .catch((error) => {
        if (!isCanceled(error)) setLoadError(errorMessage(error))
      })
    return () => controller.abort()
  }, [session?.token, isAuthorized])

  function addEntry(entry) {
    setEntries((current) => [...current, entry])
  }

  function replaceEntry(entry) {
    setEntries((current) => replaceById(current, entry))
  }

  const [selectedStatuses, setSelectedStatuses] = useState(new Set())
  const [selectedTypes, setSelectedTypes] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [entryFormTarget, setEntryFormTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FRESHPEDIA_FORM)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function toggleStatusFilter(status) {
    setSelectedStatuses((current) => {
      const next = new Set(current)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  function toggleTypeFilter(type) {
    setSelectedTypes((current) => {
      const next = new Set(current)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const visibleEntries = useMemo(() => {
    const locale = language === 'id' ? 'id' : 'en'
    const effectiveStatuses = selectedStatuses.size > 0 ? selectedStatuses : new Set(STATUSES)
    let filtered = entries.filter((entry) => effectiveStatuses.has(entry.status))
    if (selectedTypes.size > 0) {
      filtered = filtered.filter((entry) => selectedTypes.has(entry.type))
    }
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      filtered = filtered.filter((entry) => entry.title.toLowerCase().includes(query))
    }
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title, locale))
  }, [entries, language, searchQuery, selectedStatuses, selectedTypes])

  const isEditMode = Boolean(entryFormTarget) && entryFormTarget !== 'new'

  function openAddEntryDialog() {
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
        addEntry(created)
      } else {
        const updated = await updateFreshpediaEntry(entryFormTarget, form, session)
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

  async function handleChangeStatus(entry, nextStatus) {
    const updated = await updateFreshpediaEntryStatus(entry.id, nextStatus, session)
    replaceEntry(updated)
  }

  if (!isAuthorized) return null

  return (
    <>
      <div className="config-section">
        {canAddEntry && (
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
          isStatusActive={(status) => selectedStatuses.has(status)}
          onToggleStatus={toggleStatusFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTypes={selectedTypes}
          onToggleType={toggleTypeFilter}
          t={t}
        />

        {loadError && <p className="config-section__notice">{t('freshpedia.comingSoonNotice')}</p>}

        <FreshpediaEntryList
          canChangeStatus={canChangeStatus}
          canEdit={canEditEntry}
          entries={entries}
          onChangeStatus={handleChangeStatus}
          onEdit={openEditEntryDialog}
          t={t}
          visibleEntries={visibleEntries}
        />
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
