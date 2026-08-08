import axios from 'axios'
import type {
  ChatRequest,
  ChatResponse,
  ConversationsListResponse,
  DeleteConversationRequest,
  DeleteConversationResponse,
  DevTokenRequest,
  DevTokenResponse,
  FeedbackRequest,
  FeedbackResponse,
  ListConversationsRequest,
  RenameConversationRequest,
  RenameConversationResponse,
  TitleRequest,
  TitleResponse,
} from '../types/api.ts'
import { aiEngineApi, authHeaders } from './api.ts'
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
// Stands in for chat-gateway signing a real login token — deliberately
// unauthenticated, matching ai-engine's own POST /dev/token. Delete once
// chat-gateway exists (v0.5.0 Beta) and mints tokens at real login instead.
export async function mintDevToken(
  { user_id, role, allowed_scopes }: DevTokenRequest,
  { signal }: { signal?: AbortSignal } = {},
): Promise<DevTokenResponse> {
  const { data } = await aiEngineApi.post<DevTokenResponse>(
    '/dev/token',
    { user_id, role, allowed_scopes },
    { signal },
  )
  return data
}
