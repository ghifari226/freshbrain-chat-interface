import { useEffect, useMemo, useState } from 'react'
import { Tooltip, Button, Chip } from '@mui/material'
import { getScopeCatalog } from '../../config/scopeCatalog.js'
import { listUsers } from '../../services/authService.js'
import {
  ROLES,
  ROLE_LABEL_KEYS,
  ROLE_SCOPES,
  LOCKED_ROLES,
  addRoleToCatalog,
  removeRoleFromCatalog,
  renameRoleInCatalog,
} from '../../config/roles.js'
import { updateRoleScopes } from '../../services/roleScopes.js'
import { useT } from '../../hooks/useT.js'

function seedRoleScopes() {
  const seeded = {}
  for (const role of ROLES) {
    seeded[role] = [...(ROLE_SCOPES[role] ?? [])]
  }
  return seeded
}

// Order-independent — toggling systems/sub-scopes rebuilds the array via
// filter+push, so plain array/reference equality would false-positive as
// "dirty" even when the resulting set of scopes is unchanged.
function scopesEqual(a, b) {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((s) => setB.has(s))
}

// A system is 'full' when its wildcard tag (e.g. 'wms') is granted, or every
// one of its sub-scopes is individually granted; 'none' when nothing under
// it is granted; 'partial' otherwise.
function getSystemState(scopes, entry) {
  const fullScopeKeys = entry.subScopes.map((sub) => `${entry.system}.${sub}`)
  if (scopes.includes(entry.system)) return 'full'
  const checkedCount = fullScopeKeys.filter((key) => scopes.includes(key)).length
  if (checkedCount === 0) return 'none'
  return checkedCount === fullScopeKeys.length ? 'full' : 'partial'
}

function SystemCheckbox({ state, onChange, disabled }) {
  return (
    <input
      type="checkbox"
      checked={state === 'full'}
      ref={(el) => {
        if (el) el.indeterminate = state === 'partial'
      }}
      disabled={disabled}
      onChange={onChange}
    />
  )
}

