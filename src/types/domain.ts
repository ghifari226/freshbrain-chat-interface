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
  // Orthogonal to allowed_permissions — never itself a PermissionKey (see
  // permissions.js's canPromote). Gates Freshpedia/Tools' request->staging
  // Promote action purely as a boolean, so it can't drift from a
  // hand-toggled checkbox the way a permission flag could.
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
// Request-pipeline status, separate axis from CatalogStatus above (2026-08-03).
// Set the moment an entry is created via the request flow and never
// unset: 'draft' -> 'posted' (togglable, see freshpedia.request_status
// /tools.request_status) -> 'live' (frozen permanently once
// promoted — see promoteFreshpediaRequestEntry/promoteToolCatalogRequestEntry).
// Entries seeded directly as production/staging (never went through the
// request flow) simply never have this field set.
export type RequestStatus = 'draft' | 'posted' | 'live'
export type FreshpediaEntryType = 'definition' | 'document' | 'alias'
export type LocalizedText = { id: string; en: string }

// createdBy/updatedBy are users.id (uid, see authService.js's MOCK_USERS)
// — normalized 2026-07-29, was submittedBy/submittedByEmail (name+email,
// never actually rendered anywhere in the UI). `status` is always
// staging/production for entries from GET /freshpedia, always request for
// GET /freshpedia-request — see freshpedia-contract.md. `requestStatus` is
// only present on entries born via the request flow — present and frozen
// at 'live' even after `status` moves on to staging/production, which is
// what lets a promoted entry still show up as history in the Request tab.
export interface FreshpediaEntry {
  id: string
  title: string
  type: FreshpediaEntryType
  status: CatalogStatus
  requestStatus?: RequestStatus
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
// FreshpediaEntry above, 2026-07-29. requestStatus: same meaning as
// FreshpediaEntry's.
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
