import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { Eye, EyeOff } from 'lucide-react'
import { useT } from '../../hooks/useT.js'
import { hasPermission } from '../../config/permissions.js'
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
