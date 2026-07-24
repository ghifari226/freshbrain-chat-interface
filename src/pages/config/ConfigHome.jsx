import { useT } from '../../hooks/useT.js'
import { canViewRoles, canViewPermissions, canViewUsers } from '../../config/permissions.js'

export default function ConfigHome({ navigate, session }) {
  const t = useT()

  return (
    <div className="config-home">
      <p className="config-home__intro">{t('config.homeIntro')}</p>

      <div className="config-home__cards">
        {session?.['scope.view'] && (
          <button className="config-card" onClick={() => navigate('/config/scopes')}>
            <i className="fa-solid fa-list-check config-card__icon" />
            <span className="config-card__title">{t('config.scopesCardTitle')}</span>
            <span className="config-card__desc">{t('config.scopesCardDesc')}</span>
          </button>
        )}

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
