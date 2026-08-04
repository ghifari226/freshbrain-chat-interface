// Freshpedia CRUD + status transitions against ai-engine (moved off
// chat-gateway 2026-07-28 — Freshpedia's entries are ai-engine's knowledge
// base content, not an auth/identity concern; chat-gateway still owns the
// freshpedia.* permission values themselves, just not this data). Contract
// lives at freshbrain-agreement's freshpedia-contract.md.
//
// Split into two collections (2026-07-29), matching the contract:
// `/freshpedia` (published — staging+production) and `/freshpedia-request`
// (the submission queue — request status only). An entry is born in
// `/freshpedia-request` with requestStatus='draft', but no longer *leaves*
// the request collection when promoted (changed 2026-08-03) — see
// getFreshpediaRequestEntries below for why a promoted entry still shows
// up there as history. Promotion (`POST /freshpedia-request/{id}/status`,
// see promoteFreshpediaRequestEntry below) always lands `status` in
// 'staging', never straight to production, only from requestStatus='posted'
// (never 'draft'), and is gated purely by actor.is_maintainer — a boolean,
// not one of the freshpedia.* permission keys, so it can never be
// hand-granted through the Shield dialog's checkbox grid (see
// config/permissions.js's canPromote for why). Draft<->Posted is a
// separate toggle (updateFreshpediaRequestStatus below), gated by its own
// freshpedia.request_status permission — distinct from
// freshpedia.request_edit, which only covers editing content fields.
//
// USE_MOCK_API selects the in-memory MOCK_ENTRIES below or the real Axios
// client explicitly, same pattern as authService.js. `signal` is only
// actually threaded through by FreshpediaPage's list loads today — the
// create/update/status calls accept it too but no caller passes one yet,
// so cancellation only cancels the initial fetch, not a pending write.
import { USE_MOCK_API } from '../config/appConfig.js'
import { authHeaders, aiEngineApi } from './api.ts'
import { hasPermission } from '../config/permissions.js'
import { mockDelay } from './mockDelay.ts'

/**
 * Shape returned by every function in this file — `content`/`fileName`/
 * `aliasTargetId`+`aliasPhrase` are mutually exclusive, which of the three
 * is present depends on `type` (see EntryForm/entryDescriptor in
 * FreshpediaPage.jsx, the only place that branches on `type` to know which
 * one to read). `createdBy`/`updatedBy` are `users.id` (uid, see
 * authService.js's MOCK_USERS) — chat-interface has no lookup to resolve
 * these to a display name today, that's a future concern, not this file's.
 * @typedef {{
 *   id: string,
 *   title: string,
 *   type: 'definition' | 'document' | 'alias',
 *   status: 'request' | 'staging' | 'production',
 *   requestStatus?: 'draft' | 'posted' | 'live',
 *   createdBy: string,
 *   createdAt: string,
 *   updatedBy: string,
 *   updatedAt: string,
 *   content?: string | { id: string, en: string },
 *   fileName?: string,
 *   aliasTargetId?: string,
 *   aliasPhrase?: string,
 * }} FreshpediaEntry
 */

function toEntry(row) {
  return { ...row }
}

// Only staging<->production — the only two transitions
// `POST /freshpedia/{id}/status` (this file, chat-interface-facing) ever
// allows, matching the only two buttons FreshpediaEntryList.jsx renders
// (Promote to Production, Demote to Staging). Promoting *out of*
// /freshpedia-request is a different endpoint entirely, see the header
// comment above.
const ALLOWED_TRANSITIONS = {
  staging: ['production'],
  production: ['staging'],
}

// Ghifari's and Delanda's users.id, from authService.js's MOCK_USERS —
// reused here so createdBy/updatedBy actually resolve to a real user.
const GHIFARI_UID = 'b7e2d5f1-0000-4c22-9d33-000000000002'
const DELANDA_UID = 'b7e2d5f1-0000-4c22-9d33-000000000003'

