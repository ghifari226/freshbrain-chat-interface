// All API interaction lives here.

import { API_BASE_URL } from './config.js'

/**
 * user_id/role/allowed_scopes/token ride along per auth-contract.md's
 * "every subsequent request" shape, so once the backend consumes them
 * (Authorization: Bearer token header, the rest in the body) no changes
 * are needed at the call site.
 *
 * @param {{
 *   message: string,
 *   conversation_id: string | null,
 *   user_id?: string,
 *   role?: string,
 *   allowed_scopes?: string[],
 *   token?: string,
 * }} request
 * @returns {Promise<{ answer: string, conversation_id: string }>}
 */
export async function sendMessage({ message, conversation_id }) {
  let res
  try {
    res = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversation_id: conversation_id ?? null }),
    })
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.')
  }

  if (!res.ok) {
    let detail
    try {
      detail = (await res.json()).detail
    } catch {
      // response body wasn't JSON; fall through to the generic message
    }
    throw new Error(detail || `Request failed (${res.status})`)
  }

  return res.json()
}

/**
 * Mocks the title-summarization a real backend would run against the
 * first message of a new conversation. Resolves independently of
 * sendMessage so the title can pop in shortly after send, same as it
 * does for real Claude conversations.
 *
 * @param {string} message
 * @returns {Promise<string>}
 */
export async function generateTitle(message) {
  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 500))

  const words = message.trim().split(/\s+/).filter(Boolean)
  const summary = words.slice(0, 6).join(' ')
  const title = summary.charAt(0).toUpperCase() + summary.slice(1)

  return words.length > 6 ? `${title}…` : title
}
