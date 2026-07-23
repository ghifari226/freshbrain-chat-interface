import { useT } from '../hooks/useT.js'

// Shared shell for top-level pages reached from the user menu (Freshpedia,
// Tool Catalog) that aren't part of Access Configuration — same header
// pattern as ConfigLayout (just a title now — Back to Chat lives in the
// Sidebar and the profile bar, not here). Language now lives only in the
// Settings modal.
export default function StandalonePageLayout({ titleKey, children }) {
  const t = useT()

  return (
    <div className="config-page">
      <header className="config-page__header">
        <span className="config-page__title">{t(titleKey)}</span>
      </header>

      <div className="config-page__body">{children}</div>
    </div>
  )
}
