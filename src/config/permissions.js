// The full permission catalog, `resource.action` string keys — stored as
// flat boolean columns on the `users` row (indexed, type-safe queries), but
// exposed over the wire as `allowed_permissions: string[]` (only the true
// ones), same convention as allowed_scopes — see permission-catalog.md's
// "Kenapa boolean, bukan array" for why storage and wire shape differ.
// Fully separate from allowed_scopes (roles.js's ROLE_SCOPES), which gates
// chat-time data/tool access, not any of this. Keys contain dots, so
// hasPermission() below (never dot access) is the one place that reads them.
//
// Two flat arrays only now — "Chat capability access" (the three end-user
// chat surfaces) and "System Access" (roles/permissions/user
// administration), still used to seed ALL_PERMISSIONS and the Shield
// dialog's two checkbox sections. The Permissions Catalog page groups by
// prefix instead (see PERMISSION_GROUPS below), not by this split.

// Permission entries before Role Scope before User, throughout — matches
// the same order as the Access Configuration landing page/sidebar (System
// permissions before Role Scopes).
export const SYSTEM_ACCESS_PERMISSIONS = [
  'permissions.view',
  'permissions.edit',
  'roles.view',
  'roles.add_role',
  'roles.edit_role',
  'roles.assign_scopes',
  'users.view',
  'users.add',
  'users.edit',
  'users.delete',
  'users.assign_permissions',
]

export const CHAT_ACCESS_PERMISSIONS = [
  'freshpedia.view',
  'freshpedia.request',
  'freshpedia.change_status',
  'tools.view',
  'tools.request',
  'staging.test',
]

// All 18, stable order — used to seed/iterate full permission objects.
export const ALL_PERMISSIONS = [...SYSTEM_ACCESS_PERMISSIONS, ...CHAT_ACCESS_PERMISSIONS]

// Superadmin's hardcoded lock — single source of truth, imported by both
// authService.js's shaping functions and UsersPage's UI-disable logic so
// the two can never drift apart. This is the minimum needed to avoid a
// chicken-and-egg lockout: grant permissions to un-stick anyone else
// (including another Superadmin). roles.view and roles.assign_scopes
// used to be locked here too but are now ordinary editable booleans for
// Superadmin like any other role's permissions — only users.assign_permissions
// remains locked. (Technology used to hold this lock; nothing is hardcoded to
// Technology anymore — see authService.js's technologyPermissions(), which
// now just defaults everything to true, editable like any other role's
// permissions.)
export const SUPERADMIN_LOCKED_PERMISSIONS = ['users.assign_permissions']

// Permissions Catalog page's 6 display groups — derived purely from each
// key's prefix, not reassignable (there's no "move this permission to a
// different group" UI, and a prefix is baked into the key itself). Names
// are literal, not i18n keys — these are technical/brand-shaped labels
// (Freshpedia, Tools, ...), not prose, so they're the same in every
// language by design.
const PERMISSION_CATALOG_GROUP_DEFS = [
  { id: 'freshpedia', label: 'Freshpedia' },
  { id: 'tools', label: 'Tools' },
  { id: 'staging', label: 'Staging' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'roles', label: 'Roles' },
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
  'roles.add_role': 'permissions.roleScopeAddRole',
  'roles.edit_role': 'permissions.roleScopeEditRole',
  'roles.assign_scopes': 'permissions.roleScopeAssignScopes',
  'users.view': 'permissions.userView',
  'users.add': 'permissions.userAdd',
  'users.edit': 'permissions.userEdit',
  'users.delete': 'permissions.userDelete',
  'users.assign_permissions': 'permissions.userAssignPermissions',
  'freshpedia.view': 'permissions.freshpediaView',
  'freshpedia.request': 'permissions.freshpediaRequest',
  'freshpedia.change_status': 'permissions.freshpediaChangeStatus',
  'tools.view': 'permissions.toolView',
  'tools.request': 'permissions.toolRequest',
  'staging.test': 'permissions.stagingTest',
}

// No addPermissionToCatalog — the permission catalog is a fixed, code-level
// concern (this file), not something grantable/creatable at runtime through
// the UI. permissions.add (the permission key that used to gate that
// capability) is gone too, for the same reason: there's nothing left for
// it to gate. updatePermissionInCatalog below (editing a label) is the only
// mutation any user, including Superadmin, can still make from the UI.

/**
 * Edits only the display label — the key itself is immutable once created
 * (every gating check in this codebase references these exact strings;
 * renaming one live would silently break whatever it gates), and the group
 * is derived from the key's prefix, not something to reassign. No delete at
 * all, for any permission, built-in or custom. The label is a full
 * { id, en } pair (not a strings.js path) — PERMISSION_LABEL_KEYS[key]
 * holds either a path (built-in, untouched) or this resolved object (once
 * edited); useT's t() handles both.
 *
 * @param {string} key
 * @param {{ label?: { id: string, en: string } }} updates
 */
export function updatePermissionInCatalog(key, { label }) {
  if (!ALL_PERMISSIONS.includes(key)) throw new Error('Permission not found')

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
  return ['users.view', 'users.add', 'users.edit', 'users.delete', 'users.assign_permissions'].some(
    (field) => hasPermission(permissions, field),
  )
}

/** @param {{ allowed_permissions?: string[] } | undefined} permissions */
export function canViewRoles(permissions) {
  return [
    'roles.view',
    'roles.add_role',
    'roles.edit_role',
    'roles.assign_scopes',
  ].some((field) => hasPermission(permissions, field))
}

/** @param {{ allowed_permissions?: string[] } | undefined} permissions */
export function canViewPermissions(permissions) {
  return hasPermission(permissions, 'permissions.view') || hasPermission(permissions, 'permissions.edit')
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
  return hasPermission(actorPermissions, 'users.assign_permissions')
}

/**
 * Page-reachability gate — .view only, by design: staging.test and
 * freshpedia.request still gate their own tab/button *inside* the page
 * (see useStatusFilters + FreshpediaPage.jsx), but neither grants
 * reaching the page on its own. A staging-only or request-only actor
 * can no longer land here at all; they need freshpedia.view too.
 *
 * @param {{ allowed_permissions?: string[] } | undefined} permissions
 */
export function canAccessFreshpedia(permissions) {
  return hasPermission(permissions, 'freshpedia.view')
}

/**
 * Gates Freshpedia's promote/demote transition actions and full edit
 * access to any entry regardless of status — a dedicated permission now
 * (used to be a reuse of users.assign_permissions, which was really about
 * editing other users' Shield permissions, an unrelated concern). Checked
 * in both FreshpediaPage.jsx (UI) and services/freshpedia.js (mock
 * write-path enforcement), same shape as canAssignPermissions.
 *
 * @param {{ allowed_permissions?: string[] } | undefined} permissions
 */
export function canChangeFreshpediaStatus(permissions) {
  return hasPermission(permissions, 'freshpedia.change_status')
}

/**
 * Page-reachability gate — .view only, same reasoning as
 * canAccessFreshpedia above: staging.test/tools.request still gate their
 * own tab/button inside the page, not page access itself.
 *
 * @param {{ allowed_permissions?: string[] } | undefined} permissions
 */
export function canAccessToolCatalog(permissions) {
  return hasPermission(permissions, 'tools.view')
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
