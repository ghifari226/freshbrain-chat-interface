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
  id: string
  role: string
  allowed_scopes: string[]
  token?: string
  signal?: AbortSignal
}

export interface ChatResponse {
  answer: string
  conversation_id: string
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
