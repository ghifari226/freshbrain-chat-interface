import { useEffect, useRef, useState } from 'react'
import { Tooltip } from '@mui/material'
import { getScopeCatalog } from '../../config/scopeCatalog.js'
import { ROLES, ROLE_LABEL_KEYS, ROLE_SCOPES } from '../../config/roles.js'
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
// it is granted; 'partial' otherwise. The system checkbox is checked/
// indeterminate/unchecked to match.
function getSystemState(scopes, entry) {
  const fullScopeKeys = entry.subScopes.map((sub) => `${entry.system}.${sub}`)
  if (scopes.includes(entry.system)) return 'full'
  const checkedCount = fullScopeKeys.filter((key) => scopes.includes(key)).length
  if (checkedCount === 0) return 'none'
  return checkedCount === fullScopeKeys.length ? 'full' : 'partial'
}

function SystemCheckbox({ state, onChange, disabled }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'partial'
  }, [state])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === 'full'}
      disabled={disabled}
      onChange={onChange}
    />
  )
}

export default function RoleScopesPage({ session }) {
  const t = useT()
  const canEdit = Boolean(session?.config_roles_edit)
  const [catalog, setCatalog] = useState([])
  // Mocked, in-memory only — no backend persistence yet, resets on reload.
  // `roleScopes` is the live draft the checkboxes read/write; `savedRoleScopes`
  // is the last-committed baseline, only advanced by handleSaveRole — so
  // toggling a checkbox never hits an API, it just makes the role "dirty"
  // until the upload icon is clicked.
  const [roleScopes, setRoleScopes] = useState(seedRoleScopes)
  const [savedRoleScopes, setSavedRoleScopes] = useState(seedRoleScopes)
  // Keyed per role so expanding a system under one role doesn't affect any
  // other role's card — but within a single role, only one system is
  // expanded at a time. Default: everything collapsed.
  const [expandedSystemByRole, setExpandedSystemByRole] = useState({})

  // Tries PATCH /config/roles/{name} first (see auth-contract.md), same
  // try-then-mock-fallback shape as authService.js — falls back to
  // ROLE_SCOPES[role] = scopes locally since chat-gateway doesn't exist yet.
  async function handleSaveRole(role) {
    const scopes = [...(roleScopes[role] ?? [])]
    await updateRoleScopes(role, scopes)
    setSavedRoleScopes((prev) => ({ ...prev, [role]: scopes }))
  }

  // Discards the draft back to the last-saved baseline — the inverse of
  // handleSaveRole, not a delete of anything server-side.
  function handleCancelRole(role) {
    setRoleScopes((prev) => ({ ...prev, [role]: [...(savedRoleScopes[role] ?? [])] }))
  }

  function toggleExpanded(role, system) {
    setExpandedSystemByRole((prev) => ({
      ...prev,
      [role]: prev[role] === system ? null : system,
    }))
  }

  // Distinct from toggleExpanded: checking/unchecking the system checkbox
  // always reveals its sub-scopes (so you can see what just got granted or
  // cleared), rather than toggling collapsed/expanded.
  function forceExpand(role, system) {
    setExpandedSystemByRole((prev) => ({ ...prev, [role]: system }))
  }

  useEffect(() => {
    let cancelled = false
    getScopeCatalog().then((data) => {
      if (!cancelled) setCatalog(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Parent click is all-or-nothing: from 'full' it clears everything under
  // the system, from 'none'/'partial' it grants the whole system (collapsing
  // any individually-checked sub-scopes into the wildcard tag).
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

  // A child click while the system is 'full' expands the wildcard into its
  // individual sub-scopes minus the one just unchecked, so the system loses
  // its checked status. Otherwise it's a plain toggle, except that checking
  // the last remaining sub-scope collapses the set back into the wildcard
  // tag so the system becomes checked again.
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

  return (
    <div className="config-section">
      <div className="config-section__title-row">
        <h2 className="config-section__title">{t('config.roleScopesTitle')}</h2>
        <Tooltip title={t('config.roleScopesDesc')} placement="right">
          <i className="fa-solid fa-circle-info config-section__info-icon" />
        </Tooltip>
      </div>

      {!canEdit && <p className="config-section__notice">{t('config.viewOnlyNotice')}</p>}

      <div className="role-list">
        {ROLES.map((role) => {
          const isCeo = role === 'CEO'
          const scopes = roleScopes[role] ?? []
          const isDirty = canEdit && !isCeo && !scopesEqual(scopes, savedRoleScopes[role] ?? [])

          return (
            <div className="role-card" key={role}>
              <div className="role-card__header">
                <span className="role-card__name">{t(ROLE_LABEL_KEYS[role] ?? role)}</span>
                {isDirty && (
                  <div className="role-card__header-actions">
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
                  </div>
                )}
              </div>

              {isCeo ? (
                <div className="role-card__fixed">
                  <span className="scope-pill scope-pill--fixed">
                    <i className="fa-solid fa-lock" /> {t('config.allAccess')}
                  </span>
                </div>
              ) : (
                <div className="role-card__systems">
                  {catalog.map((entry) => {
                    const systemState = getSystemState(scopes, entry)
                    const isExpanded = expandedSystemByRole[role] === entry.system
                    return (
                      <div className="role-card__system" key={entry.system}>
                        <div
                          className="scope-checkbox scope-checkbox--system"
                          onClick={() => toggleExpanded(role, entry.system)}
                        >
                          <label
                            className="scope-checkbox__control"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <SystemCheckbox
                              state={systemState}
                              disabled={!canEdit}
                              onChange={() => {
                                toggleSystem(role, entry)
                                forceExpand(role, entry.system)
                              }}
                            />
                            <span className="scope-checkbox__tag">{entry.system}</span>
                            <span className="scope-checkbox__label">{entry.label}</span>
                          </label>
                          <button
                            type="button"
                            className="role-card__system-toggle"
                            aria-expanded={isExpanded}
                          >
                            <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="role-card__sub-scopes">
                            {entry.subScopes.map((sub) => {
                              const fullScope = `${entry.system}.${sub}`
                              return (
                                <label className="scope-checkbox" key={fullScope}>
                                  <input
                                    type="checkbox"
                                    checked={systemState === 'full' || scopes.includes(fullScope)}
                                    disabled={!canEdit}
                                    onChange={() => toggleSubScope(role, entry, sub)}
                                  />
                                  <span className="scope-checkbox__tag">{fullScope}</span>
                                </label>
                              )
                            })}
                          </div>
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
