import { useEffect } from 'react'
import ConfigLayout from './ConfigLayout.jsx'
import ConfigHome from './ConfigHome.jsx'
import ScopesPage from './ScopesPage.jsx'
import RolesPage from './RolesPage.jsx'
import UsersPage from './UsersPage.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useRoute } from '../../hooks/useRoute.js'
import { canAccessConfigSection, canViewRoles, canViewUsers } from '../../config/permissions.js'

// Per-path reachability — independent booleans now, not a collapsed
// 'edit'/'view'/'hidden' tri-state, since the new model has independent
// view/edit permissions rather than one combined level.
const PAGE_VISIBLE_BY_PATH = {
  '/config/scopes': (session) => Boolean(session?.config_scopes_view),
  '/config/roles': (session) => canViewRoles(session),
  '/config/users': (session) => canViewUsers(session),
}

export default function ConfigSection() {
  const { session } = useAuth()
  const [path, navigate] = useRoute()
  const isAuthorized = canAccessConfigSection(session)
  const isPageVisible = PAGE_VISIBLE_BY_PATH[path]
  const pageVisible = isPageVisible ? isPageVisible(session) : true

  useEffect(() => {
    if (!isAuthorized) {
      navigate('/')
    } else if (!pageVisible) {
      navigate('/config')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, pageVisible])

  if (!isAuthorized || !pageVisible) return null

  return (
    <ConfigLayout navigate={navigate}>
      {path === '/config/scopes' ? (
        <ScopesPage />
      ) : path === '/config/roles' ? (
        <RolesPage session={session} />
      ) : path === '/config/users' ? (
        <UsersPage />
      ) : (
        <ConfigHome navigate={navigate} session={session} />
      )}
    </ConfigLayout>
  )
}
