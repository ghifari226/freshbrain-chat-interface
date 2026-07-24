import { useEffect, useMemo, useState } from 'react'
import { Tooltip, Button, Chip } from '@mui/material'
import { getScopeCatalog } from '../../config/scopeCatalog.js'
import {
  ROLES,
  ROLE_LABEL_KEYS,
  ROLE_SCOPES,
  LOCKED_ROLES,
  addRoleToCatalog,
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

// Roles = merged Role Catalog (add/rename role rows — no delete, removed
// as a safety call) + Role Scopes (assign which scopes each role gets) —
// one page, one card per role. Each system row collapses to just its
// checkbox + abbreviation by default; the master chevron (rightmost in the
// header) expands/collapses every system in that one card at once,
// independent of every other card's state.
export default function RolesPage({ session }) {
  const t = useT()
  const canAdd = Boolean(session?.['role.add'])
  const canEditName = Boolean(session?.['role.edit'])
  const canAssignScopes = Boolean(session?.['role.assign_scopes'])
  const canEditAnything = canAdd || canEditName || canAssignScopes

  const [catalog, setCatalog] = useState([])
  // Mocked, in-memory only — no backend persistence yet for add/rename
  // (see roles.js); assign_scopes tries the real PATCH endpoint via
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
  // Which systems are expanded, per role — { [role]: Set<system> }. Not
  // present/empty = collapsed, which is also the default for every card.
  const [expandedByRole, setExpandedByRole] = useState({})

  useEffect(() => {
    let cancelled = false
    getScopeCatalog().then((data) => {
      if (!cancelled) setCatalog(data)
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

  const visibleCatalog = useMemo(
    () => (selectedSystems.size === 0 ? catalog : catalog.filter((entry) => selectedSystems.has(entry.system))),
    [catalog, selectedSystems],
  )
  // While filtering by system chip, every visible row auto-expands and the
  // per-row chevron goes away — you already narrowed down to what you want
  // to see, collapsing it back is just friction. The master toggle greys
  // out to reflect that it has nothing left to do.
  const isFilteredMode = selectedSystems.size > 0

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

  function isSystemExpanded(role, system) {
    return expandedByRole[role]?.has(system) ?? false
  }

  function toggleSystemExpanded(role, system) {
    setExpandedByRole((prev) => {
      const current = new Set(prev[role] ?? [])
      if (current.has(system)) current.delete(system)
      else current.add(system)
      return { ...prev, [role]: current }
    })
  }

  function areAllExpanded(role, systems) {
    const current = expandedByRole[role]
    return systems.length > 0 && systems.every((system) => current?.has(system))
  }

  // The master chevron: if every currently-visible system in this card is
  // already expanded, collapse them all; otherwise expand them all — same
  // "bulk toggle reflects whether everything is already on" shape as the
  // Shield dialog's per-group select-all checkbox.
  function toggleAllExpanded(role, systems) {
    setExpandedByRole((prev) => {
      const allExpanded = systems.length > 0 && systems.every((system) => prev[role]?.has(system))
      return { ...prev, [role]: allExpanded ? new Set() : new Set(systems) }
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
      {canAdd && (
        <div className="config-section__title-row">
          <Button
            className="config-section__title-action"
            variant="contained"
            size="small"
            onClick={openAddForm}
          >
            {t('config.addRole')}
          </Button>
        </div>
      )}

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
          // Systems with nothing to expand (no sub-scopes, e.g. dwh) don't
          // count toward the master toggle — there's nothing for it to do
          // to them, same reason they never get their own chevron below.
          const expandableSystems = visibleCatalog
            .filter((entry) => entry.subScopes.length > 0)
            .map((entry) => entry.system)
          const allExpanded = areAllExpanded(role, expandableSystems) || isFilteredMode

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
                            <i className="fa-solid fa-floppy-disk" />
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
                      {!isCeo && expandableSystems.length > 0 && (
                        <Tooltip
                          title={t(
                            isFilteredMode
                              ? 'config.expandCollapseDisabledFiltered'
                              : allExpanded
                                ? 'config.collapseAllSystems'
                                : 'config.expandAllSystems',
                          )}
                        >
                          <span>
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={t(allExpanded ? 'config.collapseAllSystems' : 'config.expandAllSystems')}
                              disabled={isFilteredMode}
                              onClick={() => toggleAllExpanded(role, expandableSystems)}
                            >
                              <i className={`fa-solid fa-angles-${allExpanded ? 'up' : 'down'}`} />
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
                    const hasSubScopes = entry.subScopes.length > 0
                    const isExpanded = hasSubScopes && (isFilteredMode || isSystemExpanded(role, entry.system))
                    return (
                      <div className="role-card__system" key={entry.system}>
                        <div className="scope-checkbox scope-checkbox--system">
                          <label className="scope-checkbox__control">
                            <SystemCheckbox
                              state={systemState}
                              disabled={!canAssignScopes}
                              onChange={() => toggleSystem(role, entry)}
                            />
                            <Tooltip title={entry.label}>
                              <span className="scope-checkbox__tag">{entry.system}</span>
                            </Tooltip>
                          </label>
                          {hasSubScopes && !isFilteredMode && (
                            <button
                              type="button"
                              className="role-card__system-toggle"
                              aria-expanded={isExpanded}
                              aria-label={entry.label}
                              onClick={() => toggleSystemExpanded(role, entry.system)}
                            >
                              <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} />
                            </button>
                          )}
                        </div>

                        {isExpanded && (
                          <ul className="role-card__sub-scopes">
                            {entry.subScopes.map((sub) => {
                              const fullScope = `${entry.system}.${sub}`
                              return (
                                <li className="role-card__sub-scope" key={fullScope}>
                                  <label className="scope-checkbox">
                                    <input
                                      type="checkbox"
                                      checked={systemState === 'full' || scopes.includes(fullScope)}
                                      disabled={!canAssignScopes}
                                      onChange={() => toggleSubScope(role, entry, sub)}
                                    />
                                    <span className="scope-checkbox__tag">{fullScope}</span>
                                  </label>
                                </li>
                              )
                            })}
                          </ul>
                        )}
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
