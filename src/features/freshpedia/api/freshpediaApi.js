import { authHeaders, aiEngineApi } from '@integrations/http/httpClient.ts'

export async function getFreshpediaEntries({ signal, token } = {}) {
  const { data } = await aiEngineApi.get('/freshpedia', {
    signal,
    headers: authHeaders(token),
  })
  return data
}

export async function createFreshpediaEntry(input, actor, { signal } = {}) {
  const { data } = await aiEngineApi.post('/freshpedia', input, {
    signal,
    headers: authHeaders(actor?.token),
  })
  return data
}

export async function updateFreshpediaEntry(id, updates, actor, { signal } = {}) {
  const { data } = await aiEngineApi.patch(
    `/freshpedia/${encodeURIComponent(id)}`,
    updates,
    { signal, headers: authHeaders(actor?.token) },
  )
  return data
}

export async function updateFreshpediaEntryStatus(id, status, actor, { signal } = {}) {
  const { data } = await aiEngineApi.post(
    `/freshpedia/${encodeURIComponent(id)}/status`,
    { status },
    { signal, headers: authHeaders(actor?.token) },
  )
  return data
}
