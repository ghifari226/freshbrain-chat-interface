import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useT } from '../../hooks/useT.js'

export default function ConversationItem({
  conversation,
  isActive,
  isMenuOpen,
  onSelect,
  onOpenMenu,
  onCloseMenu,
  onRename,
  onDelete,
}) {
  const t = useT()
  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(conversation.title)
  const menuWrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!isMenuOpen) return
    function handleClickOutside(event) {
      if (menuWrapRef.current && !menuWrapRef.current.contains(event.target)) {
        onCloseMenu()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMenuOpen, onCloseMenu])

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  function startRename() {
    setDraftTitle(conversation.title)
    setIsEditing(true)
    onCloseMenu()
  }

  function commitRename() {
    const trimmed = draftTitle.trim()
    if (trimmed && trimmed !== conversation.title) {
      onRename(trimmed)
    }
    setIsEditing(false)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitRename()
    } else if (event.key === 'Escape') {
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <li className="conversation-item">
        <input
          ref={inputRef}
          className="conversation-item__input"
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
        />
      </li>
    )
  }

  return (
    <li className={'conversation-item' + (isActive ? ' conversation-item--active' : '')}>
      <button className="conversation-item__button" onClick={onSelect}>
        <span className="conversation-item__title">{conversation.title}</span>
      </button>

      <div className="conversation-item__menu-wrap" ref={menuWrapRef}>
        <button
          className={
            'conversation-item__menu-trigger' +
            (isMenuOpen ? ' conversation-item__menu-trigger--open' : '')
          }
          aria-label={t('conversationMenu.options')}
          onClick={(event) => {
            event.stopPropagation()
            if (isMenuOpen) {
              onCloseMenu()
            } else {
              onOpenMenu()
            }
          }}
        >
          <MoreVertical />
        </button>

        {isMenuOpen && (
          <div className="menu menu--conversation">
            <button className="menu__item" onClick={startRename}>
              <Pencil className="menu__item-icon" fill="currentColor" />
              {t('conversationMenu.rename')}
            </button>
            <div className="menu__divider" />
            <button className="menu__item menu__item--danger" onClick={onDelete}>
              <Trash2 className="menu__item-icon" />
              {t('conversationMenu.delete')}
            </button>
          </div>
        )}
      </div>
    </li>
  )
}
