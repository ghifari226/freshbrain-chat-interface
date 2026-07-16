import { useEffect, useState } from 'react'
import { getScopeCatalog } from '../../lib/scopeCatalog.js'
import { useT } from '../../hooks/useT.js'

export default function ScopesPage() {
  const t = useT()
  const [catalog, setCatalog] = useState([])

  useEffect(() => {
    let cancelled = false
    getScopeCatalog().then((data) => {
      if (!cancelled) setCatalog(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="config-section">
      <h2 className="config-section__title">{t('config.scopesTitle')}</h2>
      <p className="config-section__desc">{t('config.scopesDesc')}</p>

      <div className="scope-catalog">
        {catalog.map((entry) => (
          <div className="scope-catalog__system" key={entry.system}>
            <div className="scope-catalog__system-header">
              <span className="scope-catalog__system-tag">{entry.system}</span>
              <span className="scope-catalog__system-label">{entry.label}</span>
            </div>
            <ul className="scope-catalog__sub-list">
              {entry.subScopes.map((sub) => (
                <li className="scope-catalog__sub-item" key={sub}>
                  <span className="scope-catalog__sub-tag">
                    {entry.system}.{sub}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
