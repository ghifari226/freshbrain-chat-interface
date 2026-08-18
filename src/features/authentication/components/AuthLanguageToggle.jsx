export default function AuthLanguageToggle({ language, setLanguage, compact }) {
  return (
    <div className={'auth-lang-toggle' + (compact ? ' auth-lang-toggle--compact' : '')}>
      <button
        className={
          'auth-lang-toggle__option' + (language === 'id' ? ' auth-lang-toggle__option--active' : '')
        }
        onClick={() => setLanguage('id')}
      >
        ID
      </button>
      <button
        className={
          'auth-lang-toggle__option' + (language === 'en' ? ' auth-lang-toggle__option--active' : '')
        }
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  )
}
