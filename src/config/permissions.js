// The full permission catalog, `resource.action` string keys — flat booleans
// on the `users` row (or the equivalent shape once chat-gateway exists),
// fully separate from allowed_scopes (roles.js's ROLE_SCOPES), which gates
// chat-time data/tool access, not any of this. Keys contain dots, so they're
// always read/written via bracket notation (`session?.['role_scope.view']`), never
// dot access.
//
// Two display groups only now — "Chat capability access" (the three
// end-user chat surfaces, shown first) and "System Access" (role/
// permission/user administration). The old per-group meta-permissions
// (config_access_permission_edit, chat_access_permission_edit) are gone;
// a single `user.assign_permissions` now gates editing anyone else's
// permissions at all, for both groups.

// Permission entries before Role Scope before User, throughout — matches
// the same order as the Access Configuration landing page/sidebar (System
// permissions before Role Scopes).
export const SYSTEM_ACCESS_PERMISSIONS = [
  'permission.view',
  'permission.edit',
  'role_scope.view',
  'role_scope.add_role',
  'role_scope.edit_role',
  'role_scope.assign_scopes',
  'user.view',
  'user.add',
  'user.edit',
  'user.delete',
  'user.assign_permissions',
]

export const CHAT_ACCESS_PERMISSIONS = [
  'freshpedia.view',
  'freshpedia.request',
  'freshpedia.change_status',
  'tool.view',
  'tool.request',
  'staging.test',
]

// All 18, stable order — used to seed/iterate full permission objects.
export const ALL_PERMISSIONS = [...SYSTEM_ACCESS_PERMISSIONS, ...CHAT_ACCESS_PERMISSIONS]

// Superadmin's hardcoded lock — single source of truth, imported by both
// authService.js's shaping functions and UsersPage's UI-disable logic so
// the two can never drift apart. This is the minimum needed to avoid a
// chicken-and-egg lockout: grant permissions to un-stick anyone else
// (including another Superadmin). role_scope.view and role_scope.assign_scopes
// used to be locked here too but are now ordinary editable booleans for
// Superadmin like any other role's permissions — only user.assign_permissions
// remains locked. (Technology used to hold this lock; nothing is hardcoded to
// Technology anymore — see authService.js's technologyPermissions(), which
// now just defaults everything to true, editable like any other role's
// permissions.)
export const SUPERADMIN_LOCKED_PERMISSIONS = ['user.assign_permissions']

export const PERMISSION_GROUPS = [
  { id: 'chat_access', array: CHAT_ACCESS_PERMISSIONS, labelKey: 'permissions.chatAccessSectionLabel' },
  { id: 'system_access', array: SYSTEM_ACCESS_PERMISSIONS, labelKey: 'permissions.systemAccessSectionLabel' },
]

export const PERMISSION_LABEL_KEYS = {
  'permission.view': 'permissions.permissionView',
  'permission.edit': 'permissions.permissionEdit',
  'role_scope.view': 'permissions.roleScopeView',
  'role_scope.add_role': 'permissions.roleScopeAddRole',
  'role_scope.edit_role': 'permissions.roleScopeEditRole',
  'role_scope.assign_scopes': 'permissions.roleScopeAssignScopes',
  'user.view': 'permissions.userView',
  'user.add': 'permissions.userAdd',
  'user.edit': 'permissions.userEdit',
  'user.delete': 'permissions.userDelete',
  'user.assign_permissions': 'permissions.userAssignPermissions',
  'freshpedia.view': 'permissions.freshpediaView',
  'freshpedia.request': 'permissions.freshpediaRequest',
  'freshpedia.change_status': 'permissions.freshpediaChangeStatus',
  'tool.view': 'permissions.toolView',
  'tool.request': 'permissions.toolRequest',
  'staging.test': 'permissions.stagingTest',
}

