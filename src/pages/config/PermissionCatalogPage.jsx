import { useMemo, useState } from 'react'
import { Tooltip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from '@mui/material'
import {
  PERMISSION_GROUPS,
  getPermissionCatalog,
  addPermissionToCatalog,
  removePermissionFromCatalog,
} from '../../config/permissions.js'
import { useT } from '../../hooks/useT.js'

const EMPTY_FORM = { key: '', group: PERMISSION_GROUPS[0].id, label: '' }

// Permission Catalog is UI-only — there's no way to add a 13th boolean
// column via any real endpoint (permission-catalog.md documents the 12 as
// fixed DB columns). New entries here mutate the shared group array +
// ALL_PERMISSIONS + PERMISSION_LABEL_KEYS in permissions.js in place, so
// they show up as real togglable checkboxes in UsersPage's Shield dialog
// immediately (defaulting to false for every existing user) — but nothing
// in the real backend contract enforces them yet.
export default function PermissionCatalogPage({ session }) {
  const t = useT()
  const canEdit = Boolean(session?.config_roles_edit)
  const [permissions, setPermissions] = useState(getPermissionCatalog)
  const [formTarget, setFormTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')

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

  function closeForm() {
    setFormTarget(null)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.key.trim() || !form.label.trim()) return
    try {
      addPermissionToCatalog(form)
      setPermissions(getPermissionCatalog())
      setFormTarget(null)
    } catch (error) {
      setFormError(error.message)
    }
  }

  function handleDelete(key) {
    removePermissionFromCatalog(key)
    setPermissions(getPermissionCatalog())
  }

  return (
    <div className="config-section">
      <div className="config-section__title-row">
        <h2 className="config-section__title">{t('config.permissionCatalogTitle')}</h2>
        <Tooltip title={t('config.permissionCatalogDesc')} placement="right">
          <i className="fa-solid fa-circle-info config-section__info-icon" />
        </Tooltip>
        {canEdit && (
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

      {!canEdit && <p className="config-section__notice">{t('config.viewOnlyNotice')}</p>}

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
                      {entry.locked && (
                        <Tooltip title={t('config.permissionLockedNotice')}>
                          <i className="fa-solid fa-lock" />
                        </Tooltip>
                      )}
                      {canEdit && !entry.locked && (
                        <Tooltip title={t('config.deletePermission')}>
                          <button
                            type="button"
                            className="icon-button icon-button--danger"
                            aria-label={t('config.deletePermission')}
                            onClick={() => handleDelete(entry.key)}
                          >
                            <i className="fa-solid fa-trash" />
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
        <DialogTitle>{t('config.addPermission')}</DialogTitle>
        <DialogContent>
          <form id="permission-form" className="auth-form config-add-form" onSubmit={handleSubmit}>
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
            {t('config.addPermission')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
