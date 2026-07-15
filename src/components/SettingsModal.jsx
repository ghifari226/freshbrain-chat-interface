import { useT } from '../hooks/useT.js'

export default function SettingsModal({
  onClose,
  theme,
  setTheme,
  tone,
  setTone,
  chatFont,
  setChatFont,
  language,
  setLanguage,
}) {
  const t = useT()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__title">{t('settings.title')}</span>
          <button className="icon-button" aria-label={t('settings.close')} onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="modal__row">
          <span className="modal__row-label">{t('settings.brightness')}</span>
          <div className="theme-toggle">
            <button
              className={
                'theme-toggle__option' +
                (theme === 'light' ? ' theme-toggle__option--active' : '')
              }
              onClick={() => setTheme('light')}
            >
              <i className="fa-solid fa-sun" /> {t('settings.light')}
            </button>
            <button
              className={
                'theme-toggle__option' +
                (theme === 'dark' ? ' theme-toggle__option--active' : '')
              }
              onClick={() => setTheme('dark')}
            >
              <i className="fa-solid fa-moon" /> {t('settings.dark')}
            </button>
          </div>
        </div>

        <div className="modal__row">
          <span className="modal__row-label">{t('settings.tone')}</span>
          <div className="theme-toggle">
            <button
              className={
                'theme-toggle__option' +
                (tone === 'cool' ? ' theme-toggle__option--active' : '')
              }
              onClick={() => setTone('cool')}
            >
              <i className="fa-solid fa-temperature-quarter" /> {t('settings.cool')}
            </button>
            <button
              className={
                'theme-toggle__option' +
                (tone === 'warm' ? ' theme-toggle__option--active' : '')
              }
              onClick={() => setTone('warm')}
            >
              <i className="fa-solid fa-temperature-half" /> {t('settings.warm')}
            </button>
          </div>
        </div>

        <div className="modal__row">
          <span className="modal__row-label">{t('settings.chatFont')}</span>
          <select
            className="font-select"
            aria-label={t('settings.chatFont')}
            value={chatFont}
            onChange={(event) => setChatFont(event.target.value)}
          >
            <option value="sans" className="font-select__option--sans">
              {t('settings.fontSans')}
            </option>
            <option value="serif" className="font-select__option--serif">
              {t('settings.fontSerif')}
            </option>
          </select>
        </div>

        <div className="modal__row">
          <span className="modal__row-label">{t('settings.language')}</span>
          <select
            className="font-select"
            aria-label={t('settings.language')}
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option value="en">{t('settings.languageEnglish')}</option>
            <option value="id">{t('settings.languageIndonesian')}</option>
          </select>
        </div>
      </div>
    </div>
  )
}
