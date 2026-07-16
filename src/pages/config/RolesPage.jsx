import { useEffect, useRef, useState } from 'react'
import { getScopeCatalog } from '../../lib/scopeCatalog.js'
import { ROLES, ROLE_LABEL_KEYS, DEFAULT_ROLE_SCOPES } from '../../lib/roles.js'
import { useT } from '../../hooks/useT.js'

function seedRoleScopes() {
  const seeded = {}
  for (const role of ROLES) {
    seeded[role] = [...(DEFAULT_ROLE_SCOPES[role] ?? [])]
  }
  return seeded
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

function SystemCheckbox({ state, onChange }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'partial'
  }, [state])

  return <input ref={ref} type="checkbox" checked={state === 'full'} onChange={onChange} />
}

export default function RolesPage() {
  const t = useT()
  const [catalog, setCatalog] = useState([])
  // Mocked, in-memory only — no backend persistence yet, resets on reload.
  const [roleScopes, setRoleScopes] = useState(seedRoleScopes)

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
      <h2 className="config-section__title">{t('config.rolesTitle')}</h2>
      <p className="config-section__desc">{t('config.rolesDesc')}</p>

      <div className="role-list">
        {ROLES.map((role) => {
          const isCeo = role === 'CEO'
          const scopes = roleScopes[role] ?? []

          return (
            <div className="role-card" key={role}>
              <div className="role-card__header">
                <span className="role-card__name">{t(ROLE_LABEL_KEYS[role])}</span>
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
                    return (
                      <div className="role-card__system" key={entry.system}>
                        <label className="scope-checkbox scope-checkbox--system">
                          <SystemCheckbox
                            state={systemState}
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
