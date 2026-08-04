import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import { useT } from '../hooks/useT.js'
import { strings } from '../i18n/strings.js'
import GatewayJsonPreview from '../components/devdoc/GatewayJsonPreview.jsx'
import { ALL_PERMISSIONS } from '../config/permissions.js'
import { USE_MOCK_API } from '../config/appConfig.js'
import { requestPasswordReset } from '../services/authService.js'
import AuthLanguageToggle from '../components/auth/AuthLanguageToggle.jsx'

// dev-doc only — static example of POST /login's 200 response (auth-contract.md).
// Shown next to the live request preview so Freddy sees both sides of the
// interaction without needing a real backend running. `id` is a real
// uuid-shaped string (not the old 'usr_a1b2c3' mock prefix) so the format
// itself is visible, not just the key name. `allowed_permissions` is spread
// from ALL_PERMISSIONS (Larry is Superuser, all true) instead of hardcoded
// so this example can never silently drift from the actual catalog.
const EXAMPLE_LOGIN_RESPONSE = {
  id: 'a1b2c3d4-5e6f-4a1b-8c2d-3e4f5a6b7c8d',
  name: 'Larry Ridwan',
  email: 'larry.ridwan@freshfactory.id',
  phone: '6281110000001',
  role: 'Superuser',
  allowed_scopes: ['wms.inventory', 'wms.inbound', 'wms.fulfillment', 'tms.shipment'],
  allowed_permissions: [...ALL_PERMISSIONS],
  is_maintainer: true,
  access_token: 'eyJhbGciOi...',
  refresh_token: 'eyJhbGciOi...',
  access_expires_in: 900,
  refresh_expires_in: 604800,
}

// dev-doc only — static example of POST /forgot-password's 200 response
// (auth-contract.md). Always this shape regardless of whether the email is
// registered — the endpoint intentionally never reveals account existence.
const EXAMPLE_FORGOT_PASSWORD_RESPONSE = { success: true }

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
      <div className="auth-page__brand">
        <img src="/assets/logos/freshbrain-horizontal-inverse.svg" alt="FreshBrain" className="auth-page__logo" />
      </div>

      <div className="auth-layout">
        <div className="auth-devdoc-column">
          <GatewayJsonPreview
            title="POST /login — Request (live)"
            data={{ email, password: 'x'.repeat(password.length) }}
          />
          <GatewayJsonPreview
            title="POST /forgot-password — Request (live)"
            data={{ email: forgotEmail }}
          />
          <GatewayJsonPreview
            title="POST /forgot-password — Response 200 (example)"
            data={EXAMPLE_FORGOT_PASSWORD_RESPONSE}
          />
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

        <div className="auth-devdoc-column">
          <GatewayJsonPreview
            title="POST /login — Response 200 (example)"
            data={EXAMPLE_LOGIN_RESPONSE}
          />
        </div>
      </div>

      <div className="auth-family">
        <span className="auth-family__caption">{t('auth.familyCaption')}</span>
        <div className="auth-family__logos">
          <img src="/assets/logos/freshfactory.svg" alt="FreshFactory" className="auth-family__logo" />
          <img src="/assets/logos/freshcommerce.svg" alt="FreshCommerce" className="auth-family__logo" />
          <img src="/assets/logos/frex.svg" alt="FreshExpress" className="auth-family__logo" />
        </div>
      </div>

      <div className="auth-footer">© 2026 FreshBrain. All rights reserved.</div>
    </div>
  )
}
