import { useEffect, useMemo, useState } from 'react'
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid'
import { Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button, Autocomplete, TextField } from '@mui/material'
import StandalonePageLayout from './StandalonePageLayout.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useRoute } from '../hooks/useRoute.js'
import { useT } from '../hooks/useT.js'
import { canAccessToolCatalog } from '../config/permissions.js'
import { getScopeCatalog } from '../config/scopeCatalog.js'
import { listToolCatalogEntries, createToolCatalogEntry, updateToolCatalogEntry } from '../services/toolCatalog.js'

// Same status filter chips as Freshpedia (order + single-select + Request
// exclusivity) — that's the only thing this page copies from it. Content
// is a plain view-only table; the only actions anywhere on this page are
// "New request" and, on your own pending request, "Edit Request".
const STATUS_FILTERS = ['production', 'staging', 'request']
const STATUS_COLOR = { production: 'success', staging: 'warning', request: 'default' }
const EMPTY_FORM = { system: '', name: '', description: '', exampleQuestions: [] }

function isFormValid(form) {
  return Boolean(form.system) && Boolean(form.name.trim()) && Boolean(form.description.trim())
}

function EntryForm({ form, setForm, systems, t }) {
  function updateQuestion(index, value) {
    setForm((prev) => ({
      ...prev,
      exampleQuestions: prev.exampleQuestions.map((q, i) => (i === index ? value : q)),
    }))
  }

  function addQuestion() {
    setForm((prev) => ({ ...prev, exampleQuestions: [...prev.exampleQuestions, ''] }))
  }

  function removeQuestion(index) {
    setForm((prev) => ({
      ...prev,
      exampleQuestions: prev.exampleQuestions.filter((_q, i) => i !== index),
    }))
  }

  return (
    <>
      <div className="form-field">
        <label className="form-field__label" htmlFor="tool-system">
          {t('toolCatalog.systemLabel')}
        </label>
        <Autocomplete
          id="tool-system"
          size="small"
          autoHighlight
          options={systems}
          value={systems.find((entry) => entry.system === form.system) ?? null}
          getOptionLabel={(entry) => entry?.label ?? ''}
          isOptionEqualToValue={(option, current) => option.system === current.system}
          onChange={(_event, newValue) =>
            setForm((prev) => ({ ...prev, system: newValue?.system ?? '' }))
          }
          renderInput={(params) => <TextField {...params} placeholder={t('toolCatalog.systemLabel')} />}
        />
      </div>

      <div className="form-field">
        <label className="form-field__label" htmlFor="tool-name">
          {t('toolCatalog.nameLabel')}
        </label>
        <input
          id="tool-name"
          className="form-field__input"
          type="text"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value.toLowerCase() }))}
          placeholder={t('toolCatalog.namePlaceholder')}
        />
      </div>

      <div className="form-field">
        <label className="form-field__label" htmlFor="tool-description">
          {t('toolCatalog.descriptionLabel')}
        </label>
        <textarea
          id="tool-description"
          className="form-field__input"
          rows={4}
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder={t('toolCatalog.descriptionPlaceholder')}
        />
      </div>

      <div className="form-field">
        <label className="form-field__label">{t('toolCatalog.exampleQuestionsLabel')}</label>
        {form.exampleQuestions.map((question, index) => (
          <div className="form-field__list-row" key={index}>
            <input
              className="form-field__input"
              type="text"
              value={question}
              onChange={(event) => updateQuestion(index, event.target.value)}
              placeholder={t('toolCatalog.exampleQuestionPlaceholder')}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={t('toolCatalog.removeQuestionAction')}
              onClick={() => removeQuestion(index)}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        ))}
        <Button size="small" onClick={addQuestion}>
          {t('toolCatalog.addQuestionAction')}
        </Button>
      </div>
    </>
  )
}

