// Seed data for the sidebar. Not part of the api.js request/response
// contract — just local mock state until conversation listing is a real
// endpoint. id is the URL slug for this conversation (App.jsx routes to
// /<id>) — a fixed literal uid per row (stable across HMR/reload, unlike
// App.jsx's own crypto.randomUUID()), same convention as authService.js's
// MOCK_USERS and roles.js's ROLE_IDS. This id is what a real GET
// /conversations would return as the conversation's own backend-assigned
// id — the frontend never invents conversation ids (see domain.ts's
// Conversation.id doc comment). backendMessageId is set to match its own
// id so giving feedback on a seeded conversation's message is treated as
// already existing on the backend, matching what a real POST /chat
// round-trip would have produced.

export function makeMockConversations() {
  return [
    {
      id: 'd4e5f6a7-0000-4c11-9b22-000000000001',
      title: 'Revenue bulan lalu',
      timestamp: '2026-07-12T09:14:00Z',
      messages: [
        {
          id: 'e5f6a7b8-0000-4d11-9c22-000000000001',
          role: 'user',
          text: 'Berapa revenue bulan lalu',
          createdAt: '2026-07-12T09:14:00Z',
        },
        {
          id: 'e5f6a7b8-0000-4d11-9c22-000000000002',
          role: 'assistant',
          text: 'Revenue bulan lalu tercatat sebesar Rp 10.176.965.194,47.',
          createdAt: '2026-07-12T09:14:20Z',
          backendMessageId: 'e5f6a7b8-0000-4d11-9c22-000000000002',
        },
      ],
    },
    {
      id: 'd4e5f6a7-0000-4c11-9b22-000000000002',
      title: 'Total warehouse saat ini',
      timestamp: '2026-07-11T15:42:00Z',
      messages: [
        {
          id: 'e5f6a7b8-0000-4d11-9c22-000000000003',
          role: 'user',
          text: 'Berapa total warehouse saat ini',
          createdAt: '2026-07-11T15:42:00Z',
        },
        {
          id: 'e5f6a7b8-0000-4d11-9c22-000000000004',
          role: 'assistant',
          text: 'Saat ini terdapat total 88 warehouse (gudang fisik), dengan total 909 tempat penyimpanan (gudang virtual).',
          createdAt: '2026-07-11T15:42:15Z',
          backendMessageId: 'e5f6a7b8-0000-4d11-9c22-000000000004',
        },
      ],
    },
  ]
}
