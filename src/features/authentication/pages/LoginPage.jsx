import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../model/useAuth.js'
import { useT } from '@shared/i18n/useT.js'
import { strings } from '@shared/i18n/strings.js'
import { USE_MOCK_API } from '@core/config/runtime.js'
import { requestPasswordReset } from '../api/authApi.js'
import AuthLanguageToggle from '../components/AuthLanguageToggle.jsx'
import { isNativeApp } from '@shared/lib/platform.js'

export default function LoginPage({ language, setLanguage, passwordResetSuccess }) {
  const { login } = useAuth()
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [mode, setMode] = useState('login')
  const [forgotEmail, setForgotEmail] = useState('')
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [mockResetLink, setMockResetLink] = useState('')
  const [notice, setNotice] = useState(passwordResetSuccess ? 'passwordReset' : '')

  async function handleSubmit(event) {
    event.preventDefault()
    setNotice('')

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

  async function handleForgotSubmit(event) {
    event.preventDefault()
    if (!forgotEmail.trim()) return

    setIsSendingReset(true)
    try {
      const result = await requestPasswordReset(forgotEmail.trim())
      setMockResetLink(result.mockResetLink ?? '')
      setNotice('resetSent')
    } finally {
      setIsSendingReset(false)
      setMode('login')
      setForgotEmail('')
    }
  }

  function backToLogin() {
    setMode('login')
    setForgotEmail('')
  }

  return (
    <div className="auth-page">
      {!isNativeApp && (
        <div className="auth-page__brand">
          <img src="/assets/logos/freshbrain-horizontal-inverse.svg" alt="FreshBrain" className="auth-page__logo" />
        </div>
      )}

      <div className="auth-card">
        {isNativeApp ? (
          <div className="auth-slogan auth-slogan--native">
            <img src="/assets/logos/freshbrain-horizontal-inverse.svg" alt="FreshBrain" className="auth-page__logo" />
          </div>
        ) : (
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
        )}

        <div className="auth-box">
          <div className="auth-box__toolbar">
            <AuthLanguageToggle language={language} setLanguage={setLanguage} compact />
          </div>

          {mode === 'login' && (
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {notice === 'resetSent' && (
                <div className="auth-form__notice">
                  <strong>{t('auth.resetLinkSentTitle')}</strong>
                  <span>{t('auth.resetLinkSentBody')}</span>
                  {USE_MOCK_API && mockResetLink && <span>Dev: {mockResetLink}</span>}
                </div>
              )}

              {notice === 'passwordReset' && (
                <div className="auth-form__notice">
                  <strong>{t('auth.passwordResetSuccessTitle')}</strong>
                  <span>{t('auth.passwordResetSuccessBody')}</span>
                </div>
              )}

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
                <button className="auth-forgot__link" type="button" onClick={() => setMode('forgot')}>
                  {t('auth.forgotPassword')}
                </button>
              </div>

              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('auth.loginButtonLoading') : t('auth.loginButton')}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form className="auth-form" onSubmit={handleForgotSubmit} noValidate>
              <p className="form-field__hint">{t('auth.forgotBody')}</p>

              <div className="form-field">
                <label className="form-field__label" htmlFor="forgot-email">
                  {t('auth.emailLabel')}
                </label>
                <input
                  id="forgot-email"
                  className="form-field__input"
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="email"
                />
              </div>

              <button className="auth-submit" type="submit" disabled={isSendingReset}>
                {isSendingReset ? t('auth.forgotSubmitLoading') : t('auth.forgotSubmit')}
              </button>

              <button className="auth-forgot__link" type="button" onClick={backToLogin}>
                <ArrowLeft className="auth-forgot__link-icon" />
                {t('auth.backToLogin')}
              </button>
            </form>
          )}
        </div>
      </div>

      {!isNativeApp && (
        <div className="auth-family">
          <span className="auth-family__caption">{t('auth.familyCaption')}</span>
          <div className="auth-family__logos">
            <img src="/assets/logos/freshfactory.svg" alt="FreshFactory" className="auth-family__logo" />
            <img src="/assets/logos/freshcommerce.svg" alt="FreshCommerce" className="auth-family__logo" />
            <img src="/assets/logos/frex.svg" alt="FreshExpress" className="auth-family__logo" />
          </div>
        </div>
      )}

      {!isNativeApp && (
        <div className="auth-footer">© 2026 FreshBrain. All rights reserved.</div>
      )}
    </div>
  )
}