export default function ToolCatalogPage() {
  const t = useT()
  const { session } = useAuth()
  const [, navigate] = useRoute()

  const isAuthorized = canAccessToolCatalog(session)
  const canViewProduction = Boolean(session?.['tool.view'])
  const canViewStaging = Boolean(session?.['staging.test'])
  const canViewRequest = Boolean(session?.['tool.request'])

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
  const [systems, setSystems] = useState([])
  // Independent of the status filter — narrows by system (wms/tms/...)
  // regardless of which status chips are active. Empty = every system.
  // This is also where the old standalone Scope Catalog page's "grouped by
  // system" concept lives now that that page is gone.
  const [selectedSystems, setSelectedSystems] = useState(new Set())
  // Production/Staging are independent multi-select (either, both, or
  // neither — neither and both both mean "show everything accessible").
  // Request is a separate exclusive toggle: activating it shows only
  // Request rows regardless of the Production/Staging set; clicking
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
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!isAuthorized) navigate('/')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized])

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
      if (!cancelled) setSystems(data.map((entry) => ({ system: entry.system, label: entry.label })))
    })
    return () => {
      cancelled = true
    }
  }, [])

  function toggleSystemFilter(system) {
    setSelectedSystems((prev) => {
      const next = new Set(prev)
      if (next.has(system)) next.delete(system)
      else next.add(system)
      return next
    })
  }

  function toggleStatusFilter(status) {
    if (status === 'request') {
      const next = !isRequestActive
      setIsRequestActive(next)
      // Turning Request off clears the filter entirely rather than
      // restoring whatever Production/Staging selection was sitting there
      // from before Request was activated — that stale state is confusing
      // to land back on.
      if (!next) setSelectedStatuses(new Set())
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

  const isRequestFilterActive = isRequestActive
  const visibleRows = useMemo(() => {
    let filtered
    if (isRequestFilterActive) {
      filtered = entries.filter((entry) => entry.status === 'request')
    } else {
      // Empty or both-selected read the same: show everything accessible.
      const effective = selectedStatuses.size === 0 ? new Set(['production', 'staging']) : selectedStatuses
      filtered = entries.filter((entry) => {
        if (entry.status === 'production' && !canViewProduction) return false
        if (entry.status === 'staging' && !canViewStaging) return false
        if (entry.status === 'request') return false
        if (!effective.has(entry.status)) return false
        return true
      })
    }
    if (selectedSystems.size > 0) {
      filtered = filtered.filter((entry) => selectedSystems.has(entry.system))
    }
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      // The whole chain, not just entry.name — searching "wms" should find
      // every wms.* tool, not just one literally named "wms".
      filtered = filtered.filter((entry) => `${entry.system}.${entry.name}`.toLowerCase().includes(query))
    }
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
    return filtered.map((entry) => ({ ...entry, displayName: `${entry.system}.${entry.name}` }))
  }, [
    entries,
    canViewProduction,
    canViewStaging,
    selectedStatuses,
    selectedSystems,
    isRequestFilterActive,
    searchQuery,
  ])
  const isEditMode = Boolean(entryFormTarget) && entryFormTarget !== 'new'

  const columns = useMemo(() => {
    const base = [
      { field: 'system', headerName: t('toolCatalog.systemLabel'), flex: 0.6 },
      { field: 'displayName', headerName: t('toolCatalog.toolColumn'), flex: 1 },
      {
        field: 'status',
        headerName: t('toolCatalog.statusColumn'),
        flex: 1,
        renderCell: (params) => (
          <Chip
            label={t(`toolCatalog.${params.value}Status`)}
            size="small"
            color={STATUS_COLOR[params.value]}
            variant={params.value === 'production' ? 'filled' : 'outlined'}
          />
        ),
      },
    ]
    if (isRequestFilterActive) {
      base.push({
        field: 'rowActions',
        type: 'actions',
        headerName: '',
        width: 48,
        // Anyone with tool.request can edit any pending request, not
        // just their own — reaching this view already implies the
        // permission, so no per-row ownership check.
        getActions: ({ row }) => [
          <GridActionsCellItem
            key="edit"
            icon={<i className="fa-solid fa-pen" />}
            label={t('toolCatalog.editRequestAction')}
            onClick={() => openEditEntryDialog(row)}
          />,
        ],
      })
    }
    return base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRequestFilterActive, t])

  if (!isAuthorized) return null

  // The button lives outside the Request filter now (see render below), so
  // clicking it also switches into the Request view — otherwise you'd open
  // the dialog, submit, and land back on a filter that doesn't show what
  // you just created.
  function openAddEntryDialog() {
    setIsRequestActive(true)
    setForm(EMPTY_FORM)
    setFormError('')
    setEntryFormTarget('new')
  }

  function openEditEntryDialog(entry) {
    setForm({
      system: entry.system,
      name: entry.name,
      description: entry.description,
      exampleQuestions: entry.exampleQuestions,
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
        const created = await createToolCatalogEntry(form, session)
        setEntries((prev) => [...prev, created])
      } else {
        const updated = await updateToolCatalogEntry(entryFormTarget, form, session)
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

        {availableStatusFilters.length > 1 && (
          <div className="filter-bar">
            <div
              className="filter-bar__chips"
              role="group"
              aria-label={t('toolCatalog.filterByStatusLabel')}
            >
              {availableStatusFilters.map((status) => {
                const isActive =
                  status === 'request' ? isRequestActive : !isRequestActive && selectedStatuses.has(status)
                return (
                  <Chip
                    key={status}
                    label={t(`toolCatalog.${status}Status`)}
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

        {systems.length > 0 && (
          <div className="filter-bar">
            <div
              className="filter-bar__chips"
              role="group"
              aria-label={t('toolCatalog.filterBySystemLabel')}
            >
              {systems.map(({ system }) => {
                const isActive = selectedSystems.has(system)
                return (
                  <Chip
                    key={system}
                    label={system}
                    size="small"
                    clickable
                    onClick={() => toggleSystemFilter(system)}
                    variant={isActive ? 'filled' : 'outlined'}
                    className={isActive ? 'chip--secondary-active' : undefined}
                  />
                )
              })}
            </div>
            <input
              type="search"
              className="form-field__input filter-bar__search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('toolCatalog.searchPlaceholder')}
              aria-label={t('toolCatalog.searchPlaceholder')}
            />
          </div>
        )}

        <DataGrid rows={visibleRows} columns={columns} getRowId={(row) => row.id} autoHeight hideFooter />
      </div>

      <Dialog open={Boolean(entryFormTarget)} onClose={closeEntryFormDialog}>
        <DialogTitle>
          {isEditMode ? `${form.system}.${form.name}` : t('toolCatalog.addEntry')}
        </DialogTitle>
        <DialogContent>
          <form id="tool-form" className="auth-form config-add-form" onSubmit={handleSubmitEntryForm}>
            <EntryForm form={form} setForm={setForm} systems={systems} t={t} />
            {formError && <span className="form-field__error">{formError}</span>}
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEntryFormDialog}>{t('toolCatalog.cancelEntry')}</Button>
          <Button
            type="submit"
            form="tool-form"
            variant="contained"
            disabled={isSubmitting || !isFormValid(form)}
          >
            {t(isEditMode ? 'toolCatalog.saveEntry' : 'toolCatalog.addEntrySubmit')}
          </Button>
        </DialogActions>
      </Dialog>
    </StandalonePageLayout>
  )
}
