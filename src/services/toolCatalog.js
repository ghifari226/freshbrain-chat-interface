// Tool Catalog CRUD against ai-engine (moved off chat-gateway 2026-07-28 —
// same reasoning as freshpedia.js: the tool registry is ai-engine's own
// content, tightly coupled to its actual tool implementations under
// be/freshbrain-ai-engine/tools/, not an auth/identity concern; chat-gateway
// still owns the tool.* permission values themselves, just not this data).
// Same shape as freshpedia.js (USE_MOCK_API branch, MOCK_TOOLS in place of
// MOCK_ENTRIES), but no change_status endpoint: per permission-catalog.md's
// open questions, Tool Catalog has no promote/demote path at all yet,
// mocked or real — a `request` entry can only be edited while pending,
// never moved to staging/production from this file or the UI. Contract
// lives at freshbrain-agreement's tool-catalog-contract.md. `signal` is
// only actually threaded through by ToolCatalogPage's list load
// (getAllToolCatalogEntries) today — create/update accept it too but no
// caller passes one yet.
import { USE_MOCK_API } from '../config/appConfig.js'
import { authHeaders, aiEngineApi } from './api.ts'
import { hasPermission } from '../config/permissions.js'
import { mockDelay } from './mockDelay.ts'

/**
 * Shape returned by every function in this file.
 * @typedef {{
 *   id: string,
 *   system: string,
 *   name: string,
 *   status: 'request' | 'staging' | 'production',
 *   updatedAt: string,
 *   submittedBy: string,
 *   submittedByEmail: string,
 *   description: string,
 *   exampleQuestions: string[],
 * }} ToolCatalogEntry
 */

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function toEntry(row) {
  return { ...row }
}

// Module-level, mutable — same role as MOCK_USERS/MOCK_ENTRIES elsewhere.
// Resets on reload; no backend persistence yet. Statuses match the split
// this page shipped with earlier this session; description/example
// questions are new.
const MOCK_TOOLS = [
  {
    id: 'w1',
    system: 'wms',
    name: 'inventory',
    status: 'production',
    updatedAt: '2026-07-08T09:00:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    description: 'Melihat jumlah stok barang di seluruh gudang.',
    exampleQuestions: [
      'Berapa stok barang X saat ini?',
      'Barang apa saja yang stoknya di bawah minimum?',
    ],
  },
  {
    id: 'w2',
    system: 'wms',
    name: 'inbound',
    status: 'staging',
    updatedAt: '2026-07-15T09:00:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    description: 'Melacak status penerimaan barang masuk ke gudang.',
    exampleQuestions: [
      'Apakah pengiriman dari supplier X sudah diterima?',
      'Berapa banyak barang yang masih dalam proses inbound?',
    ],
  },
  {
    id: 'w3',
    system: 'wms',
    name: 'fulfillment',
    status: 'staging',
    updatedAt: '2026-07-15T09:05:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    description: 'Melihat status pemenuhan pesanan dari gudang.',
    exampleQuestions: [
      'Apakah pesanan #1234 sudah dikirim?',
      'Berapa banyak pesanan yang belum di-fulfill hari ini?',
    ],
  },
  {
    id: 't1',
    system: 'tms',
    name: 'shipment',
    status: 'production',
    updatedAt: '2026-07-08T09:10:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    description: 'Melacak status pengiriman barang ke pelanggan.',
    exampleQuestions: [
      'Di mana posisi pengiriman #5678 sekarang?',
      'Berapa lama estimasi pengiriman ke kota X?',
    ],
  },
  {
    id: 'd1',
    system: 'dilema',
    name: 'orders',
    status: 'staging',
    updatedAt: '2026-07-16T09:00:00Z',
    submittedBy: 'Delanda Pramuwidia',
    submittedByEmail: 'delapramuwidia@gmail.com',
    description: 'Melihat data pesanan penjualan langsung.',
    exampleQuestions: ['Berapa total pesanan bulan ini?', 'Pesanan mana saja yang masih pending?'],
  },
  {
    id: 'd2',
    system: 'dilema',
    name: 'tenants',
    status: 'production',
    updatedAt: '2026-07-08T09:15:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    description: 'Melihat data tenant/mitra penjualan langsung.',
    exampleQuestions: [
      'Siapa saja tenant aktif saat ini?',
      'Berapa total transaksi tenant X bulan ini?',
    ],
  },
  {
    id: 'o1',
    system: 'odoo',
    name: 'revenue',
    status: 'production',
    updatedAt: '2026-07-08T09:20:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    description: 'Melihat data pendapatan dari sistem ERP.',
    exampleQuestions: ['Berapa revenue bulan lalu?', 'Bagaimana tren revenue 3 bulan terakhir?'],
  },
  {
    id: 'w4',
    system: 'wms',
    name: 'cyclecount',
    status: 'request',
    updatedAt: '2026-07-20T10:00:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    description: 'Melihat jadwal dan hasil cycle count stok gudang.',
    exampleQuestions: [
      'Kapan cycle count gudang X terakhir dilakukan?',
      'Apakah ada selisih stok dari cycle count minggu ini?',
    ],
  },
  {
    id: 't2',
    system: 'tms',
    name: 'route',
    status: 'request',
    updatedAt: '2026-07-19T15:00:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    description: 'Melihat rute pengiriman yang sedang berjalan.',
    exampleQuestions: ['Rute mana yang paling sering delay?'],
  },
]

/**
 * @returns {Promise<ToolCatalogEntry[]>}
 */
export async function getAllToolCatalogEntries({ signal, token } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.get(
      '/tool-catalog',
      { signal, headers: authHeaders(token) },
    )
    return data
  }
  await mockDelay(500, 900, signal)
  return MOCK_TOOLS.map(toEntry)
}

/**
 * @param {{ system: string, name: string, description: string, exampleQuestions: string[] }} input
 * @param {{ email: string, name: string, token?: string, allowed_permissions?: string[] }} actor
 * @returns {Promise<ToolCatalogEntry>}
 */
export async function createToolCatalogEntry(input, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.post(
      '/tool-catalog',
      input,
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  if (!hasPermission(actor, 'tool.request')) {
    throw new Error('You do not have permission to submit tool requests')
  }

  const entry = {
    id: makeId(),
    system: input.system,
    name: input.name,
    // Always request on create — contributors can never self-promote.
    status: 'request',
    updatedAt: new Date().toISOString(),
    submittedBy: actor.name,
    submittedByEmail: actor.email,
    description: input.description ?? '',
    exampleQuestions: (input.exampleQuestions ?? []).filter((q) => q.trim()),
  }
  MOCK_TOOLS.push(entry)
  return toEntry(entry)
}

/**
 * Editable by anyone holding tool.request, while still pending —
 * not restricted to the entry's own submitter, any contributor can edit
 * any pending request. No promote/demote/superadmin path here, "Edit
 * Request" is a personal action, not a review step.
 *
 * @param {string} id
 * @param {{ system?: string, name?: string, description?: string, exampleQuestions?: string[] }} updates
 * @param {{ email: string, token?: string, allowed_permissions?: string[] }} actor
 * @returns {Promise<ToolCatalogEntry>}
 */
export async function updateToolCatalogEntry(id, updates, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.patch(
      `/tool-catalog/${encodeURIComponent(id)}`,
      updates,
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  const entry = MOCK_TOOLS.find((e) => e.id === id)
  if (!entry) throw new Error('Entry not found')

  if (!hasPermission(actor, 'tool.request') || entry.status !== 'request') {
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
  entry.updatedAt = new Date().toISOString()

  return toEntry(entry)
}
