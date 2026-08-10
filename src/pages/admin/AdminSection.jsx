import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AdminLayout from './AdminLayout.jsx'
import AdminHome from './AdminHome.jsx'
import RolesPage from './RolesPage.jsx'
import PermissionsPage from './PermissionsPage.jsx'
import UsersPage from './UsersPage.jsx'
import FreshpediaPage from '../FreshpediaPage.jsx'
import ToolCatalogLivePage from '../ToolCatalogLivePage.jsx'
import ToolCatalogRequestPage from '../ToolCatalogRequestPage.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { canAccessConfigSection, canViewRoles, canViewPermissions, canViewUsers } from '../../config/permissions.js'
import { ADMIN_NAV_ITEMS } from '../../config/adminNav.js'
const PAGE_VISIBLE_BY_PATH = {
  '/admin/roles': (session) => canViewRoles(session),
  '/admin/permissions': (session) => canViewPermissions(session),
  '/admin/users': (session) => canViewUsers(session),
}
const SUB_PAGE_TITLES = Object.fromEntries(ADMIN_NAV_ITEMS.map((item) => [item.path, item.labelKey]))

export default function AdminSection({ language }) {
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
      navigate('/admin')
    }
  }, [isAuthorized, navigate, pageVisible])

  if (!isAuthorized || !pageVisible) return null

  return (
    <AdminLayout navigate={navigate} subTitle={SUB_PAGE_TITLES[path]}>
      {path === '/admin/freshpedia' ? (
        <FreshpediaPage language={language} />
      ) : path === '/admin/tool-catalog' ? (
        <ToolCatalogLivePage />
      ) : path === '/admin/tool-requests' ? (
        <ToolCatalogRequestPage />
      ) : path === '/admin/roles' ? (
        <RolesPage session={session} />
      ) : path === '/admin/permissions' ? (
        <PermissionsPage session={session} />
      ) : path === '/admin/users' ? (
        <UsersPage />
      ) : (
        <AdminHome navigate={navigate} session={session} />
      )}
    </AdminLayout>
  )
}
