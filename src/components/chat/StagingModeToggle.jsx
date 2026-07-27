import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { Eye, EyeOff } from 'lucide-react'
import { useT } from '../../hooks/useT.js'
import { hasPermission } from '../../config/permissions.js'

// staging.test is its own independent, per-individual toggle (not derived
// from Freshpedia/Tool Catalog view access) — see permission-catalog.md.
// Purely local UI state for now — no staging content exists to actually
// filter yet (Freshpedia/Tool Catalog are placeholders), so toggling this
// only shows the banner. Wiring it to actually swap in staging content is
// future work once those pages are backed by real data.
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
