import { X } from 'lucide-react'
import { useT } from '@shared/i18n/useT.js'

export default function ProfileModal({ onClose, session }) {
  const t = useT()

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
          <span>{session?.role}</span>
        </div>

        <p className="config-section__notice">{t('profile.editNotice')}</p>
      </div>
    </div>
  )
}
