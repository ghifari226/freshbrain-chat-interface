
import type { RoleScope } from '../types/domain.ts'
import type { AuthenticatedRequestOptions, RequestOptions, TokenActor } from '../types/api.ts'
import { authHeaders, gatewayApi } from './api.ts'
import { USE_MOCK_API } from '../config/appConfig.js'
import { mockDelay } from './mockDelay.ts'
import {
  LOCKED_ROLES,
  ROLE_SCOPES,
  addRoleToCatalog,
  getRoleCatalog,
  renameRoleInCatalog,
  roleNameForId,
} from '../config/roles.js'

function toRoleScope(entry: { id: string; name: string; allowedScopes: string[] }): RoleScope {
  return { id: entry.id, name: entry.name, allowed_scopes: entry.allowedScopes }
}

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

  await mockDelay(500, 900, signal)
  return getRoleCatalog().map(toRoleScope)
}
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

  await mockDelay(500, 900, signal)
  const trimmed = name.trim()
  addRoleToCatalog(trimmed)
  const created = getRoleCatalog().find((r) => r.name === trimmed)
  if (!created) throw new Error('A role with this name already exists')
  return toRoleScope(created)
}
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

  await mockDelay(500, 900, signal)
  const oldName = roleNameForId(id)
  if (!oldName) throw new Error('Role not found')
  renameRoleInCatalog(oldName, newName)
  const updated = getRoleCatalog().find((r) => r.id === id)
  if (!updated) throw new Error('Role not found')
  return toRoleScope(updated)
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

  await mockDelay(500, 900, signal)
  const name = roleNameForId(id)
  if (!name) throw new Error('Role not found')
  if (LOCKED_ROLES.includes(name)) throw new Error('This role cannot be modified')
  ;(ROLE_SCOPES as Record<string, string[]>)[name] = allowedScopes
  const updated = getRoleCatalog().find((r) => r.id === id)
  if (!updated) throw new Error('Role not found')
  return toRoleScope(updated)
}
