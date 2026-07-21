// Family 2 (config_*) and Family 3 (chat_*) admin/UI permissions, plus the
// two unprefixed users_* fields — see freshbrain-agreement's
// permission-catalog.md for the full cross-team contract. Fully separate
// from allowed_scopes (lib/roles.js's ROLE_SCOPES), which gates chat-time
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
