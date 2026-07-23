import { useEffect, useMemo, useState } from 'react'
import { Tooltip, Button } from '@mui/material'
import { listUsers } from '../../services/authService.js'
import {
  ROLE_LABEL_KEYS,
  LOCKED_ROLES,
  getRoleCatalog,
  addRoleToCatalog,
  removeRoleFromCatalog,
} from '../../config/roles.js'
import { useT } from '../../hooks/useT.js'

// Role Catalog is UI-only — there's no POST/DELETE /config/roles in
// freshbrain-agreement's auth-contract.md (roles are documented as a fixed
// set there). This mutates the shared ROLES/ROLE_SCOPES/ROLE_LABEL_KEYS
// objects in place via roles.js, so Role Scopes and the Users role picker
// pick up additions/removals immediately without any refetch plumbing.
export default function RoleCatalogPage({ session }) {
  const t = useT()
  const canEdit = Boolean(session?.config_roles_edit)
  const [roles, setRoles] = useState(getRoleCatalog)
  const [usersByRole, setUsersByRole] = useState({})
  const [newRoleName, setNewRoleName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let cancelled = false
    listUsers().then((data) => {
      if (cancelled) return
      const counts = {}
      for (const user of data) counts[user.role] = (counts[user.role] ?? 0) + 1
      setUsersByRole(counts)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo(
    () =>
      roles.map((role) => ({
        ...role,
        inUseCount: usersByRole[role.name] ?? 0,
      })),
    [roles, usersByRole],
  )

  function openAddForm() {
    setNewRoleName('')
    setFormError('')
    setIsAdding(true)
  }

  function closeAddForm() {
    setIsAdding(false)
  }

  function handleAddRole(event) {
    event.preventDefault()
    if (!newRoleName.trim()) return
    if (getRoleCatalog().some((r) => r.name === newRoleName.trim())) {
      setFormError(t('config.roleNameTaken'))
      return
    }
    addRoleToCatalog(newRoleName.trim())
    setRoles(getRoleCatalog())
    setIsAdding(false)
  }

  function handleDeleteRole(name) {
    removeRoleFromCatalog(name)
    setRoles(getRoleCatalog())
  }

  return (
    <div className="config-section">
      <div className="config-section__title-row">
        <h2 className="config-section__title">{t('config.roleCatalogTitle')}</h2>
        <Tooltip title={t('config.roleCatalogDesc')} placement="right">
          <i className="fa-solid fa-circle-info config-section__info-icon" />
        </Tooltip>
        {canEdit && (
          <Button
            className="config-section__title-action"
            variant="contained"
            size="small"
            onClick={openAddForm}
          >
            {t('config.addRole')}
          </Button>
        )}
      </div>

      {!canEdit && <p className="config-section__notice">{t('config.viewOnlyNotice')}</p>}

      <ul className="entry-index">
        {rows.map((role) => {
          const isLocked = LOCKED_ROLES.includes(role.name)
          const isInUse = role.inUseCount > 0
          const blockedReason = isLocked
            ? t('config.roleLockedNotice')
            : isInUse
              ? t('config.roleInUseNotice')
              : ''
          return (
            <li className="entry-index__entry" key={role.name}>
              <div className="entry-index__entry-row">
                <span className="entry-index__entry-label">
                  {t(ROLE_LABEL_KEYS[role.name] ?? role.name)}
                  {' — '}
                  {role.allowedScopes.length > 0 ? role.allowedScopes.join(', ') : t('config.noScopes')}
                </span>
                <div className="entry-index__actions">
                  {isLocked && (
                    <Tooltip title={blockedReason}>
                      <i className="fa-solid fa-lock" />
                    </Tooltip>
                  )}
                  {canEdit && !isLocked && (
                    <Tooltip title={isInUse ? blockedReason : t('config.deleteRole')}>
                      <span>
                        <button
                          type="button"
                          className="icon-button icon-button--danger"
                          aria-label={t('config.deleteRole')}
                          disabled={isInUse}
                          onClick={() => handleDeleteRole(role.name)}
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {isAdding && (
        <form className="config-inline-form" onSubmit={handleAddRole}>
          <input
            className="form-field__input"
            type="text"
            autoFocus
            value={newRoleName}
            onChange={(event) => setNewRoleName(event.target.value)}
            placeholder={t('config.roleNamePlaceholder')}
          />
          {formError && <span className="form-field__error">{formError}</span>}
          <div className="config-inline-form__actions">
            <Button size="small" onClick={closeAddForm}>
              {t('config.cancelEdit')}
            </Button>
            <Button size="small" variant="contained" type="submit">
              {t('config.addRole')}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
