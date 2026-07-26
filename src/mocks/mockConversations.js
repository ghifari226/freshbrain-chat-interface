// Seed data for the sidebar. Not part of the api.js request/response
// contract — just local mock state until conversation listing is a real
// endpoint. id is the URL slug for this conversation (App.jsx routes to
// /<id>) — shaped like App.jsx's own makeId() (random base36, 8 chars) but
// hardcoded here so these mock chats have a stable, shareable URL across
// reloads instead of a fresh random id every session.

export function makeMockConversations() {
  return [
    {
      id: 'k3f8x1qz',
      backendId: null,
      title: 'Revenue bulan lalu',
      timestamp: '2026-07-12T09:14:00Z',
      messages: [
        { id: 'm1', role: 'user', text: 'Berapa revenue bulan lalu', createdAt: '2026-07-12T09:14:00Z' },
        { id: 'm2', role: 'assistant', text: 'Revenue bulan lalu tercatat sebesar Rp 10.176.965.194,47.', createdAt: '2026-07-12T09:14:20Z' },
      ],
    },
    {
      id: 'p9m2v7bd',
      backendId: null,
      title: 'Total warehouse saat ini',
      timestamp: '2026-07-11T15:42:00Z',
      messages: [
        { id: 'm3', role: 'user', text: 'Berapa total warehouse saat ini', createdAt: '2026-07-11T15:42:00Z' },
        { id: 'm4', role: 'assistant', text: 'Saat ini terdapat total 45 warehouse.', createdAt: '2026-07-11T15:42:15Z' },
      ],
    },
  ]
}
