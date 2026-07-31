import { BookOpen, ListChecks, ShieldCheck, UserCog, Wrench } from 'lucide-react'
import {
  canAccessFreshpedia,
  canAccessToolCatalog,
  canViewRoles,
  canViewPermissions,
  canViewUsers,
} from './permissions.js'

// Single source of truth for the 5 Admin destinations — the Admin landing
// page's card list, the Sidebar's nav-variant rows (collapsed rail +
// expanded nav), and AdminSection's breadcrumb sub-titles all render from
// this, so path/icon/label/gate can't drift out of sync between them.
export const ADMIN_NAV_ITEMS = [
  { path: '/admin/freshpedia', labelKey: 'freshpedia.title', Icon: BookOpen, canSee: canAccessFreshpedia },
  { path: '/admin/tools', labelKey: 'toolCatalog.title', Icon: Wrench, canSee: canAccessToolCatalog },
  { path: '/admin/roles', labelKey: 'config.rolesTitle', Icon: ListChecks, canSee: canViewRoles },
  { path: '/admin/permissions', labelKey: 'config.permissionsTitle', Icon: ShieldCheck, canSee: canViewPermissions },
  { path: '/admin/users', labelKey: 'config.usersTitle', Icon: UserCog, canSee: canViewUsers },
]
