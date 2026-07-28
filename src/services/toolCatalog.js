// Tool Catalog CRUD against ai-engine (moved off chat-gateway 2026-07-28 —
// same reasoning as freshpedia.js: the tool registry is ai-engine's own
// content, tightly coupled to its actual tool implementations under
// be/freshbrain-ai-engine/tools/, not an auth/identity concern; chat-gateway
// still owns the tool.* permission values themselves, just not this data).
//
// Split into two collections (2026-07-29), same idea as freshpedia.js:
// `/tool-catalog` (published — staging+production) and
// `/tool-catalog-request` (the submission queue). Unlike Freshpedia,
// there's no status-transition endpoint at all here, and no PATCH for
// published entries either — per permission-catalog.md's still-open
// question, Tool Catalog has no promote/demote path yet, mocked or real,
// and the UI never even renders an edit affordance for a non-`request` row
// (see ToolCatalogTable.jsx's `isRequestView &&` guard on the edit
// button). This split doesn't answer that open question, just carries it
// forward — see tool-catalog-contract.md.
//
// Contract lives at freshbrain-agreement's tool-catalog-contract.md.
// `signal` is only actually threaded through by ToolCatalogPage's list
// loads today — create/update accept it too but no caller passes one yet.
import { USE_MOCK_API } from '../config/appConfig.js'
import { authHeaders, aiEngineApi } from './api.ts'
import { hasPermission } from '../config/permissions.js'
import { mockDelay } from './mockDelay.ts'

/**
 * Shape returned by every function in this file. `createdBy`/`updatedBy`
 * are `users.id` (uid, see authService.js's MOCK_USERS) — same convention
 * as freshpedia.js.
 * @typedef {{
 *   id: string,
 *   system: string,
 *   name: string,
 *   status: 'request' | 'staging' | 'production',
 *   createdBy: string,
 *   createdAt: string,
 *   updatedBy: string,
 *   updatedAt: string,
 *   description: string,
 *   exampleQuestions: string[],
 * }} ToolCatalogEntry
 */

function toEntry(row) {
  return { ...row }
}

// Ghifari's and Delanda's users.id, from authService.js's MOCK_USERS —
// same reuse as freshpedia.js, so createdBy/updatedBy actually resolve.
const GHIFARI_UID = 'b7e2d5f1-0000-4c22-9d33-000000000002'
const DELANDA_UID = 'b7e2d5f1-0000-4c22-9d33-000000000003'

// Module-level, mutable — same role as MOCK_USERS/MOCK_ENTRIES elsewhere.
// Resets on reload; no backend persistence yet. `id` is a fixed literal
// uid per row (stable across HMR/reload, same convention as
// freshpedia.js/roles.js/authService.js); createToolCatalogEntry generates
// a fresh one for genuinely new entries.
const MOCK_TOOLS = [
  {
    id: 'a2f6b3c1-0000-4e11-8b22-000000000001',
    system: 'wms',
    name: 'inventory',
    status: 'production',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-08T09:00:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-08T09:00:00Z',
    description: 'Melihat jumlah stok barang di seluruh gudang.',
    exampleQuestions: [
      'Berapa stok barang X saat ini?',
      'Barang apa saja yang stoknya di bawah minimum?',
    ],
  },
  {
    id: 'a2f6b3c1-0000-4e11-8b22-000000000002',
    system: 'wms',
    name: 'inbound',
    status: 'staging',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-15T09:00:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-15T09:00:00Z',
    description: 'Melacak status penerimaan barang masuk ke gudang.',
    exampleQuestions: [
      'Apakah pengiriman dari supplier X sudah diterima?',
      'Berapa banyak barang yang masih dalam proses inbound?',
    ],
  },
  {
    id: 'a2f6b3c1-0000-4e11-8b22-000000000003',
    system: 'wms',
    name: 'fulfillment',
    status: 'staging',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-15T09:05:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-15T09:05:00Z',
    description: 'Melihat status pemenuhan pesanan dari gudang.',
    exampleQuestions: [
      'Apakah pesanan #1234 sudah dikirim?',
      'Berapa banyak pesanan yang belum di-fulfill hari ini?',
    ],
  },
  {
    id: 'a2f6b3c1-0000-4e11-8b22-000000000004',
    system: 'tms',
    name: 'shipment',
    status: 'production',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-08T09:10:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-08T09:10:00Z',
    description: 'Melacak status pengiriman barang ke pelanggan.',
    exampleQuestions: [
      'Di mana posisi pengiriman #5678 sekarang?',
      'Berapa lama estimasi pengiriman ke kota X?',
    ],
  },
  {
    id: 'a2f6b3c1-0000-4e11-8b22-000000000005',
    system: 'dilema',
    name: 'orders',
    status: 'staging',
    createdBy: DELANDA_UID,
    createdAt: '2026-07-16T09:00:00Z',
    updatedBy: DELANDA_UID,
    updatedAt: '2026-07-16T09:00:00Z',
    description: 'Melihat data pesanan penjualan langsung.',
    exampleQuestions: ['Berapa total pesanan bulan ini?', 'Pesanan mana saja yang masih pending?'],
  },
  {
    id: 'a2f6b3c1-0000-4e11-8b22-000000000006',
    system: 'dilema',
    name: 'tenants',
    status: 'production',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-08T09:15:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-08T09:15:00Z',
    description: 'Melihat data tenant/mitra penjualan langsung.',
    exampleQuestions: [
      'Siapa saja tenant aktif saat ini?',
      'Berapa total transaksi tenant X bulan ini?',
    ],
  },
  {
    id: 'a2f6b3c1-0000-4e11-8b22-000000000007',
    system: 'odoo',
    name: 'revenue',
    status: 'production',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-08T09:20:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-08T09:20:00Z',
    description: 'Melihat data pendapatan dari sistem ERP.',
    exampleQuestions: ['Berapa revenue bulan lalu?', 'Bagaimana tren revenue 3 bulan terakhir?'],
  },
  {
    id: 'a2f6b3c1-0000-4e11-8b22-000000000008',
    system: 'wms',
    name: 'cyclecount',
    status: 'request',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-20T10:00:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-20T10:00:00Z',
    description: 'Melihat jadwal dan hasil cycle count stok gudang.',
    exampleQuestions: [
      'Kapan cycle count gudang X terakhir dilakukan?',
      'Apakah ada selisih stok dari cycle count minggu ini?',
    ],
  },
  {
    id: 'a2f6b3c1-0000-4e11-8b22-000000000009',
    system: 'tms',
    name: 'route',
    status: 'request',
    createdBy: GHIFARI_UID,
    createdAt: '2026-07-19T15:00:00Z',
    updatedBy: GHIFARI_UID,
    updatedAt: '2026-07-19T15:00:00Z',
    description: 'Melihat rute pengiriman yang sedang berjalan.',
    exampleQuestions: ['Rute mana yang paling sering delay?'],
  },
]

