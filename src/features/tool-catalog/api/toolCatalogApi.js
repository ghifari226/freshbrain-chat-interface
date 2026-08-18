import { authHeaders, aiEngineApi } from '@integrations/http/httpClient.ts'

export async function getLiveTools({ signal, token, domain } = {}) {
  const { data } = await aiEngineApi.get('/tools', {
    signal,
    headers: authHeaders(token),
    params: domain ? { domain } : undefined,
  })
  return data.domains
}

export async function getToolRequests({ signal, token } = {}) {
  const { data } = await aiEngineApi.get('/tool-requests', {
    signal,
    headers: authHeaders(token),
  })
  return data.requests
}

export async function createToolRequest(input, actor, { signal } = {}) {
  const { data } = await aiEngineApi.post(
    '/tool-requests',
    { title: input.title, description: input.description, domain: input.domain },
    { signal, headers: authHeaders(actor?.token) },
  )
  return data
}

export async function updateToolRequest(id, updates, actor, { signal } = {}) {
  const { data } = await aiEngineApi.patch(
    `/tool-requests/${encodeURIComponent(id)}`,
    { title: updates.title, description: updates.description, domain: updates.domain },
    { signal, headers: authHeaders(actor?.token) },
  )
  return data
}

export async function updateToolRequestStatus(id, nextStatus, actor, { signal } = {}) {
  const { data } = await aiEngineApi.post(
    `/tool-requests/${encodeURIComponent(id)}/status`,
    { status: nextStatus },
    { signal, headers: authHeaders(actor?.token) },
  )
  return data
}
