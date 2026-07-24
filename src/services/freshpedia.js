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

// Only forward transitions plus one demotion step back — matches the three
// buttons the UI actually shows (Promote to Staging on Request, Promote to
// Production on Staging, Demote to Staging on Production).
const ALLOWED_TRANSITIONS = {
  request: ['staging'],
  staging: ['production'],
  production: ['staging'],
}

// Module-level, mutable — same role as MOCK_USERS in auth.js. Resets on
// reload; no backend persistence yet.
const MOCK_ENTRIES = [
  {
    id: 'e1',
    title: 'Jumlah Gudang Fisik',
    type: 'definition',
    status: 'production',
    updatedAt: '2026-07-10T09:00:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    content: {
      en: 'The count of physical warehouse locations Fresh Factory currently operates. Referenced whenever FreshBrain answers a "how many warehouses" question — see the mock chat example: "Saat ini terdapat total 45 warehouse."',
      id: 'Jumlah lokasi gudang fisik yang saat ini dioperasikan oleh Fresh Factory. Dirujuk setiap kali FreshBrain menjawab pertanyaan "berapa jumlah gudang" — lihat contoh chat: "Saat ini terdapat total 45 warehouse."',
    },
  },
  {
    id: 'e2',
    title: 'Warehouse Management System',
    type: 'definition',
    status: 'production',
    updatedAt: '2026-07-09T09:00:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    content: {
      en: 'The system that tracks inventory, inbound receiving, and fulfillment across Fresh Factory\'s warehouses.',
      id: 'Sistem yang melacak inventaris, penerimaan barang masuk, dan fulfillment di seluruh gudang Fresh Factory.',
    },
  },
  {
    id: 'e3',
    title: 'WMS',
    type: 'alias',
    status: 'production',
    updatedAt: '2026-07-09T09:05:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    aliasTargetId: 'e2',
    aliasPhrase: 'Singkatan umum untuk Warehouse Management System.',
  },
  {
    id: 'e4',
    title: 'Cross-Docking',
    type: 'definition',
    status: 'staging',
    updatedAt: '2026-07-15T11:00:00Z',
    submittedBy: 'Delanda Pramuwidia',
    submittedByEmail: 'delapramuwidia@gmail.com',
    content: {
      en: 'Unloading goods from inbound shipments and loading them directly onto outbound transport, with little or no warehouse storage in between.',
      id: 'Menurunkan barang dari pengiriman masuk lalu langsung memuatnya ke transportasi keluar, dengan penyimpanan gudang minimal atau tanpa penyimpanan sama sekali.',
    },
  },
  {
    id: 'e5',
    title: 'Panduan Tata Letak Gudang',
    type: 'document',
    status: 'production',
    updatedAt: '2026-07-08T09:00:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    fileName: 'panduan-tata-letak-gudang.pdf',
  },
  {
    id: 'e6',
    title: 'SOP Retur Barang',
    type: 'document',
    status: 'staging',
    updatedAt: '2026-07-16T14:30:00Z',
    submittedBy: 'Delanda Pramuwidia',
    submittedByEmail: 'delapramuwidia@gmail.com',
    fileName: 'sop-retur-barang.pdf',
  },
  {
    id: 'e7',
    title: 'Fulfillment Rate',
    type: 'definition',
    status: 'request',
    updatedAt: '2026-07-20T10:15:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    content: {
      en: 'The share of order lines shipped complete and on the first attempt, without split shipments or backorders.',
      id: 'Persentase baris pesanan yang dikirim lengkap dan pada percobaan pertama, tanpa pengiriman terpisah atau backorder.',
    },
  },
  {
    id: 'e8',
    title: 'Transport Management System',
    type: 'definition',
    status: 'request',
    updatedAt: '2026-07-19T16:40:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    content: {
      en: 'The system that plans and tracks outbound shipments across carriers and routes.',
      id: 'Sistem yang merencanakan dan melacak pengiriman keluar di berbagai kurir dan rute.',
    },
  },
  {
    id: 'e9',
    title: 'TMS',
    type: 'alias',
    status: 'request',
    updatedAt: '2026-07-19T16:45:00Z',
    submittedBy: 'Ghifari',
    submittedByEmail: 'ghifari@freshfactory.id',
    aliasTargetId: 'e8',
    aliasPhrase: 'Singkatan umum untuk Transport Management System.',
  },
]

