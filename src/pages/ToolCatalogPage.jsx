import { useEffect } from 'react'
import StandalonePageLayout from './StandalonePageLayout.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useRoute } from '../hooks/useRoute.js'
import { useT } from '../hooks/useT.js'
import { canAccessFeature } from '../lib/permissions.js'

export default function ToolCatalogPage({ language, setLanguage }) {
  const t = useT()
  const { session } = useAuth()
  const [, navigate] = useRoute()
  const isAuthorized = canAccessFeature(session?.allowed_permissions, 'tool_catalog')

  useEffect(() => {
    if (!isAuthorized) navigate('/')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized])

  if (!isAuthorized) return null

  return (
    <StandalonePageLayout titleKey="toolCatalog.title" language={language} setLanguage={setLanguage}>
      <div className="config-section">
        <p className="config-section__notice">{t('toolCatalog.comingSoon')}</p>
      </div>
    </StandalonePageLayout>
  )
}
