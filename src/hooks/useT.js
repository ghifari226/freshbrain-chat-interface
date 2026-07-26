import { useContext } from 'react'
import { LanguageContext } from '../contexts/LanguageContext.js'
import { strings } from '../i18n/strings.js'

// Resolves either a dotted path into strings.js, or an already-resolved
// { id, en } entry (e.g. a custom permission label edited through
// PermissionsPage, which stores the { id, en } pair directly rather than a
// path). Falls back to echoing the path itself when it doesn't resolve.
function resolveEntry(path) {
  if (path && typeof path === 'object') return path
  const entry = path.split('.').reduce((node, key) => node?.[key], strings)
  return entry ?? { id: path, en: path }
}

export function useT() {
  const language = useContext(LanguageContext)
  return function t(path) {
    const entry = resolveEntry(path)
    return entry[language] ?? entry.id
  }
}

// Returns the raw { id, en } pair for a label regardless of current UI
// language — used by editors (e.g. PermissionsPage's edit form) that need
// both language values at once, not just the one t() would currently render.
export function resolveLabelEntry(path) {
  const entry = resolveEntry(path)
  return { id: entry.id ?? '', en: entry.en ?? entry.id ?? '' }
}
