// Auth, matching the request/response contract in
// freshbrain-agreement/auth-contract.md (including the /config/users admin
// section) and permission-catalog.md. Each exported function tries the
// real endpoint first; since chat-gateway doesn't exist yet, that fetch
// always fails and every function falls back to the MOCK_USERS logic
// below, unchanged. Once chat-gateway is up, the fallback branches (and
// eventually MOCK_USERS itself) just get deleted — call sites don't change.
//
// No username, by design — this isn't a social product, email + password
// is the login identity. MOCK_USERS also backs the /config/users admin
// directory below (listUsers/createUser/updateUser) — self-service
// registration has been removed in favor of admin-managed user creation,
// so this is now the only place new mock accounts come from.

import { CHAT_GATEWAY_BASE_URL } from '../config/appConfig.js'
import { ROLE_SCOPES } from '../config/roles.js'
import { ALL_PERMISSIONS, SUPERADMIN_LOCKED_PERMISSIONS } from '../config/permissions.js'

function allFalsePermissions() {
  return Object.fromEntries(ALL_PERMISSIONS.map((field) => [field, false]))
}

// Seeds every permission true — used for Superadmin (the "gets everything"
// role now, both wildcard data scope and every admin permission) and for
// the two pre-existing Technology mock rows below, which keep their
// already-checked state as a static fact even though Technology itself is
// no longer role-conditional anywhere in this file (see createUser() —
// there's no Technology branch left, new Technology users default false
// like any other ordinary role, same as Finance/Human Resource/etc).
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

function delay() {
  return new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 400))
}

// Stand-in for a real reset-password token. There's no email-sending
// channel yet, so this is surfaced once in the UsersPage UI for an admin to
// copy and relay manually — real generation/delivery is a chat-gateway
// decision.
function makeResetToken() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
}

// Re-derives the 17 boolean fields from a stored MOCK_USERS row, forcing
// Superadmin's 3 locked fields to true regardless of what's stored —
// defense in depth, not just a creation-time seed. Only forces them TRUE
// for Superadmin; every other role's copies of these same 3 fields are
// ordinary stored booleans (this is what lets Technology hold them true
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
 */
export async function authenticate(email, password) {
  try {
    const res = await fetch(`${CHAT_GATEWAY_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) return res.json()
  } catch {
    // no real chat-gateway yet — fall through to the mock below
  }

  await delay()

  const user = MOCK_USERS.find((u) => u.email === email)
  if (!user || user.password !== password) {
    throw new Error('Invalid email or password')
  }

  return toSession(user)
}

/**
 * @returns {Promise<object[]>}
 */
export async function listUsers() {
  try {
    const res = await fetch(`${CHAT_GATEWAY_BASE_URL}/config/users`)
    if (res.ok) return res.json()
  } catch {
    // no real chat-gateway yet — fall through to the mock below
  }

  await delay()
  return MOCK_USERS.map(toDirectoryEntry)
}

/**
 * New users get no password — they're created pending a reset link, not
 * with an admin-assigned credential. `resetToken` is only returned here,
 * once, for the caller to display; it isn't retrievable again from
 * listUsers().
 *
 * All 17 permission booleans start false, except when `role` is
 * 'Superadmin' (all 17 start true — the "gets everything" role). Technology
 * has no special-cased default anymore, it starts false like any other
 * role; the two pre-existing Technology mock accounts (Ghifari, Admin)
 * keep their already-true state as static seed data, not because of a
 * role branch here. This is purely a function of `role` — never something
 * the request body can ask for directly.
 *
 * `email` is captured but not verified or used to actually send anything —
 * real delivery is a chat-gateway/email-provider decision for later.
 *
 * @param {{ name: string, email: string, phone?: string, role: string }} input
 * @returns {Promise<object>}
 */
export async function createUser({ name, email, phone, role }) {
  try {
    const res = await fetch(`${CHAT_GATEWAY_BASE_URL}/config/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, role }),
    })
    if (res.ok) return res.json()
  } catch {
    // no real chat-gateway yet — fall through to the mock below
  }

  await delay()

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
 * @param {{ name?: string, phone?: string, role?: string } & Partial<Record<string, boolean>>} updates
 * @param {{ email: string }} actor - the calling session's own email
 * @returns {Promise<object>}
 */
export async function updateUser(email, updates, actor) {
  try {
    const res = await fetch(`${CHAT_GATEWAY_BASE_URL}/config/users/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) return res.json()
  } catch {
    // no real chat-gateway yet — fall through to the mock below
  }

  await delay()

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
  // this point): these 3 only ever flip as a side effect of a role change
  // for Superadmin, never a direct boolean write by anyone. Every other
  // role's copies of these same 3 fields are ordinary editable booleans —
  // this is exactly what "don't lock anything to Technology" means in
  // practice.
  if (user.role === 'Superadmin') {
    for (const field of SUPERADMIN_LOCKED_PERMISSIONS) {
      if (updates[field] !== undefined) {
        throw new Error(`${field} cannot be set directly — it follows role`)
      }
    }
  }

  // Reassigning ANY user to Superadmin requires the actor to already hold
  // all 3 locked permissions themselves — not just user.edit. Applies
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
 * No `DELETE /config/users/{email}` documented in auth-contract.md yet —
 * same "try the real endpoint, fall through" shape as everything else here,
 * new territory once chat-gateway actually exists. Gated by `user.delete`,
 * re-validated live like updateUser's writes. An actor can never delete
 * their own row (self-lockout guard, mirrors the self-escalation guard
 * above) — there's no cascade to reassign a self-deleted admin's work.
 *
 * @param {string} email
 * @param {{ email: string }} actor
 */
export async function deleteUser(email, actor) {
  try {
    const res = await fetch(`${CHAT_GATEWAY_BASE_URL}/config/users/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    })
    if (res.ok) return
  } catch {
    // no real chat-gateway yet — fall through to the mock below
  }

  await delay()

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
