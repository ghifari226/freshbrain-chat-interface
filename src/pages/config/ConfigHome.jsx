import { useT } from '../../hooks/useT.js'

export default function ConfigHome({ navigate }) {
  const t = useT()

  return (
    <div className="config-home">
      <p className="config-home__intro">{t('config.homeIntro')}</p>

      <div className="config-home__cards">
        <button className="config-card" onClick={() => navigate('/config/scopes')}>
          <i className="fa-solid fa-list-check config-card__icon" />
          <span className="config-card__title">{t('config.scopesCardTitle')}</span>
          <span className="config-card__desc">{t('config.scopesCardDesc')}</span>
        </button>

        <button className="config-card" onClick={() => navigate('/config/roles')}>
          <i className="fa-solid fa-users-gear config-card__icon" />
          <span className="config-card__title">{t('config.rolesCardTitle')}</span>
          <span className="config-card__desc">{t('config.rolesCardDesc')}</span>
        </button>
      </div>
    </div>
  )
}
