// Matches GET/POST /roles and PATCH /roles/{name} in the
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
  return getRoleCatalog().map(({ name, allowedScopes }) => ({ name, allowed_scopes: allowedScopes }))
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
  return { name: trimmed, allowed_scopes: [] }
}

// Renames a role in place — scopes carry over unchanged (see
// renameRoleInCatalog). Rejected for LOCKED_ROLES (Superadmin) both here and
// server-side, per auth-contract.md's "Superadmin terkunci total" rule.
export async function renameRole(
  oldName: string,
  newName: string,
  actor: TokenActor | null | undefined,
  { signal }: RequestOptions = {},
): Promise<RoleScope> {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.patch<RoleScope>(
      `/roles/${encodeURIComponent(oldName)}`,
      { name: newName },
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(400, 700, signal)
  renameRoleInCatalog(oldName, newName)
  const trimmed = newName.trim()
  return { name: trimmed, allowed_scopes: roleScopesByName[trimmed] ?? [] }
}

export async function updateRoleScopes(
  name: string,
  allowedScopes: string[],
  actor: TokenActor | null | undefined,
  { signal }: RequestOptions = {},
): Promise<RoleScope> {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.patch<RoleScope>(
      `/roles/${encodeURIComponent(name)}`,
      { allowed_scopes: allowedScopes },
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(400, 700, signal)
  roleScopesByName[name] = allowedScopes
  return { name, allowed_scopes: allowedScopes }
}
