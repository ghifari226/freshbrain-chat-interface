import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useT } from '../hooks/useT.js'
import { ROLES, ROLE_LABEL_KEYS } from '../lib/roles.js'

export default function RegisterPage({ language, setLanguage, onSwitchToLogin }) {
  const { register } = useAuth()
  const t = useT()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Warehouse Staff')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const errors = {}
    if (!username.trim()) errors.username = 'usernameRequired'
    if (!password) errors.password = 'passwordRequired'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      await register(username.trim(), password, role)
    } catch {
      setFieldErrors({ username: 'usernameTaken' })
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
        <span className="auth-heading">{t('auth.registerHeading')}</span>

        <div className="auth-box">
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label className="form-field__label" htmlFor="register-username">
                {t('auth.usernameLabel')}
              </label>
              <input
                id="register-username"
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
              <label className="form-field__label" htmlFor="register-password">
                {t('auth.passwordLabel')}
              </label>
              <input
                id="register-password"
                className="form-field__input"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setFieldErrors((prev) => ({ ...prev, password: '' }))
                }}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete="new-password"
              />
              {fieldErrors.password && (
                <span className="form-field__error">{t('auth.' + fieldErrors.password)}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-field__label" htmlFor="register-role">
                {t('auth.roleLabel')}
              </label>
              <select
                id="register-role"
                className="form-field__select"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t(ROLE_LABEL_KEYS[role])}
                  </option>
                ))}
              </select>
            </div>

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('auth.registerButtonLoading') : t('auth.registerButton')}
            </button>
          </form>

          <div className="auth-switch">
            <span>{t('auth.haveAccount')}</span>{' '}
            <button className="auth-switch__link" onClick={onSwitchToLogin}>
              {t('auth.loginLink')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
