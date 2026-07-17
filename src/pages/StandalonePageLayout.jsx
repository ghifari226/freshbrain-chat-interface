import { useT } from '../hooks/useT.js'
import { useRoute } from '../hooks/useRoute.js'

// Shared shell for top-level pages reached from the user menu (Freshpedia,
// Tool Catalog) that aren't part of Access Configuration — same header
// pattern as ConfigLayout (back button, title, language toggle), minus the
// config-specific nav tabs.
export default function StandalonePageLayout({ titleKey, language, setLanguage, children }) {
  const t = useT()
  const [, navigate] = useRoute()

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
        <span className="config-page__title">{t(titleKey)}</span>

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

      <div className="config-page__body">{children}</div>
    </div>
  )
}
