import { useContext } from 'react'
import { LanguageContext } from '../contexts/LanguageContext.js'
import { strings } from '../i18n/strings.js'

export function useT() {
  const language = useContext(LanguageContext)
  return function t(path) {
    const entry = path.split('.').reduce((node, key) => node?.[key], strings)
    if (!entry) return path
    return entry[language] ?? entry.id
  }
}
