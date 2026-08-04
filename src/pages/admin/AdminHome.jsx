import { useT } from '../../hooks/useT.js'
import { ADMIN_NAV_ITEMS } from '../../config/adminNav.js'

export default function AdminHome({ navigate, session }) {
  const t = useT()

  return (
    <div className="admin-home">
      <h1 className="admin-home__title">{t('admin.pageTitle')}</h1>
      <nav className="admin-home__menu">
        {ADMIN_NAV_ITEMS.filter((item) => item.canSee(session)).map((item) => (
          <button key={item.path} className="admin-home__item" onClick={() => navigate(item.path)}>
            <item.Icon className="admin-home__item-icon" />
            <span>{t(item.labelKey)}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
