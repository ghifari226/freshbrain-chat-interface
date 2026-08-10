import axios from 'axios'
import type {
  ChatRequest,
  ChatResponse,
  ConversationsListResponse,
  DeleteConversationRequest,
  DeleteConversationResponse,
  FeedbackRequest,
  FeedbackResponse,
  ListConversationsRequest,
  RenameConversationRequest,
  RenameConversationResponse,
  TitleRequest,
  TitleResponse,
} from '../types/api.ts'
import type { Conversation } from '../types/domain.ts'
import { aiEngineApi, authHeaders } from './api.ts'
import { USE_MOCK_API } from '../config/appConfig.js'
import { mockDelay } from './mockDelay.ts'

// In-memory only, mirrors MOCK_USERS in authService.js — resets on reload.
const MOCK_CONVERSATIONS: Conversation[] = []

const MOCK_ANSWER = 'Tidak dapat terhubung ke AI Engine'

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
    await mockDelay(500, 900, signal)

    let conversation = conversation_id
      ? MOCK_CONVERSATIONS.find((c) => c.id === conversation_id)
      : undefined
    if (!conversation) {
      conversation = {
        id: crypto.randomUUID(),
        title: '',
        timestamp: new Date().toISOString(),
        messages: [],
      }
      MOCK_CONVERSATIONS.unshift(conversation)
    }

    const now = new Date().toISOString()
    conversation.messages.push({ id: crypto.randomUUID(), role: 'user', text: message, createdAt: now })
    const answer = MOCK_ANSWER
    const messageId = crypto.randomUUID()
    conversation.messages.push({ id: messageId, role: 'assistant', text: answer, createdAt: now })
    conversation.timestamp = now

    return { answer, conversation_id: conversation.id, message_id: messageId }
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
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    if (conversation_id && (status === 400 || status === 404)) {
      return postChat({ ...request, conversationId: null })
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
  if (USE_MOCK_API) {
    await mockDelay(300, 600, signal)
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
export async function generateTitle({
  message,
  conversation_id,
  token,
  signal,
}: TitleRequest): Promise<string> {
  if (USE_MOCK_API) {
    await mockDelay(300, 600, signal)
    const title = message.slice(0, 40)
    const conversation = MOCK_CONVERSATIONS.find((c) => c.id === conversation_id)
    if (conversation) conversation.title = title
    return title
  }

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
  if (USE_MOCK_API) {
    await mockDelay(300, 600, signal)
    return { conversations: [...MOCK_CONVERSATIONS] }
  }

  const { data } = await aiEngineApi.get<ConversationsListResponse>('/conversations', {
    signal,
    headers: authHeaders(token),
    params: { user_id, role },
  })
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
  if (USE_MOCK_API) {
    await mockDelay(300, 600, signal)
    const conversation = MOCK_CONVERSATIONS.find((c) => c.id === conversation_id)
    if (conversation) conversation.title = title
    return { conversation_id, title }
  }

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
  if (USE_MOCK_API) {
    await mockDelay(300, 600, signal)
    const index = MOCK_CONVERSATIONS.findIndex((c) => c.id === conversation_id)
    if (index !== -1) MOCK_CONVERSATIONS.splice(index, 1)
    return { conversation_id }
  }

  const { data } = await aiEngineApi.delete<DeleteConversationResponse>(`/conversations/${conversation_id}`, {
    signal,
    headers: authHeaders(token),
    data: { user_id, role },
  })
  return data
}
