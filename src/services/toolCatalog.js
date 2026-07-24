import { CHAT_GATEWAY_BASE_URL } from '../config/appConfig.js'

function delay() {
  return new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 400))
}

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

export async function listToolCatalogEntries() {
  try {
    const res = await fetch(`${CHAT_GATEWAY_BASE_URL}/tool-catalog`)
    if (res.ok) return res.json()
  } catch {
    // no real chat-gateway yet — fall through to the mock below
  }
  await delay()
  return MOCK_TOOLS.map(toEntry)
}

/**
 * @param {{ system: string, name: string, description: string, exampleQuestions: string[] }} input
 * @param {{ email: string, name: string, 'tool.request'?: boolean }} actor
 */
export async function createToolCatalogEntry(input, actor) {
  try {
    const res = await fetch(`${CHAT_GATEWAY_BASE_URL}/tool-catalog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (res.ok) return res.json()
  } catch {
    // no real chat-gateway yet — fall through to the mock below
  }

  await delay()

  if (!actor?.['tool.request']) {
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
 * @param {{ email: string, 'tool.request'?: boolean }} actor
 */
export async function updateToolCatalogEntry(id, updates, actor) {
  try {
    const res = await fetch(`${CHAT_GATEWAY_BASE_URL}/tool-catalog/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) return res.json()
  } catch {
    // no real chat-gateway yet — fall through to the mock below
  }

  await delay()

  const entry = MOCK_TOOLS.find((e) => e.id === id)
  if (!entry) throw new Error('Entry not found')

  if (!actor?.['tool.request'] || entry.status !== 'request') {
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
