// Auth and user administration matching auth-contract.md. VITE_USE_MOCK_API
// selects either the mutable in-memory data below or the real Axios client
// explicitly; real HTTP errors never fall back to mocks. `signal` is only
// actually threaded through by UsersPage's list load (getAllUsers) today —
// authenticate/createUser/updateUser/deleteUser accept it too but no caller
// passes one yet.
//
// No username, by design — this isn't a social product, email + password
// is the login identity. MOCK_USERS also backs the /config/users admin
// directory below (getAllUsers/createUser/updateUser) — self-service
// registration has been removed in favor of admin-managed user creation,
// so this is now the only place new mock accounts come from.

import { USE_MOCK_API } from '../config/appConfig.js'
import { ROLE_SCOPES } from '../config/roles.js'
import { ALL_PERMISSIONS, SUPERADMIN_LOCKED_PERMISSIONS } from '../config/permissions.js'
import { authHeaders, gatewayApi } from './api.js'
import { mockDelay } from './mockDelay.js'

/**
 * The 17 Family 2/3 permission booleans from permission-catalog.md — dot-key
 * names, always read/written via bracket notation, never dot access (the
 * dots aren't valid in a plain identifier). config/permissions.js's
 * ALL_PERMISSIONS is the actual source of truth this list has to stay in
 * sync with; this typedef is documentation, not enforcement.
 * @typedef {{
 *   'permission.view': boolean,
 *   'permission.edit': boolean,
 *   'role_scope.view': boolean,
 *   'role_scope.add_role': boolean,
 *   'role_scope.edit_role': boolean,
 *   'role_scope.assign_scopes': boolean,
 *   'user.view': boolean,
 *   'user.add': boolean,
 *   'user.edit': boolean,
 *   'user.delete': boolean,
 *   'user.assign_permissions': boolean,
 *   'tool.view': boolean,
 *   'tool.request': boolean,
 *   'freshpedia.view': boolean,
 *   'freshpedia.request': boolean,
 *   'freshpedia.change_status': boolean,
 *   'staging.test': boolean,
 * }} Permissions
 */

/**
 * POST /login's 200 response shape (auth-contract.md) — also what
 * useAuth's `session` looks like everywhere else in the app, since it's
 * stored/passed around verbatim from here.
 * @typedef {Permissions & {
 *   user_id: string,
 *   name: string,
 *   email: string,
 *   phone: string,
 *   role: string,
 *   allowed_scopes: string[],
 *   token: string,
 * }} Session
 */

/**
 * One element of GET /config/users' 200 response array (auth-contract.md) —
 * same shape as Session minus the login-only fields (user_id, allowed_scopes,
 * token: none of those belong on "some other user's" directory row).
 * @typedef {Permissions & {
 *   name: string,
 *   email: string,
 *   phone: string,
 *   role: string,
 * }} UserDirectoryEntry
 */

function allFalsePermissions() {
  return Object.fromEntries(ALL_PERMISSIONS.map((field) => [field, false]))
}

// Seeds every permission true — used for the three Superadmin mock rows
// below (Larry, Ghifari, Admin: the "gets everything" role, both wildcard
// data scope and every admin permission). Technology is no longer
// role-conditional anywhere in this file (see createUser() — there's no
// Technology branch left, new Technology users default false like any
// other ordinary role, same as Finance/Human Resource/etc).
function allTruePermissions() {
  return Object.fromEntries(ALL_PERMISSIONS.map((field) => [field, true]))
}

const MOCK_USERS = [
  {
    email: 'larry.ridwan@freshfactory.id',
    password: 'freshbrain',
    name: 'Larry Ridwan',
    phone: '6281110000001',
    role: 'Superadmin',
    ...allTruePermissions(),
  },
  {
    email: 'ghifari@freshfactory.id',
    password: 'freshbrain',
    name: 'Ghifari',
    phone: '6281110000002',
    role: 'Superadmin',
    ...allTruePermissions(),
  },
  {
    email: 'delapramuwidia@gmail.com',
    password: 'freshbrain',
    name: 'Delanda Pramuwidia',
    phone: '6281110000003',
    role: 'Client Service Management',
    ...allFalsePermissions(),
  },
  {
    email: 'shabrinanisayulianti@gmail.com',
    password: 'freshbrain',
    name: 'Shabrina Nisa Yulianti',
    phone: '6281110000004',
    role: 'Finance',
    ...allFalsePermissions(),
  },
  {
    email: 'admin',
    password: 'admin',
    name: 'Admin',
    phone: '6281110000005',
    role: 'Superadmin',
    ...allTruePermissions(),
  },
  {
    email: 'user',
    password: 'user',
    name: 'User',
    phone: '6281110000006',
    role: 'Client Service Management',
    ...allFalsePermissions(),
  },
]

