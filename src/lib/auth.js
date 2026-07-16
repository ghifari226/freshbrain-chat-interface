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
    password: 'ceo',
    name: 'Andi Wijaya',
    email: 'andi.wijaya@freshfactory.id',
    phone: '+62 811-1000-0001',
    role: 'CEO',
    allowed_scopes: DEFAULT_ROLE_SCOPES.CEO,
  },
  {
    password: 'ops',
    name: 'Budi Santoso',
    email: 'budi.santoso@freshfactory.id',
    phone: '+62 811-1000-0002',
    role: 'Ops Manager',
    allowed_scopes: DEFAULT_ROLE_SCOPES['Ops Manager'],
  },
  {
    password: 'finance',
    name: 'Citra Lestari',
    email: 'citra.lestari@freshfactory.id',
    phone: '+62 811-1000-0003',
    role: 'Finance',
    allowed_scopes: DEFAULT_ROLE_SCOPES.Finance,
  },
  {
    password: 'warehouse',
    name: 'Dedi Kurniawan',
    email: 'dedi.kurniawan@freshfactory.id',
    phone: '+62 811-1000-0004',
    role: 'Warehouse Staff',
    allowed_scopes: DEFAULT_ROLE_SCOPES['Warehouse Staff'],
  },
  {
    password: 'tech',
    name: 'Eka Putri',
    email: 'eka.putri@freshfactory.id',
    phone: '+62 811-1000-0005',
    role: 'Technology',
    allowed_scopes: DEFAULT_ROLE_SCOPES.Technology,
  },
  {
    password: 'hr',
    name: 'Fitri Handayani',
    email: 'fitri.handayani@freshfactory.id',
    phone: '+62 811-1000-0006',
    role: 'HR',
    allowed_scopes: DEFAULT_ROLE_SCOPES.HR,
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
    token: 'mock-jwt-token',
  }
}

function toDirectoryEntry(user) {
  return { name: user.name, email: user.email, phone: user.phone, role: user.role }
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user_id: string, name: string, email: string, phone: string, role: string, allowed_scopes: string[], token: string }>}
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
 * @returns {Promise<{ name: string, email: string, phone: string, role: string }[]>}
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
 * @returns {Promise<{ name: string, email: string, phone: string, role: string, resetToken: string }>}
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
  }
  MOCK_USERS.push(user)
  return { ...toDirectoryEntry(user), resetToken }
}

/**
 * @param {string} email
 * @param {{ name?: string, phone?: string, role?: string }} updates
 * @returns {Promise<{ name: string, email: string, phone: string, role: string }>}
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
  return toDirectoryEntry(user)
}
