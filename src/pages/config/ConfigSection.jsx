import { useEffect } from 'react'
import ConfigLayout from './ConfigLayout.jsx'
import ConfigHome from './ConfigHome.jsx'
import ScopesPage from './ScopesPage.jsx'
import RoleCatalogPage from './RoleCatalogPage.jsx'
import RoleScopesPage from './RoleScopesPage.jsx'
import PermissionCatalogPage from './PermissionCatalogPage.jsx'
import UsersPage from './UsersPage.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useRoute } from '../../hooks/useRoute.js'
import { canAccessConfigSection, canViewRoles, canViewUsers } from '../../config/permissions.js'

// Per-path reachability — independent booleans now, not a collapsed
// 'edit'/'view'/'hidden' tri-state, since the new model has independent
// view/edit permissions rather than one combined level. Role Catalog,
// Role Scopes, and Permission Catalog all share the config_roles_view/edit
// gate — there's no dedicated permission for the catalog split yet (see
// roles.js/permissions.js's addRoleToCatalog/addPermissionToCatalog
// comments on why these three stay UI-only for now).
const PAGE_VISIBLE_BY_PATH = {
  '/config/scopes': (session) => Boolean(session?.config_scopes_view),
  '/config/role-catalog': (session) => canViewRoles(session),
  '/config/role-scopes': (session) => canViewRoles(session),
  '/config/permission-catalog': (session) => canViewRoles(session),
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
      ) : path === '/config/role-catalog' ? (
        <RoleCatalogPage session={session} />
      ) : path === '/config/role-scopes' ? (
        <RoleScopesPage session={session} />
      ) : path === '/config/permission-catalog' ? (
        <PermissionCatalogPage session={session} />
      ) : path === '/config/users' ? (
        <UsersPage />
      ) : (
        <ConfigHome navigate={navigate} session={session} />
      )}
    </ConfigLayout>
  )
}
