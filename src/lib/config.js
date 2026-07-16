// Single source of truth for the backend base URL. Today this points at
// ai-engine directly; once chat-gateway sits in front, only the env var
// (VITE_API_BASE_URL) needs to change, not this file or its callers.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
