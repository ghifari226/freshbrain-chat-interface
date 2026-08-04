export const AI_ENGINE_BASE_URL = import.meta.env.VITE_AI_ENGINE_BASE_URL || 'http://localhost:8000'
export const CHAT_GATEWAY_BASE_URL = import.meta.env.VITE_CHAT_GATEWAY_BASE_URL || 'http://localhost:8001'
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000
