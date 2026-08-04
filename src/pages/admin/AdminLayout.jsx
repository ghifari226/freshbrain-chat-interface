import { useT } from '../../hooks/useT.js'

// No in-page Freshpedia/Tool Catalog/Roles/Permissions/Users switcher here
// — Admin is reached only via the account menu's "Admin" button or this
// breadcrumb's own parent link, not the Sidebar (which no longer has an
// Admin entry at all). No back button either — Back to Chat lives in the
// Sidebar and the profile bar.
//
// Breadcrumb: when a sub-page is active (`subTitle` set by AdminSection),
// "Admin" is de-emphasized (still the click target to go back) and the
// active sub-page's own title renders to its right instead of inside the
// page body — this replaces the <h2> each page used to render itself.
export default function AdminLayout({ navigate, subTitle, children }) {
  const t = useT()

  return (
    <div className="config-page">
      <header className="config-page__header">
        <button
          className={'config-page__title' + (subTitle ? ' config-page__title--muted' : '')}
          onClick={() => navigate('/admin')}
        >
          {t('admin.title')}
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