// Module-level, mutable — same role as MOCK_USERS in auth.js. Resets on
// reload; no backend persistence yet. `id` is a fixed literal uid per row
// (stable across HMR/reload, unlike crypto.randomUUID() — same convention
// as roles.js's ROLE_IDS/authService.js's MOCK_USERS); createFreshpediaEntry
// generates a fresh one for genuinely new entries.
const MOCK_ENTRIES = [
  {
    id: 'c9d4e1a0-0000-4f11-9a22-000000000001',
    title: 'Jumlah Gudang Fisik',
    type: 'definition',
    status: 'production',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-10T09:00:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-10T09:00:00Z',
    content: {
      en: 'The count of physical warehouse locations Fresh Factory currently operates. Referenced whenever FreshBrain answers a "how many warehouses" question — see the mock chat example: "Saat ini terdapat total 45 warehouse."',
      id: 'Jumlah lokasi gudang fisik yang saat ini dioperasikan oleh Fresh Factory. Dirujuk setiap kali FreshBrain menjawab pertanyaan "berapa jumlah gudang" — lihat contoh chat: "Saat ini terdapat total 45 warehouse."',
    },
  },
  {
    id: 'c9d4e1a0-0000-4f11-9a22-000000000002',
    title: 'Warehouse Management System',
    type: 'definition',
    status: 'production',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-09T09:00:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-09T09:00:00Z',
    content: {
      en: 'The system that tracks inventory, inbound receiving, and fulfillment across Fresh Factory\'s warehouses.',
      id: 'Sistem yang melacak inventaris, penerimaan barang masuk, dan fulfillment di seluruh gudang Fresh Factory.',
    },
  },
  {
    id: 'c9d4e1a0-0000-4f11-9a22-000000000003',
    title: 'WMS',
    type: 'alias',
    status: 'production',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-09T09:05:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-09T09:05:00Z',
    aliasTargetId: 'c9d4e1a0-0000-4f11-9a22-000000000002',
    aliasPhrase: 'Singkatan umum untuk Warehouse Management System.',
  },
  {
    id: 'c9d4e1a0-0000-4f11-9a22-000000000004',
    title: 'Cross-Docking',
    type: 'definition',
    status: 'staging',
    createdBy: DELANDA_UID,
    createdAt: '2026-07-15T11:00:00Z',
    updatedBy: DELANDA_UID,
    updatedAt: '2026-07-15T11:00:00Z',
    content: {
      en: 'Unloading goods from inbound shipments and loading them directly onto outbound transport, with little or no warehouse storage in between.',
      id: 'Menurunkan barang dari pengiriman masuk lalu langsung memuatnya ke transportasi keluar, dengan penyimpanan gudang minimal atau tanpa penyimpanan sama sekali.',
    },
  },
  {
    id: 'c9d4e1a0-0000-4f11-9a22-000000000005',
    title: 'Panduan Tata Letak Gudang',
    type: 'document',
    status: 'production',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-08T09:00:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-08T09:00:00Z',
    fileName: 'panduan-tata-letak-gudang.pdf',
  },
  {
    id: 'c9d4e1a0-0000-4f11-9a22-000000000006',
    title: 'SOP Retur Barang',
    type: 'document',
    status: 'staging',
    createdBy: DELANDA_UID,
    createdAt: '2026-07-16T14:30:00Z',
    updatedBy: DELANDA_UID,
    updatedAt: '2026-07-16T14:30:00Z',
    fileName: 'sop-retur-barang.pdf',
  },
  {
    id: 'c9d4e1a0-0000-4f11-9a22-000000000007',
    title: 'Fulfillment Rate',
    type: 'definition',
    status: 'request',
    requestStatus: 'posted',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-20T10:15:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-20T10:15:00Z',
    content: {
      en: 'The share of order lines shipped complete and on the first attempt, without split shipments or backorders.',
      id: 'Persentase baris pesanan yang dikirim lengkap dan pada percobaan pertama, tanpa pengiriman terpisah atau backorder.',
    },
  },
  {
    id: 'c9d4e1a0-0000-4f11-9a22-000000000008',
    title: 'Transport Management System',
    type: 'definition',
    status: 'request',
    requestStatus: 'draft',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-19T16:40:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-19T16:40:00Z',
    content: {
      en: 'The system that plans and tracks outbound shipments across carriers and routes.',
      id: 'Sistem yang merencanakan dan melacak pengiriman keluar di berbagai kurir dan rute.',
    },
  },
  {
    id: 'c9d4e1a0-0000-4f11-9a22-000000000009',
    title: 'TMS',
    type: 'alias',
    status: 'request',
    requestStatus: 'posted',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-19T16:45:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-19T16:45:00Z',
    aliasTargetId: 'c9d4e1a0-0000-4f11-9a22-000000000008',
    aliasPhrase: 'Singkatan umum untuk Transport Management System.',
  },
]

/**
 * `/freshpedia` — published entries only (staging+production). Never
 * returns a request-status row; see getFreshpediaRequestEntries for those.
 * @returns {Promise<FreshpediaEntry[]>}
 */
export async function getFreshpediaEntries({ signal, token } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.get(
      '/freshpedia',
      { signal, headers: authHeaders(token) },
    )
    return data
  }
  await mockDelay(500, 900, signal)
  return MOCK_ENTRIES.filter((entry) => entry.status !== 'request').map(toEntry)
}

