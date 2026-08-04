
import { USE_MOCK_API } from '../config/appConfig.js'
import { ROLE_SCOPES } from '../config/roles.js'
import {
  ALL_PERMISSIONS,
  TECHNOLOGY_LOCKED_PERMISSIONS,
  canAssignPermissions,
  permissionFlagsToArray,
  permissionsArrayToFlags,
} from '../config/permissions.js'
import { authHeaders, gatewayApi } from './api.ts'
import { mockDelay } from './mockDelay.ts'
function allFalsePermissions() {
  return Object.fromEntries(ALL_PERMISSIONS.map((field) => [field, false]))
}
function allTruePermissions() {
  return Object.fromEntries(ALL_PERMISSIONS.map((field) => [field, true]))
}
const MOCK_USERS = [
  {
    id: 'b7e2d5f1-0000-4c22-9d33-000000000001',
    email: 'admin',
    password: 'admin',
    name: 'Admin',
    phone: '6281110000001',
    role: 'Superuser',
    is_maintainer: false,
    ...allTruePermissions(),
  },
  {
    id: 'b7e2d5f1-0000-4c22-9d33-000000000002',
    email: 'ghifari@freshfactory.id',
    password: 'freshbrain',
    name: 'Ghifari',
    phone: '6281110000002',
    role: 'Technology',
    is_maintainer: true,
    ...allTruePermissions(),
  },
]
function makeResetToken() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
}
function shapeUserPermissions(user) {
  const perms = {}
  for (const field of ALL_PERMISSIONS) perms[field] = Boolean(user[field])
  if (user.role === 'Technology') {
    for (const field of TECHNOLOGY_LOCKED_PERMISSIONS) perms[field] = true
  }
  return perms
}
function resolveScopes(role) {
  return ROLE_SCOPES[role] ?? []
}
function toSession(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    allowed_scopes: resolveScopes(user.role),
    allowed_permissions: permissionFlagsToArray(shapeUserPermissions(user)),
    is_maintainer: Boolean(user.is_maintainer),
    token: `mock:${user.id}`,
  }
}

function toDirectoryEntry(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    allowed_permissions: permissionFlagsToArray(shapeUserPermissions(user)),
    is_maintainer: Boolean(user.is_maintainer),
  }
}
export async function authenticate(email, password, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.post(
      '/login',
      { email, password },
      { signal },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  const user = MOCK_USERS.find((u) => u.email === email)
  if (!user || user.password !== password) {
    throw new Error('Invalid email or password')
  }

  return toSession(user)
}
export async function getAllUsers({ signal, token } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.get(
      '/users',
      { signal, headers: authHeaders(token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)
  return MOCK_USERS.map(toDirectoryEntry)
}
export async function createUser(
  { name, email, phone, role },
  actor,
  { signal } = {},
) {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.post(
      '/users',
      { name, email, phone, role },
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  if (MOCK_USERS.some((u) => u.email === email)) {
    throw new Error('Email already exists')
  }

  const resetToken = makeResetToken()
  const user = {
    id: crypto.randomUUID(),
    password: null,
    name,
    email,
    phone,
    role,
    is_maintainer: false,
    ...(role === 'Superuser' ? allTruePermissions() : allFalsePermissions()),
  }
  MOCK_USERS.push(user)
  return { ...toDirectoryEntry(user), resetToken }
}
export async function updateUser(id, updates, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.patch(
      `/users/${encodeURIComponent(id)}`,
      updates,
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  const user = MOCK_USERS.find((u) => u.id === id)
  if (!user) {
    throw new Error('User not found')
  }

  const actorUser = MOCK_USERS.find((u) => u.id === actor?.id)
  if (!actorUser) {
    throw new Error('Actor not found')
  }
  const actorPermissions = shapeUserPermissions(actorUser)
  const actorCanAssignPermissions = canAssignPermissions(actorUser)
  const currentFlags = shapeUserPermissions(user)
  const nextFlags =
    updates.allowed_permissions !== undefined
      ? permissionsArrayToFlags(updates.allowed_permissions)
      : currentFlags
  const touchedPermissionFields = ALL_PERMISSIONS.filter(
    (field) => Boolean(nextFlags[field]) !== Boolean(currentFlags[field]),
  )
  const touchesProfileOrRole =
    updates.name !== undefined || updates.phone !== undefined || updates.role !== undefined
  if (touchedPermissionFields.length > 0 && !actorCanAssignPermissions) {
    throw new Error('You do not have permission to edit this field')
  }
  if (updates.is_maintainer !== undefined && !actorCanAssignPermissions) {
    throw new Error('You do not have permission to edit this field')
  }
  if (touchesProfileOrRole && !actorPermissions['users.edit']) {
    throw new Error('You do not have permission to edit this field')
  }
  if (user.role === 'Technology' && updates.allowed_permissions !== undefined) {
    for (const field of TECHNOLOGY_LOCKED_PERMISSIONS) {
      if (nextFlags[field] !== true) {
        throw new Error(`${field} cannot be removed directly — it follows role`)
      }
    }
  }
  if (updates.role === 'Superuser' && user.role !== 'Superuser' && !actorCanAssignPermissions) {
    throw new Error('Reassigning to Superuser requires Superuser or Technology access')
  }
  if (id === actor.id) {
    for (const field of touchedPermissionFields) {
      if (nextFlags[field] === true && !actorPermissions[field]) {
        throw new Error('Cannot grant a permission you do not already hold')
      }
    }
  }

  if (updates.name !== undefined) user.name = updates.name
  if (updates.phone !== undefined) user.phone = updates.phone
  if (updates.role !== undefined) user.role = updates.role
  if (updates.is_maintainer !== undefined) user.is_maintainer = Boolean(updates.is_maintainer)
  for (const field of touchedPermissionFields) {
    user[field] = nextFlags[field]
  }

  return toDirectoryEntry(user)
}
export async function deleteUser(id, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    await gatewayApi.delete(
      `/users/${encodeURIComponent(id)}`,
      { signal, headers: authHeaders(actor?.token) },
    )
    return
  }

  await mockDelay(500, 900, signal)

  if (id === actor?.id) {
    throw new Error('You cannot delete your own account')
  }

  const actorUser = MOCK_USERS.find((u) => u.id === actor?.id)
  if (!actorUser || !shapeUserPermissions(actorUser)['users.delete']) {
    throw new Error('You do not have permission to delete users')
  }

  const index = MOCK_USERS.findIndex((u) => u.id === id)
  if (index === -1) {
    throw new Error('User not found')
  }
  MOCK_USERS.splice(index, 1)
}
