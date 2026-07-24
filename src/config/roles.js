// Role metadata shared by auth (default scopes on login/register) and the
// /config/roles admin view. Single source of truth so the two don't drift.

// Renamed 2026-07-24: CEO -> Superadmin (now also the bootstrap-locked
// role, see permissions.js's SUPERADMIN_LOCKED_PERMISSIONS), Ops Manager ->
// Logistic Manager, Warehouse Staff -> Client Service Management (which
// folds into the "Client Service Management" job title MOCK_USERS already
// used — that title is no longer an orphan not backed by a real ROLES
// entry).
export const ROLES = [
  'Superadmin',
  'Logistic Manager',
  'Finance',
  'Client Service Management',
  'Technology',
  'Human Resource',
]

// The sole source for a role's allowed_scopes — not a per-user-overridable
// default. There is no allowed_scopes column on users at all; every user's
// effective scopes are resolved by looking up their role here.
export const ROLE_SCOPES = {
  Superadmin: ['*'],
  'Logistic Manager': ['wms', 'tms'],
  Finance: ['odoo'],
  'Client Service Management': ['wms.inventory'],
  // Explicit list (not '*', which stays Superadmin-exclusive) so Technology
  // can query data cross-system for support/debugging without wildcarding.
  Technology: ['wms', 'tms', 'dilema', 'odoo', 'dwh'],
  // Human Resource manages the user directory, it doesn't query chat data.
  'Human Resource': [],
}

export const ROLE_LABEL_KEYS = {
  Superadmin: 'auth.roleSuperadmin',
  'Logistic Manager': 'auth.roleLogisticManager',
  Finance: 'auth.roleFinance',
  'Client Service Management': 'auth.roleClientServiceManagement',
  Technology: 'auth.roleTechnology',
  'Human Resource': 'auth.roleHumanResource',
}

// Only Superadmin has hardcoded meaning left (permanent "*" scope plus the
// bootstrap-locked permissions in permissions.js) — the Roles admin page
// can't be allowed to rename it, or those guarantees stop meaning
// anything. Technology used to be locked here too (it held the bootstrap
// permission-lock before 2026-07-24), but now that the lock lives on
// Superadmin, Technology has no role-conditional code left anywhere
// (see authService.js) — it's just an ordinary role, safe to rename like
// any other. (There's no delete feature at all anymore — removed as a
// safety call, see RolesPage.jsx.)
export const LOCKED_ROLES = ['Superadmin']

/**
 * Role add/rename are UI-only for now — there's no `POST /config/roles`
 * in freshbrain-agreement's auth-contract.md (which explicitly documents
 * the role list as a fixed set). This mutates the shared ROLES/
 * ROLE_SCOPES/ROLE_LABEL_KEYS objects in place, so every existing
 * consumer (login's resolveScopes, the Users role picker, RolesPage) sees
 * the change immediately without any refetch plumbing.
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
 * Renames a role in place — scopes carry over unchanged, only the key
 * changes. Blocked for LOCKED_ROLES (renaming "Superadmin" would silently
 * break every hardcoded `role === 'Superadmin'` check elsewhere). Callers
 * are expected to also block this when the role is still assigned to any
 * user — renaming doesn't cascade-update MOCK_USERS' `role` field, so an
 * in-use role would be left orphaned otherwise.
 *
 * @param {string} oldName
 * @param {string} newName
 */
export function renameRoleInCatalog(oldName, newName) {
  if (LOCKED_ROLES.includes(oldName)) {
    throw new Error('This role cannot be renamed')
  }
  const trimmed = newName.trim()
  if (!trimmed) return
  if (trimmed === oldName) return
  if (ROLES.includes(trimmed)) {
    throw new Error('A role with this name already exists')
  }
  const index = ROLES.indexOf(oldName)
  if (index === -1) return
  ROLES[index] = trimmed
  ROLE_SCOPES[trimmed] = ROLE_SCOPES[oldName] ?? []
  delete ROLE_SCOPES[oldName]
  ROLE_LABEL_KEYS[trimmed] = trimmed
  delete ROLE_LABEL_KEYS[oldName]
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
