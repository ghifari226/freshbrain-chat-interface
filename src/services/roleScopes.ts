// Matches GET/POST /roles and PATCH /roles/{id} in the
// chat-gateway contract (auth-contract.md) — role catalog (list/add/rename)
// plus scope assignment, the two responsibilities the contract's "Admin:
// role & role scope management" section bundles into one resource. `{id}`,
// not `{name}` (normalized 2026-07-28) — name is exactly the field rename
// edits, so it was never a safe path identifier. Mock mode mutates
// ROLES/ROLE_SCOPES/ROLE_IDS locally (via config/roles.js, the single
// source of truth those consumers already share); real mode uses the
// shared Axios client. `signal` is only threaded through by getAllRoles
// today — RolesPage.jsx doesn't pass one to the write calls, same gap noted
// in authService.js/freshpedia.js/toolCatalog.js.

import { USE_MOCK_API } from '../config/appConfig.js'
import { ROLES, ROLE_SCOPES, ROLE_IDS, addRoleToCatalog, getRoleCatalog, renameRoleInCatalog, roleNameForId } from '../config/roles.js'
import type { RoleScope } from '../types/domain.ts'
import type { AuthenticatedRequestOptions, RequestOptions, TokenActor } from '../types/api.ts'
import { authHeaders, gatewayApi } from './api.ts'
import { mockDelay } from './mockDelay.ts'

const roleScopesByName = ROLE_SCOPES as Record<string, string[]>

export async function getAllRoles(
  { signal, token }: AuthenticatedRequestOptions = {},
): Promise<RoleScope[]> {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.get<RoleScope[]>('/roles', {
      signal,
      headers: authHeaders(token),
    })
    return data
  }

  await mockDelay(400, 700, signal)
  return getRoleCatalog().map(({ id, name, allowedScopes }) => ({ id, name, allowed_scopes: allowedScopes }))
}

// Creates a role with `allowed_scopes: []` (assigned afterward via
// updateRoleScopes) — matches POST /roles's 201 response shape.
export async function createRole(
  name: string,
  actor: TokenActor | null | undefined,
  { signal }: RequestOptions = {},
): Promise<RoleScope> {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.post<RoleScope>(
      '/roles',
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
  return { id: (ROLE_IDS as Record<string, string>)[trimmed], name: trimmed, allowed_scopes: [] }
}

// Renames a role in place — scopes carry over unchanged (see
// renameRoleInCatalog). Rejected for LOCKED_ROLES (Superuser, renamed from
// Superadmin 2026-08-04 — the contract doc's quoted rule below still says
// the old name) both here and server-side, per auth-contract.md's
// "Superadmin terkunci total" rule.
export async function renameRole(
  id: string,
  newName: string,
  actor: TokenActor | null | undefined,
  { signal }: RequestOptions = {},
): Promise<RoleScope> {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.patch<RoleScope>(
      `/roles/${encodeURIComponent(id)}`,
      { name: newName },
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(400, 700, signal)
  const oldName = roleNameForId(id)
  if (!oldName) {
    throw new Error('Role not found')
  }
  renameRoleInCatalog(oldName, newName)
  const trimmed = newName.trim()
  return { id, name: trimmed, allowed_scopes: roleScopesByName[trimmed] ?? [] }
}

export async function updateRoleScopes(
  id: string,
  allowedScopes: string[],
  actor: TokenActor | null | undefined,
  { signal }: RequestOptions = {},
): Promise<RoleScope> {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.patch<RoleScope>(
      `/roles/${encodeURIComponent(id)}`,
      { allowed_scopes: allowedScopes },
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(400, 700, signal)
  const name = roleNameForId(id)
  if (!name) {
    throw new Error('Role not found')
  }
  roleScopesByName[name] = allowedScopes
  return { id, name, allowed_scopes: allowedScopes }
}
