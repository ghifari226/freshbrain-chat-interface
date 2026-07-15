import { useEffect, useState } from 'react'

const STORAGE_KEY = 'freshbrain-language'

function getPreferredLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'id') return stored
  return 'en'
}

export function useLanguage() {
  const [language, setLanguage] = useState(getPreferredLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem(STORAGE_KEY, language)
  }, [language])

  return [language, setLanguage]
}
