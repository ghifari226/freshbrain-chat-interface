// Role metadata shared by auth (default scopes on login/register) and the
// /config/roles admin view. Single source of truth so the two don't drift.

export const ROLES = ['CEO', 'Ops Manager', 'Finance', 'Warehouse Staff', 'Technology', 'Human Resource']

// The sole source for a role's allowed_scopes — not a per-user-overridable
// default. There is no allowed_scopes column on users at all; every user's
// effective scopes are resolved by looking up their role here.
export const ROLE_SCOPES = {
  CEO: ['*'],
  'Ops Manager': ['wms', 'tms'],
  Finance: ['odoo'],
  'Warehouse Staff': ['wms.inventory'],
  // Explicit list (not '*', which stays CEO-exclusive) so Technology can
  // query data cross-system for support/debugging without wildcarding.
  Technology: ['wms', 'tms', 'dilema', 'odoo', 'dwh'],
  // Human Resource manages the user directory, it doesn't query chat data.
  'Human Resource': [],
}

export const ROLE_LABEL_KEYS = {
  CEO: 'auth.roleCeo',
  'Ops Manager': 'auth.roleOpsManager',
  Finance: 'auth.roleFinance',
  'Warehouse Staff': 'auth.roleWarehouseStaff',
  Technology: 'auth.roleTechnology',
  'Human Resource': 'auth.roleHumanResource',
  // Job title in MOCK_USERS that differs from its scope bucket — not among
  // the assignable ROLES, but UsersPage looks it up directly.
  'Client Service Management': 'auth.roleClientServiceManagement',
}

// CEO and Technology have hardcoded meaning elsewhere (CEO: permanent "*"
// scope, see RolesPage/RoleScopesPage; Technology: the five bootstrap-locked
// permissions in permissions.js) — the Role Catalog admin page can't be
// allowed to delete either, or those guarantees stop meaning anything.
export const LOCKED_ROLES = ['CEO', 'Technology']

/**
 * Role Catalog is UI-only for now — there's no `POST`/`DELETE
 * /config/roles` in freshbrain-agreement's auth-contract.md (which
 * explicitly documents the role list as a fixed set). This mutates the
 * shared ROLES/ROLE_SCOPES/ROLE_LABEL_KEYS objects in place, so every
 * existing consumer (login's resolveScopes, the Users role picker,
 * RoleScopesPage) sees the change immediately without any refetch plumbing.
 *
 * @param {string} name
 */
export function addRoleToCatalog(name) {
  const trimmed = name.trim()
  if (!trimmed || ROLES.includes(trimmed)) return
  ROLES.push(trimmed)
  ROLE_SCOPES[trimmed] = []
  // No real i18n copy for admin-created roles — the label key IS the raw
  // name. useT's t() echoes back whatever it's given when the string isn't
  // a resolvable translation path, so this just renders as plain text.
  ROLE_LABEL_KEYS[trimmed] = trimmed
}

/**
 * @param {string} name
 */
export function removeRoleFromCatalog(name) {
  if (LOCKED_ROLES.includes(name)) {
    throw new Error('This role cannot be deleted')
  }
  const index = ROLES.indexOf(name)
  if (index === -1) return
  ROLES.splice(index, 1)
  delete ROLE_SCOPES[name]
  delete ROLE_LABEL_KEYS[name]
}

/**
 * @returns {{ name: string, allowedScopes: string[], locked: boolean }[]}
 */
export function getRoleCatalog() {
  return ROLES.map((name) => ({
    name,
    allowedScopes: ROLE_SCOPES[name] ?? [],
    locked: LOCKED_ROLES.includes(name),
  }))
}
