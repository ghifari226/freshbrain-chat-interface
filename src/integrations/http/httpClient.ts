import axios, { type AxiosError } from 'axios'
import {
  AI_ENGINE_BASE_URL,
  API_TIMEOUT_MS,
  CHAT_GATEWAY_BASE_URL,
} from '@core/config/runtime.js'

export const aiEngineApi = axios.create({
  baseURL: AI_ENGINE_BASE_URL,
  timeout: API_TIMEOUT_MS,
})

export const gatewayApi = axios.create({
  baseURL: CHAT_GATEWAY_BASE_URL,
  timeout: API_TIMEOUT_MS,
})

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

function handleResponseError(error: AxiosError) {
  if (error.response?.status === 401) {
    onUnauthorized?.()
  }
  return Promise.reject(error)
}

aiEngineApi.interceptors.response.use((response) => response, handleResponseError)
gatewayApi.interceptors.response.use((response) => response, handleResponseError)

export function authHeaders(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : undefined
}
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}
export function isCanceled(error: unknown): boolean {
  return (
    axios.isCancel(error) ||
    (error instanceof Error &&
      ('code' in error && error.code === 'ERR_CANCELED' || error.name === 'AbortError'))
  )
}
