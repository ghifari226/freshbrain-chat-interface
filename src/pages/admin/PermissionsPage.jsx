import { useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip } from '@mui/material'
import { PERMISSION_GROUPS, getPermissionCatalog, updatePermissionInCatalog, hasPermission } from '../../config/permissions.js'
import { useT, resolveLabelEntry } from '../../hooks/useT.js'
import { errorMessage } from '../../services/api.ts'
import GatewayJsonPreview from '../../components/devdoc/GatewayJsonPreview.jsx'

function isFormValid(form) {
  return Boolean(form.labelId.trim())
}

// Same 6 prefix-derived groups the catalog itself is organized into
// (Freshpedia/Tools/Permissions/Roles/Users/Staging) — single source of
// truth, so the filter chips can't drift out of sync with the sections
// below them. Labels are literal (untranslated), matching PERMISSION_GROUPS.
const FILTER_CHIPS = PERMISSION_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  match: (key) => group.array.includes(key),
}))

// The permission catalog is fixed, code-level (permissions.js) — no way to
// add an 18th boolean column via the UI, only view the existing 17 and edit
// a label. Editing only ever touches the label (key and group are
// permanent once created in code, since gating logic elsewhere references
// the key as a literal string).
export default function PermissionsPage({ session }) {
  const t = useT()
  const canEdit = hasPermission(session, 'permissions.edit')
  const [permissions, setPermissions] = useState(getPermissionCatalog)
  const [formTarget, setFormTarget] = useState(null)
  const [form, setForm] = useState({ key: '', labelId: '', labelEn: '' })
  const [formError, setFormError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChips, setSelectedChips] = useState(new Set())

  function toggleChip(id) {
    setSelectedChips((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visiblePermissions = useMemo(() => {
    let filtered = permissions
    if (selectedChips.size > 0) {
      const activeChips = FILTER_CHIPS.filter((chip) => selectedChips.has(chip.id))
      filtered = filtered.filter((entry) => activeChips.some((chip) => chip.match(entry.key)))
    }
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      filtered = filtered.filter(
        (entry) => entry.key.toLowerCase().includes(query) || t(entry.labelKey).toLowerCase().includes(query),
      )
    }
    return filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions, selectedChips, searchQuery])

  const groupedRows = useMemo(
    () =>
      PERMISSION_GROUPS.map((group) => ({
        ...group,
        entries: visiblePermissions.filter((p) => p.group === group.id),
      })).filter((group) => group.entries.length > 0),
    [visiblePermissions],
  )

  // dev-doc only — GET /permissions' 200 response (auth-contract.md), shaped
  // from the full catalog (not visiblePermissions, so filter chips/search
  // don't hide rows from the preview). `group` is deliberately absent — it
  // never leaves this page, see permission-catalog.md's "Katalog permission
  // tertutup".
  const gatewayPermissionsResponse = useMemo(
    () =>
      permissions.map((entry) => {
        const label = resolveLabelEntry(entry.labelKey)
        return { key: entry.key, label_id: label.id, label_en: label.en }
      }),
    [permissions],
  )

  function openEditForm(entry) {
    const label = resolveLabelEntry(entry.labelKey)
    setForm({ key: entry.key, labelId: label.id, labelEn: label.en })
    setFormError('')
    setFormTarget(entry.key)
  }

  function closeForm() {
    setFormTarget(null)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!isFormValid(form)) return
    try {
      updatePermissionInCatalog(formTarget, { label: { id: form.labelId, en: form.labelEn } })
      setPermissions(getPermissionCatalog())
      setFormTarget(null)
    } catch (error) {
      setFormError(errorMessage(error))
    }
  }

  return (
    <div className="config-section">
      {!canEdit && <p className="config-section__notice">{t('config.viewOnlyNotice')}</p>}

      <div className="filter-bar">
        <div className="filter-bar__chips" role="group" aria-label={t('config.filterByPermissionGroupLabel')}>
          {FILTER_CHIPS.map((chip) => {
            const isActive = selectedChips.has(chip.id)
            return (
              <Chip
                key={chip.id}
                label={chip.label}
                size="small"
                clickable
                onClick={() => toggleChip(chip.id)}
                color={isActive ? 'primary' : 'default'}
                variant={isActive ? 'filled' : 'outlined'}
              />
            )
          })}
        </div>
        <input
          type="search"
          className="form-field__input filter-bar__search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t('config.searchPermissionsPlaceholder')}
          aria-label={t('config.searchPermissionsPlaceholder')}
        />
      </div>

      <div className="permission-catalog-grid">
        {groupedRows.map((group) => (
          <div className="permission-group" key={group.id}>
            <span className="permission-group__label">{group.label}</span>
            <ul className="entry-index">
              {group.entries.map((entry) => (
                <li className="entry-index__entry" key={entry.key}>
                  <div className="permission-entry-row">
                    <span className="permission-entry__label">{t(entry.labelKey)}</span>
                    <div className="permission-entry-row__actions">
                      <code className="permission-entry__key">{entry.key}</code>
                      {canEdit && (
                        <Tooltip title={t('config.editPermission')}>
                          <button
                            type="button"
                            className="icon-button icon-button--edit"
                            aria-label={t('config.editPermission')}
                            onClick={() => openEditForm(entry)}
                          >
                            <Pencil fill="currentColor" />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="config-devdoc">
        <GatewayJsonPreview title="GET /permissions — Response (live)" data={gatewayPermissionsResponse} />
        <GatewayJsonPreview
          title={`PATCH /permissions/${form.key || '{key}'} — Payload (live)`}
          data={{ label_id: form.labelId, label_en: form.labelEn }}
        />
      </div>

      <Dialog open={Boolean(formTarget)} onClose={closeForm} fullWidth maxWidth="xs">
        <DialogTitle>{form.key}</DialogTitle>
        <DialogContent>
          <form id="permission-form" className="auth-form config-add-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-field__label" htmlFor="permission-key">
                {t('config.permissionKeyLabel')}
              </label>
              <span id="permission-key" className="form-field__static">
                {form.key}
              </span>
            </div>

            <div className="form-field">
              <label className="form-field__label" htmlFor="permission-label-id">
                {t('config.permissionLabelIdLabel')}
              </label>
              <input
                id="permission-label-id"
                className="form-field__input"
                type="text"
                value={form.labelId}
                onChange={(event) => setForm((prev) => ({ ...prev, labelId: event.target.value }))}
                placeholder={t('config.permissionLabelIdPlaceholder')}
              />
            </div>

            <div className="form-field">
              <label className="form-field__label" htmlFor="permission-label-en">
                {t('config.permissionLabelEnLabel')}
              </label>
              <input
                id="permission-label-en"
                className="form-field__input"
                type="text"
                value={form.labelEn}
                onChange={(event) => setForm((prev) => ({ ...prev, labelEn: event.target.value }))}
                placeholder={t('config.permissionLabelEnPlaceholder')}
              />
            </div>

            {formError && <span className="form-field__error">{formError}</span>}
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm}>{t('config.cancelEdit')}</Button>
          <Button type="submit" form="permission-form" variant="contained" disabled={!isFormValid(form)}>
            {t('config.saveUser')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
