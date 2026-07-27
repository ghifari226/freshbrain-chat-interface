import { X } from 'lucide-react'
import { useT } from '../../hooks/useT.js'
import { ROLE_LABEL_KEYS } from '../../config/roles.js'

export default function ProfileModal({ onClose, session }) {
  const t = useT()
  const roleLabel = ROLE_LABEL_KEYS[session?.role] ? t(ROLE_LABEL_KEYS[session.role]) : session?.role

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__title">{t('profile.title')}</span>
          <button className="icon-button" aria-label={t('profile.close')} onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="modal__row">
          <span className="modal__row-label">{t('config.nameLabel')}</span>
          <span>{session?.name}</span>
        </div>

        <div className="modal__row">
          <span className="modal__row-label">{t('auth.emailLabel')}</span>
          <span>{session?.email}</span>
        </div>

        <div className="modal__row">
          <span className="modal__row-label">{t('auth.roleLabel')}</span>
          <span>{roleLabel}</span>
        </div>

        <p className="config-section__notice">{t('profile.editNotice')}</p>
      </div>
    </div>
  )
}
