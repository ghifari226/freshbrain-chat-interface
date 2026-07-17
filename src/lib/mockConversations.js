// Seed data for the sidebar. Not part of the api.js request/response
// contract — just local mock state until conversation listing is a real
// endpoint.

export function makeMockConversations() {
  return [
    {
      id: 'c1',
      backendId: null,
      title: 'Revenue bulan lalu',
      timestamp: '2026-07-12T09:14:00Z',
      messages: [
        { id: 'm1', role: 'user', text: 'Berapa revenue bulan lalu', createdAt: '2026-07-12T09:14:00Z' },
        { id: 'm2', role: 'assistant', text: 'Revenue bulan lalu tercatat sebesar Rp 10.176.965.194,47.', createdAt: '2026-07-12T09:14:20Z' },
      ],
    },
    {
      id: 'c2',
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
