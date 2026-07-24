import { useT } from '../../hooks/useT.js'

// No in-page Scopes/Roles/Users switcher here anymore — that navigation
// now lives in the main Sidebar's Access Configuration group. No back
// button either — Back to Chat lives in the Sidebar and the profile bar.
//
// Breadcrumb: when a sub-page is active (`subTitle` set by ConfigSection),
// "Access Configuration" is de-emphasized (still the click target to go
// back) and the active sub-page's own title renders to its right instead
// of inside the page body — this replaces the <h2> each page used to
// render itself. No info-tooltip here (removed) — that description copy
// no longer surfaces anywhere.
export default function ConfigLayout({ navigate, subTitle, children }) {
  const t = useT()

  return (
    <div className="config-page">
      <header className="config-page__header">
        <button
          className={'config-page__title' + (subTitle ? ' config-page__title--muted' : '')}
          onClick={() => navigate('/config')}
        >
          {t('config.title')}
        </button>
        {subTitle && (
          <>
            <span className="config-page__breadcrumb-sep">/</span>
            <span className="config-page__title config-page__title--active">{t(subTitle)}</span>
          </>
        )}
      </header>

      <div className="config-page__body">{children}</div>
    </div>
  )
}
