// Single source of truth for backend base URLs. Two separate systems:
// ai-engine answers chat/title requests (api.js), chat-gateway (Laravel)
// handles login/register/admin requests (auth.js). They don't share a
// host or port, so they get separate env vars/constants — only the env
// var needs to change once each backend has a real deployed URL, not
// this file or its callers.
export const AI_ENGINE_BASE_URL = import.meta.env.VITE_AI_ENGINE_BASE_URL || 'http://localhost:8000'
export const CHAT_GATEWAY_BASE_URL = import.meta.env.VITE_CHAT_GATEWAY_BASE_URL || 'http://localhost:8001'
