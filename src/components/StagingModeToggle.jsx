import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useT } from '../hooks/useT.js'
import { canAccessFeature } from '../lib/permissions.js'

// Lets Freshpedia/Tool Catalog viewers preview staging-status content in
// their own live session before it's promoted to production. Purely local
// UI state for now — no staging content exists to actually filter yet
// (Freshpedia/Tool Catalog are placeholders), so toggling this only shows
// the banner. Wiring it to actually swap in staging content is future work
// once those pages are backed by real data.
export default function StagingModeToggle() {
  const { session } = useAuth()
  const t = useT()
  const [isStaging, setIsStaging] = useState(false)

  const canPreviewStaging =
    canAccessFeature(session?.allowed_permissions, 'freshpedia') ||
    canAccessFeature(session?.allowed_permissions, 'tool_catalog')

  if (!canPreviewStaging) return null

  return (
    <>
      {isStaging && <span className="staging-banner">{t('staging.bannerLabel')}</span>}
      <button
        className={'staging-toggle' + (isStaging ? ' staging-toggle--active' : '')}
        aria-label={t('staging.toggleLabel')}
        onClick={() => setIsStaging((prev) => !prev)}
      >
        <i className={'fa-solid ' + (isStaging ? 'fa-eye-slash' : 'fa-eye')} />
      </button>
    </>
  )
}
