import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../hooks/useT.js'
import { strings } from '../i18n/strings.js'
import { confirmPasswordReset } from '../services/authService.js'
import AuthLanguageToggle from '../components/auth/AuthLanguageToggle.jsx'
import GatewayJsonPreview from '../components/devdoc/GatewayJsonPreview.jsx'

const MIN_PASSWORD_LENGTH = 8

// dev-doc only — static example of POST /reset-password's 200 response
// (auth-contract.md). Same session shape as POST /login — this endpoint
// also issues a fresh token — see LoginPage.jsx's EXAMPLE_LOGIN_RESPONSE
// for the fully catalog-derived version; kept abbreviated here since this
// page's only job is showing the request side is masked correctly.
const EXAMPLE_RESET_PASSWORD_RESPONSE = {
  id: 'a1b2c3d4-5e6f-4a1b-8c2d-3e4f5a6b7c8d',
  name: 'Larry Ridwan',
  email: 'larry.ridwan@freshfactory.id',
  phone: '6281110000001',
  role: 'Superuser',
  allowed_scopes: ['wms.inventory', 'wms.inbound', 'wms.fulfillment', 'tms.shipment'],
  allowed_permissions: ['...'],
  is_maintainer: true,
  token: 'eyJhbGciOiJIUzI1NiIs...',
}

export default function ResetPasswordPage({ token, language, setLanguage }) {
  const navigate = useNavigate()
  const t = useT()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const errors = {}
    if (!password) errors.password = 'passwordRequired'
    else if (password.length < MIN_PASSWORD_LENGTH) errors.password = 'passwordTooShort'
    if (password && confirmPassword !== password) errors.confirmPassword = 'passwordMismatch'
    setFieldErrors(errors)
    setFormError('')
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      await confirmPasswordReset(token, password)
      navigate('/', { replace: true, state: { passwordResetSuccess: true } })
    } catch {
      setFormError('invalidToken')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__brand">
        <img src="/assets/logos/freshbrain-horizontal-inverse.svg" alt="FreshBrain" className="auth-page__logo" />
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

          <h1 className="auth-heading">{t('resetPassword.title')}</h1>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {formError && <div className="auth-form__error">{t('resetPassword.' + formError)}</div>}

            <div className="form-field">
              <label className="form-field__label" htmlFor="reset-password">
                {t('resetPassword.newPasswordLabel')}
              </label>
              <input
                id="reset-password"
                className="form-field__input"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setFieldErrors((prev) => ({ ...prev, password: '' }))
                }}
                placeholder={t('resetPassword.newPasswordPlaceholder')}
                autoComplete="new-password"
              />
              {fieldErrors.password && (
                <span className="form-field__error">{t('resetPassword.' + fieldErrors.password)}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-field__label" htmlFor="reset-confirm-password">
                {t('resetPassword.confirmPasswordLabel')}
              </label>
              <input
                id="reset-confirm-password"
                className="form-field__input"
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
                }}
                placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                autoComplete="new-password"
              />
              {fieldErrors.confirmPassword && (
                <span className="form-field__error">{t('resetPassword.' + fieldErrors.confirmPassword)}</span>
              )}
            </div>

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('resetPassword.submitButtonLoading') : t('resetPassword.submitButton')}
            </button>
          </form>
        </div>
      </div>

      <div className="auth-devdoc">
        <GatewayJsonPreview
          title="POST /reset-password — Request (live)"
          data={{ token, password: 'x'.repeat(password.length) }}
        />
        <GatewayJsonPreview
          title="POST /reset-password — Response 200 (example)"
          data={EXAMPLE_RESET_PASSWORD_RESPONSE}
        />
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
