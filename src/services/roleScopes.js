// Matches GET/POST /config/roles and PATCH /config/roles/{name} in the
// chat-gateway contract (auth-contract.md) — role catalog (list/add/rename)
// plus scope assignment, the two responsibilities the contract's "Admin:
// role & role scope management" section bundles into one resource. Mock
// mode mutates ROLES/ROLE_SCOPES locally (via config/roles.js,
// the single source of truth those consumers already share); real mode uses
// the shared Axios client. `signal` is only threaded through by getAllRoles
// today — RolesPage.jsx doesn't pass one to the write calls, same gap noted
// in authService.js/freshpedia.js/toolCatalog.js.

import { USE_MOCK_API } from '../config/appConfig.js'
import { ROLES, ROLE_SCOPES, addRoleToCatalog, getRoleCatalog, renameRoleInCatalog } from '../config/roles.js'
import { authHeaders, gatewayApi } from './api.js'
import { mockDelay } from './mockDelay.js'

/**
 * GET/PATCH /config/roles' response shape (auth-contract.md) — one row of
 * the role catalog, name plus its resolved Family 1 scope list.
 * @typedef {{ name: string, allowed_scopes: string[] }} RoleScope
 */

/**
 * @returns {Promise<RoleScope[]>}
 */
export async function getAllRoles({ signal, token } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.get('/config/roles', { signal, headers: authHeaders(token) })
    return data
  }

  await mockDelay(400, 700, signal)
  return getRoleCatalog().map(({ name, allowedScopes }) => ({ name, allowed_scopes: allowedScopes }))
}

/**
 * Creates a role with `allowed_scopes: []` (assigned afterward via
 * updateRoleScopes) — matches POST /config/roles's 201 response shape.
 * @param {string} name
 * @param {{ token?: string }} actor
 * @returns {Promise<RoleScope>}
 */
export async function createRole(name, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.post(
      '/config/roles',
      { name },
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(400, 700, signal)

  const trimmed = name.trim()
  if (!trimmed || ROLES.includes(trimmed)) {
    throw new Error('A role with this name already exists')
  }
  addRoleToCatalog(trimmed)
  return { name: trimmed, allowed_scopes: [] }
}

/**
 * Renames a role in place — scopes carry over unchanged (see
 * renameRoleInCatalog). Rejected for LOCKED_ROLES (Superadmin) both here and
 * server-side, per auth-contract.md's "Superadmin terkunci total" rule.
 * @param {string} oldName
 * @param {string} newName
 * @param {{ token?: string }} actor
 * @returns {Promise<RoleScope>}
 */
export async function renameRole(oldName, newName, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.patch(
      `/config/roles/${encodeURIComponent(oldName)}`,
      { name: newName },
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(400, 700, signal)
  renameRoleInCatalog(oldName, newName)
  const trimmed = newName.trim()
  return { name: trimmed, allowed_scopes: ROLE_SCOPES[trimmed] ?? [] }
}

/**
 * @param {string} name
 * @param {string[]} allowedScopes
 * @param {{ token?: string }} actor
 * @returns {Promise<RoleScope>}
 */
export async function updateRoleScopes(name, allowedScopes, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.patch(
      `/config/roles/${encodeURIComponent(name)}`,
      { allowed_scopes: allowedScopes },
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(400, 700, signal)
  ROLE_SCOPES[name] = allowedScopes
  return { name, allowed_scopes: allowedScopes }
}