// Stand-in for a real reset-password token. There's no email-sending
// channel yet, so this is surfaced once in the UsersPage UI for an admin to
// copy and relay manually — real generation/delivery is a chat-gateway
// decision.
function makeResetToken() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
}

// Re-derives the 17 boolean fields from a stored MOCK_USERS row, forcing
// Superadmin's locked field(s) to true regardless of what's stored —
// defense in depth, not just a creation-time seed. Only forces them TRUE
// for Superadmin; every other role's copy of these same field(s) is an
// ordinary stored boolean (this is what lets Technology hold them true
// too, without being locked — "true because it's stored true", not "true
// because of a role override"). Called from every read path (toSession,
// toDirectoryEntry) so the Superadmin lock can never drift even from a bad
// write.
function shapeUserPermissions(user) {
  const perms = {}
  for (const field of ALL_PERMISSIONS) perms[field] = Boolean(user[field])
  if (user.role === 'Superadmin') {
    for (const field of SUPERADMIN_LOCKED_PERMISSIONS) perms[field] = true
  }
  return perms
}

// allowed_scopes lives only on roles, not users (see roles.md) — resolved
// here via the role "join" every time a session/directory entry is shaped,
// same as a real chat-gateway would do at read time.
function resolveScopes(role) {
  return ROLE_SCOPES[role] ?? []
}

// name/email/phone are documented in auth-contract.md's /login response
// as profile-only fields — ai-engine never reads them, chat-gateway is
// the only place that data should live.
function toSession(user) {
  return {
    user_id: user.email,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    allowed_scopes: resolveScopes(user.role),
    ...shapeUserPermissions(user),
    token: 'mock-jwt-token',
  }
}

function toDirectoryEntry(user) {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    ...shapeUserPermissions(user),
  }
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Session>}
 */
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

/**
 * @returns {Promise<UserDirectoryEntry[]>}
 */
