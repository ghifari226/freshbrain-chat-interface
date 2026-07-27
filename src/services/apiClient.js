// ai-engine-only calls (POST /chat, /chat/title) — never chat-gateway, see
// auth-contract.md's "Setiap request berikutnya" for the /chat wire shape
// this mirrors (message/conversation_id/user_id/role/allowed_scopes, bearer
// token). /chat/title has no contract doc yet — it's an ai-engine-side
// convenience endpoint the frontend already calls, not yet written up in
// freshbrain-agreement.
import { USE_MOCK_API } from '../config/appConfig.js'
import { aiApi, authHeaders } from './api.js'
import { mockDelay } from './mockDelay.js'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * POST /chat's request/response shape (auth-contract.md's "Setiap request
 * berikutnya") — `role`/`allowed_scopes` are the only Family 2/3-adjacent
 * fields that reach ai-engine at all; the 17 permission booleans never leave
 * chat-interface/chat-gateway.
 * @typedef {{
 *   message: string,
 *   conversation_id: string | null,
 *   user_id: string,
 *   role: string,
 *   allowed_scopes: string[],
 * }} ChatRequest
 */

/**
 * @typedef {{ answer: string, conversation_id: string }} ChatResponse
 */

// Internal helper only — camelCase params here, translated to the
// contract's snake_case body just before the request goes out. sendMessage
// (below) is the actual exported surface and takes snake_case params
// directly, matching the wire shape 1:1 so callers don't have to translate
// twice.
async function postChat({
  message,
  conversationId,
  userId,
  role,
  allowedScopes,
  token,
  signal,
}) {
  const { data } = await aiApi.post(
    '/chat',
    {
      message,
      conversation_id: conversationId ?? null,
      user_id: userId,
      role,
      allowed_scopes: allowedScopes,
    },
    { signal, headers: authHeaders(token) },
  )
  return data
}

/**
 * @param {ChatRequest & { token?: string, signal?: AbortSignal }} params
 * @returns {Promise<ChatResponse>}
 */
export async function sendMessage({
  message,
  conversation_id,
  user_id,
  role,
  allowed_scopes,
  token,
  signal,
}) {
  if (USE_MOCK_API) {
    await mockDelay(900, 1500, signal)
    return {
      answer: `You said: "${message}" (Tidak dapat terhubung ke ai-engine)`,
      conversation_id: conversation_id ?? makeId(),
    }
  }

  const request = {
    message,
    conversationId: conversation_id,
    userId: user_id,
    role,
    allowedScopes: allowed_scopes,
    token,
    signal,
  }

  try {
    return await postChat(request)
  } catch (error) {
    // Recovery, not a retry-on-flakiness: a 400/404 with a conversation_id
    // attached means ai-engine doesn't recognize that conversation anymore
    // (e.g. its in-memory store was reset). Resending once with
    // conversation_id: null degrades to "start a new conversation" instead
    // of surfacing a hard failure for what the user experiences as an
    // ordinary send. Only retried once — a second failure propagates.
    const status = error.response?.status
    if (conversation_id && (status === 400 || status === 404)) {
      return postChat({ ...request, conversationId: null })
    }
    throw error
  }
}

/**
 * No auth-contract.md entry for this one — see the header note above.
 * @param {string} message
 * @returns {Promise<string>}
 */
export async function generateTitle(message, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiApi.post('/chat/title', { message }, { signal })
    return data.title
  }

  await mockDelay(600, 1100, signal)
  const words = message.trim().split(/\s+/).filter(Boolean)
  const summary = words.slice(0, 6).join(' ')
  const title = summary.charAt(0).toUpperCase() + summary.slice(1)
  return words.length > 6 ? `${title}…` : title
}
