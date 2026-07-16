import { useT } from '../../hooks/useT.js'

export default function ConfigLayout({ path, navigate, language, setLanguage, children }) {
  const t = useT()

  return (
    <div className="config-page">
      <header className="config-page__header">
        <button
          className="icon-button"
          aria-label={t('config.backToChat')}
          onClick={() => navigate('/')}
        >
          <i className="fa-solid fa-arrow-left" />
        </button>
        <button className="config-page__title" onClick={() => navigate('/config')}>
          {t('config.title')}
        </button>

        <div className="config-lang-toggle">
          <button
            className={
              'config-lang-toggle__option' +
              (language === 'en' ? ' config-lang-toggle__option--active' : '')
            }
            onClick={() => setLanguage('en')}
          >
            EN
          </button>
          <button
            className={
              'config-lang-toggle__option' +
              (language === 'id' ? ' config-lang-toggle__option--active' : '')
            }
            onClick={() => setLanguage('id')}
          >
            ID
          </button>
        </div>
      </header>

      <nav className="config-page__nav">
        <button
          className={
            'config-page__nav-item' +
            (path === '/config/scopes' ? ' config-page__nav-item--active' : '')
          }
          onClick={() => navigate('/config/scopes')}
        >
          {t('config.navScopes')}
        </button>
        <button
          className={
            'config-page__nav-item' +
            (path === '/config/roles' ? ' config-page__nav-item--active' : '')
          }
          onClick={() => navigate('/config/roles')}
        >
          {t('config.navRoles')}
        </button>
      </nav>

      <div className="config-page__body">{children}</div>
    </div>
  )
}
