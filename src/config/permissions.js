// Family 2 (config_*) and Family 3 (chat_*) admin/UI permissions, plus the
// two unprefixed users_* fields — see freshbrain-agreement's
// permission-catalog.md for the full cross-team contract. Fully separate
// from allowed_scopes (roles.js's ROLE_SCOPES), which gates chat-time
// data/tool access, not any of this.

// Shown as "User Management" in the Shield dialog — grouped separately
// from Access Config for display, but gated by the same meta-permission
// (config_access_permission_edit) since it doesn't cleanly belong to
// either config_*/chat_* prefix. Also independently gates the pencil/Edit
// icon's row-level edit capability via users_edit.
export const USER_PERMISSIONS = ['users_view', 'users_edit']

export const ACCESS_CONFIG_PERMISSIONS = [
  'config_scopes_view',
  'config_roles_view',
  'config_roles_edit',
  'config_access_permission_edit',
]

export const CHAT_ACCESS_PERMISSIONS = [
  'chat_tools_view',
  'chat_tools_request',
  'chat_freshpedia_view',
  'chat_freshpedia_request',
  'chat_staging_test',
  'chat_access_permission_edit',
]

// All 12, stable order — used to seed/iterate full permission objects.
export const ALL_PERMISSIONS = [
  ...USER_PERMISSIONS,
  ...ACCESS_CONFIG_PERMISSIONS,
  ...CHAT_ACCESS_PERMISSIONS,
]

// Snapshot of the 12 at module load, before any Permission Catalog edits —
// this is the fixed, contract-backed set (see freshbrain-agreement's
// permission-catalog.md, "Kenapa boolean, bukan array"). Locked: can't be
// deleted or renamed via the catalog UI, since gating logic elsewhere
// references these exact field names as literal strings.
export const CORE_PERMISSIONS = [...ALL_PERMISSIONS]

// Technology's hardcoded locks/defaults — single source of truth, imported
// by both auth.js's shaping functions and UsersPage's UI-disable logic so
// the two can never drift apart.
export const TECHNOLOGY_LOCKED_PERMISSIONS = [
  'config_scopes_view',
  'config_roles_view',
  'config_roles_edit',
  'config_access_permission_edit',
  'chat_access_permission_edit',
]

export const TECHNOLOGY_DEFAULT_EDITABLE_PERMISSIONS = [
  'users_view',
  'users_edit',
  'chat_tools_view',
  'chat_tools_request',
  'chat_freshpedia_view',
  'chat_freshpedia_request',
  'chat_staging_test',
]

// Which existing group array a new permission joins, plus the Shield
// dialog's section label for display in the Permission Catalog list —
// reusing the same three groupings PermissionCheckboxGroup already renders.
export const PERMISSION_GROUPS = [
  { id: 'access_config', array: ACCESS_CONFIG_PERMISSIONS, labelKey: 'permissions.accessConfigSectionLabel' },
  { id: 'user_management', array: USER_PERMISSIONS, labelKey: 'permissions.userManagementSectionLabel' },
  { id: 'chat_access', array: CHAT_ACCESS_PERMISSIONS, labelKey: 'permissions.chatAccessSectionLabel' },
]

export const PERMISSION_LABEL_KEYS = {
  users_view: 'permissions.usersView',
  users_edit: 'permissions.usersEdit',
  config_scopes_view: 'permissions.configScopesView',
  config_roles_view: 'permissions.configRolesView',
  config_roles_edit: 'permissions.configRolesEdit',
  config_access_permission_edit: 'permissions.configAccessPermissionEdit',
  chat_tools_view: 'permissions.chatToolsView',
  chat_tools_request: 'permissions.chatToolsRequest',
  chat_freshpedia_view: 'permissions.chatFreshpediaView',
  chat_freshpedia_request: 'permissions.chatFreshpediaRequest',
  chat_staging_test: 'permissions.chatStagingTest',
  chat_access_permission_edit: 'permissions.chatAccessPermissionEdit',
}

/**
 * Permission Catalog is UI-only for now, same caveat as Role Catalog's
 * addRoleToCatalog in roles.js — there's no contract for adding a 13th
 * permission (permission-catalog.md documents 12 fixed DB columns, not an
 * open set). Mutates the shared group array + ALL_PERMISSIONS +
 * PERMISSION_LABEL_KEYS in place, so a new permission immediately shows up
 * as a real togglable checkbox in UsersPage's Shield dialog (which reads
 * those same arrays), defaulting to false for every existing user.
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
  // Same echo-back trick as ROLE_LABEL_KEYS — t() renders this as plain
  // text since it won't resolve as a translation path.
  PERMISSION_LABEL_KEYS[trimmedKey] = label.trim() || trimmedKey
}

/**
 * @param {string} key
 */
export function removePermissionFromCatalog(key) {
  if (CORE_PERMISSIONS.includes(key)) {
    throw new Error('This permission cannot be deleted')
  }
  for (const group of PERMISSION_GROUPS) {
    const index = group.array.indexOf(key)
    if (index !== -1) group.array.splice(index, 1)
  }
  const allIndex = ALL_PERMISSIONS.indexOf(key)
  if (allIndex !== -1) ALL_PERMISSIONS.splice(allIndex, 1)
  delete PERMISSION_LABEL_KEYS[key]
}

/**
 * @returns {{ key: string, group: string, labelKey: string, locked: boolean }[]}
 */
export function getPermissionCatalog() {
  return ALL_PERMISSIONS.map((key) => ({
    key,
    group: PERMISSION_GROUPS.find((g) => g.array.includes(key))?.id,
    labelKey: PERMISSION_LABEL_KEYS[key],
    locked: CORE_PERMISSIONS.includes(key),
  }))
}

/**
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canViewUsers(permissions) {
  const p = permissions ?? {}
  return Boolean(p.users_view || p.users_edit)
}

/**
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canViewRoles(permissions) {
  const p = permissions ?? {}
  return Boolean(p.config_roles_view || p.config_roles_edit)
}

// Any of the 12 true => can reach /config at all (nav-menu gate).
/**
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canAccessConfigSection(permissions) {
  const p = permissions ?? {}
  return ALL_PERMISSIONS.some((field) => Boolean(p[field]))
}

// Shield-icon section visibility is about the ACTOR's own permissions, not
// the target row being viewed/edited. Also gates User Management, per
// permission-catalog.md — not a separate meta-permission.
/**
 * @param {Record<string, boolean> | undefined} actorPermissions
 */
export function canEditAccessConfigGroup(actorPermissions) {
  return Boolean(actorPermissions?.config_access_permission_edit)
}

/**
 * @param {Record<string, boolean> | undefined} actorPermissions
 */
export function canEditChatAccessGroup(actorPermissions) {
  return Boolean(actorPermissions?.chat_access_permission_edit)
}

/**
 * @param {Record<string, boolean> | undefined} actorPermissions
 */
export function canShowShieldIcon(actorPermissions) {
  return canEditAccessConfigGroup(actorPermissions) || canEditChatAccessGroup(actorPermissions)
}

/**
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canAccessFreshpedia(permissions) {
  const p = permissions ?? {}
  return Boolean(p.chat_freshpedia_view || p.chat_staging_test || p.chat_freshpedia_request)
}

/**
 * @param {Record<string, boolean> | undefined} permissions
 */
export function canAccessToolCatalog(permissions) {
  const p = permissions ?? {}
  return Boolean(p.chat_tools_view || p.chat_staging_test || p.chat_tools_request)
}
