// Mocked auth, matching the request/response contract in
// freshbrain-agreement/auth-contract.md. Swapping in the real
// chat-gateway later means changing only this file's internals —
// authenticate() keeps the same signature, return shape, and thrown-error
// cases (401 in the real contract).
//
// No username, by design — this isn't a social product, email + password
// is the login identity. MOCK_USERS also backs the /config/users admin
// directory below (listUsers/createUser/updateUser) — self-service
// registration has been removed in favor of HR-managed user creation, so
// this is now the only place new mock accounts come from.

import { DEFAULT_ROLE_SCOPES } from './roles.js'

const MOCK_USERS = [
  {
    email: 'larry.ridwan@freshfactory.id',
    password: 'freshbrain',
    name: 'Larry Ridwan',
    phone: '+62 811-1000-0001',
    role: 'CEO',
    allowed_permissions: [],
    allowed_scopes: DEFAULT_ROLE_SCOPES.CEO,
  },
  {
    email: 'delapramuwidia@gmail.com',
    password: 'freshbrain',
    name: 'Delanda Pramuwidia',
    phone: '+62 811-1000-0002',
    role: 'Client Service Management',
    allowed_permissions: [],
    allowed_scopes: DEFAULT_ROLE_SCOPES['Ops Manager'],
  },
  {
    email: 'gesikautzar@gmail.com',
    password: 'freshbrain',
    name: 'Gesi Kautzar',
    phone: '+62 811-1000-0003',
    role: 'Human Resource',
    allowed_permissions: [],
    allowed_scopes: DEFAULT_ROLE_SCOPES.HR,
  },
  {
    email: 'ghifari@freshfactory.id',
    password: 'freshbrain',
    name: 'Ghifari',
    phone: '+62 811-1000-0004',
    role: 'Technology',
    allowed_permissions: [],
    allowed_scopes: DEFAULT_ROLE_SCOPES.Technology,
  },
  {
    email: 'shabrinanisayulianti@gmail.com',
    password: 'freshbrain',
    name: 'Shabrina Nisa Yulianti',
    phone: '+62 811-1000-0006',
    role: 'Finance',
    allowed_permissions: [],
    allowed_scopes: DEFAULT_ROLE_SCOPES.Finance,
  },
]

function delay() {
  return new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 400))
}

// Stand-in for a real reset-password token. There's no email-sending
// channel yet, so this is surfaced once in the UsersPage UI for HR to copy
// and relay manually — real generation/delivery is a chat-gateway decision.
function makeResetToken() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
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
    allowed_scopes: user.allowed_scopes,
    allowed_permissions: user.allowed_permissions,
    token: 'mock-jwt-token',
  }
}

function toDirectoryEntry(user) {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    allowed_permissions: user.allowed_permissions,
  }
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user_id: string, name: string, email: string, phone: string, role: string, allowed_scopes: string[], allowed_permissions: string[], token: string }>}
 */
export async function authenticate(email, password) {
  await delay()

  const user = MOCK_USERS.find((u) => u.email === email)
  if (!user || user.password !== password) {
    throw new Error('Invalid email or password')
  }

  return toSession(user)
}

/**
 * @returns {Promise<{ name: string, email: string, phone: string, role: string, allowed_permissions: string[] }[]>}
 */
export async function listUsers() {
  await delay()
  return MOCK_USERS.map(toDirectoryEntry)
}

/**
 * New users get no password — they're created pending a reset link, not
 * with an HR-assigned credential. `resetToken` is only returned here, once,
 * for the caller to display; it isn't retrievable again from listUsers().
 *
 * `email` is captured but not verified or used to actually send anything —
 * real delivery is a chat-gateway/email-provider decision for later. It's
 * here so the record isn't missing an obvious real-world field, not because
 * sending is implemented.
 *
 * @param {{ name: string, email: string, phone?: string, role: string }} input
 * @returns {Promise<{ name: string, email: string, phone: string, role: string, allowed_permissions: string[], resetToken: string }>}
 */
export async function createUser({ name, email, phone, role }) {
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
    allowed_scopes: DEFAULT_ROLE_SCOPES[role] ?? [],
    allowed_permissions: [],
  }
  MOCK_USERS.push(user)
  return { ...toDirectoryEntry(user), resetToken }
}

/**
 * @param {string} email
 * @param {{ name?: string, phone?: string, role?: string, allowed_permissions?: string[] }} updates
 * @returns {Promise<{ name: string, email: string, phone: string, role: string, allowed_permissions: string[] }>}
 */
export async function updateUser(email, updates) {
  await delay()

  const user = MOCK_USERS.find((u) => u.email === email)
  if (!user) {
    throw new Error('User not found')
  }

  if (updates.name !== undefined) user.name = updates.name
  if (updates.phone !== undefined) user.phone = updates.phone
  if (updates.role !== undefined) {
    user.role = updates.role
    user.allowed_scopes = DEFAULT_ROLE_SCOPES[updates.role] ?? []
  }
  if (updates.allowed_permissions !== undefined) user.allowed_permissions = updates.allowed_permissions
  return toDirectoryEntry(user)
}
