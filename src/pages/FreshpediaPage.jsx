import { useEffect, useMemo, useState } from 'react'
import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  Tooltip,
} from '@mui/material'
import StandalonePageLayout from './StandalonePageLayout.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useRoute } from '../hooks/useRoute.js'
import { useT } from '../hooks/useT.js'
import { canAccessFreshpedia } from '../lib/permissions.js'
import {
  listFreshpediaEntries,
  createFreshpediaEntry,
  updateFreshpediaEntry,
  setFreshpediaEntryStatus,
} from '../lib/freshpedia.js'

// One flat, always-visible list. Default (no filter) mixes Production +
// Staging alphabetically — that's "the pedia". Selecting the Request
// filter is exclusive: it replaces the view with only Request entries,
// it never mixes with Production/Staging.
const STATUS_FILTERS = ['production', 'staging', 'request']
const ENTRY_TYPES = ['definition', 'document', 'alias']
const STATUS_COLOR = { production: 'success', staging: 'warning', request: 'default' }
// entry.status -> where the transition icon moves it, which way it points,
// and its color: green for a move that lands on Production, yellow/warning
// for a move that lands on Staging (matches the destination's own status
// chip color) — including Request's promote arrow, which is yellow because
// it lands on Staging, not Production.
const TRANSITION_BY_STATUS = {
  production: {
    labelKey: 'freshpedia.demoteToStagingAction',
    toStatus: 'staging',
    icon: 'fa-arrow-down',
    colorClass: 'icon-button--warning',
  },
  staging: {
    labelKey: 'freshpedia.promoteToProductionAction',
    toStatus: 'production',
    icon: 'fa-arrow-up',
    colorClass: 'icon-button--success',
  },
  request: {
    labelKey: 'freshpedia.promoteToStagingAction',
    toStatus: 'staging',
    icon: 'fa-arrow-up',
    colorClass: 'icon-button--warning',
  },
}
const EMPTY_FORM = {
  title: '',
  type: 'definition',
  content: '',
  fileName: '',
  aliasTargetId: null,
  aliasPhrase: '',
}

function isFormValid(form) {
  if (!form.title.trim()) return false
  if (form.type === 'definition') return Boolean(form.content.trim())
  if (form.type === 'document') return Boolean(form.fileName)
  return Boolean(form.aliasTargetId) && Boolean(form.aliasPhrase.trim())
}

// "Title — Definition", "Title — Document", or "Title — Alias (<target>)".
function entryDescriptor(entry, entries, t) {
  if (entry.type === 'alias') {
    const target = entries.find((candidate) => candidate.id === entry.aliasTargetId)
    return `${t('freshpedia.aliasType')} (${target?.title ?? entry.aliasTargetId})`
  }
  return t(`freshpedia.${entry.type}Type`)
}

// The create/edit form's fields change shape based on the selected entry
// type. No reviewer-only fields — editing is just editing the content.
function EntryForm({ form, setForm, existingEntries, t }) {
  return (
    <>
      <div className="form-field">
        <label className="form-field__label" htmlFor="entry-title">
          {t('freshpedia.entryTitleLabel')}
        </label>
        <input
          id="entry-title"
          className="form-field__input"
          type="text"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder={t('freshpedia.entryTitlePlaceholder')}
        />
      </div>

      <div className="form-field">
        <label className="form-field__label" htmlFor="entry-type">
          {t('freshpedia.entryTypeLabel')}
        </label>
        <Autocomplete
          id="entry-type"
          size="small"
          disableClearable
          autoHighlight
          options={ENTRY_TYPES}
          value={form.type}
          getOptionLabel={(type) => t(`freshpedia.${type}Type`)}
          isOptionEqualToValue={(option, current) => option === current}
          onChange={(_event, newValue) => setForm((prev) => ({ ...prev, type: newValue ?? prev.type }))}
          renderInput={(params) => <TextField {...params} placeholder={t('freshpedia.entryTypeLabel')} />}
        />
      </div>

      {form.type === 'definition' && (
        <div className="form-field">
          <label className="form-field__label" htmlFor="entry-content">
            {t('freshpedia.contentLabel')}
          </label>
          <textarea
            id="entry-content"
            className="form-field__input"
            rows={6}
            value={form.content}
            onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            placeholder={t('freshpedia.contentPlaceholder')}
          />
        </div>
      )}

      {form.type === 'document' && (
        <div className="form-field">
          <label className="form-field__label" htmlFor="entry-file">
            {t('freshpedia.fileUploadLabel')}
          </label>
          <input
            id="entry-file"
            type="file"
            accept="application/pdf"
            onChange={(event) =>
              setForm((prev) => ({ ...prev, fileName: event.target.files[0]?.name ?? '' }))
            }
          />
          {form.fileName && <span className="form-field__hint">{form.fileName}</span>}
        </div>
      )}

      {form.type === 'alias' && (
        <>
          <div className="form-field">
            <label className="form-field__label" htmlFor="entry-alias-target">
              {t('freshpedia.aliasTargetLabel')}
            </label>
            <Autocomplete
              id="entry-alias-target"
              size="small"
              autoHighlight
              options={existingEntries.filter((entry) => entry.type !== 'alias')}
              value={existingEntries.find((entry) => entry.id === form.aliasTargetId) ?? null}
              getOptionLabel={(entry) => entry?.title ?? ''}
              isOptionEqualToValue={(option, current) => option.id === current.id}
              onChange={(_event, newValue) =>
                setForm((prev) => ({ ...prev, aliasTargetId: newValue?.id ?? null }))
              }
              renderInput={(params) => (
                <TextField {...params} placeholder={t('freshpedia.aliasTargetPlaceholder')} />
              )}
            />
          </div>
          <div className="form-field">
            <label className="form-field__label" htmlFor="entry-alias-phrase">
              {t('freshpedia.aliasPhraseLabel')}
            </label>
            <input
              id="entry-alias-phrase"
              className="form-field__input"
              type="text"
              value={form.aliasPhrase}
              onChange={(event) => setForm((prev) => ({ ...prev, aliasPhrase: event.target.value }))}
              placeholder={t('freshpedia.aliasPhrasePlaceholder')}
            />
          </div>
        </>
      )}
    </>
  )
}

