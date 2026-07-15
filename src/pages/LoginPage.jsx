import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useT } from '../hooks/useT.js'
import { strings } from '../lib/strings.js'

export default function LoginPage({ language, setLanguage, onSwitchToRegister }) {
  const { login } = useAuth()
  const t = useT()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const errors = {}
    if (!username.trim()) errors.username = 'usernameRequired'
    if (!password) errors.password = 'passwordRequired'
    setFieldErrors(errors)
    setFormError('')
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      await login(username.trim(), password)
    } catch {
      setFormError('invalidCredentials')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__brand">
        <img src="/logo.png" alt="FreshBrain" className="auth-page__logo" />
        <span className="auth-wordmark">FreshBrain</span>
      </div>

      <div className="auth-lang-toggle">
        <button
          className={
            'auth-lang-toggle__option' +
            (language === 'en' ? ' auth-lang-toggle__option--active' : '')
          }
          onClick={() => setLanguage('en')}
        >
          EN
        </button>
        <button
          className={
            'auth-lang-toggle__option' +
            (language === 'id' ? ' auth-lang-toggle__option--active' : '')
          }
          onClick={() => setLanguage('id')}
        >
          ID
        </button>
      </div>

      <div className="auth-card">
        <div className="auth-slogan">
          {strings.auth.slogan
            .split('. ')
            .map((sentence, index, sentences) => {
              const text = index < sentences.length - 1 ? `${sentence}.` : sentence
              const words = text.split(' ')
              const lastWord = words.pop()
              const leadingText = words.length > 0 ? `${words.join(' ')} ` : ''

              return (
                <div key={index} className="auth-slogan__line">
                  {leadingText}
                  <span className="auth-slogan__accent">{lastWord}</span>
                </div>
              )
            })}
        </div>

        <div className="auth-box">
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {formError && <div className="auth-form__error">{t('auth.' + formError)}</div>}

            <div className="form-field">
              <label className="form-field__label" htmlFor="login-username">
                {t('auth.usernameLabel')}
              </label>
              <input
                id="login-username"
                className="form-field__input"
                type="text"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value)
                  setFieldErrors((prev) => ({ ...prev, username: '' }))
                }}
                placeholder={t('auth.usernamePlaceholder')}
                autoComplete="username"
              />
              {fieldErrors.username && (
                <span className="form-field__error">{t('auth.' + fieldErrors.username)}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-field__label" htmlFor="login-password">
                {t('auth.passwordLabel')}
              </label>
              <input
                id="login-password"
                className="form-field__input"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setFieldErrors((prev) => ({ ...prev, password: '' }))
                }}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete="current-password"
              />
              {fieldErrors.password && (
                <span className="form-field__error">{t('auth.' + fieldErrors.password)}</span>
              )}
            </div>

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('auth.loginButtonLoading') : t('auth.loginButton')}
            </button>
          </form>

          <div className="auth-switch">
            <span>{t('auth.noAccount')}</span>{' '}
            <button className="auth-switch__link" onClick={onSwitchToRegister}>
              {t('auth.registerLink')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
