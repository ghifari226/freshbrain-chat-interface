import { useMemo, useState } from 'react'
import { useT } from '../../hooks/useT.js'

export default function SearchModal({ conversations, onSelect, onClose }) {
  const t = useT()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return conversations
    return conversations.filter((c) => c.title.toLowerCase().includes(trimmed))
  }, [conversations, query])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(event) => event.stopPropagation()}>
        <div className="search-modal__bar">
          <i className="fa-solid fa-magnifying-glass search-modal__icon" />
          <input
            type="text"
            className="search-modal__input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.placeholder')}
            autoFocus
          />
          <button className="icon-button" aria-label={t('search.close')} onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="search-modal__list">
          {filtered.length === 0 && <div className="menu__empty">{t('search.noMatches')}</div>}
          {filtered.map((conversation) => (
            <button
              key={conversation.id}
              className="search-modal__item"
              onClick={() => onSelect(conversation.id)}
            >
              <i className="fa-solid fa-comment search-modal__item-icon" />
              <span className="search-modal__item-title">{conversation.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
