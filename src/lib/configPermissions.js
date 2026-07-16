// Per-role access to the /config section. Each page is 'edit', 'view', or
// 'hidden' — UI-only gating for this prototype, not a security boundary;
// real enforcement has to happen server-side once chat-gateway exists.
const CONFIG_PERMISSIONS = {
  Technology: { users: 'view', roles: 'edit', scopes: 'view' },
  HR: { users: 'edit', roles: 'hidden', scopes: 'hidden' },
}

/**
 * @param {string | undefined} role
 * @param {'users' | 'roles' | 'scopes'} page
 * @returns {'edit' | 'view' | 'hidden'}
 */
export function getConfigPermission(role, page) {
  return CONFIG_PERMISSIONS[role]?.[page] ?? 'hidden'
}

/**
 * @param {string | undefined} role
 * @returns {boolean}
 */
export function canAccessConfig(role) {
  const pages = CONFIG_PERMISSIONS[role]
  if (!pages) return false
  return Object.values(pages).some((permission) => permission !== 'hidden')
}
