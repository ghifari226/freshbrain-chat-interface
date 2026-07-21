import { useEffect } from 'react'
import StandalonePageLayout from './StandalonePageLayout.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useRoute } from '../hooks/useRoute.js'

// Placeholder entry names only, no content backend yet — plain strings, not
// a data file, so this doesn't imply a real schema has been decided (see
// the project note on Freshpedia's status model). Already A-Z since the
// space in "Fresh Factory" sorts before the letters in the other two.
const MOCK_ENTRY_NAMES = ['Fresh Factory', 'FreshBrain', 'Freshpedia']

export default function FreshpediaPage({ language, setLanguage }) {
  const { session } = useAuth()
  const [, navigate] = useRoute()
  const isAuthorized = Boolean(session?.chat_freshpedia_view)

  useEffect(() => {
    if (!isAuthorized) navigate('/')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized])

  if (!isAuthorized) return null

  return (
    <StandalonePageLayout titleKey="freshpedia.title" language={language} setLanguage={setLanguage}>
      <div className="config-section">
        <ul className="freshpedia-index">
          {MOCK_ENTRY_NAMES.map((name) => (
            <li className="freshpedia-index__entry" key={name}>
              {name}
            </li>
          ))}
        </ul>
      </div>
    </StandalonePageLayout>
  )
}
