export type PermissionKey =
  | 'permission.view'
  | 'permission.edit'
  | 'role_scope.view'
  | 'role_scope.add_role'
  | 'role_scope.edit_role'
  | 'role_scope.assign_scopes'
  | 'user.view'
  | 'user.add'
  | 'user.edit'
  | 'user.delete'
  | 'user.assign_permissions'
  | 'freshpedia.view'
  | 'freshpedia.request'
  | 'freshpedia.change_status'
  | 'tool.view'
  | 'tool.request'
  | 'staging.test'

export type Permissions = Record<PermissionKey, boolean>
export type PartialPermissions = Partial<Permissions>

export interface Session extends Permissions {
  user_id: string
  name: string
  email: string
  phone: string
  role: string
  allowed_scopes: string[]
  token: string
}

export interface UserDirectoryEntry extends Permissions {
  name: string
  email: string
  phone: string
  role: string
}

export type CatalogStatus = 'request' | 'staging' | 'production'
export type FreshpediaEntryType = 'definition' | 'document' | 'alias'
export type LocalizedText = { id: string; en: string }

export interface FreshpediaEntry {
  id: string
  title: string
  type: FreshpediaEntryType
  status: CatalogStatus
  updatedAt: string
  submittedBy: string
  submittedByEmail: string
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
  updatedAt: string
  submittedBy: string
  submittedByEmail: string
  description: string
  exampleQuestions: string[]
}

// GET/PATCH /config/roles' response shape (auth-contract.md) — one row of
// the role catalog, name plus its resolved Family 1 scope list.
export interface RoleScope {
  name: string
  allowed_scopes: string[]
}

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: MessageRole
  text: string
  createdAt: string
  isError?: boolean
  feedback?: string
}

export interface Conversation {
  id: string
  backendId: string | null
  title: string
  timestamp: string
  messages: ChatMessage[]
}