/**
 * `/freshpedia-request` — every entry that was ever submitted through the
 * request flow, keyed off `requestStatus` (set once at creation, never
 * unset) rather than `status`. That's deliberate: a promoted entry's
 * `status` moves on to 'staging'/'production', but it keeps showing up
 * here too (frozen at requestStatus='live') so the Request tab is a
 * permanent history, not just a pending queue. FreshpediaPage.jsx dedupes
 * by id when merging this with getFreshpediaEntries()'s results, since a
 * promoted entry legitimately satisfies both.
 * @returns {Promise<FreshpediaEntry[]>}
 */
export async function getFreshpediaRequestEntries({ signal, token } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.get(
      '/freshpedia-request',
      { signal, headers: authHeaders(token) },
    )
    return data
  }
  await mockDelay(500, 900, signal)
  return MOCK_ENTRIES.filter((entry) => Boolean(entry.requestStatus)).map(toEntry)
}

/**
 * Entries are always born in `/freshpedia-request` — contributors can
 * never self-promote straight into the published collection.
 *
 * @param {{ title: string, type: 'definition'|'document'|'alias', content?: string, fileName?: string, aliasTargetId?: string, aliasPhrase?: string }} input
 * @param {{ id: string, token?: string, allowed_permissions?: string[] }} actor
 * @returns {Promise<FreshpediaEntry>}
 */
