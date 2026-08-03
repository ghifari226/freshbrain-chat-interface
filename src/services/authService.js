// Auth and user administration matching auth-contract.md. VITE_USE_MOCK_API
// selects either the mutable in-memory data below or the real Axios client
// explicitly; real HTTP errors never fall back to mocks. `signal` is only
// actually threaded through by UsersPage's list load (getAllUsers) today —
// authenticate/createUser/updateUser/deleteUser accept it too but no caller
// passes one yet.
//
// No username, by design — this isn't a social product, email + password
// is the login identity. MOCK_USERS also backs the /users admin
// directory below (getAllUsers/createUser/updateUser) — self-service
// registration has been removed in favor of admin-managed user creation,
// so this is now the only place new mock accounts come from.

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

/**
 * The Family 2/3 permission booleans from permission-catalog.md — dot-key
 * names. Storage-only shape (MOCK_USERS rows); the wire shape collapses
 * these to `allowed_permissions: string[]` (see Session/UserDirectoryEntry
 * below) via permissionFlagsToArray/permissionsArrayToFlags at every
 * read/write boundary in this file. config/permissions.js's ALL_PERMISSIONS
 * is the actual source of truth this list has to stay in sync with; this
 * typedef is documentation, not enforcement.
 * @typedef {{
 *   'permissions.view': boolean,
 *   'permissions.edit': boolean,
 *   'roles.view': boolean,
 *   'roles.add': boolean,
 *   'roles.edit': boolean,
 *   'roles.assign_scopes': boolean,
 *   'users.view': boolean,
 *   'users.add': boolean,
 *   'users.edit': boolean,
 *   'users.delete': boolean,
 *   'users.assign_permissions': boolean,
 *   'freshpedia.live_view': boolean,
 *   'freshpedia.live_edit': boolean,
 *   'freshpedia.live_status': boolean,
 *   'freshpedia.request_view': boolean,
 *   'freshpedia.request_add': boolean,
 *   'freshpedia.request_edit': boolean,
 *   'tools.live_view': boolean,
 *   'tools.request_view': boolean,
 *   'tools.request_add': boolean,
 *   'tools.request_edit': boolean,
 *   'staging.test': boolean,
 * }} PermissionFlags
 */

/**
 * POST /login's 200 response shape (auth-contract.md) — also what
 * useAuth's `session` looks like everywhere else in the app, since it's
 * stored/passed around verbatim from here.
 * @typedef {{
 *   id: string,
 *   name: string,
 *   email: string,
 *   phone: string,
 *   role: string,
 *   allowed_scopes: string[],
 *   allowed_permissions: string[],
 *   token: string,
 * }} Session
 */

/**
 * One element of GET /users' 200 response array (auth-contract.md) — same
 * shape as Session minus the login-only fields (allowed_scopes, token:
 * neither belongs on "some other user's" directory row; `id` stays,
 * unlike those two, since it's also PATCH/DELETE /users/{id}'s path
 * identifier — normalized 2026-07-28, was `{email}` before).
 * @typedef {{
 *   id: string,
 *   name: string,
 *   email: string,
 *   phone: string,
 *   role: string,
 *   allowed_permissions: string[],
 * }} UserDirectoryEntry
 */

function allFalsePermissions() {
  return Object.fromEntries(ALL_PERMISSIONS.map((field) => [field, false]))
}

// Seeds every permission true — used for the three Superuser mock rows
// below (Larry, Ghifari, Admin: the "gets everything" role, both wildcard
// data scope and every admin permission). Technology is no longer
// role-conditional anywhere in this file (see createUser() — there's no
// Technology branch left, new Technology users default false like any
// other ordinary role, same as Finance/Human Resource/etc).
function allTruePermissions() {
  return Object.fromEntries(ALL_PERMISSIONS.map((field) => [field, true]))
}

