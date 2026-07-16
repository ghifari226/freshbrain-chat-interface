import { useEffect } from 'react'
import ConfigLayout from './ConfigLayout.jsx'
import ConfigHome from './ConfigHome.jsx'
import ScopesPage from './ScopesPage.jsx'
import RolesPage from './RolesPage.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useRoute } from '../../hooks/useRoute.js'

export default function ConfigSection({ language, setLanguage }) {
  const { session } = useAuth()
  const [path, navigate] = useRoute()
  const isAuthorized = session?.role === 'Technology'

  useEffect(() => {
    if (!isAuthorized) navigate('/')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized])

  if (!isAuthorized) return null

  return (
    <ConfigLayout path={path} navigate={navigate} language={language} setLanguage={setLanguage}>
      {path === '/config/scopes' ? (
        <ScopesPage />
      ) : path === '/config/roles' ? (
        <RolesPage />
      ) : (
        <ConfigHome navigate={navigate} />
      )}
    </ConfigLayout>
  )
}