export async function createFreshpediaEntry(input, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.post(
      '/freshpedia-request',
      input,
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  if (!hasPermission(actor, 'freshpedia.request_add')) {
    throw new Error('You do not have permission to submit Freshpedia entries')
  }

  const now = new Date().toISOString()
  const entry = {
    id: crypto.randomUUID(),
    title: input.title,
    type: input.type,
    status: 'request',
    requestStatus: 'draft',
    createdBy: actor.id,
    createdAt: now,
    updatedBy: actor.id,
    updatedAt: now,
    content: input.type === 'definition' ? input.content ?? '' : undefined,
    fileName: input.type === 'document' ? input.fileName ?? '' : undefined,
    aliasTargetId: input.type === 'alias' ? input.aliasTargetId ?? null : undefined,
    aliasPhrase: input.type === 'alias' ? input.aliasPhrase ?? '' : undefined,
  }
  MOCK_ENTRIES.push(entry)
  return toEntry(entry)
}

// Shared by updateFreshpediaEntry/updateFreshpediaRequestEntry below —
// applies the editable fields and stamps updatedBy/updatedAt. `status`
// never goes through here (see updateFreshpediaEntryStatus): both PATCH
// endpoints reject it, they only ever touch content fields.
function applyFieldUpdates(entry, updates, actor) {
  if (updates.status !== undefined) {
    throw new Error('status cannot be set directly — use updateFreshpediaEntryStatus')
  }
  if (updates.title !== undefined) entry.title = updates.title
  if (updates.content !== undefined) entry.content = updates.content
  if (updates.fileName !== undefined) entry.fileName = updates.fileName
  if (updates.aliasTargetId !== undefined) entry.aliasTargetId = updates.aliasTargetId
  if (updates.aliasPhrase !== undefined) entry.aliasPhrase = updates.aliasPhrase
  entry.updatedBy = actor.id
  entry.updatedAt = new Date().toISOString()
}

/**
 * `PATCH /freshpedia/{id}` — published entries only (staging+production).
 * 404s if `{id}` is actually a request-status entry — modeling the real
 * two-collection boundary, not just a convenience split. Only
 * freshpedia.live_edit holders can edit a published entry; use
 * updateFreshpediaRequestEntry for pending ones.
 *
 * @param {string} id
 * @param {{ title?: string, content?: string, fileName?: string, aliasTargetId?: string, aliasPhrase?: string }} updates
 * @param {{ id: string, token?: string, allowed_permissions?: string[] }} actor
 * @returns {Promise<FreshpediaEntry>}
 */
export async function updateFreshpediaEntry(id, updates, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.patch(
      `/freshpedia/${encodeURIComponent(id)}`,
      updates,
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  const entry = MOCK_ENTRIES.find((e) => e.id === id && e.status !== 'request')
  if (!entry) throw new Error('Entry not found')

  if (!hasPermission(actor, 'freshpedia.live_edit')) {
    throw new Error('You do not have permission to edit this entry')
  }

  applyFieldUpdates(entry, updates, actor)
  return toEntry(entry)
}

/**
 * `PATCH /freshpedia-request/{id}` — pending entries only. 404s if `{id}`
 * is actually a published entry (mirror-image of updateFreshpediaEntry's
 * guard). Editable by anyone holding freshpedia.request_edit (any
 * contributor, not just the original submitter) or freshpedia.live_edit.
 *
 * @param {string} id
 * @param {{ title?: string, content?: string, fileName?: string, aliasTargetId?: string, aliasPhrase?: string }} updates
 * @param {{ id: string, token?: string, allowed_permissions?: string[] }} actor
 * @returns {Promise<FreshpediaEntry>}
 */
export async function updateFreshpediaRequestEntry(id, updates, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.patch(
      `/freshpedia-request/${encodeURIComponent(id)}`,
      updates,
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  const entry = MOCK_ENTRIES.find((e) => e.id === id && e.status === 'request')
  if (!entry) throw new Error('Entry not found')

  if (!hasPermission(actor, 'freshpedia.live_edit') && !hasPermission(actor, 'freshpedia.request_edit')) {
    throw new Error('You do not have permission to edit this entry')
  }

  applyFieldUpdates(entry, updates, actor)
  return toEntry(entry)
}

/**
 * `POST /freshpedia/{id}/status` — freshpedia.live_status-only move
 * between the two published tiers: staging→production or
 * production→staging (demote). Promoting an entry *out of*
 * `/freshpedia-request` is a different endpoint entirely — see
 * promoteFreshpediaRequestEntry below.
 *
 * @param {string} id
 * @param {'staging'|'production'} status
 * @param {{ token?: string, allowed_permissions?: string[] }} actor
 * @returns {Promise<FreshpediaEntry>}
 */
export async function updateFreshpediaEntryStatus(id, status, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.post(
      `/freshpedia/${encodeURIComponent(id)}/status`,
      { status },
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  if (!hasPermission(actor, 'freshpedia.live_status')) {
    throw new Error('You do not have permission to change entry status')
  }

  const entry = MOCK_ENTRIES.find((e) => e.id === id && e.status !== 'request')
  if (!entry) throw new Error('Entry not found')

  if (!ALLOWED_TRANSITIONS[entry.status]?.includes(status)) {
    throw new Error(`Cannot move an entry from ${entry.status} to ${status}`)
  }

  entry.status = status
  entry.updatedBy = actor.id
  entry.updatedAt = new Date().toISOString()
  return toEntry(entry)
}

/**
 * `POST /freshpedia-request/{id}/status` — moves an entry's `status` into
 * the published tier, always landing in 'staging' (never straight to
 * production; use updateFreshpediaEntryStatus for the staging→production
 * step afterward). Only valid from requestStatus='posted' — a draft can't
 * be promoted directly, it has to be posted first (see
 * updateFreshpediaRequestStatus). Gated purely by actor.is_maintainer, not
 * a permission key — see this file's header comment. Freezes
 * requestStatus at 'live' rather than clearing it, which is what keeps
 * this entry showing up in getFreshpediaRequestEntries() as permanent
 * history even after `status` has moved on.
 *
 * @param {string} id
 * @param {{ id: string, token?: string, is_maintainer?: boolean }} actor
 * @returns {Promise<FreshpediaEntry>}
 */
export async function promoteFreshpediaRequestEntry(id, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.post(
      `/freshpedia-request/${encodeURIComponent(id)}/status`,
      { status: 'staging' },
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  if (!actor?.is_maintainer) {
    throw new Error('Only maintainers can promote entries')
  }

  const entry = MOCK_ENTRIES.find((e) => e.id === id && e.status === 'request')
  if (!entry) throw new Error('Entry not found')

  if (entry.requestStatus !== 'posted') {
    throw new Error('Only posted requests can be promoted')
  }

  entry.status = 'staging'
  entry.requestStatus = 'live'
  entry.updatedBy = actor.id
  entry.updatedAt = new Date().toISOString()
  return toEntry(entry)
}

/**
 * `POST /freshpedia-request/{id}/request-status` — the bidirectional
 * Draft<->Posted toggle, distinct from both content edits
 * (updateFreshpediaRequestEntry, gated by freshpedia.request_edit) and
 * promotion (promoteFreshpediaRequestEntry, gated by is_maintainer). Only
 * valid while still status='request' — once promoted, requestStatus is
 * frozen at 'live' and this always 404s, same guard shape as
 * updateFreshpediaRequestEntry.
 *
 * @param {string} id
 * @param {'draft'|'posted'} nextRequestStatus
 * @param {{ token?: string, allowed_permissions?: string[] }} actor
 * @returns {Promise<FreshpediaEntry>}
 */
export async function updateFreshpediaRequestStatus(id, nextRequestStatus, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.post(
      `/freshpedia-request/${encodeURIComponent(id)}/request-status`,
      { requestStatus: nextRequestStatus },
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  if (!hasPermission(actor, 'freshpedia.request_status')) {
    throw new Error("You do not have permission to change this request's status")
  }

  const entry = MOCK_ENTRIES.find((e) => e.id === id && e.status === 'request')
  if (!entry) throw new Error('Entry not found')

  entry.requestStatus = nextRequestStatus
  entry.updatedBy = actor.id
  entry.updatedAt = new Date().toISOString()
  return toEntry(entry)
}
