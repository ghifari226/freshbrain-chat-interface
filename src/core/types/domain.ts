export type PermissionKey =
  | 'permissions.view'
  | 'permissions.edit'
  | 'roles.view'
  | 'roles.add'
  | 'roles.edit'
  | 'roles.assign_scopes'
  | 'users.view'
  | 'users.add'
  | 'users.edit'
  | 'users.delete'
  | 'users.assign_permissions'
  | 'freshpedia.live_view'
  | 'freshpedia.live_edit'
  | 'freshpedia.live_status'
  | 'freshpedia.request_view'
  | 'freshpedia.request_add'
  | 'freshpedia.request_edit'
  | 'freshpedia.request_status'
  | 'tools.live_view'
  | 'tools.request_view'
  | 'tools.request_add'
  | 'tools.request_edit'
  | 'tools.request_status'
  | 'staging.test'
export type Permissions = Record<PermissionKey, boolean>
export type PartialPermissions = Partial<Permissions>

export interface Session {
  id: string
  name: string
  email: string
  phone: string
  role: string
  allowed_scopes: string[]
  allowed_permissions: PermissionKey[]
  is_maintainer: boolean
  token: string
}

export interface UserDirectoryEntry {
  name: string
  email: string
  phone: string
  role: string
  allowed_permissions: PermissionKey[]
  is_maintainer: boolean
}

export type CatalogStatus = 'request' | 'staging' | 'production'
export type RequestStatus = 'draft' | 'posted' | 'live'
export type FreshpediaStatus = 'draft' | 'posted'
export type FreshpediaEntryType = 'definition' | 'document' | 'alias'
export type LocalizedText = { id: string; en: string }
export interface FreshpediaEntry {
  id: string
  title: string
  type: FreshpediaEntryType
  status: FreshpediaStatus
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  content?: string | LocalizedText
  fileName?: string
  aliasTargetId?: string
  aliasPhrase?: string
}
export interface ToolCatalogEntry {
  id: string
  system: string
  name: string
  status: CatalogStatus
  requestStatus?: RequestStatus
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  description: string
  exampleQuestions: string[]
}
export interface RoleScope {
  id: string
  name: string
  allowed_scopes: string[]
}

export type MessageRole = 'user' | 'assistant'

export type FeedbackRating = 'up' | 'down'

export interface MessageFeedback {
  rating: FeedbackRating
  reason: string | null
  comment: string | null
}

export interface ChatMessage {
  id: string
  role: MessageRole
  text: string
  createdAt: string
  isError?: boolean
  feedback?: MessageFeedback
  backendMessageId?: string
}

export interface Conversation {
  id: string
  title: string
  timestamp: string
  messages?: ChatMessage[]
  nextCursor?: string | null
}
