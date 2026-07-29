import type {
  FreshpediaEntryType,
  PartialPermissions,
  Session,
} from './domain.ts'

export interface RequestOptions {
  signal?: AbortSignal
}

export interface AuthenticatedRequestOptions extends RequestOptions {
  token?: string
}

export interface TokenActor {
  token?: string
}

export interface ActorIdentity extends TokenActor {
  email: string
  name: string
}

// POST /chat's request shape (auth-contract.md's "Setiap request
// berikutnya") — `role`/`allowed_scopes` are the only Family 2/3-adjacent
// fields that reach ai-engine at all; the 17 permission booleans never leave
// chat-interface/chat-gateway.
export interface ChatRequest {
  message: string
  conversation_id: string | null
  user_id: string
  role: string
  allowed_scopes: string[]
  token?: string
  signal?: AbortSignal
}

export interface ChatResponse {
  answer: string
  conversation_id: string
  message_id: string
  // Only ever populated on a message after the first one — the first
  // message's title comes from the separate, decoupled POST /chat/title
  // call (TitleRequest below) so the visible answer never waits on title
  // generation. Absent/undefined on most turns; present when ai-engine
  // detects a mid-conversation rename request (e.g. "rename this to X")
  // and decided to update the conversation's title as a side effect of
  // answering — the frontend just applies it if present, no separate
  // endpoint involved.
  title?: string
}

// POST /feedback's request shape (auth-contract.md) — role is a snapshot at
// submission time, same convention as ChatRequest.role. reason is required
// when rating is 'down', enforced both client-side (MessageFeedback.jsx's
// disabled submit button) and server-side.
export interface FeedbackRequest {
  message_id: string
  conversation_id: string
  user_id: string
  role: string
  rating: 'up' | 'down'
  reason: string | null
  comment: string | null
  token?: string
  signal?: AbortSignal
}

export interface FeedbackResponse {
  id: string
}

// POST /chat/title's request shape — no auth-contract.md entry yet, see
// apiClient.ts's header note. Scoped to the conversation, not the user:
// conversation_id is null for the only case the frontend calls this today
// (naming a brand-new conversation, before /chat's response assigns a
// backendId) — no user_id/role, unlike ChatRequest/FeedbackRequest, since
// titling has no RBAC/scope-gated-answer angle.
export interface TitleRequest {
  message: string
  conversation_id: string | null
  token?: string
  signal?: AbortSignal
}

export interface TitleResponse {
  title: string
}

export interface LoginRequest {
  email: string
  password: string
}

export type LoginResponse = Session

export interface CreateUserInput {
  name: string
  email: string
  phone?: string
  role: string
}

export type UpdateUserInput = Partial<Pick<CreateUserInput, 'name' | 'phone' | 'role'>> &
  PartialPermissions

export interface FreshpediaInput {
  title: string
  type: FreshpediaEntryType
  content?: string
  fileName?: string
  aliasTargetId?: string
  aliasPhrase?: string
}

export type FreshpediaUpdate = Partial<Omit<FreshpediaInput, 'type'>>

export interface ToolCatalogInput {
  system: string
  name: string
  description: string
  exampleQuestions: string[]
}

export type ToolCatalogUpdate = Partial<ToolCatalogInput>
