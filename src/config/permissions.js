// The full permission catalog, `resource.action` string keys — stored as
// flat boolean columns on the `users` row (indexed, type-safe queries), but
// exposed over the wire as `allowed_permissions: string[]` (only the true
// ones), same convention as allowed_scopes — see permission-catalog.md's
// "Kenapa boolean, bukan array" for why storage and wire shape differ.
// Fully separate from allowed_scopes (roles.js's ROLE_SCOPES), which gates
// chat-time data/tool access, not any of this. Keys contain dots, so
// hasPermission() below (never dot access) is the one place that reads them.
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
 * The one place every other check in this module (and every direct call
 * site elsewhere — pages/components that need a single field rather than
 * one of the OR-groups below) reads `allowed_permissions` — never dot
 * access, the key itself contains a literal `.`.
 *
 * @param {{ allowed_permissions?: string[] } | undefined | null} bag
 * @param {string} key
 */
export function hasPermission(bag, key) {
  return Boolean(bag?.allowed_permissions?.includes(key))
}

/** @param {{ allowed_permissions?: string[] } | undefined} permissions */
export function canViewUsers(permissions) {
  return ['user.view', 'user.add', 'user.edit', 'user.delete', 'user.assign_permissions'].some(
    (field) => hasPermission(permissions, field),
  )
}

/** @param {{ allowed_permissions?: string[] } | undefined} permissions */
export function canViewRoles(permissions) {
  return [
    'role_scope.view',
    'role_scope.add_role',
    'role_scope.edit_role',
    'role_scope.assign_scopes',
  ].some((field) => hasPermission(permissions, field))
}

/** @param {{ allowed_permissions?: string[] } | undefined} permissions */
export function canViewPermissions(permissions) {
  return hasPermission(permissions, 'permission.view') || hasPermission(permissions, 'permission.edit')
}

// Any of the 18 present => can reach /config at all (nav-menu gate).
/** @param {{ allowed_permissions?: string[] } | undefined} permissions */
export function canAccessConfigSection(permissions) {
  return Boolean(permissions?.allowed_permissions?.length)
}

/**
 * Gates the Shield icon and everything inside it — both display groups at
 * once, there's no more per-group split now that config_access_permission_edit
 * and chat_access_permission_edit have merged into this one flag.
 *
 * @param {{ allowed_permissions?: string[] } | undefined} actorPermissions
 */
export function canAssignPermissions(actorPermissions) {
  return hasPermission(actorPermissions, 'user.assign_permissions')
}

/** @param {{ allowed_permissions?: string[] } | undefined} permissions */
export function canAccessFreshpedia(permissions) {
  return (
    hasPermission(permissions, 'freshpedia.view') ||
    hasPermission(permissions, 'staging.test') ||
    hasPermission(permissions, 'freshpedia.request')
  )
}

/**
 * Gates Freshpedia's promote/demote transition actions and full edit
 * access to any entry regardless of status — a dedicated permission now
 * (used to be a reuse of user.assign_permissions, which was really about
 * editing other users' Shield permissions, an unrelated concern). Checked
 * in both FreshpediaPage.jsx (UI) and services/freshpedia.js (mock
 * write-path enforcement), same shape as canAssignPermissions.
 *
 * @param {{ allowed_permissions?: string[] } | undefined} permissions
 */
export function canChangeFreshpediaStatus(permissions) {
  return hasPermission(permissions, 'freshpedia.change_status')
}

/** @param {{ allowed_permissions?: string[] } | undefined} permissions */
export function canAccessToolCatalog(permissions) {
  return (
    hasPermission(permissions, 'tool.view') ||
    hasPermission(permissions, 'staging.test') ||
    hasPermission(permissions, 'tool.request')
  )
}

/**
 * Boundary helpers only — UsersPage's Shield dialog edits permissions as a
 * per-field checkbox grid (flags), but the wire/session shape is an array.
 * Convert at the edges; never store the flags form anywhere persistent.
 *
 * @param {string[] | undefined} allowedPermissions
 * @returns {Record<string, boolean>}
 */
export function permissionsArrayToFlags(allowedPermissions) {
  const set = new Set(allowedPermissions ?? [])
  return Object.fromEntries(ALL_PERMISSIONS.map((key) => [key, set.has(key)]))
}

/** @param {Record<string, boolean>} flags */
export function permissionFlagsToArray(flags) {
  return ALL_PERMISSIONS.filter((key) => Boolean(flags[key]))
}
