import { useT } from '../../hooks/useT.js'
export default function AdminLayout({ navigate, subTitle, children }) {
  const t = useT()

  return (
    <div className="config-page">
      <header className="config-page__header">
        <button
          className={'config-page__title' + (subTitle ? ' config-page__title--muted' : '')}
          onClick={() => navigate('/admin')}
        >
          {t('admin.title')}
        </button>
        {subTitle && (
          <>
            <span className="config-page__breadcrumb-sep">/</span>
            <span className="config-page__title config-page__title--active">{t(subTitle)}</span>
          </>
        )}
      </header>

      <div className="config-page__body">{children}</div>
    </div>
  )
}