/**
 * `/tool-catalog` — published entries only (staging+production). Never
 * returns a request-status row; see getToolCatalogRequestEntries.
 * @returns {Promise<ToolCatalogEntry[]>}
 */
export async function getToolCatalogEntries({ signal, token } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.get(
      '/tool-catalog',
      { signal, headers: authHeaders(token) },
    )
    return data
  }
  await mockDelay(500, 900, signal)
  return MOCK_TOOLS.filter((entry) => entry.status !== 'request').map(toEntry)
}

/**
 * `/tool-catalog-request` — the submission queue. Always `status: "request"`.
 * @returns {Promise<ToolCatalogEntry[]>}
 */
export async function getToolCatalogRequestEntries({ signal, token } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.get(
      '/tool-catalog-request',
      { signal, headers: authHeaders(token) },
    )
    return data
  }
  await mockDelay(500, 900, signal)
  return MOCK_TOOLS.filter((entry) => entry.status === 'request').map(toEntry)
}

/**
 * Entries are always born in `/tool-catalog-request` — contributors can
 * never self-promote straight into the published collection (not that
 * there's a promotion path at all yet, see this file's header comment).
 *
 * @param {{ system: string, name: string, description: string, exampleQuestions: string[] }} input
 * @param {{ id: string, token?: string, allowed_permissions?: string[] }} actor
 * @returns {Promise<ToolCatalogEntry>}
 */
export async function createToolCatalogEntry(input, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.post(
      '/tool-catalog-request',
      input,
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  if (!hasPermission(actor, 'tool.request')) {
    throw new Error('You do not have permission to submit tool requests')
  }

  const now = new Date().toISOString()
  const entry = {
    id: crypto.randomUUID(),
    system: input.system,
    name: input.name,
    status: 'request',
    createdBy: actor.id,
    createdAt: now,
    updatedBy: actor.id,
    updatedAt: now,
    description: input.description ?? '',
    exampleQuestions: (input.exampleQuestions ?? []).filter((q) => q.trim()),
  }
  MOCK_TOOLS.push(entry)
  return toEntry(entry)
}

/**
 * `PATCH /tool-catalog-request/{id}` — pending entries only, editable by
 * anyone holding tool.request, not restricted to the entry's own
 * submitter. No published-entry equivalent exists (no
 * `PATCH /tool-catalog/{id}`) — nothing today can promote an entry out of
 * this collection, so there's nothing for that endpoint to ever edit; see
 * this file's header comment. "Edit Request" is a personal action, not a
 * review step.
 *
 * @param {string} id
 * @param {{ system?: string, name?: string, description?: string, exampleQuestions?: string[] }} updates
 * @param {{ id: string, token?: string, allowed_permissions?: string[] }} actor
 * @returns {Promise<ToolCatalogEntry>}
 */
export async function updateToolCatalogRequestEntry(id, updates, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.patch(
      `/tool-catalog-request/${encodeURIComponent(id)}`,
      updates,
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  const entry = MOCK_TOOLS.find((e) => e.id === id && e.status === 'request')
  if (!entry) throw new Error('Entry not found')

  if (!hasPermission(actor, 'tool.request')) {
    throw new Error('You do not have permission to edit this entry')
  }
  if (updates.status !== undefined) {
    throw new Error('status cannot be set directly')
  }

  if (updates.system !== undefined) entry.system = updates.system
  if (updates.name !== undefined) entry.name = updates.name
  if (updates.description !== undefined) entry.description = updates.description
  if (updates.exampleQuestions !== undefined) {
    entry.exampleQuestions = updates.exampleQuestions.filter((q) => q.trim())
  }
  entry.updatedBy = actor.id
  entry.updatedAt = new Date().toISOString()

  return toEntry(entry)
}
