import { useT } from '../../hooks/useT.js'
import { canViewRoles, canViewPermissions, canViewUsers } from '../../config/permissions.js'

export default function ConfigHome({ navigate, session }) {
  const t = useT()

  return (
    <div className="config-home">
      <div className="config-home__cards">
        {canViewRoles(session) && (
          <button className="config-card" onClick={() => navigate('/config/roles')}>
            <i className="fa-solid fa-users-gear config-card__icon" />
            <span className="config-card__title">{t('config.rolesCardTitle')}</span>
            <span className="config-card__desc">{t('config.rolesCardDesc')}</span>
          </button>
        )}

        {canViewPermissions(session) && (
          <button className="config-card" onClick={() => navigate('/config/permissions')}>
            <i className="fa-solid fa-shield-halved config-card__icon" />
            <span className="config-card__title">{t('config.permissionsCardTitle')}</span>
            <span className="config-card__desc">{t('config.permissionsCardDesc')}</span>
          </button>
        )}

        {canViewUsers(session) && (
          <button className="config-card" onClick={() => navigate('/config/users')}>
            <i className="fa-solid fa-user-gear config-card__icon" />
            <span className="config-card__title">{t('config.usersCardTitle')}</span>
            <span className="config-card__desc">{t('config.usersCardDesc')}</span>
          </button>
        )}
      </div>
    </div>
  )
}
