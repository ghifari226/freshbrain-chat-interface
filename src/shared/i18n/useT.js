import { useContext } from 'react'
import { LanguageContext } from './LanguageContext.js'
import { strings } from './strings.js'
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
export function resolveLabelEntry(path) {
  const entry = resolveEntry(path)
  return { id: entry.id ?? '', en: entry.en ?? entry.id ?? '' }
}
