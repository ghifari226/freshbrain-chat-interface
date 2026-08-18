import { BookOpen, ListChecks, ShieldCheck, Toolbox, UserCog, Wrench } from 'lucide-react'
import {
  canAccessFreshpedia,
  canAccessToolCatalog,
  canAccessToolRequests,
  canViewRoles,
  canViewPermissions,
  canViewUsers,
} from '@features/access-control'

export const ADMIN_NAV_SECTIONS = [
  { id: 'knowledge', labelKey: 'sidebar.knowledgeSection' },
  { id: 'capability', labelKey: 'sidebar.capabilitySection' },
  { id: 'access', labelKey: 'sidebar.accessSection' },
]

export const ADMIN_NAV_ITEMS = [
  {
    path: '/admin/freshpedia',
    labelKey: 'freshpedia.title',
    Icon: BookOpen,
    canSee: canAccessFreshpedia,
    section: 'knowledge',
  },
  {
    path: '/admin/tool-catalog',
    labelKey: 'toolCatalog.title',
    Icon: Toolbox,
    canSee: canAccessToolCatalog,
    section: 'capability',
  },
  {
    path: '/admin/tool-requests',
    labelKey: 'toolCatalog.requestsNavTitle',
    Icon: Wrench,
    canSee: canAccessToolRequests,
    section: 'capability',
  },
  {
    path: '/admin/permissions',
    labelKey: 'config.permissionsTitle',
    Icon: ShieldCheck,
    canSee: canViewPermissions,
    section: 'access',
  },
  {
    path: '/admin/roles',
    labelKey: 'config.rolesTitle',
    Icon: ListChecks,
    canSee: canViewRoles,
    section: 'access',
  },
  {
    path: '/admin/users',
    labelKey: 'config.usersTitle',
    Icon: UserCog,
    canSee: canViewUsers,
    section: 'access',
  },
]
