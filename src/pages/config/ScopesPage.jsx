import { useEffect, useState } from 'react'
import { Tooltip } from '@mui/material'
import { getScopeCatalog } from '../../config/scopeCatalog.js'
import { useT } from '../../hooks/useT.js'

export default function ScopesPage() {
  const t = useT()
  const [catalog, setCatalog] = useState([])
  // Global across the whole page, not per-system — clicking a chip under
  // one system closes whichever chip's description was open under any
  // other system.
  const [openScopeKey, setOpenScopeKey] = useState(null)

  useEffect(() => {
    let cancelled = false
    getScopeCatalog().then((data) => {
      if (!cancelled) setCatalog(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function toggleDescription(key) {
    setOpenScopeKey((prev) => (prev === key ? null : key))
  }

  return (
    <div className="config-section">
      <div className="config-section__title-row">
        <h2 className="config-section__title">{t('config.scopesTitle')}</h2>
        <Tooltip title={t('config.scopesDesc')} placement="right">
          <i className="fa-solid fa-circle-info config-section__info-icon" />
        </Tooltip>
      </div>

      <div className="scope-catalog">
        {catalog.map((entry) => (
          <div className="scope-catalog__system" key={entry.system}>
            <div className="scope-catalog__system-header">
              <span className="scope-catalog__system-tag">{entry.system}</span>
              <span className="scope-catalog__system-label">{entry.label}</span>
            </div>
            <ul className="scope-catalog__sub-list">
              {entry.subScopes.map((sub) => {
                const key = `${entry.system}.${sub}`
                const isActive = openScopeKey === key
                return (
                  <li
                    className={
                      'scope-catalog__sub-item' + (isActive ? ' scope-catalog__sub-item--active' : '')
                    }
                    key={sub}
                  >
                    <button
                      type="button"
                      className="scope-catalog__sub-tag scope-catalog__sub-tag--clickable"
                      onClick={() => toggleDescription(key)}
                    >
                      {key}
                    </button>
                  </li>
                )
              })}
            </ul>
            {openScopeKey?.startsWith(`${entry.system}.`) && (
              <p className="scope-catalog__description">
                {entry.subScopeDescriptions?.[openScopeKey.slice(entry.system.length + 1)]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
