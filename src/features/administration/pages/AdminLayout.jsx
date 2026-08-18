import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useT } from '@shared/i18n/useT.js'

export default function AdminLayout({ navigate, subTitle, children }) {
  const t = useT()
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767.98px)').matches,
  )

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 767.98px)')
    const handleViewportChange = (event) => setIsMobileViewport(event.matches)
    mobileViewport.addEventListener('change', handleViewportChange)
    return () => mobileViewport.removeEventListener('change', handleViewportChange)
  }, [])

  const collapseBreadcrumb = subTitle && isMobileViewport
  const hideHeader = isMobileViewport && !subTitle

  return (
    <div className="config-page">
      {!hideHeader && (
        <header className="config-page__header">
          {collapseBreadcrumb ? (
            <button className="icon-button" aria-label={t('admin.title')} onClick={() => navigate('/admin')}>
              <ArrowLeft />
            </button>
          ) : (
            <button
              className={'config-page__title' + (subTitle ? ' config-page__title--muted' : '')}
              onClick={() => navigate('/admin')}
            >
              {t('admin.title')}
            </button>
          )}
          {subTitle && !collapseBreadcrumb && (
            <>
              <span className="config-page__breadcrumb-sep">/</span>
              <span className="config-page__title config-page__title--active">{t(subTitle)}</span>
            </>
          )}
        </header>
      )}

      <div className="config-page__body">{children}</div>
    </div>
  )
}
