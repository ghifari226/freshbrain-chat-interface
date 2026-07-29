// ai-engine-only calls (POST /chat, /chat/title, POST /feedback) — never
// chat-gateway, see auth-contract.md's "Setiap request berikutnya" for the
// /chat wire shape this mirrors (message/conversation_id/user_id/role/
// allowed_scopes, bearer token). /chat/title has no contract doc yet — it's
// an ai-engine-side convenience endpoint the frontend already calls, not yet
// written up in freshbrain-agreement.
import { USE_MOCK_API } from '../config/appConfig.js'
import axios from 'axios'
import type {
  ChatRequest,
  ChatResponse,
  FeedbackRequest,
  FeedbackResponse,
  TitleRequest,
  TitleResponse,
} from '../types/api.ts'
import { aiEngineApi, authHeaders } from './api.ts'
import { mockDelay } from './mockDelay.ts'

// Internal helper only — camelCase params here, translated to the
// contract's snake_case body just before the request goes out. sendMessage
// (below) is the actual exported surface and takes snake_case params
// directly, matching the wire shape 1:1 so callers don't have to translate
// twice.
interface InternalChatRequest {
  message: string
  conversationId: string | null
  userId: string
  role: string
  allowedScopes: string[]
  token?: string
  signal?: AbortSignal
}

async function postChat({
  message,
  conversationId,
  userId,
  role,
  allowedScopes,
  token,
  signal,
}: InternalChatRequest): Promise<ChatResponse> {
  const { data } = await aiEngineApi.post<ChatResponse>(
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

// dev-doc mock only — ai-engine's real rename-intent detection is an LLM
// call we can't fake meaningfully; this keyword match exists purely so
// ChatResponse.title's listen-and-apply path (App.jsx) is demoable end to
// end without a real backend. Only ever checked for messages on an
// existing conversation — see sendMessage below, matching the doc comment
// on ChatResponse.title in types/api.ts.
const RENAME_INTENT_PATTERN =
  /(?:rename (?:this (?:thread|conversation|chat) )?to|(?:ganti|ubah) judul(?:nya)? (?:jadi|ke))\s+["']?([^"'.!]+?)["']?[.!]*$/i

function matchRenameIntent(message: string): string | null {
  const match = message.trim().match(RENAME_INTENT_PATTERN)
  return match ? match[1].trim() : null
}

export async function sendMessage({
  message,
  conversation_id,
  user_id,
  role,
  allowed_scopes,
  token,
  signal,
}: ChatRequest): Promise<ChatResponse> {
  if (USE_MOCK_API) {
    await mockDelay(900, 1500, signal)
    // Only checked on an existing conversation — the first message's title
    // always comes from the separate POST /chat/title call instead (see
    // ChatResponse.title's doc comment in types/api.ts).
    const renamedTitle = conversation_id ? matchRenameIntent(message) : null
    return {
      answer: `You said: "${message}" (Tidak dapat terhubung ke ai-engine)`,
      conversation_id: conversation_id ?? crypto.randomUUID(),
      message_id: crypto.randomUUID(),
      ...(renamedTitle ? { title: renamedTitle } : {}),
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
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    if (conversation_id && (status === 400 || status === 404)) {
      return postChat({ ...request, conversationId: null })
    }
    throw error
  }
}

// Fire-and-forget from the caller's perspective: App.jsx's
// handleMessageFeedback catches and logs rather than surfacing errors, since
// MessageFeedback.jsx has no error slot — a failed submission must never
// disrupt the chat UI.
export async function sendFeedback({
  message_id,
  conversation_id,
  user_id,
  role,
  rating,
  reason,
  comment,
  token,
  signal,
}: FeedbackRequest): Promise<FeedbackResponse> {
  if (USE_MOCK_API) {
    await mockDelay(200, 500, signal)
    return { id: crypto.randomUUID() }
  }

  const { data } = await aiEngineApi.post<FeedbackResponse>(
    '/feedback',
    {
      message_id,
      conversation_id,
      user_id,
      role,
      rating,
      reason,
      comment,
    },
    { signal, headers: authHeaders(token) },
  )
  return data
}

// No auth-contract.md entry for this one — see the header note above.
export async function generateTitle({
  message,
  conversation_id,
  token,
  signal,
}: TitleRequest): Promise<string> {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.post<TitleResponse>(
      '/chat/title',
      { message, conversation_id },
      { signal, headers: authHeaders(token) },
    )
    return data.title
  }

  await mockDelay(600, 1100, signal)
  const words = message.trim().split(/\s+/).filter(Boolean)
  const summary = words.slice(0, 6).join(' ')
  const title = summary.charAt(0).toUpperCase() + summary.slice(1)
  return words.length > 6 ? `${title}…` : title
}