export async function listFreshpediaEntries() {
  try {
    const res = await fetch(`${CHAT_GATEWAY_BASE_URL}/freshpedia`)
    if (res.ok) return res.json()
  } catch {
    // no real chat-gateway yet — fall through to the mock below
  }
  await delay()
  return MOCK_ENTRIES.map(toEntry)
}

/**
 * @param {{ title: string, type: 'definition'|'document'|'alias', content?: string, fileName?: string, aliasTargetId?: string, aliasPhrase?: string }} input
 * @param {{ email: string, name: string, 'freshpedia.request'?: boolean }} actor
 */
export async function createFreshpediaEntry(input, actor) {
  try {
    const res = await fetch(`${CHAT_GATEWAY_BASE_URL}/freshpedia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (res.ok) return res.json()
  } catch {
    // no real chat-gateway yet — fall through to the mock below
  }

  await delay()

  if (!actor?.['freshpedia.request']) {
    throw new Error('You do not have permission to submit Freshpedia entries')
  }

  const entry = {
    id: makeId(),
    title: input.title,
    type: input.type,
    // Always request on create — contributors can never self-promote.
    status: 'request',
    updatedAt: new Date().toISOString(),
    submittedBy: actor.name,
    submittedByEmail: actor.email,
    content: input.type === 'definition' ? input.content ?? '' : undefined,
    fileName: input.type === 'document' ? input.fileName ?? '' : undefined,
    aliasTargetId: input.type === 'alias' ? input.aliasTargetId ?? null : undefined,
    aliasPhrase: input.type === 'alias' ? input.aliasPhrase ?? '' : undefined,
  }
  MOCK_ENTRIES.push(entry)
  return toEntry(entry)
}

/**
 * Editable by anyone holding freshpedia.request while still pending, or by
 * anyone holding freshpedia.change_status at any status — not restricted
 * to the entry's own submitter, any contributor can edit any pending
 * entry.
 *
 * @param {string} id
 * @param {{ title?: string, content?: string, fileName?: string, aliasTargetId?: string, aliasPhrase?: string }} updates
 * @param {{ email: string, 'freshpedia.request'?: boolean, 'freshpedia.change_status'?: boolean }} actor
 */
export async function updateFreshpediaEntry(id, updates, actor) {
  try {
    const res = await fetch(`${CHAT_GATEWAY_BASE_URL}/freshpedia/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) return res.json()
  } catch {
    // no real chat-gateway yet — fall through to the mock below
  }

  await delay()

  const entry = MOCK_ENTRIES.find((e) => e.id === id)
  if (!entry) throw new Error('Entry not found')

  const canChangeStatus = Boolean(actor?.['freshpedia.change_status'])
  if (!canChangeStatus && !(actor?.['freshpedia.request'] && entry.status === 'request')) {
    throw new Error('You do not have permission to edit this entry')
  }
  if (updates.status !== undefined) {
    throw new Error('status cannot be set directly — use setFreshpediaEntryStatus')
  }

  if (updates.title !== undefined) entry.title = updates.title
  if (updates.content !== undefined) entry.content = updates.content
  if (updates.fileName !== undefined) entry.fileName = updates.fileName
  if (updates.aliasTargetId !== undefined) entry.aliasTargetId = updates.aliasTargetId
  if (updates.aliasPhrase !== undefined) entry.aliasPhrase = updates.aliasPhrase
  entry.updatedAt = new Date().toISOString()

  return toEntry(entry)
}

/**
 * freshpedia.change_status-only status move: request→staging,
 * staging→production, or production→staging (demote).
 *
 * @param {string} id
 * @param {'staging'|'production'} status
 * @param {{ 'freshpedia.change_status'?: boolean }} actor
 */
export async function setFreshpediaEntryStatus(id, status, actor) {
  try {
    const res = await fetch(`${CHAT_GATEWAY_BASE_URL}/freshpedia/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) return res.json()
  } catch {
    // no real chat-gateway yet — fall through to the mock below
  }

  await delay()

  if (!actor?.['freshpedia.change_status']) {
    throw new Error('You do not have permission to change entry status')
  }

  const entry = MOCK_ENTRIES.find((e) => e.id === id)
  if (!entry) throw new Error('Entry not found')

  if (!ALLOWED_TRANSITIONS[entry.status]?.includes(status)) {
    throw new Error(`Cannot move an entry from ${entry.status} to ${status}`)
  }

  entry.status = status
  entry.updatedAt = new Date().toISOString()
  return toEntry(entry)
}