export async function getAllUsers({ signal, token } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.get(
      '/config/users',
      { signal, headers: authHeaders(token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)
  return MOCK_USERS.map(toDirectoryEntry)
}

/**
 * New users get no password — they're created pending a reset link, not
 * with an admin-assigned credential. `resetToken` is only returned here,
 * once, for the caller to display; it isn't retrievable again from
 * getAllUsers().
 *
 * All 17 permission booleans start false, except when `role` is
 * 'Superadmin' (all 17 start true — the "gets everything" role). Technology
 * has no special-cased default anymore, it starts false like any other
 * role; the three pre-existing Superadmin mock accounts (Larry, Ghifari,
 * Admin) keep their already-true state as static seed data, not because of
 * a role branch here. This is purely a function of `role` — never something
 * the request body can ask for directly.
 *
 * `email` is captured but not verified or used to actually send anything —
 * real delivery is a chat-gateway/email-provider decision for later.
 *
 * @param {{ name: string, email: string, phone?: string, role: string }} input
 * @returns {Promise<UserDirectoryEntry & { resetToken: string }>}
 */
export async function createUser(
  { name, email, phone, role },
  actor,
  { signal } = {},
) {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.post(
      '/config/users',
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
    password: null,
    name,
    email,
    phone,
    role,
    ...(role === 'Superadmin' ? allTruePermissions() : allFalsePermissions()),
  }
  MOCK_USERS.push(user)
  return { ...toDirectoryEntry(user), resetToken }
}

/**
 * The mock stand-in for chat-gateway's write-path enforcement (see
 * auth-contract.md's PATCH /config/users/{email} rules). `actor` is always
 * re-read fresh from MOCK_USERS by email here — the caller's
 * `actor.permissions`, if any, is never trusted, matching the "re-validate
 * live, not cached session state" rule.
 *
 * @param {string} email - target user being updated
 * @param {{ name?: string, phone?: string, role?: string } & Partial<Permissions>} updates
 * @param {{ email: string, token?: string }} actor - the calling session's own email
 * @returns {Promise<UserDirectoryEntry>}
 */
export async function updateUser(email, updates, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await gatewayApi.patch(
      `/config/users/${encodeURIComponent(email)}`,
      updates,
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  const user = MOCK_USERS.find((u) => u.email === email)
  if (!user) {
    throw new Error('User not found')
  }

  const actorUser = MOCK_USERS.find((u) => u.email === actor?.email)
  if (!actorUser) {
    throw new Error('Actor not found')
  }
  const actorPermissions = shapeUserPermissions(actorUser)

  const touchedPermissionFields = ALL_PERMISSIONS.filter((field) => updates[field] !== undefined)
  const touchesProfileOrRole =
    updates.name !== undefined || updates.phone !== undefined || updates.role !== undefined

  // Field-level gate: any of the 17 permission booleans need
  // user.assign_permissions (single flag now, both groups); name/phone/role
  // need user.edit — see permission-catalog.md's "who can edit" column.
  if (touchedPermissionFields.length > 0 && !actorPermissions['user.assign_permissions']) {
    throw new Error('You do not have permission to edit this field')
  }
  if (touchesProfileOrRole && !actorPermissions['user.edit']) {
    throw new Error('You do not have permission to edit this field')
  }

  // Superadmin-lock write protection — only for a Superadmin target
  // (current role, since a role-change update hasn't been applied yet at
  // this point): these locked field(s) only ever flip as a side effect of
  // a role change for Superadmin, never a direct boolean write by anyone.
  // Every other role's copies of these same field(s) are ordinary editable
  // booleans — this is exactly what "don't lock anything to Technology"
  // means in practice.
  if (user.role === 'Superadmin') {
    for (const field of SUPERADMIN_LOCKED_PERMISSIONS) {
      if (updates[field] !== undefined) {
        throw new Error(`${field} cannot be set directly — it follows role`)
      }
    }
  }

  // Reassigning ANY user to Superadmin requires the actor to already hold
  // all locked permissions themselves — not just user.edit. Applies
  // regardless of whether the target is the actor's own row. Gated on an
  // actual transition (user.role !== 'Superadmin' already) so a no-op edit
  // that merely leaves an existing Superadmin user's role field unchanged
  // (e.g. editing just their phone number) never trips this guard.
  if (updates.role === 'Superadmin' && user.role !== 'Superadmin') {
    const actorHasAllLocks = SUPERADMIN_LOCKED_PERMISSIONS.every((field) => actorPermissions[field])
    if (!actorHasAllLocks) {
      throw new Error('Reassigning to Superadmin requires holding all Superadmin access permissions')
    }
  }

  // Self-escalation guard: editing your own row can never flip a boolean
  // you don't already hold from false to true. Demotion (true -> false) on
  // yourself is always allowed.
  if (email === actor.email) {
    for (const field of touchedPermissionFields) {
      if (updates[field] === true && !actorPermissions[field]) {
        throw new Error('Cannot grant a permission you do not already hold')
      }
    }
  }

  if (updates.name !== undefined) user.name = updates.name
  if (updates.phone !== undefined) user.phone = updates.phone
  if (updates.role !== undefined) user.role = updates.role
  for (const field of touchedPermissionFields) {
    user[field] = updates[field]
  }

  return toDirectoryEntry(user)
}

/**
 * No `DELETE /config/users/{email}` documented in auth-contract.md yet.
 * The mock contract below is gated by `user.delete`,
 * re-validated live like updateUser's writes. An actor can never delete
 * their own row (self-lockout guard, mirrors the self-escalation guard
 * above) — there's no cascade to reassign a self-deleted admin's work.
 *
 * @param {string} email
 * @param {{ email: string, token?: string }} actor
 * @returns {Promise<void>}
 */
export async function deleteUser(email, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    await gatewayApi.delete(
      `/config/users/${encodeURIComponent(email)}`,
      { signal, headers: authHeaders(actor?.token) },
    )
    return
  }

  await mockDelay(500, 900, signal)

  if (email === actor?.email) {
    throw new Error('You cannot delete your own account')
  }

  const actorUser = MOCK_USERS.find((u) => u.email === actor?.email)
  if (!actorUser || !shapeUserPermissions(actorUser)['user.delete']) {
    throw new Error('You do not have permission to delete users')
  }

  const index = MOCK_USERS.findIndex((u) => u.email === email)
  if (index === -1) {
    throw new Error('User not found')
  }
  MOCK_USERS.splice(index, 1)
}
