import type {
  ChatRequest,
  ChatResponse,
  ChatStreamStatus,
  ConversationsListResponse,
  DeleteConversationRequest,
  DeleteConversationResponse,
  FeedbackRequest,
  FeedbackResponse,
  ListConversationMessagesRequest,
  ListConversationsRequest,
  MessagesPageResponse,
  RenameConversationRequest,
  RenameConversationResponse,
  TitleRequest,
  TitleResponse,
} from '@core/types/api.ts'
import { aiEngineApi, authHeaders } from '@integrations/http/httpClient.ts'
interface InternalChatRequest {
  message: string
  conversationId: string | null
  userId: string
  role: string
  allowedScopes: string[]
  token?: string
  signal?: AbortSignal
}

interface ChatStreamHandlers {
  onStatus?: (status: ChatStreamStatus) => void
}

interface SseFrame {
  event: string
  data: unknown
}

export function parseSseFrame(rawFrame: string): SseFrame | null {
  let event = ''
  let data = ''
  for (const line of rawFrame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice('event:'.length).trim()
    else if (line.startsWith('data:')) data = line.slice('data:'.length).trim()
  }
  if (!event || !data) return null
  return { event, data: JSON.parse(data) }
}

async function postChatStream(
  { message, conversationId, userId, role, allowedScopes, token, signal }: InternalChatRequest,
  { onStatus }: ChatStreamHandlers,
): Promise<ChatResponse> {
  // Fetch dipakai karena jawaban LLM diterima bertahap melalui stream SSE dari permintaan POST.
  const response = await fetch(`${aiEngineApi.defaults.baseURL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...authHeaders(token),
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId ?? null,
      user_id: userId,
      role,
      allowed_scopes: allowedScopes,
    }),
    signal,
  })

  if (!response.ok || !response.body) {
    const error = new Error(`Chat stream request failed: ${response.status}`) as Error & {
      status?: number
    }
    error.status = response.status
    throw error
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: ChatResponse | null = null

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const frame = parseSseFrame(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 2)
      if (frame?.event === 'status') {
        onStatus?.((frame.data as { status: ChatStreamStatus }).status)
      } else if (frame?.event === 'done') {
        result = frame.data as ChatResponse
      }
      boundary = buffer.indexOf('\n\n')
    }
  }

  if (!result) {
    throw new Error('Chat stream ended without a final response')
  }
  return result
}

export async function streamChat(
  { message, conversation_id, user_id, role, allowed_scopes, token, signal }: ChatRequest,
  handlers: ChatStreamHandlers = {},
): Promise<ChatResponse> {
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
    return await postChatStream(request, handlers)
  } catch (error) {
    // Percakapan yang hilang di server dicoba sekali lagi sebagai percakapan baru.
    const status = (error as { status?: number }).status
    if (conversation_id && (status === 400 || status === 404)) {
      return postChatStream({ ...request, conversationId: null }, handlers)
    }
    throw error
  }
}

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
export async function generateTitle({
  message,
  conversation_id,
  token,
  signal,
}: TitleRequest): Promise<string> {
  const { data } = await aiEngineApi.post<TitleResponse>(
    '/chat/title',
    { message, conversation_id },
    { signal, headers: authHeaders(token) },
  )
  return data.title
}
export async function listConversations({
  user_id,
  role,
  token,
  signal,
}: ListConversationsRequest): Promise<ConversationsListResponse> {
  const { data } = await aiEngineApi.get<ConversationsListResponse>('/conversations', {
    signal,
    headers: authHeaders(token),
    params: { user_id, role },
  })
  return data
}
export async function listConversationMessages({
  conversation_id,
  limit,
  before,
  token,
  signal,
}: ListConversationMessagesRequest): Promise<MessagesPageResponse> {
  const { data } = await aiEngineApi.get<MessagesPageResponse>(
    `/conversations/${conversation_id}/messages`,
    {
      signal,
      headers: authHeaders(token),
      params: { limit, before: before ?? undefined },
    },
  )
  return data
}
export async function renameConversation({
  conversation_id,
  title,
  user_id,
  role,
  token,
  signal,
}: RenameConversationRequest): Promise<RenameConversationResponse> {
  const { data } = await aiEngineApi.patch<RenameConversationResponse>(
    `/conversations/${conversation_id}`,
    { title, user_id, role },
    { signal, headers: authHeaders(token) },
  )
  return data
}
export async function deleteConversation({
  conversation_id,
  user_id,
  role,
  token,
  signal,
}: DeleteConversationRequest): Promise<DeleteConversationResponse> {
  const { data } = await aiEngineApi.delete<DeleteConversationResponse>(`/conversations/${conversation_id}`, {
    signal,
    headers: authHeaders(token),
    data: { user_id, role },
  })
  return data
}
