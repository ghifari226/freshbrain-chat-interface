// The full permission catalog, `resource.action` string keys — flat booleans
// on the `users` row (or the equivalent shape once chat-gateway exists),
// fully separate from allowed_scopes (roles.js's ROLE_SCOPES), which gates
// chat-time data/tool access, not any of this. Keys contain dots, so they're
// always read/written via bracket notation (`session?.['role.view']`), never
// dot access.
//
// Two display groups only now — "Chat capability access" (the three
// end-user chat surfaces, shown first) and "System Access" (role/
// permission/user administration). The old per-group meta-permissions
// (config_access_permission_edit, chat_access_permission_edit) are gone;
// a single `user.assign_permissions` now gates editing anyone else's
// permissions at all, for both groups.

export const SYSTEM_ACCESS_PERMISSIONS = [
  'role.view',
  'role.add',
  'role.edit',
  'role.delete',
  'role.assign_scopes',
  'permission.view',
  'permission.add',
  'permission.edit',
  'user.view',
  'user.add',
  'user.edit',
  'user.delete',
  'user.assign_permissions',
]

export const CHAT_ACCESS_PERMISSIONS = [
  'tool.view',
  'tool.request',
  'freshpedia.view',
  'freshpedia.request',
  'staging.test',
]

// All 18, stable order — used to seed/iterate full permission objects.
export const ALL_PERMISSIONS = [...SYSTEM_ACCESS_PERMISSIONS, ...CHAT_ACCESS_PERMISSIONS]

// Technology's hardcoded locks/defaults — single source of truth, imported
// by both authService.js's shaping functions and UsersPage's UI-disable
// logic so the two can never drift apart. These three are the minimum
// needed to avoid a chicken-and-egg lockout: see role reachability, and
// grant permissions to un-stick anyone else (including another Technology
// user) — replaces the old config_access_permission_edit/
// chat_access_permission_edit pair, now merged into one flag.
export const TECHNOLOGY_LOCKED_PERMISSIONS = ['role.view', 'role.assign_scopes', 'user.assign_permissions']

export const TECHNOLOGY_DEFAULT_EDITABLE_PERMISSIONS = [
  'role.add',
  'role.edit',
  'role.delete',
  'permission.view',
  'permission.add',
  'permission.edit',
  'user.view',
  'user.add',
  'user.edit',
  'user.delete',
  'tool.view',
  'tool.request',
  'freshpedia.view',
  'freshpedia.request',
  'staging.test',
]

export const PERMISSION_GROUPS = [
  { id: 'chat_access', array: CHAT_ACCESS_PERMISSIONS, labelKey: 'permissions.chatAccessSectionLabel' },
  { id: 'system_access', array: SYSTEM_ACCESS_PERMISSIONS, labelKey: 'permissions.systemAccessSectionLabel' },
]

export const PERMISSION_LABEL_KEYS = {
  'role.view': 'permissions.roleView',
  'role.add': 'permissions.roleAdd',
  'role.edit': 'permissions.roleEdit',
  'role.delete': 'permissions.roleDelete',
  'role.assign_scopes': 'permissions.roleAssignScopes',
  'permission.view': 'permissions.permissionView',
  'permission.add': 'permissions.permissionAdd',
  'permission.edit': 'permissions.permissionEdit',
  'user.view': 'permissions.userView',
  'user.add': 'permissions.userAdd',
  'user.edit': 'permissions.userEdit',
  'user.delete': 'permissions.userDelete',
  'user.assign_permissions': 'permissions.userAssignPermissions',
  'tool.view': 'permissions.toolView',
  'tool.request': 'permissions.toolRequest',
  'freshpedia.view': 'permissions.freshpediaView',
  'freshpedia.request': 'permissions.freshpediaRequest',
  'staging.test': 'permissions.stagingTest',
}

/**
 * Permission catalog entries beyond these 18 are UI-only, same caveat noted
 * throughout this session — there's no contract for an open permission set
 * yet. Mutates PERMISSION_GROUPS' arrays + ALL_PERMISSIONS + LABEL_KEYS in
 * place, so a new permission immediately shows up as a real togglable
 * checkbox in UsersPage's Shield dialog, defaulting to false for everyone.
 *
 * @param {{ key: string, group: string, label: string }} input
 */
export function addPermissionToCatalog({ key, group, label }) {
  const trimmedKey = key.trim()
  if (!trimmedKey || ALL_PERMISSIONS.includes(trimmedKey)) {
    throw new Error('Permission key already exists')
  }
  const groupEntry = PERMISSION_GROUPS.find((g) => g.id === group)
  if (!groupEntry) throw new Error('Unknown permission group')

  groupEntry.array.push(trimmedKey)
  ALL_PERMISSIONS.push(trimmedKey)
  // Same echo-back trick as ROLE_LABEL_KEYS in roles.js — t() renders this
  // as plain text since it won't resolve as a translation path.
  PERMISSION_LABEL_KEYS[trimmedKey] = label.trim() || trimmedKey
}

/**
 * Edits only the display label and which group a permission belongs to —
 * the key itself is immutable once created (every gating check in this
 * codebase references these exact strings; renaming one live would silently
 * break whatever it gates). No delete at all, for any permission, built-in
 * or custom.
 *
 * @param {string} key
 * @param {{ group?: string, label?: string }} updates
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
    PERMISSION_LABEL_KEYS[key] = label.trim() || key
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
    p['role.view'] || p['role.add'] || p['role.edit'] || p['role.delete'] || p['role.assign_scopes'],
  )
}

/**
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canViewPermissions(permissions) {
  const p = permissions ?? {}
  return Boolean(p['permission.view'] || p['permission.add'] || p['permission.edit'])
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
 * and chat_access_permission_edit have merged into this one flag. Also
 * reused as the "superadmin" gate for Freshpedia's promote/demote actions
 * (see FreshpediaPage.jsx), same dual role chat_access_permission_edit used
 * to play.
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
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canAccessToolCatalog(permissions) {
  const p = permissions ?? {}
  return Boolean(p['tool.view'] || p['staging.test'] || p['tool.request'])
}
