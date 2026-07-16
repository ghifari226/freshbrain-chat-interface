// All API interaction lives here. Currently mocked; swap the body of
// sendMessage for a real fetch/axios call when the backend is ready —
// callers shouldn't need to change.

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

const MOCK_REPLIES = [
  'Berikut yang saya temukan — cold storage unit 3 sudah 1,5°C di atas target selama 4 jam terakhir.',
  'Berdasarkan log pengiriman masuk terbaru, Anda menerima 3 pengiriman hari ini dengan total 1.240 unit.',
  'Saya sudah cek okupansi gudang — kapasitas Anda saat ini 82% di seluruh zona.',
  'Pesanan tersebut sedang dalam perjalanan dan diperkirakan tiba besok pagi.',
]

/**
 * user_id/role/allowed_scopes/token ride along per auth-contract.md's
 * "every subsequent request" shape, so swapping this mock for a real
 * fetch (Authorization: Bearer token header, the rest in the body)
 * needs no changes at the call site.
 *
 * @param {{
 *   message: string,
 *   conversation_id: string | null,
 *   user_id?: string,
 *   role?: string,
 *   allowed_scopes?: string[],
 *   token?: string,
 * }} request
 * @returns {Promise<{ answer: string, conversation_id: string }>}
 */
export async function sendMessage({ message, conversation_id }) {
  await new Promise((resolve) => setTimeout(resolve, 900 + Math.random() * 600))

  const answer = MOCK_REPLIES[message.length % MOCK_REPLIES.length]

  return {
    answer,
    conversation_id: conversation_id ?? makeId(),
  }
}

/**
 * Mocks the title-summarization a real backend would run against the
 * first message of a new conversation. Resolves independently of
 * sendMessage so the title can pop in shortly after send, same as it
 * does for real Claude conversations.
 *
 * @param {string} message
 * @returns {Promise<string>}
 */
export async function generateTitle(message) {
  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 500))

  const words = message.trim().split(/\s+/).filter(Boolean)
  const summary = words.slice(0, 6).join(' ')
  const title = summary.charAt(0).toUpperCase() + summary.slice(1)

  return words.length > 6 ? `${title}…` : title
}