// No addPermissionToCatalog — the permission catalog is a fixed, code-level
// concern (this file), not something grantable/creatable at runtime through
// the UI. permission.add (the permission key that used to gate that
// capability) is gone too, for the same reason: there's nothing left for
// it to gate. updatePermissionInCatalog below (editing a label) is the only
// mutation any user, including Superadmin, can still make from the UI.

/**
 * Edits only the display label and which group a permission belongs to —
 * the key itself is immutable once created (every gating check in this
 * codebase references these exact strings; renaming one live would silently
 * break whatever it gates). No delete at all, for any permission, built-in
 * or custom. The label is a full { id, en } pair (not a strings.js path) —
 * PERMISSION_LABEL_KEYS[key] holds either a path (built-in, untouched) or
 * this resolved object (once edited); useT's t() handles both.
 *
 * @param {string} key
 * @param {{ group?: string, label?: { id: string, en: string } }} updates
 */
export function updatePermissionInCatalog(key, { group, label }) {
  if (!ALL_PERMISSIONS.includes(key)) throw new Error('Permission not found')

  if (group !== undefined) {
    const groupEntry = PERMISSION_GROUPS.find((g) => g.id === group)
    if (!groupEntry) throw new Error('Unknown permission group')
    for (const g of PERMISSION_GROUPS) {
      const index = g.array.indexOf(key)
      if (index !== -1) g.array.splice(index, 1)
    }
    groupEntry.array.push(key)
  }

  if (label !== undefined) {
    const id = label.id.trim() || key
    const en = label.en.trim() || id
    PERMISSION_LABEL_KEYS[key] = { id, en }
  }
}

/**
 * @returns {{ key: string, group: string, labelKey: string }[]}
 */
export function getPermissionCatalog() {
  return ALL_PERMISSIONS.map((key) => ({
    key,
    group: PERMISSION_GROUPS.find((g) => g.array.includes(key))?.id,
    labelKey: PERMISSION_LABEL_KEYS[key],
  }))
}

/**
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canViewUsers(permissions) {
  const p = permissions ?? {}
  return Boolean(
    p['user.view'] || p['user.add'] || p['user.edit'] || p['user.delete'] || p['user.assign_permissions'],
  )
}

/**
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canViewRoles(permissions) {
  const p = permissions ?? {}
  return Boolean(
    p['role_scope.view'] || p['role_scope.add_role'] || p['role_scope.edit_role'] || p['role_scope.assign_scopes'],
  )
}

/**
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canViewPermissions(permissions) {
  const p = permissions ?? {}
  return Boolean(p['permission.view'] || p['permission.edit'])
}

// Any of the 18 true => can reach /config at all (nav-menu gate).
/**
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canAccessConfigSection(permissions) {
  const p = permissions ?? {}
  return ALL_PERMISSIONS.some((field) => Boolean(p[field]))
}

/**
 * Gates the Shield icon and everything inside it — both display groups at
 * once, there's no more per-group split now that config_access_permission_edit
 * and chat_access_permission_edit have merged into this one flag.
 *
 * @param {Record<string, boolean> | undefined} actorPermissions
 */
export function canAssignPermissions(actorPermissions) {
  return Boolean(actorPermissions?.['user.assign_permissions'])
}

/**
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canAccessFreshpedia(permissions) {
  const p = permissions ?? {}
  return Boolean(p['freshpedia.view'] || p['staging.test'] || p['freshpedia.request'])
}

/**
 * Gates Freshpedia's promote/demote transition actions and full edit
 * access to any entry regardless of status — a dedicated permission now
 * (used to be a reuse of user.assign_permissions, which was really about
 * editing other users' Shield permissions, an unrelated concern). Checked
 * in both FreshpediaPage.jsx (UI) and services/freshpedia.js (mock
 * write-path enforcement), same shape as canAssignPermissions.
 *
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canChangeFreshpediaStatus(permissions) {
  return Boolean(permissions?.['freshpedia.change_status'])
}

/**
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canAccessToolCatalog(permissions) {
  const p = permissions ?? {}
  return Boolean(p['tool.view'] || p['staging.test'] || p['tool.request'])
}
