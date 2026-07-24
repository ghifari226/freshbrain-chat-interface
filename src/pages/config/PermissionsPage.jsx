import { useMemo, useState } from 'react'
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tooltip } from '@mui/material'
import {
  PERMISSION_GROUPS,
  getPermissionCatalog,
  addPermissionToCatalog,
  updatePermissionInCatalog,
} from '../../config/permissions.js'
import { useT } from '../../hooks/useT.js'

const EMPTY_FORM = { key: '', group: PERMISSION_GROUPS[0].id, label: '' }

// Permission add/edit are UI-only — there's no way to add a 20th boolean
// column, or rename one of these 19, via any real endpoint yet
// (permission-catalog.md documents a fixed set). New/edited entries mutate
// the shared group arrays + ALL_PERMISSIONS + PERMISSION_LABEL_KEYS in
// permissions.js in place, so they show up as real togglable checkboxes in
// UsersPage's Shield dialog immediately. No delete at all, for anything —
// only the label and group are ever editable, the key is permanent once
// created since gating logic elsewhere references it as a literal string.
export default function PermissionsPage({ session }) {
  const t = useT()
  const canAdd = Boolean(session?.['permission.add'])
  const canEdit = Boolean(session?.['permission.edit'])
  const [permissions, setPermissions] = useState(getPermissionCatalog)
  const [formTarget, setFormTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const isEditMode = Boolean(formTarget) && formTarget !== 'new'

  const groupedRows = useMemo(
    () =>
      PERMISSION_GROUPS.map((group) => ({
        ...group,
        entries: permissions.filter((p) => p.group === group.id),
      })),
    [permissions],
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
        updatePermissionInCatalog(formTarget, { group: form.group, label: form.label })
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
      <div className="config-section__title-row">
        <h2 className="config-section__title">{t('config.permissionsTitle')}</h2>
        <Tooltip title={t('config.permissionsDesc')} placement="right">
          <i className="fa-solid fa-circle-info config-section__info-icon" />
        </Tooltip>
        {canAdd && (
          <Button
            className="config-section__title-action"
            variant="contained"
            size="small"
            onClick={openAddForm}
          >
            {t('config.addPermission')}
          </Button>
        )}
      </div>

      {!canAdd && !canEdit && <p className="config-section__notice">{t('config.viewOnlyNotice')}</p>}

      <div className="permission-group-list">
        {groupedRows.map((group) => (
          <div className="permission-group" key={group.id}>
            <span className="permission-group__label">{t(group.labelKey)}</span>
            <ul className="entry-index">
              {group.entries.map((entry) => (
                <li className="entry-index__entry" key={entry.key}>
                  <div className="entry-index__entry-row">
                    <span className="entry-index__entry-label">
                      <code className="scope-checkbox__tag">{entry.key}</code> {t(entry.labelKey)}
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
            {!isEditMode && (
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
            )}

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
