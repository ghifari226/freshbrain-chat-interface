// Mocked auth, matching the request/response contract in
// freshbrain-agreement/auth-contract.md. Swapping in the real
// chat-gateway later means changing only this file's internals —
// authenticate()/register() keep the same signature, return shape, and
// thrown-error cases (401/409 in the real contract).

const ROLE_SCOPES = {
  CEO: ['*'],
  'Ops Manager': ['wms', 'tms'],
  Finance: ['odoo'],
  'Warehouse Staff': ['wms'],
}

const MOCK_USERS = [
  { username: 'ceo', password: 'password', role: 'CEO', allowed_scopes: ROLE_SCOPES.CEO },
  {
    username: 'ops',
    password: 'password',
    role: 'Ops Manager',
    allowed_scopes: ROLE_SCOPES['Ops Manager'],
  },
  { username: 'finance', password: 'password', role: 'Finance', allowed_scopes: ROLE_SCOPES.Finance },
]

function delay() {
  return new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 400))
}

function toSession(user) {
  return {
    user_id: user.username,
    role: user.role,
    allowed_scopes: user.allowed_scopes,
    token: 'mock-jwt-token',
  }
}

/**
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ user_id: string, role: string, allowed_scopes: string[], token: string }>}
 */
export async function authenticate(username, password) {
  await delay()

  const user = MOCK_USERS.find((u) => u.username === username)
  if (!user || user.password !== password) {
    throw new Error('Invalid username or password')
  }

  return toSession(user)
}

/**
 * @param {string} username
 * @param {string} password
 * @param {string} role
 * @returns {Promise<{ user_id: string, role: string, allowed_scopes: string[], token: string }>}
 */
export async function register(username, password, role) {
  await delay()

  if (MOCK_USERS.some((u) => u.username === username)) {
    throw new Error('Username already exists')
  }

  const user = { username, password, role, allowed_scopes: ROLE_SCOPES[role] ?? [] }
  MOCK_USERS.push(user)
  return toSession(user)
}
