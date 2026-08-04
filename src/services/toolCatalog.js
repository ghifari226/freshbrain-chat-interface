import { USE_MOCK_API } from '../config/appConfig.js'
import { authHeaders, aiEngineApi } from './api.ts'
import { hasPermission } from '../config/permissions.js'
import { mockDelay } from './mockDelay.ts'
function toEntry(row) {
  return { ...row }
}
const GHIFARI_UID = 'b7e2d5f1-0000-4c22-9d33-000000000002'
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
    id: 'a2f6b3c1-0000-4e11-8b22-000000000008',
    system: 'wms',
    name: 'cyclecount',
    status: 'request',
    requestStatus: 'draft',
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
]
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
export async function getToolCatalogRequestEntries({ signal, token } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.get(
      '/tool-catalog-request',
      { signal, headers: authHeaders(token) },
    )
    return data
  }
  await mockDelay(500, 900, signal)
  return MOCK_TOOLS.filter((entry) => Boolean(entry.requestStatus)).map(toEntry)
}
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

  if (!hasPermission(actor, 'tools.request_add')) {
    throw new Error('You do not have permission to submit tool requests')
  }

  const now = new Date().toISOString()
  const entry = {
    id: crypto.randomUUID(),
    system: input.system,
    name: input.name,
    status: 'request',
    requestStatus: 'draft',
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

  if (!hasPermission(actor, 'tools.request_edit')) {
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
export async function promoteToolCatalogRequestEntry(id, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.post(
      `/tool-catalog-request/${encodeURIComponent(id)}/status`,
      { status: 'staging' },
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  if (!actor?.is_maintainer) {
    throw new Error('Only maintainers can promote entries')
  }

  const entry = MOCK_TOOLS.find((e) => e.id === id && e.status === 'request')
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
export async function updateToolCatalogRequestStatus(id, nextRequestStatus, actor, { signal } = {}) {
  if (!USE_MOCK_API) {
    const { data } = await aiEngineApi.post(
      `/tool-catalog-request/${encodeURIComponent(id)}/request-status`,
      { requestStatus: nextRequestStatus },
      { signal, headers: authHeaders(actor?.token) },
    )
    return data
  }

  await mockDelay(500, 900, signal)

  if (!hasPermission(actor, 'tools.request_status')) {
    throw new Error("You do not have permission to change this request's status")
  }

  const entry = MOCK_TOOLS.find((e) => e.id === id && e.status === 'request')
  if (!entry) throw new Error('Entry not found')

  entry.requestStatus = nextRequestStatus
  entry.updatedBy = actor.id
  entry.updatedAt = new Date().toISOString()
  return toEntry(entry)
}
