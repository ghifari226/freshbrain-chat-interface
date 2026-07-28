// Single source of truth for backend base URLs. Two separate systems:
// ai-engine answers chat/title requests AND owns Freshpedia + Tool Catalog
// content (services/apiClient.js, freshpedia.js, toolCatalog.js — moved off
// chat-gateway 2026-07-28, see those files' headers), chat-gateway (Laravel)
// handles login/admin/identity requests only (services/authService.js,
// roleScopes.js) — there's no self-registration, only admin-driven user
// creation, see authService.js. They don't share a host or port, so they
// get separate env vars/constants — only the env var needs to change once
// each backend has a real deployed URL, not this file or its callers.
export const AI_ENGINE_BASE_URL = import.meta.env.VITE_AI_ENGINE_BASE_URL || 'http://localhost:8000'
export const CHAT_GATEWAY_BASE_URL = import.meta.env.VITE_CHAT_GATEWAY_BASE_URL || 'http://localhost:8001'
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000
