import { useEffect, useState } from 'react'
import { createUser, listUsers, updateUser } from '../../lib/auth.js'
import { ROLES, ROLE_LABEL_KEYS } from '../../lib/roles.js'
import { useT } from '../../hooks/useT.js'

const EMPTY_FORM = { name: '', email: '', phone: '', role: ROLES[0] }

export default function UsersPage({ permission }) {
  const t = useT()
  const canEdit = permission === 'edit'

  // Mocked, in-memory only — no backend persistence yet, resets on reload.
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingEmail, setEditingEmail] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: '' })
  const [resetLink, setResetLink] = useState(null)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    listUsers().then((data) => {
      if (!cancelled) setUsers(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleAddUser(event) {
    event.preventDefault()
    setFormError('')

    if (!form.name.trim() || !form.email.trim()) return

    setIsSubmitting(true)
    try {
      const { resetToken, ...user } = await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
      })
      setUsers((prev) => [...prev, user])
      setForm(EMPTY_FORM)
      setResetLink(`/reset/${resetToken}`)
      setIsCopied(false)
    } catch {
      setFormError('emailTaken')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCopyResetLink() {
    navigator.clipboard.writeText(resetLink).then(() => {
      setIsCopied(true)
    })
  }

  function startEdit(user) {
    setEditingEmail(user.email)
    setEditForm({ name: user.name, phone: user.phone ?? '', role: user.role })
  }

  async function handleSaveEdit(email) {
    const updated = await updateUser(email, editForm)
    setUsers((prev) => prev.map((u) => (u.email === email ? updated : u)))
    setEditingEmail(null)
  }

  return (
    <div className="config-section">
      <h2 className="config-section__title">{t('config.usersTitle')}</h2>
      <p className="config-section__desc">{t('config.usersDesc')}</p>

      {!canEdit && <p className="config-section__notice">{t('config.viewOnlyNotice')}</p>}

      {resetLink && (
        <div className="config-reset-link">
          <span className="config-reset-link__label">{t('config.resetLinkLabel')}</span>
          <code className="config-reset-link__value">{resetLink}</code>
          <button className="config-link-button" onClick={handleCopyResetLink}>
            {t(isCopied ? 'config.copied' : 'config.copyLink')}
          </button>
        </div>
      )}

      {canEdit && (
        <form className="auth-form config-add-form" onSubmit={handleAddUser}>
          <div className="form-field">
            <label className="form-field__label" htmlFor="user-name">
              {t('config.nameLabel')}
            </label>
            <input
              id="user-name"
              className="form-field__input"
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder={t('config.namePlaceholder')}
            />
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="user-email">
              {t('auth.emailLabel')}
            </label>
            <input
              id="user-email"
              className="form-field__input"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder={t('config.emailPlaceholder')}
              autoComplete="off"
            />
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="user-phone">
              {t('config.phoneLabel')}
            </label>
            <input
              id="user-phone"
              className="form-field__input"
              type="tel"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder={t('config.phonePlaceholder')}
              autoComplete="off"
            />
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="user-role">
              {t('auth.roleLabel')}
            </label>
            <select
              id="user-role"
              className="form-field__select"
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(ROLE_LABEL_KEYS[role])}
                </option>
              ))}
            </select>
          </div>

          {formError && <span className="form-field__error">{t('auth.' + formError)}</span>}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {t('config.addUserSubmit')}
          </button>
        </form>
      )}

      <div className="role-list">
        {users.map((user) => {
          const isEditing = editingEmail === user.email

          return (
            <div className="role-card" key={user.email}>
              {isEditing ? (
                <>
                  <div className="form-field">
                    <label className="form-field__label">{t('config.nameLabel')}</label>
                    <input
                      className="form-field__input"
                      type="text"
                      value={editForm.name}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-field__label">{t('auth.emailLabel')}</label>
                    <input className="form-field__input" type="email" value={user.email} disabled />
                  </div>
                  <div className="form-field">
                    <label className="form-field__label">{t('config.phoneLabel')}</label>
                    <input
                      className="form-field__input"
                      type="tel"
                      value={editForm.phone}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      placeholder={t('config.phonePlaceholder')}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-field__label">{t('auth.roleLabel')}</label>
                    <select
                      className="form-field__select"
                      value={editForm.role}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, role: event.target.value }))
                      }
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {t(ROLE_LABEL_KEYS[role])}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="role-card__actions">
                    <button
                      className="config-link-button"
                      onClick={() => handleSaveEdit(user.email)}
                    >
                      {t('config.saveUser')}
                    </button>
                    <button className="config-link-button" onClick={() => setEditingEmail(null)}>
                      {t('config.cancelEdit')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="role-card__header user-card__header">
                  <div>
                    <span className="role-card__name">{user.name}</span>
                    <span className="user-card__meta">
                      {user.email}
                      {user.phone ? ` · ${user.phone}` : ''} · {t(ROLE_LABEL_KEYS[user.role])}
                    </span>
                  </div>
                  {canEdit && (
                    <button className="config-link-button" onClick={() => startEdit(user)}>
                      {t('config.editUser')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
