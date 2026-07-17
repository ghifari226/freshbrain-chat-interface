// All API interaction lives here. Like auth.js, each function tries the
// real endpoint first; since ai-engine isn't reachable yet, the fetch
// itself fails (not a real HTTP error) and we fall back to a local mock.
// sendMessage additionally retries once with a fresh conversation on a
// 400/404 (see the comment inline) since a conversation_id from an earlier
// network-failure fallback isn't a real backend id. Any other non-2xx
// response still throws, since that's a real backend telling us something
// failed, not "there's no backend."

import { AI_ENGINE_BASE_URL } from './config.js'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

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
async function postChat(message, conversationId) {
  const res = await fetch(`${AI_ENGINE_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversation_id: conversationId ?? null }),
  })

  if (!res.ok) {
    let detail
    try {
      detail = (await res.json()).detail
    } catch {
      // response body wasn't JSON; fall through to the generic message
    }
    const error = new Error(detail || `Request failed (${res.status})`)
    error.status = res.status
    throw error
  }

  return res.json()
}

export async function sendMessage({ message, conversation_id }) {
  await new Promise((resolve) => setTimeout(resolve, 900 + Math.random() * 600))

  try {
    return await postChat(message, conversation_id)
  } catch (error) {
    if (error.status === undefined) {
      // fetch itself failed (ai-engine unreachable) — fall back to a canned
      // reply so the app stays usable, but say so instead of pretending
      return {
        answer: `You said: "${message}" (Tidak dapat terhubung ke ai-engine)`,
        conversation_id: conversation_id ?? makeId(),
      }
    }

    // conversation_id came from an earlier network failure (see fallback
    // above) and isn't a real backend id, or the conversation otherwise
    // doesn't exist server-side — transparently continue as a new backend
    // conversation instead of surfacing the error.
    if (conversation_id && (error.status === 400 || error.status === 404)) {
      return postChat(message, null)
    }

    throw error
  }
}

/**
 * Title-summarization for the first message of a new conversation.
 * Resolves independently of sendMessage so the title can pop in shortly
 * after send, same as it does for real Claude conversations.
 *
 * There's no agreed contract for this endpoint yet (auth-contract.md only
 * covers login/register) — `/chat/title` is chat-interface's own proposal.
 *
 * @param {string} message
 * @returns {Promise<string>}
 */
export async function generateTitle(message) {
  try {
    const res = await fetch(`${AI_ENGINE_BASE_URL}/chat/title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    if (res.ok) return (await res.json()).title
  } catch {
    // no real ai-engine yet — fall through to the local mock below
  }

  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 500))

  const words = message.trim().split(/\s+/).filter(Boolean)
  const summary = words.slice(0, 6).join(' ')
  const title = summary.charAt(0).toUpperCase() + summary.slice(1)

  return words.length > 6 ? `${title}…` : title
}
