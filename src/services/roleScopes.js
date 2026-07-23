// Matches PATCH /config/roles/{name} in freshbrain-agreement's
// auth-contract.md — tries the real endpoint first, falls back to mutating
// ROLE_SCOPES locally since chat-gateway doesn't exist yet. Same shape as
// authService.js's updateUser.

import { CHAT_GATEWAY_BASE_URL } from '../config/appConfig.js'
import { ROLE_SCOPES } from '../config/roles.js'

function delay() {
  return new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 300))
}

/**
 * @param {string} name
 * @param {string[]} allowedScopes
 */
export async function updateRoleScopes(name, allowedScopes) {
  try {
    const res = await fetch(`${CHAT_GATEWAY_BASE_URL}/config/roles/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowed_scopes: allowedScopes }),
    })
    if (res.ok) return res.json()
  } catch {
    // no real chat-gateway yet — fall through to the mock below
  }

  await delay()
  ROLE_SCOPES[name] = allowedScopes
  return { name, allowed_scopes: allowedScopes }
}
