import { authHeaders, aiEngineApi } from './api.ts'

export async function getFreshpediaEntries({ signal, token } = {}) {
  const { data } = await aiEngineApi.get('/freshpedia', {
    signal,
    headers: authHeaders(token),
  })
  return data
}

export async function getFreshpediaRequestEntries({ signal, token } = {}) {
  const { data } = await aiEngineApi.get('/freshpedia-request', {
    signal,
    headers: authHeaders(token),
  })
  return data
}

export async function createFreshpediaEntry(input, actor, { signal } = {}) {
  const { data } = await aiEngineApi.post('/freshpedia-request', input, {
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

export async function updateFreshpediaRequestEntry(id, updates, actor, { signal } = {}) {
  const { data } = await aiEngineApi.patch(
    `/freshpedia-request/${encodeURIComponent(id)}`,
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

export async function promoteFreshpediaRequestEntry(id, actor, { signal } = {}) {
  const { data } = await aiEngineApi.post(
    `/freshpedia-request/${encodeURIComponent(id)}/status`,
    { status: 'staging' },
    { signal, headers: authHeaders(actor?.token) },
  )
  return data
}

export async function updateFreshpediaRequestStatus(id, requestStatus, actor, { signal } = {}) {
  const { data } = await aiEngineApi.post(
    `/freshpedia-request/${encodeURIComponent(id)}/request-status`,
    { requestStatus },
    { signal, headers: authHeaders(actor?.token) },
  )
  return data
}
