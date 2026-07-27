// Shared low-level Axios plumbing only — no domain logic lives here. Every
// services/*.js file imports aiApi/gatewayApi/authHeaders from here instead
// of constructing its own client, so base URL/timeout/auth-header shape stay
// in one place. Domain calls (chat, Freshpedia, Tool Catalog, auth/users/
// roles) each live in their own service file and branch on
// config/appConfig.js's USE_MOCK_API themselves — this file doesn't know or
// care whether mocking is on.
import axios, { type AxiosError } from 'axios'
import {
  AI_ENGINE_BASE_URL,
  API_TIMEOUT_MS,
  CHAT_GATEWAY_BASE_URL,
} from '../config/appConfig.js'

export const aiApi = axios.create({
  baseURL: AI_ENGINE_BASE_URL,
  timeout: API_TIMEOUT_MS,
})

export const gatewayApi = axios.create({
  baseURL: CHAT_GATEWAY_BASE_URL,
  timeout: API_TIMEOUT_MS,
})

let onUnauthorized: (() => void) | null = null

// Registers the single global callback fired whenever aiApi or gatewayApi
// gets back a 401 — AuthProvider wires this to a full logout (clear session,
// navigate to /) so a revoked/expired token bounces the user to the login
// page immediately instead of leaving them on a page that just keeps
// silently failing. Deliberately just "force logout on 401", nothing about
// proactive expiry/refresh — auth-contract.md hasn't settled JWT lifetime or
// revocation timing yet, so there's nothing to build against there. Never
// fires under USE_MOCK_API: mock calls reject with plain Error()s, not a
// real Axios response, so they never match the 401 check below.
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

function handleResponseError(error: AxiosError) {
  if (error.response?.status === 401) {
    onUnauthorized?.()
  }
  return Promise.reject(error)
}

aiApi.interceptors.response.use((response) => response, handleResponseError)
gatewayApi.interceptors.response.use((response) => response, handleResponseError)

export function authHeaders(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

// Prefers the contract's `{ error: "..." }` response body (auth-contract.md)
// over Axios's generic "Request failed with status code NNN" — falls back to
// error.message untouched for mock-mode errors (plain Error objects, no
// .response at all), so this is safe to call unconditionally regardless of
// USE_MOCK_API. Every form/page in config/*.jsx and Freshpedia/Tool Catalog
// should route their caught network errors through this rather than reading
// error.message directly.
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}

// Three checks because two different rejection shapes can reach a caller
// depending on whether USE_MOCK_API is on: real Axios requests reject with
// an AxiosError (axios.isCancel / ERR_CANCELED), while mockDelay.ts's
// abort-aware timeout rejects with a plain DOMException('AbortError')
// instead — callers (FreshpediaPage, ToolCatalogPage, UsersPage) use this to
// swallow "the effect unmounted/re-ran" aborts without also swallowing a
// real load error.
export function isCanceled(error: unknown): boolean {
  return (
    axios.isCancel(error) ||
    (error instanceof Error &&
      ('code' in error && error.code === 'ERR_CANCELED' || error.name === 'AbortError'))
  )
}