// id: users.id (auth-contract.md's /login and /users response field, also
// the PATCH/DELETE /users/{id} path identifier — normalized 2026-07-28,
// see roles.js's ROLE_IDS for the same pattern applied to roles). Fixed
// literal per seed row (stable across HMR/reload, unlike
// crypto.randomUUID()); createUser generates a fresh one for genuinely new
// users.
const MOCK_USERS = [
  {
    id: 'b7e2d5f1-0000-4c22-9d33-000000000001',
    email: 'larry.ridwan@freshfactory.id',
    password: 'freshbrain',
    name: 'Larry Ridwan',
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
    role: 'Superuser',
    is_maintainer: true,
    ...allTruePermissions(),
  },
  {
    id: 'b7e2d5f1-0000-4c22-9d33-000000000003',
    email: 'delapramuwidia@gmail.com',
    password: 'freshbrain',
    name: 'Delanda Pramuwidia',
    phone: '6281110000003',
    role: 'Client Service Management',
    is_maintainer: false,
    ...allFalsePermissions(),
  },
  {
    id: 'b7e2d5f1-0000-4c22-9d33-000000000004',
    email: 'shabrinanisayulianti@gmail.com',
    password: 'freshbrain',
    name: 'Shabrina Nisa Yulianti',
    phone: '6281110000004',
    role: 'Finance',
    is_maintainer: false,
    ...allFalsePermissions(),
  },
  {
    id: 'b7e2d5f1-0000-4c22-9d33-000000000005',
    email: 'admin',
    password: 'admin',
    name: 'Admin',
    phone: '6281110000005',
    role: 'Superuser',
    is_maintainer: false,
    ...allTruePermissions(),
  },
  {
    id: 'b7e2d5f1-0000-4c22-9d33-000000000006',
    email: 'user',
    password: 'user',
    name: 'User',
    phone: '6281110000006',
    role: 'Client Service Management',
    is_maintainer: false,
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

// Re-derives the permission boolean fields from a stored MOCK_USERS row,
// forcing Technology's locked fields (users.assign_permissions,
// users.view — see permissions.js's TECHNOLOGY_LOCKED_PERMISSIONS) to true
// regardless of what's stored — defense in depth, not just a
// creation-time seed. Only forces them TRUE for Technology; every other
// role's copy of these same fields is an ordinary stored boolean
// (Superuser included — it gets no forced lock, unlike before
// 2026-08-04's rename). Called from every read path (toSession,
// toDirectoryEntry) so the lock can never drift even from a bad write.
function shapeUserPermissions(user) {
  const perms = {}
  for (const field of ALL_PERMISSIONS) perms[field] = Boolean(user[field])
  if (user.role === 'Technology') {
    for (const field of TECHNOLOGY_LOCKED_PERMISSIONS) perms[field] = true
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
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    allowed_scopes: resolveScopes(user.role),
    allowed_permissions: permissionFlagsToArray(shapeUserPermissions(user)),
    is_maintainer: Boolean(user.is_maintainer),
    // mock:<user_id> — cross-checked by ai-engine's verify_mock_token
    // (auth.py), a temporary stand-in for chat-gateway's real signing.
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
      '/users',
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
 * All permission booleans start false, except when `role` is
 * 'Superuser' (all start true — the "gets everything" role). Technology
 * has no special-cased default anymore, it starts false like any other
 * role (its two locked fields still read back true regardless, though —
 * see shapeUserPermissions); the three pre-existing Superuser mock
 * accounts (Larry, Ghifari, Admin) keep their already-true state as
 * static seed data, not because of a role branch here. This is purely a
 * function of `role` — never something the request body can ask for
 * directly.
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
    // Never settable at creation, regardless of role — an admin grants
    // maintainer status afterward via the Shield dialog, same as any other
    // Superuser/Technology-gated write (see updateUser below).
    is_maintainer: false,
    ...(role === 'Superuser' ? allTruePermissions() : allFalsePermissions()),
  }
  MOCK_USERS.push(user)
  return { ...toDirectoryEntry(user), resetToken }
}

/**
 * The mock stand-in for chat-gateway's write-path enforcement (see
 * auth-contract.md's PATCH /users/{id} rules). `actor` is always
 * re-read fresh from MOCK_USERS by id here — the caller's
 * `actor.permissions`, if any, is never trusted, matching the "re-validate
 * live, not cached session state" rule.
 *
 * @param {string} id - target user being updated
 * @param {{ name?: string, phone?: string, role?: string, allowed_permissions?: string[], is_maintainer?: boolean }} updates
 * @param {{ id: string, token?: string }} actor - the calling session's own id
 * @returns {Promise<UserDirectoryEntry>}
 */
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

  // allowed_permissions, when sent, is a full replace (auth-contract.md,
  // same convention as roles.allowed_scopes) — diff against the currently
  // stored flags to find which of the 17 fields actually changed, since
  // every guard below reasons about individual fields, not the array as a
  // whole.
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

  // Field-level gate: any of the permission booleans need the actor to be
  // Superuser or Technology (role-hardlocked, not a permission flag — see
  // canAssignPermissions); name/phone/role need users.edit — see
  // permission-catalog.md's "who can edit" column. is_maintainer rides the
  // same role-lock as permissions, not users.edit — granting Promote access
  // is a comparably sensitive act to granting a permission.
  if (touchedPermissionFields.length > 0 && !actorCanAssignPermissions) {
    throw new Error('You do not have permission to edit this field')
  }
  if (updates.is_maintainer !== undefined && !actorCanAssignPermissions) {
    throw new Error('You do not have permission to edit this field')
  }
  if (touchesProfileOrRole && !actorPermissions['users.edit']) {
    throw new Error('You do not have permission to edit this field')
  }

  // Technology-lock write protection — only for a Technology target
  // (current role, since a role-change update hasn't been applied yet at
  // this point): users.assign_permissions/users.view only ever flip as a
  // side effect of a role change for Technology, never removable via a
  // direct allowed_permissions write by anyone, including the actor
  // themselves. Every other role's copies of these same fields (Superuser
  // included) are ordinary editable booleans.
  if (user.role === 'Technology' && updates.allowed_permissions !== undefined) {
    for (const field of TECHNOLOGY_LOCKED_PERMISSIONS) {
      if (nextFlags[field] !== true) {
        throw new Error(`${field} cannot be removed directly — it follows role`)
      }
    }
  }

  // Reassigning ANY user to Superuser requires the actor to themselves be
  // Superuser or Technology — not just users.edit. Applies regardless of
  // whether the target is the actor's own row. Gated on an actual
  // transition (user.role !== 'Superuser' already) so a no-op edit that
  // merely leaves an existing Superuser user's role field unchanged (e.g.
  // editing just their phone number) never trips this guard.
  if (updates.role === 'Superuser' && user.role !== 'Superuser' && !actorCanAssignPermissions) {
    throw new Error('Reassigning to Superuser requires Superuser or Technology access')
  }

  // Self-escalation guard: editing your own row can never add a permission
  // key you don't already hold to your own allowed_permissions. Removing a
  // key you already hold on yourself is always allowed.
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

/**
 * No `DELETE /users/{id}` documented in auth-contract.md yet.
 * The mock contract below is gated by `users.delete`,
 * re-validated live like updateUser's writes. An actor can never delete
 * their own row (self-lockout guard, mirrors the self-escalation guard
 * above) — there's no cascade to reassign a self-deleted admin's work.
 *
 * @param {string} id
 * @param {{ id: string, token?: string }} actor
 * @returns {Promise<void>}
 */
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