export default function FreshpediaPage({ language, setLanguage }) {
  const t = useT()
  const { session } = useAuth()
  const [, navigate] = useRoute()

  const isAuthorized = canAccessFreshpedia(session)
  const canViewProduction = Boolean(session?.chat_freshpedia_view)
  const canViewStaging = Boolean(session?.chat_staging_test)
  const canViewRequest = Boolean(session?.chat_freshpedia_request)
  const isSuperadmin = Boolean(session?.chat_access_permission_edit)

  const availableStatusFilters = useMemo(
    () =>
      STATUS_FILTERS.filter(
        (status) =>
          (status === 'production' && canViewProduction) ||
          (status === 'staging' && canViewStaging) ||
          (status === 'request' && canViewRequest),
      ),
    [canViewProduction, canViewStaging, canViewRequest],
  )

  const [entries, setEntries] = useState([])
  const [entriesLoaded, setEntriesLoaded] = useState(false)
  // Production/Staging are independent multi-select (either, both, or
  // neither — neither and both both mean "show everything accessible").
  // Request is a separate exclusive toggle: activating it shows only
  // Request entries regardless of the Production/Staging set; clicking
  // Production or Staging while Request is active deactivates Request
  // ("clicking away from request") and applies normal toggle behavior to
  // the clicked status.
  const [selectedStatuses, setSelectedStatuses] = useState(new Set())
  const [isRequestActive, setIsRequestActive] = useState(
    () => !(canViewProduction || canViewStaging) && canViewRequest,
  )
  const [entryFormTarget, setEntryFormTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isAuthorized) navigate('/')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized])

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

  function toggleStatusFilter(status) {
    if (status === 'request') {
      setIsRequestActive((prev) => !prev)
      return
    }
    if (isRequestActive) {
      // Leaving Request — take the click at face value: show exactly this
      // status, not a toggle against whatever the set held before Request
      // was activated (that produced confusing results, e.g. clicking
      // Staging could show Production if Staging was already in the set).
      setIsRequestActive(false)
      setSelectedStatuses(new Set([status]))
      return
    }
    setSelectedStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  // Always alphabetical, in both the default (unfiltered) index and once a
  // status filter narrows it down.
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => a.title.localeCompare(b.title, language === 'id' ? 'id' : 'en')),
    [entries, language],
  )
  const isRequestFilterActive = isRequestActive
  const visibleEntries = useMemo(() => {
    if (isRequestFilterActive) {
      return sortedEntries.filter((entry) => entry.status === 'request')
    }
    // Empty or both-selected read the same: show everything accessible.
    const effective = selectedStatuses.size === 0 ? new Set(['production', 'staging']) : selectedStatuses
    return sortedEntries.filter((entry) => {
      if (entry.status === 'production' && !canViewProduction) return false
      if (entry.status === 'staging' && !canViewStaging) return false
      if (entry.status === 'request') return false
      if (!effective.has(entry.status)) return false
      return true
    })
  }, [sortedEntries, canViewProduction, canViewStaging, selectedStatuses, isRequestFilterActive])
  const isEditMode = Boolean(entryFormTarget) && entryFormTarget !== 'new'

  if (!isAuthorized) return null

  function openAddEntryDialog() {
    setForm(EMPTY_FORM)
    setFormError('')
    setEntryFormTarget('new')
  }

  function openEditEntryDialog(entry) {
    setForm({
      title: entry.title,
      type: entry.type,
      content: typeof entry.content === 'string' ? entry.content : (entry.content?.[language] ?? ''),
      fileName: entry.fileName ?? '',
      aliasTargetId: entry.aliasTargetId ?? null,
      aliasPhrase: entry.aliasPhrase ?? '',
    })
    setFormError('')
    setEntryFormTarget(entry.id)
  }

  function closeEntryFormDialog() {
    setEntryFormTarget(null)
  }

  async function handleSubmitEntryForm(event) {
    event.preventDefault()
    setFormError('')
    if (!isFormValid(form)) return

    setIsSubmitting(true)
    try {
      if (entryFormTarget === 'new') {
        const created = await createFreshpediaEntry(form, session)
        setEntries((prev) => [...prev, created])
      } else {
        const updated = await updateFreshpediaEntry(entryFormTarget, form, session)
        setEntries((prev) => prev.map((entry) => (entry.id === entryFormTarget ? updated : entry)))
      }
      setForm(EMPTY_FORM)
      setEntryFormTarget(null)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleTransition(entry) {
    const updated = await setFreshpediaEntryStatus(entry.id, TRANSITION_BY_STATUS[entry.status].toStatus, session)
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? updated : e)))
  }

  return (
    <StandalonePageLayout titleKey="freshpedia.title" language={language} setLanguage={setLanguage}>
      <div className="config-section">
        {availableStatusFilters.length > 1 && (
          <div className="filter-bar">
            <div
              className="filter-bar__chips"
              role="group"
              aria-label={t('freshpedia.filterByStatusLabel')}
            >
              {availableStatusFilters.map((status) => {
                const isActive =
                  status === 'request' ? isRequestActive : !isRequestActive && selectedStatuses.has(status)
                return (
                  <Chip
                    key={status}
                    label={t(`freshpedia.${status}Status`)}
                    size="small"
                    clickable
                    onClick={() => toggleStatusFilter(status)}
                    color={isActive ? 'primary' : 'default'}
                    variant={isActive ? 'filled' : 'outlined'}
                  />
                )
              })}
            </div>
          </div>
        )}

        {isRequestFilterActive && canViewRequest && (
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

        {entriesLoaded && (
          <ul className="entry-index">
            {visibleEntries.map((entry) => {
              const canEdit = isSuperadmin || (canViewRequest && entry.status === 'request')
              const transition = TRANSITION_BY_STATUS[entry.status]
              return (
                <li className="entry-index__entry" key={entry.id}>
                  <div className="entry-index__entry-row">
                    <span className="entry-index__entry-label">
                      {entry.title} — {entryDescriptor(entry, entries, t)}
                    </span>
                    <div className="entry-index__actions">
                      <Chip
                        label={t(`freshpedia.${entry.status}Status`)}
                        size="small"
                        color={STATUS_COLOR[entry.status]}
                        variant={entry.status === 'production' ? 'filled' : 'outlined'}
                      />
                      {isSuperadmin && (
                        <Tooltip title={t(transition.labelKey)}>
                          <button
                            type="button"
                            className={'icon-button ' + transition.colorClass}
                            aria-label={t(transition.labelKey)}
                            onClick={() => handleTransition(entry)}
                          >
                            <i className={`fa-solid ${transition.icon}`} />
                          </button>
                        </Tooltip>
                      )}
                      {canEdit && (
                        <Tooltip title={t('freshpedia.editEntryAction')}>
                          <button
                            type="button"
                            className="icon-button icon-button--edit"
                            aria-label={t('freshpedia.editEntryAction')}
                            onClick={() => openEditEntryDialog(entry)}
                          >
                            <i className="fa-solid fa-pen" />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
            {visibleEntries.length === 0 && (
              <p className="config-section__notice">{t('freshpedia.noEntriesNotice')}</p>
            )}
          </ul>
        )}
      </div>

      <Dialog open={Boolean(entryFormTarget)} onClose={closeEntryFormDialog}>
        <DialogTitle>{isEditMode ? form.title : t('freshpedia.addEntry')}</DialogTitle>
        <DialogContent>
          <form id="entry-form" className="auth-form config-add-form" onSubmit={handleSubmitEntryForm}>
            <EntryForm form={form} setForm={setForm} existingEntries={entries} t={t} />
            {formError && <span className="form-field__error">{formError}</span>}
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEntryFormDialog}>{t('freshpedia.cancelEntry')}</Button>
          <Button
            type="submit"
            form="entry-form"
            variant="contained"
            disabled={isSubmitting || !isFormValid(form)}
          >
            {t(isEditMode ? 'freshpedia.saveEntry' : 'freshpedia.addEntrySubmit')}
          </Button>
        </DialogActions>
      </Dialog>
    </StandalonePageLayout>
  )
}
