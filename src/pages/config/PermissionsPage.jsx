import { useMemo, useState } from 'react'
import { Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tooltip } from '@mui/material'
import {
  PERMISSION_GROUPS,
  getPermissionCatalog,
  addPermissionToCatalog,
  updatePermissionInCatalog,
} from '../../config/permissions.js'
import { useT } from '../../hooks/useT.js'

const EMPTY_FORM = { key: '', group: PERMISSION_GROUPS[0].id, label: '' }

// Hardcoded for now, per the request — not derived from PERMISSION_GROUPS,
// since "Role"/"Permission"/"User" are a finer split than the two display
// groups (all three currently live inside "System Access"). "Chat
// capability access" matches that group 1:1 (tool/freshpedia/staging).
const FILTER_CHIPS = [
  { id: 'chat_capability', labelKey: 'permissions.chatAccessSectionLabel', match: (key) => key.startsWith('tool.') || key.startsWith('freshpedia.') || key.startsWith('staging.') },
  { id: 'role', labelKey: 'config.filterChipRole', match: (key) => key.startsWith('role_scope.') },
  { id: 'permission', labelKey: 'config.filterChipPermission', match: (key) => key.startsWith('permission.') },
  { id: 'user', labelKey: 'config.filterChipUser', match: (key) => key.startsWith('user.') },
]

// Permission add/edit are UI-only — there's no way to add an 18th boolean
// column, or rename one of these 17, via any real endpoint yet
// (permission-catalog.md documents a fixed set). New/edited entries mutate
// the shared group arrays + ALL_PERMISSIONS + PERMISSION_LABEL_KEYS in
// permissions.js in place, so they show up as real togglable checkboxes in
// UsersPage's Shield dialog immediately. No delete at all, for anything —
// editing only ever touches the label (key and group are fixed once
// created, since gating logic elsewhere references the key as a literal
// string, and the group is what the add form put it in).
export default function PermissionsPage({ session }) {
  const t = useT()
  const canAdd = Boolean(session?.['permission.add'])
  const canEdit = Boolean(session?.['permission.edit'])
  const [permissions, setPermissions] = useState(getPermissionCatalog)
  const [formTarget, setFormTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChips, setSelectedChips] = useState(new Set())
  const isEditMode = Boolean(formTarget) && formTarget !== 'new'

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

  function openAddForm() {
    setForm(EMPTY_FORM)
    setFormError('')
    setFormTarget('new')
  }

  function openEditForm(entry) {
    setForm({ key: entry.key, group: entry.group, label: t(entry.labelKey) })
    setFormError('')
    setFormTarget(entry.key)
  }

  function closeForm() {
    setFormTarget(null)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.label.trim()) return
    try {
      if (isEditMode) {
        updatePermissionInCatalog(formTarget, { label: form.label })
      } else {
        if (!form.key.trim()) return
        addPermissionToCatalog(form)
      }
      setPermissions(getPermissionCatalog())
      setFormTarget(null)
    } catch (error) {
      setFormError(error.message)
    }
  }

  return (
    <div className="config-section">
      {canAdd && (
        <div className="config-section__title-row">
          <Button
            className="config-section__title-action"
            variant="contained"
            size="small"
            onClick={openAddForm}
          >
            {t('config.addPermission')}
          </Button>
        </div>
      )}

      {!canAdd && !canEdit && <p className="config-section__notice">{t('config.viewOnlyNotice')}</p>}

      <div className="filter-bar">
        <div className="filter-bar__chips" role="group" aria-label={t('config.filterByPermissionGroupLabel')}>
          {FILTER_CHIPS.map((chip) => {
            const isActive = selectedChips.has(chip.id)
            return (
              <Chip
                key={chip.id}
                label={t(chip.labelKey)}
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

      <div className="permission-group-list">
        {groupedRows.map((group) => (
          <div className="permission-group" key={group.id}>
            <span className="permission-group__label">{t(group.labelKey)}</span>
            <ul className="entry-index">
              {group.entries.map((entry) => (
                <li className="entry-index__entry" key={entry.key}>
                  <div className="entry-index__entry-row">
                    <span className="entry-index__entry-label">
                      <span className="permission-entry__label">{t(entry.labelKey)}</span>
                      <code className="permission-entry__key">{entry.key}</code>
                    </span>
                    <div className="entry-index__actions">
                      {canEdit && (
                        <Tooltip title={t('config.editPermission')}>
                          <button
                            type="button"
                            className="icon-button icon-button--edit"
                            aria-label={t('config.editPermission')}
                            onClick={() => openEditForm(entry)}
                          >
                            <i className="fa-solid fa-pen" />
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

      <Dialog open={Boolean(formTarget)} onClose={closeForm}>
        <DialogTitle>{isEditMode ? form.key : t('config.addPermission')}</DialogTitle>
        <DialogContent>
          <form id="permission-form" className="auth-form config-add-form" onSubmit={handleSubmit}>
            {isEditMode ? (
              <div className="form-field">
                <label className="form-field__label" htmlFor="permission-key">
                  {t('config.permissionKeyLabel')}
                </label>
                <span id="permission-key" className="form-field__static">
                  {form.key}
                </span>
              </div>
            ) : (
              <>
                <div className="form-field">
                  <label className="form-field__label" htmlFor="permission-group">
                    {t('config.permissionGroupLabel')}
                  </label>
                  <TextField
                    id="permission-group"
                    select
                    size="small"
                    value={form.group}
                    onChange={(event) => setForm((prev) => ({ ...prev, group: event.target.value }))}
                  >
                    {PERMISSION_GROUPS.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {t(group.labelKey)}
                      </MenuItem>
                    ))}
                  </TextField>
                </div>

                <div className="form-field">
                  <label className="form-field__label" htmlFor="permission-key">
                    {t('config.permissionKeyLabel')}
                  </label>
                  <input
                    id="permission-key"
                    className="form-field__input"
                    type="text"
                    value={form.key}
                    onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value.trim() }))}
                    placeholder={t('config.permissionKeyPlaceholder')}
                  />
                </div>
              </>
            )}

            <div className="form-field">
              <label className="form-field__label" htmlFor="permission-label">
                {t('config.permissionLabelLabel')}
              </label>
              <input
                id="permission-label"
                className="form-field__input"
                type="text"
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder={t('config.permissionLabelPlaceholder')}
              />
            </div>

            {formError && <span className="form-field__error">{formError}</span>}
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm}>{t('config.cancelEdit')}</Button>
          <Button type="submit" form="permission-form" variant="contained">
            {t(isEditMode ? 'config.saveUser' : 'config.addPermission')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
