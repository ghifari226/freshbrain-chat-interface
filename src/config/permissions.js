// The full permission catalog, `resource.action` string keys — stored as
// flat boolean columns on the `users` row (indexed, type-safe queries), but
// exposed over the wire as `allowed_permissions: string[]` (only the true
// ones), same convention as allowed_scopes — see permission-catalog.md's
// "Kenapa boolean, bukan array" for why storage and wire shape differ.
// Fully separate from allowed_scopes (roles.js's ROLE_SCOPES), which gates
// chat-time data/tool access, not any of this. Keys contain dots, so
// hasPermission() below (never dot access) is the one place that reads them.
//
// Two flat arrays only now — "Chat capability access" (Freshpedia, Tools,
// Staging) and "System Access" (roles/permissions/user administration),
// still used to seed ALL_PERMISSIONS and the Shield dialog's two checkbox
// sections. The Permissions Catalog page groups by prefix instead (see
// PERMISSION_GROUPS below), not by this split.

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
]

// Freshpedia/Tools each split "view" and "request" into a live-tier axis
// and a request-pipeline axis (2026-08-03) — a user can now be granted
// visibility into published content without also seeing the request
// backlog, or vice versa, which one shared `.view`/`.request` flag
// couldn't express. Tools has no live_edit/live_change_status — its live
// tier stays read-only; the only way content reaches it is Promote, which
// is gated by the is_maintainer boolean (see roles.js/authService.js), not
// a permission key at all.
export const CHAT_ACCESS_PERMISSIONS = [
  'freshpedia.live_view',
  'freshpedia.live_edit',
  'freshpedia.live_change_status',
  'freshpedia.request_view',
  'freshpedia.request_add',
  'freshpedia.request_edit',
  'freshpedia.request_change_status',
  'tools.live_view',
  'tools.request_view',
  'tools.request_add',
  'tools.request_edit',
  'tools.request_change_status',
  'staging.test',
]

// All 23, stable order — used to seed/iterate full permission objects.
export const ALL_PERMISSIONS = [...SYSTEM_ACCESS_PERMISSIONS, ...CHAT_ACCESS_PERMISSIONS]

// users.assign_permissions used to be a permission flag gating the Shield
// dialog, locked true for Superadmin as a chicken-and-egg guard. It's gone
// now — permission assignment is gated by role directly (see
// canAssignPermissions below), so there's nothing left to lock.

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
  'freshpedia.live_view': 'permissions.freshpediaLiveView',
  'freshpedia.live_edit': 'permissions.freshpediaLiveEdit',
  'freshpedia.live_change_status': 'permissions.freshpediaLiveChangeStatus',
  'freshpedia.request_view': 'permissions.freshpediaRequestView',
  'freshpedia.request_add': 'permissions.freshpediaRequestAdd',
  'freshpedia.request_edit': 'permissions.freshpediaRequestEdit',
  'freshpedia.request_change_status': 'permissions.freshpediaRequestChangeStatus',
  'tools.live_view': 'permissions.toolLiveView',
  'tools.request_view': 'permissions.toolRequestView',
  'tools.request_add': 'permissions.toolRequestAdd',
  'tools.request_edit': 'permissions.toolRequestEdit',
  'tools.request_change_status': 'permissions.toolRequestChangeStatus',
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
  return ['users.view', 'users.add', 'users.edit', 'users.delete'].some(
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

// Any of the 23 present => can reach /config at all (nav-menu gate).
/** @param {{ allowed_permissions?: string[] } | undefined} permissions */
export function canAccessConfigSection(permissions) {
  return Boolean(permissions?.allowed_permissions?.length)
}

/**
 * Gates the Shield icon and everything inside it — hardcoded to role now,
 * not a permission flag. There's no way to grant this to a Finance or HR
 * user by checking a box; only Superadmin and Technology can ever assign
 * permissions to other users, full stop.
 *
 * @param {{ role?: string } | undefined} actor
 */
export function canAssignPermissions(actor) {
  return actor?.role === 'Superadmin' || actor?.role === 'Technology'
}

/**
 * Gates Freshpedia/Tools' Promote action (request status -> staging) —
 * purely the is_maintainer boolean (2026-08-03), never a permission key.
 * Deliberately not one of ALL_PERMISSIONS: a permission key can be
 * hand-toggled in the Shield dialog independently of whatever granted it,
 * which would let someone check the box for a non-maintainer or leave it
 * checked after revoking maintainer status — this check reads is_maintainer
 * directly so there's nothing to drift.
 *
 * @param {{ is_maintainer?: boolean } | undefined} actor
 */
export function canPromote(actor) {
  return Boolean(actor?.is_maintainer)
}

/**
 * Page-reachability gate — live_view only, by design: staging.test and
 * freshpedia.request_view still gate their own tab/button *inside* the
 * page (see useStatusFilters + FreshpediaPage.jsx), but neither grants
 * reaching the page on its own. A staging-only or request-only actor
 * can no longer land here at all; they need freshpedia.live_view too.
 *
 * @param {{ allowed_permissions?: string[] } | undefined} permissions
 */
export function canAccessFreshpedia(permissions) {
  return hasPermission(permissions, 'freshpedia.live_view')
}

/**
 * Gates only Freshpedia's staging<->production promote/demote transition
 * actions — narrower than it used to be. Editing a published entry's
 * content is a separate permission now (freshpedia.live_edit), split out
 * 2026-08-03 since "can move it between staging/production" and "can edit
 * its content" turned out to be different trust levels in practice.
 * Checked in both FreshpediaPage.jsx (UI) and services/freshpedia.js (mock
 * write-path enforcement).
 *
 * @param {{ allowed_permissions?: string[] } | undefined} permissions
 */
export function canChangeFreshpediaStatus(permissions) {
  return hasPermission(permissions, 'freshpedia.live_change_status')
}

/**
 * Page-reachability gate — live_view only, same reasoning as
 * canAccessFreshpedia above: staging.test/tools.request_view still gate
 * their own tab/button inside the page, not page access itself.
 *
 * @param {{ allowed_permissions?: string[] } | undefined} permissions
 */
export function canAccessToolCatalog(permissions) {
  return hasPermission(permissions, 'tools.live_view')
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
