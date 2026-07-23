import { useT } from '../../hooks/useT.js'

// No in-page Scopes/Roles/Users switcher here anymore — that navigation
// now lives in the main Sidebar's Access Configuration group. No back
// button either — Back to Chat lives in the Sidebar and the profile bar.
export default function ConfigLayout({ navigate, children }) {
  const t = useT()

  return (
    <div className="config-page">
      <header className="config-page__header">
        <button className="config-page__title" onClick={() => navigate('/config')}>
          {t('config.title')}
        </button>
      </header>

      <div className="config-page__body">{children}</div>
    </div>
  )
}
