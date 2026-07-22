import { LanguageContext } from './LanguageContext.js'

export function LanguageProvider({ language, children }) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>
}
