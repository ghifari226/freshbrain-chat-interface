import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Lock,
  Pencil,
  Save,
  X,
} from 'lucide-react'
import { Tooltip, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { getScopeCatalog } from '../../config/scopeCatalog.js'
import { LOCKED_ROLES } from '../../config/roles.js'
import { hasPermission } from '../../config/permissions.js'
import { createRole, getAllRoles, renameRole, updateRoleScopes } from '../../services/roleScopes.ts'
import { errorMessage, isCanceled } from '../../services/api.ts'
import { useT } from '../../hooks/useT.js'

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
  const canAdd = hasPermission(session, 'role_scope.add_role')
  const canEditName = hasPermission(session, 'role_scope.edit_role')
  const canAssignScopes = hasPermission(session, 'role_scope.assign_scopes')
  const canEditAnything = canAdd || canEditName || canAssignScopes

  const [catalog, setCatalog] = useState([])
  // Role list + scope assignment both come from getAllRoles() — add/rename/
  // scope-assign each go through their own service call (createRole/
  // renameRole/updateRoleScopes), the same real/mock branch as every other
  // service in this app, rather than this page mutating config/roles.js's
  // module state directly.
  const [roles, setRoles] = useState([])
  const [loadError, setLoadError] = useState('')
  const [roleScopes, setRoleScopes] = useState({})
  const [savedRoleScopes, setSavedRoleScopes] = useState({})
  // Keyed by role — multiple cards can be dirty (and one can fail to save)
  // independently of each other, unlike renameError which only ever applies
  // to the single role currently in rename mode.
  const [scopeSaveErrors, setScopeSaveErrors] = useState({})
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

  useEffect(() => {
    const controller = new AbortController()
    getAllRoles({ signal: controller.signal, token: session?.token })
      .then((data) => {
        setRoles(data.map((r) => r.name))
        const scopesByName = Object.fromEntries(data.map((r) => [r.name, r.allowed_scopes]))
        setRoleScopes(scopesByName)
        setSavedRoleScopes(scopesByName)
      })
      .catch((error) => {
        if (!isCanceled(error)) setLoadError(errorMessage(error))
      })
    return () => controller.abort()
  }, [session?.token])

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
    const filtered = query
      ? roles.filter((role) => role.toLowerCase().includes(query))
      : roles
    return [...filtered].sort((left, right) => {
      if (left === 'Superadmin') return -1
      if (right === 'Superadmin') return 1
      return left.localeCompare(right, 'en', { sensitivity: 'base' })
    })
  }, [roles, searchQuery])

  async function handleSaveRole(role) {
    const scopes = [...(roleScopes[role] ?? [])]
    try {
      await updateRoleScopes(role, scopes, session)
      setSavedRoleScopes((prev) => ({ ...prev, [role]: scopes }))
      clearScopeSaveError(role)
    } catch (error) {
      setScopeSaveErrors((prev) => ({ ...prev, [role]: errorMessage(error) }))
    }
  }

  function clearScopeSaveError(role) {
    setScopeSaveErrors((prev) => {
      if (!(role in prev)) return prev
      const next = { ...prev }
      delete next[role]
      return next
    })
  }

  function handleCancelRole(role) {
    setRoleScopes((prev) => ({ ...prev, [role]: [...(savedRoleScopes[role] ?? [])] }))
    clearScopeSaveError(role)
  }

  // One-way — only ever adds, never removes. Distinct from
  // toggleSystemExpanded (the chevron), which flips both ways.
  function expandSystem(role, system) {
    setExpandedByRole((prev) => {
      if (prev[role]?.has(system)) return prev
      const current = new Set(prev[role] ?? [])
      current.add(system)
      return { ...prev, [role]: current }
    })
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
    // Clicking the parent checkbox reveals what it just granted/cleared —
    // expands once if collapsed, but never re-collapses an already-open
    // one (that would undo a manual expand for no reason).
    if (entry.subScopes.length > 0) {
      expandSystem(role, entry.system)
    }
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

  async function handleAddRole(event) {
    event.preventDefault()
    const trimmed = newRoleName.trim()
    if (!trimmed) return
    setAddError('')
    try {
      const created = await createRole(trimmed, session)
      setRoles((prev) => [...prev, created.name])
      setRoleScopes((prev) => ({ ...prev, [created.name]: created.allowed_scopes }))
      setSavedRoleScopes((prev) => ({ ...prev, [created.name]: created.allowed_scopes }))
      setIsAdding(false)
    } catch {
      // Duplicate name is really the only realistic failure mode here (same
      // reasoning as UsersPage's createUser handling) — always show the
      // translated copy rather than the service's raw contract error text.
      setAddError(t('config.roleNameTaken'))
    }
  }

  function openRename(role) {
    setRenamingRole(role)
    setRenameDraft(role)
    setRenameError('')
  }

  async function handleRenameSubmit(event, oldName) {
    event.preventDefault()
    try {
      const renamed = await renameRole(oldName, renameDraft, session)
      setRoles((prev) => prev.map((role) => (role === oldName ? renamed.name : role)))
      setRoleScopes((prev) => {
        const { [oldName]: scopes, ...rest } = prev
        return { ...rest, [renamed.name]: renamed.allowed_scopes ?? scopes ?? [] }
      })
      setSavedRoleScopes((prev) => {
        const { [oldName]: scopes, ...rest } = prev
        return { ...rest, [renamed.name]: renamed.allowed_scopes ?? scopes ?? [] }
      })
      setRenamingRole(null)
    } catch (error) {
      setRenameError(errorMessage(error))
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
      {loadError && <p className="config-section__notice">{loadError}</p>}

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
          const isSuperadmin = role === 'Superadmin'
          const scopes = roleScopes[role] ?? []
          const isDirty = canAssignScopes && !isSuperadmin && !scopesEqual(scopes, savedRoleScopes[role] ?? [])
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
                      <Check />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={t('config.cancelEdit')}
                      onClick={() => setRenamingRole(null)}
                    >
                      <X />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="role-card__name-group">
                      <span className="role-card__name">{role}</span>
                      {isSuperadmin && (
                        <span className="scope-pill scope-pill--fixed">{t('config.allAccess')}</span>
                      )}
                    </div>
                    <div className="role-card__header-actions">
                      {isLocked && (
                        <Tooltip title={t('config.roleLockedNotice')}>
                          <Lock />
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
                            <X />
                          </button>
                          <button
                            type="button"
                            className="icon-button icon-button--pending"
                            aria-label={t('config.saveUser')}
                            onClick={() => handleSaveRole(role)}
                          >
                            <Save />
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
                            <Pencil fill="currentColor" />
                          </button>
                        </Tooltip>
                      )}
                      {!isSuperadmin && expandableSystems.length > 0 && (
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
                              {allExpanded ? <ChevronsUp /> : <ChevronsDown />}
                            </button>
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </>
                )}
              </div>
              {isRenaming && renameError && <span className="form-field__error">{renameError}</span>}
              {scopeSaveErrors[role] && (
                <span className="form-field__error">{scopeSaveErrors[role]}</span>
              )}

              {isSuperadmin ? (
                <div className="role-card__systems">
                  {visibleCatalog.map((entry) => (
                    <div className="role-card__system" key={entry.system}>
                      <div className="scope-checkbox scope-checkbox--system role-card__system--fixed">
                        <label className="scope-checkbox__control">
                          <input type="checkbox" checked disabled readOnly />
                          <Tooltip title={entry.label}>
                            <span className="scope-checkbox__tag">{entry.system}</span>
                          </Tooltip>
                        </label>
                      </div>
                    </div>
                  ))}
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
                              {isExpanded ? <ChevronUp /> : <ChevronDown />}
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

      <Dialog open={isAdding} onClose={() => setIsAdding(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('config.addRole')}</DialogTitle>
        <DialogContent>
          <form id="role-form" className="auth-form config-add-form" onSubmit={handleAddRole}>
            <div className="form-field">
              <label className="form-field__label" htmlFor="role-name">
                {t('config.roleNameLabel')}
              </label>
              <input
                id="role-name"
                className="form-field__input"
                type="text"
                autoFocus
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
                placeholder={t('config.roleNamePlaceholder')}
              />
            </div>
            {addError && <span className="form-field__error">{addError}</span>}
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAdding(false)}>{t('config.cancelEdit')}</Button>
          <Button type="submit" form="role-form" variant="contained" disabled={!newRoleName.trim()}>
            {t('config.addRole')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
