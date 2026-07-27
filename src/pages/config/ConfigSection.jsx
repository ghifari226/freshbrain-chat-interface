import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ConfigLayout from './ConfigLayout.jsx'
import ConfigHome from './ConfigHome.jsx'
import RolesPage from './RolesPage.jsx'
import PermissionsPage from './PermissionsPage.jsx'
import UsersPage from './UsersPage.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { canAccessConfigSection, canViewRoles, canViewPermissions, canViewUsers } from '../../config/permissions.js'

// Per-path reachability — independent booleans, one gate group per page.
// Scope Catalog is gone — that "grouped by system" concept now lives in
// Tool Catalog (system column + system filter chips), not a standalone
// Access Config page.
const PAGE_VISIBLE_BY_PATH = {
  '/config/roles': (session) => canViewRoles(session),
  '/config/permissions': (session) => canViewPermissions(session),
  '/config/users': (session) => canViewUsers(session),
}

// Breadcrumb copy for each sub-page — the title ConfigLayout renders next
// to the (muted) "Access Configuration" parent. No entry for '/config'
// itself, since that's the page the breadcrumb collapses to.
const SUB_PAGE_TITLES = {
  '/config/roles': 'config.rolesTitle',
  '/config/permissions': 'config.permissionsTitle',
  '/config/users': 'config.usersTitle',
}

export default function ConfigSection() {
  const { session } = useAuth()
  const { pathname: path } = useLocation()
  const navigate = useNavigate()
  const isAuthorized = canAccessConfigSection(session)
  const isPageVisible = PAGE_VISIBLE_BY_PATH[path]
  const pageVisible = isPageVisible ? isPageVisible(session) : true

  useEffect(() => {
    if (!isAuthorized) {
      navigate('/')
    } else if (!pageVisible) {
      navigate('/config')
    }
  }, [isAuthorized, navigate, pageVisible])

  if (!isAuthorized || !pageVisible) return null

  return (
    <ConfigLayout navigate={navigate} subTitle={SUB_PAGE_TITLES[path]}>
      {path === '/config/roles' ? (
        <RolesPage session={session} />
      ) : path === '/config/permissions' ? (
        <PermissionsPage session={session} />
      ) : path === '/config/users' ? (
        <UsersPage />
      ) : (
        <ConfigHome navigate={navigate} session={session} />
      )}
    </ConfigLayout>
  )
}
