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

// Storage-only shape (MOCK_USERS rows) — the wire shape (Session,
// UserDirectoryEntry below) collapses these to `allowed_permissions:
// PermissionKey[]` instead, see authService.js.
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
  token: string
}

export interface UserDirectoryEntry {
  name: string
  email: string
  phone: string
  role: string
  allowed_permissions: PermissionKey[]
}

export type CatalogStatus = 'request' | 'staging' | 'production'
export type FreshpediaEntryType = 'definition' | 'document' | 'alias'
export type LocalizedText = { id: string; en: string }

// createdBy/updatedBy are users.id (uid, see authService.js's MOCK_USERS)
// — normalized 2026-07-29, was submittedBy/submittedByEmail (name+email,
// never actually rendered anywhere in the UI). `status` is always
// staging/production for entries from GET /freshpedia, always request for
// GET /freshpedia-request — see freshpedia-contract.md.
export interface FreshpediaEntry {
  id: string
  title: string
  type: FreshpediaEntryType
  status: CatalogStatus
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  content?: string | LocalizedText
  fileName?: string
  aliasTargetId?: string
  aliasPhrase?: string
}

// createdBy/updatedBy are users.id (uid) — same normalization as
// FreshpediaEntry above, 2026-07-29.
export interface ToolCatalogEntry {
  id: string
  system: string
  name: string
  status: CatalogStatus
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  description: string
  exampleQuestions: string[]
}

// GET/PATCH /roles' response shape (auth-contract.md) — one row of
// the role catalog: id (PATCH /roles/{id}'s path identifier, not name —
// name is the field rename edits), plus its resolved Family 1 scope list.
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
  // The message's own id as returned by POST /chat (main.py's ChatResponse) —
  // distinct from `id` above, which is a local makeId() React key. This is
  // what feedback submissions reference.
  backendMessageId?: string
}

export interface Conversation {
  // Always the real, backend-assigned conversation id — the frontend never
  // generates one (App.jsx's handleSend holds the first exchange in
  // pendingMessages, un-routed, until POST /chat's response provides this).
  id: string
  title: string
  timestamp: string
  messages: ChatMessage[]
}
