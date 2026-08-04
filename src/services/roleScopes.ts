
import type { RoleScope } from '../types/domain.ts'
import type { AuthenticatedRequestOptions, RequestOptions, TokenActor } from '../types/api.ts'
import { authHeaders, gatewayApi } from './api.ts'

export async function getAllRoles(
  { signal, token }: AuthenticatedRequestOptions = {},
): Promise<RoleScope[]> {
  const { data } = await gatewayApi.get<RoleScope[]>('/roles', {
    signal,
    headers: authHeaders(token),
  })
  return data
}
export async function createRole(
  name: string,
  actor: TokenActor | null | undefined,
  { signal }: RequestOptions = {},
): Promise<RoleScope> {
  const { data } = await gatewayApi.post<RoleScope>(
    '/roles',
    { name },
    { signal, headers: authHeaders(actor?.token) },
  )
  return data
}
export async function renameRole(
  id: string,
  newName: string,
  actor: TokenActor | null | undefined,
  { signal }: RequestOptions = {},
): Promise<RoleScope> {
  const { data } = await gatewayApi.patch<RoleScope>(
    `/roles/${encodeURIComponent(id)}`,
    { name: newName },
    { signal, headers: authHeaders(actor?.token) },
  )
  return data
}

export async function updateRoleScopes(
  id: string,
  allowedScopes: string[],
  actor: TokenActor | null | undefined,
  { signal }: RequestOptions = {},
): Promise<RoleScope> {
  const { data } = await gatewayApi.patch<RoleScope>(
    `/roles/${encodeURIComponent(id)}`,
    { allowed_scopes: allowedScopes },
    { signal, headers: authHeaders(actor?.token) },
  )
  return data
}
