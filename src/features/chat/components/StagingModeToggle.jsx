import { useState } from 'react'
import { useAuth } from '@features/authentication'
import { Eye, EyeOff } from 'lucide-react'
import { useT } from '@shared/i18n/useT.js'
import { hasPermission } from '@features/access-control'
export default function StagingModeToggle() {
  const { session } = useAuth()
  const t = useT()
  const [isStaging, setIsStaging] = useState(false)

  const canPreviewStaging = hasPermission(session, 'staging.test')

  if (!canPreviewStaging) return null

  return (
    <>
      {isStaging && <span className="staging-banner">{t('staging.bannerLabel')}</span>}
      <button
        className={'staging-toggle' + (isStaging ? ' staging-toggle--active' : '')}
        aria-label={t('staging.toggleLabel')}
        onClick={() => setIsStaging((prev) => !prev)}
      >
        {isStaging ? <EyeOff /> : <Eye />}
      </button>
    </>
  )
}
