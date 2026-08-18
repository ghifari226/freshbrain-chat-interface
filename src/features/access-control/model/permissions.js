export const SYSTEM_ACCESS_PERMISSIONS = [
  'permissions.view',
  'permissions.edit',
  'roles.view',
  'roles.add',
  'roles.edit',
  'roles.assign_scopes',
  'users.view',
  'users.add',
  'users.edit',
  'users.delete',
  'users.assign_permissions',
]
export const CHAT_ACCESS_PERMISSIONS = [
  'freshpedia.live_view',
  'freshpedia.live_edit',
  'freshpedia.live_status',
  'freshpedia.request_view',
  'freshpedia.request_add',
  'freshpedia.request_edit',
  'freshpedia.request_status',
  'tools.live_view',
  'tools.request_view',
  'tools.request_add',
  'tools.request_edit',
  'tools.request_status',
  'staging.test',
]
export const ALL_PERMISSIONS = [...SYSTEM_ACCESS_PERMISSIONS, ...CHAT_ACCESS_PERMISSIONS]
export const TECHNOLOGY_LOCKED_PERMISSIONS = ['users.assign_permissions', 'users.view']
const PERMISSION_CATALOG_GROUP_DEFS = [
  { id: 'freshpedia', label: 'Freshpedia' },
  { id: 'tools', label: 'Tools' },
  { id: 'staging', label: 'Staging' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'roles', label: 'Role scopes' },
  { id: 'users', label: 'Users' },
]

export const PERMISSION_GROUPS = PERMISSION_CATALOG_GROUP_DEFS.map((group) => ({
  id: group.id,
  label: group.label,
  array: ALL_PERMISSIONS.filter((key) => key.startsWith(group.id + '.')),
}))

export const PERMISSION_LABEL_KEYS = {
  'permissions.view': 'permissions.permissionView',
  'permissions.edit': 'permissions.permissionEdit',
  'roles.view': 'permissions.roleScopeView',
  'roles.add': 'permissions.roleScopeAddRole',
  'roles.edit': 'permissions.roleScopeEditRole',
  'roles.assign_scopes': 'permissions.roleScopeAssignScopes',
  'users.view': 'permissions.userView',
  'users.add': 'permissions.userAdd',
  'users.edit': 'permissions.userEdit',
  'users.delete': 'permissions.userDelete',
  'users.assign_permissions': 'permissions.userAssignPermissions',
  'freshpedia.live_view': 'permissions.freshpediaLiveView',
  'freshpedia.live_edit': 'permissions.freshpediaLiveEdit',
  'freshpedia.live_status': 'permissions.freshpediaLiveChangeStatus',
  'freshpedia.request_view': 'permissions.freshpediaRequestView',
  'freshpedia.request_add': 'permissions.freshpediaRequestAdd',
  'freshpedia.request_edit': 'permissions.freshpediaRequestEdit',
  'freshpedia.request_status': 'permissions.freshpediaRequestChangeStatus',
  'tools.live_view': 'permissions.toolLiveView',
  'tools.request_view': 'permissions.toolRequestView',
  'tools.request_add': 'permissions.toolRequestAdd',
  'tools.request_edit': 'permissions.toolRequestEdit',
  'tools.request_status': 'permissions.toolRequestChangeStatus',
  'staging.test': 'permissions.stagingTest',
}
export function updatePermissionInCatalog(key, { label }) {
  if (!ALL_PERMISSIONS.includes(key)) throw new Error('Permission not found')

  if (label !== undefined) {
    const id = label.id.trim() || key
    const en = label.en.trim() || id
    PERMISSION_LABEL_KEYS[key] = { id, en }
  }
}
export function getPermissionCatalog() {
  return ALL_PERMISSIONS.map((key) => ({
    key,
    group: PERMISSION_GROUPS.find((g) => g.array.includes(key))?.id,
    labelKey: PERMISSION_LABEL_KEYS[key] ?? key,
  }))
}
export function hasPermission(bag, key) {
  return Boolean(bag?.allowed_permissions?.includes(key))
}
export function canViewUsers(permissions) {
  return ['users.view', 'users.add', 'users.edit', 'users.delete', 'users.assign_permissions'].some(
    (field) => hasPermission(permissions, field),
  )
}
export function canViewRoles(permissions) {
  return [
    'roles.view',
    'roles.add',
    'roles.edit',
    'roles.assign_scopes',
  ].some((field) => hasPermission(permissions, field))
}
export function canViewPermissions(permissions) {
  return hasPermission(permissions, 'permissions.view') || hasPermission(permissions, 'permissions.edit')
}
export function canAccessConfigSection(permissions) {
  return Boolean(permissions?.allowed_permissions?.length)
}
export function canAssignPermissions(actor) {
  return actor?.role === 'Superuser' || actor?.role === 'Technology'
}
export function canPromote(actor) {
  return Boolean(actor?.is_maintainer)
}
export function canAccessFreshpedia(permissions) {
  return hasPermission(permissions, 'freshpedia.live_view')
}
export function canChangeFreshpediaStatus(permissions) {
  return hasPermission(permissions, 'freshpedia.live_status')
}
export function canAccessToolCatalog(permissions) {
  return hasPermission(permissions, 'tools.live_view')
}
export function canAccessToolRequests(permissions) {
  return hasPermission(permissions, 'tools.request_view')
}
export function permissionsArrayToFlags(allowedPermissions) {
  const set = new Set(allowedPermissions ?? [])
  return Object.fromEntries(ALL_PERMISSIONS.map((key) => [key, set.has(key)]))
}
export function permissionFlagsToArray(flags) {
  return ALL_PERMISSIONS.filter((key) => Boolean(flags[key]))
}
