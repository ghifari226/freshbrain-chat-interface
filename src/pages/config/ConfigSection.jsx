import { useEffect } from 'react'
import ConfigLayout from './ConfigLayout.jsx'
import ConfigHome from './ConfigHome.jsx'
import ScopesPage from './ScopesPage.jsx'
import RolesPage from './RolesPage.jsx'
import UsersPage from './UsersPage.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useRoute } from '../../hooks/useRoute.js'
import { canAccessConfig, getConfigPermission } from '../../lib/configPermissions.js'

const PAGE_BY_PATH = {
  '/config/scopes': 'scopes',
  '/config/roles': 'roles',
  '/config/users': 'users',
}

export default function ConfigSection({ language, setLanguage }) {
  const { session } = useAuth()
  const [path, navigate] = useRoute()
  const role = session?.role
  const isAuthorized = canAccessConfig(role)
  const page = PAGE_BY_PATH[path]
  const permission = page ? getConfigPermission(role, page) : null

  useEffect(() => {
    if (!isAuthorized) {
      navigate('/')
    } else if (permission === 'hidden') {
      navigate('/config')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, permission])

  if (!isAuthorized || permission === 'hidden') return null

  return (
    <ConfigLayout
      path={path}
      navigate={navigate}
      language={language}
      setLanguage={setLanguage}
      role={role}
    >
      {path === '/config/scopes' ? (
        <ScopesPage />
      ) : path === '/config/roles' ? (
        <RolesPage />
      ) : path === '/config/users' ? (
        <UsersPage permission={permission} role={role} />
      ) : (
        <ConfigHome navigate={navigate} role={role} />
      )}
    </ConfigLayout>
  )
}
