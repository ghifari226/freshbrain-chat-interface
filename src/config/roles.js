// Role metadata shared by auth (default scopes on login/register) and the
// /roles admin view. Single source of truth so the two don't drift.

// Renamed 2026-07-24: CEO -> Superadmin (now also the role permission
// assignment is hardlocked to, alongside Technology — see permissions.js's
// canAssignPermissions), Ops Manager -> Logistic Manager, Warehouse Staff
// -> Client Service Management (which
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

// roles.id (roles.md's `CREATE TABLE roles`) — the `PATCH /roles/{id}`
// path identifier (normalized 2026-07-28, see auth-contract.md; endpoint
// previously used `{name}`, unsafe since `name` is exactly the field
// rename edits). Name-keyed, re-keyed on rename same as ROLE_SCOPES (see
// renameRoleInCatalog) — the id VALUE survives a rename even though this
// map's key doesn't. Seed rows get fixed literal ids (stable across
// HMR/reload, unlike crypto.randomUUID()); addRoleToCatalog generates a
// fresh one for genuinely new roles.
export const ROLE_IDS = {
  Superadmin: 'a3f1c2d4-0000-4a11-8b11-000000000001',
  'Logistic Manager': 'a3f1c2d4-0000-4a11-8b11-000000000002',
  Finance: 'a3f1c2d4-0000-4a11-8b11-000000000003',
  'Client Service Management': 'a3f1c2d4-0000-4a11-8b11-000000000004',
  Technology: 'a3f1c2d4-0000-4a11-8b11-000000000005',
  'Human Resource': 'a3f1c2d4-0000-4a11-8b11-000000000006',
}

/**
 * @param {string} id
 * @returns {string | undefined}
 */
export function roleNameForId(id) {
  return Object.entries(ROLE_IDS).find(([, roleId]) => roleId === id)?.[0]
}

// Superadmin has hardcoded meaning (permanent "*" scope) — the Roles admin
// page can't be allowed to rename it, or that guarantee stops meaning
// anything. Technology is also hardcoded now, alongside Superadmin, as the
// only two roles that can assign permissions to other users (see
// permissions.js's canAssignPermissions) — but that check is
// role-name-based, not a LOCKED_ROLES entry, so Technology stays
// renameable here; renaming it would just silently drop that access.
// (There's no delete feature at all anymore — removed as a safety call,
// see RolesPage.jsx.)
export const LOCKED_ROLES = ['Superadmin']

/**
 * Mutates the shared ROLES/ROLE_SCOPES/ROLE_IDS objects in place, so every
 * existing consumer (login's resolveScopes, the Users role picker,
 * RolesPage) sees the change immediately without any refetch plumbing.
 *
 * @param {string} name
 */
export function addRoleToCatalog(name) {
  const trimmed = name.trim()
  if (!trimmed || ROLES.includes(trimmed)) return
  ROLES.push(trimmed)
  ROLE_SCOPES[trimmed] = []
  ROLE_IDS[trimmed] = crypto.randomUUID()
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
  ROLE_IDS[trimmed] = ROLE_IDS[oldName] ?? crypto.randomUUID()
  delete ROLE_IDS[oldName]
}

/**
 * @returns {{ id: string, name: string, allowedScopes: string[], locked: boolean }[]}
 */
export function getRoleCatalog() {
  return ROLES.map((name) => ({
    id: ROLE_IDS[name],
    name,
    allowedScopes: ROLE_SCOPES[name] ?? [],
    locked: LOCKED_ROLES.includes(name),
  }))
}
