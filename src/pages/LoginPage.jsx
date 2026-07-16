import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useT } from '../hooks/useT.js'
import { strings } from '../lib/strings.js'

export default function LoginPage({ language, setLanguage }) {
  const { login } = useAuth()
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const errors = {}
    if (!email.trim()) errors.email = 'emailRequired'
    if (!password) errors.password = 'passwordRequired'
    setFieldErrors(errors)
    setFormError('')
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      await login(email.trim(), password)
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
              <label className="form-field__label" htmlFor="login-email">
                {t('auth.emailLabel')}
              </label>
              <input
                id="login-email"
                className="form-field__input"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setFieldErrors((prev) => ({ ...prev, email: '' }))
                }}
                placeholder={t('auth.emailPlaceholder')}
                autoComplete="email"
              />
              {fieldErrors.email && (
                <span className="form-field__error">{t('auth.' + fieldErrors.email)}</span>
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

            <div className="auth-forgot">
              <button className="auth-forgot__link" type="button">
                {t('auth.forgotPassword')}
              </button>
            </div>

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('auth.loginButtonLoading') : t('auth.loginButton')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