// Roles = merged Role Catalog (add/rename/delete role rows) + Role Scopes
// (assign which scopes each role gets) — one page, one card per role.
// Expand/collapse is gone: every system + sub-scope renders inline, always;
// the system filter chips below are what keeps a card manageable instead.
export default function RolesPage({ session }) {
  const t = useT()
  const canAdd = Boolean(session?.['role.add'])
  const canEditName = Boolean(session?.['role.edit'])
  const canDelete = Boolean(session?.['role.delete'])
  const canAssignScopes = Boolean(session?.['role.assign_scopes'])
  const canEditAnything = canAdd || canEditName || canDelete || canAssignScopes

  const [catalog, setCatalog] = useState([])
  const [usersByRole, setUsersByRole] = useState({})
  // Mocked, in-memory only — no backend persistence yet for add/rename/
  // delete (see roles.js); assign_scopes tries the real PATCH endpoint via
  // updateRoleScopes before falling back to local mock state.
  const [roleScopes, setRoleScopes] = useState(seedRoleScopes)
  const [savedRoleScopes, setSavedRoleScopes] = useState(seedRoleScopes)
  const [roleVersion, setRoleVersion] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  // Empty = show every system's rows in every card.
  const [selectedSystems, setSelectedSystems] = useState(new Set())
  const [isAdding, setIsAdding] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [addError, setAddError] = useState('')
  const [renamingRole, setRenamingRole] = useState(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [renameError, setRenameError] = useState('')

  useEffect(() => {
    let cancelled = false
    getScopeCatalog().then((data) => {
      if (!cancelled) setCatalog(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

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
  }, [roleVersion])

  function toggleSystemFilter(system) {
    setSelectedSystems((prev) => {
      const next = new Set(prev)
      if (next.has(system)) next.delete(system)
      else next.add(system)
      return next
    })
  }

  const visibleCatalog = useMemo(
    () => (selectedSystems.size === 0 ? catalog : catalog.filter((entry) => selectedSystems.has(entry.system))),
    [catalog, selectedSystems],
  )

  const visibleRoles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return ROLES
    return ROLES.filter((role) => t(ROLE_LABEL_KEYS[role] ?? role).toLowerCase().includes(query))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, roleVersion])

  async function handleSaveRole(role) {
    const scopes = [...(roleScopes[role] ?? [])]
    await updateRoleScopes(role, scopes)
    setSavedRoleScopes((prev) => ({ ...prev, [role]: scopes }))
  }

  function handleCancelRole(role) {
    setRoleScopes((prev) => ({ ...prev, [role]: [...(savedRoleScopes[role] ?? [])] }))
  }

  function toggleSystem(role, entry) {
    setRoleScopes((prev) => {
      const scopes = prev[role] ?? []
      const fullScopeKeys = entry.subScopes.map((sub) => `${entry.system}.${sub}`)
      const state = getSystemState(scopes, entry)
      const cleared = scopes.filter((s) => s !== entry.system && !fullScopeKeys.includes(s))
      const next = state === 'full' ? cleared : [...cleared, entry.system]
      return { ...prev, [role]: next }
    })
  }

  function toggleSubScope(role, entry, sub) {
    setRoleScopes((prev) => {
      const scopes = prev[role] ?? []
      const fullScope = `${entry.system}.${sub}`
      const fullScopeKeys = entry.subScopes.map((s) => `${entry.system}.${s}`)

      let next
      if (scopes.includes(entry.system)) {
        next = [
          ...scopes.filter((s) => s !== entry.system),
          ...fullScopeKeys.filter((key) => key !== fullScope),
        ]
      } else if (scopes.includes(fullScope)) {
        next = scopes.filter((s) => s !== fullScope)
      } else {
        const withNew = [...scopes, fullScope]
        const allChecked = fullScopeKeys.every((key) => withNew.includes(key))
        next = allChecked
          ? [...withNew.filter((s) => !fullScopeKeys.includes(s)), entry.system]
          : withNew
      }
      return { ...prev, [role]: next }
    })
  }

  function openAddForm() {
    setNewRoleName('')
    setAddError('')
    setIsAdding(true)
  }

  function handleAddRole(event) {
    event.preventDefault()
    if (!newRoleName.trim()) return
    if (ROLES.includes(newRoleName.trim())) {
      setAddError(t('config.roleNameTaken'))
      return
    }
    addRoleToCatalog(newRoleName.trim())
    setRoleScopes((prev) => ({ ...prev, [newRoleName.trim()]: [] }))
    setSavedRoleScopes((prev) => ({ ...prev, [newRoleName.trim()]: [] }))
    setRoleVersion((v) => v + 1)
    setIsAdding(false)
  }

  function handleDeleteRole(role) {
    removeRoleFromCatalog(role)
    setRoleVersion((v) => v + 1)
  }

  function openRename(role) {
    setRenamingRole(role)
    setRenameDraft(role)
    setRenameError('')
  }

  function handleRenameSubmit(event, oldName) {
    event.preventDefault()
    try {
      renameRoleInCatalog(oldName, renameDraft)
      setRoleScopes((prev) => {
        const { [oldName]: scopes, ...rest } = prev
        return { ...rest, [renameDraft.trim()]: scopes ?? [] }
      })
      setSavedRoleScopes((prev) => {
        const { [oldName]: scopes, ...rest } = prev
        return { ...rest, [renameDraft.trim()]: scopes ?? [] }
      })
      setRenamingRole(null)
      setRoleVersion((v) => v + 1)
    } catch (error) {
      setRenameError(error.message)
    }
  }

  return (
    <div className="config-section">
      <div className="config-section__title-row">
        <h2 className="config-section__title">{t('config.rolesTitle')}</h2>
        <Tooltip title={t('config.rolesDesc')} placement="right">
          <i className="fa-solid fa-circle-info config-section__info-icon" />
        </Tooltip>
        {canAdd && (
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

      {!canEditAnything && <p className="config-section__notice">{t('config.viewOnlyNotice')}</p>}

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
          {addError && <span className="form-field__error">{addError}</span>}
          <div className="config-inline-form__actions">
            <Button size="small" onClick={() => setIsAdding(false)}>
              {t('config.cancelEdit')}
            </Button>
            <Button size="small" variant="contained" type="submit">
              {t('config.addRole')}
            </Button>
          </div>
        </form>
      )}

      <div className="filter-bar">
        <div className="filter-bar__chips" role="group" aria-label={t('config.filterBySystemLabel')}>
          {catalog.map((entry) => {
            const isActive = selectedSystems.has(entry.system)
            return (
              <Chip
                key={entry.system}
                label={entry.system}
                size="small"
                clickable
                onClick={() => toggleSystemFilter(entry.system)}
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
          placeholder={t('config.searchRolesPlaceholder')}
          aria-label={t('config.searchRolesPlaceholder')}
        />
      </div>

      <div className="role-grid">
        {visibleRoles.map((role) => {
          const isLocked = LOCKED_ROLES.includes(role)
          const isCeo = role === 'CEO'
          const scopes = roleScopes[role] ?? []
          const isDirty = canAssignScopes && !isCeo && !scopesEqual(scopes, savedRoleScopes[role] ?? [])
          const isRenaming = renamingRole === role
          const inUseCount = usersByRole[role] ?? 0

          return (
            <div className="role-card" key={role}>
              <div className="role-card__header">
                {isRenaming ? (
                  <form
                    className="role-card__rename-form"
                    onSubmit={(event) => handleRenameSubmit(event, role)}
                  >
                    <input
                      className="form-field__input"
                      type="text"
                      autoFocus
                      value={renameDraft}
                      onChange={(event) => setRenameDraft(event.target.value)}
                    />
                    <button type="submit" className="icon-button icon-button--pending" aria-label={t('config.saveUser')}>
                      <i className="fa-solid fa-check" />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={t('config.cancelEdit')}
                      onClick={() => setRenamingRole(null)}
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="role-card__name">{t(ROLE_LABEL_KEYS[role] ?? role)}</span>
                    <div className="role-card__header-actions">
                      {isLocked && (
                        <Tooltip title={t('config.roleLockedNotice')}>
                          <i className="fa-solid fa-lock" />
                        </Tooltip>
                      )}
                      {isDirty && (
                        <>
                          <button
                            type="button"
                            className="icon-button icon-button--pending"
                            aria-label={t('config.cancelEdit')}
                            onClick={() => handleCancelRole(role)}
                          >
                            <i className="fa-solid fa-xmark" />
                          </button>
                          <button
                            type="button"
                            className="icon-button icon-button--pending"
                            aria-label={t('config.saveUser')}
                            onClick={() => handleSaveRole(role)}
                          >
                            <i className="fa-solid fa-upload" />
                          </button>
                        </>
                      )}
                      {canEditName && !isLocked && (
                        <Tooltip title={t('config.editRole')}>
                          <button
                            type="button"
                            className="icon-button icon-button--edit"
                            aria-label={t('config.editRole')}
                            onClick={() => openRename(role)}
                          >
                            <i className="fa-solid fa-pen" />
                          </button>
                        </Tooltip>
                      )}
                      {canDelete && !isLocked && (
                        <Tooltip
                          title={inUseCount > 0 ? t('config.roleInUseNotice') : t('config.deleteRole')}
                        >
                          <span>
                            <button
                              type="button"
                              className="icon-button icon-button--danger"
                              aria-label={t('config.deleteRole')}
                              disabled={inUseCount > 0}
                              onClick={() => handleDeleteRole(role)}
                            >
                              <i className="fa-solid fa-trash" />
                            </button>
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </>
                )}
              </div>
              {isRenaming && renameError && <span className="form-field__error">{renameError}</span>}

              {isCeo ? (
                <div className="role-card__fixed">
                  <span className="scope-pill scope-pill--fixed">
                    <i className="fa-solid fa-lock" /> {t('config.allAccess')}
                  </span>
                </div>
              ) : (
                <div className="role-card__systems">
                  {visibleCatalog.map((entry) => {
                    const systemState = getSystemState(scopes, entry)
                    return (
                      <div className="role-card__system" key={entry.system}>
                        <label className="scope-checkbox scope-checkbox--system">
                          <SystemCheckbox
                            state={systemState}
                            disabled={!canAssignScopes}
                            onChange={() => toggleSystem(role, entry)}
                          />
                          <span className="scope-checkbox__tag">{entry.system}</span>
                          <span className="scope-checkbox__label">{entry.label}</span>
                        </label>
                        <div className="role-card__sub-scopes">
                          {entry.subScopes.map((sub) => {
                            const fullScope = `${entry.system}.${sub}`
                            return (
                              <label className="scope-checkbox" key={fullScope}>
                                <input
                                  type="checkbox"
                                  checked={systemState === 'full' || scopes.includes(fullScope)}
                                  disabled={!canAssignScopes}
                                  onChange={() => toggleSubScope(role, entry, sub)}
                                />
                                <span className="scope-checkbox__tag">{fullScope}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
