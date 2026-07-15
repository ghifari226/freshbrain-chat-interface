// Seed data for the sidebar. Not part of the api.js request/response
// contract — just local mock state until conversation listing is a real
// endpoint.

export function makeMockConversations() {
  return [
    {
      id: 'c1',
      title: 'Peringatan suhu cold storage',
      timestamp: '2026-07-12T09:14:00Z',
      messages: [
        { id: 'm1', role: 'user', text: 'Kenapa unit 3 mengirim peringatan tadi pagi?', createdAt: '2026-07-12T09:14:00Z' },
        { id: 'm2', role: 'assistant', text: 'Unit 3 sempat 1,5°C di atas target antara pukul 6-8 pagi, kemungkinan pintu terbuka saat proses restock.', createdAt: '2026-07-12T09:14:20Z' },
      ],
    },
    {
      id: 'c2',
      title: 'Ringkasan pengiriman masuk',
      timestamp: '2026-07-11T15:42:00Z',
      messages: [
        { id: 'm3', role: 'user', text: 'Berapa banyak pengiriman yang masuk kemarin?', createdAt: '2026-07-11T15:42:00Z' },
        { id: 'm4', role: 'assistant', text: 'Anda menerima 3 pengiriman dengan total 1.240 unit.', createdAt: '2026-07-11T15:42:15Z' },
      ],
    },
  ]
}
