import { useEffect, useRef, useState } from 'react'
import ConversationItem from './ConversationItem.jsx'
import UserMenu from './UserMenu.jsx'
import SearchModal from './SearchModal.jsx'
import { useT } from '../hooks/useT.js'

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  theme,
  setTheme,
  tone,
  setTone,
  chatFont,
  setChatFont,
  language,
  setLanguage,
}) {
  const t = useT()
  const [openMenuId, setOpenMenuId] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isRecentsOpen, setIsRecentsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const recentsWrapRef = useRef(null)

  useEffect(() => {
    if (!isRecentsOpen) return
    function handleClickOutside(event) {
      if (recentsWrapRef.current && !recentsWrapRef.current.contains(event.target)) {
        setIsRecentsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isRecentsOpen])

  function selectRecent(conversationId) {
    onSelectConversation(conversationId)
    setIsRecentsOpen(false)
  }

  function selectFromSearch(conversationId) {
    onSelectConversation(conversationId)
    setIsSearchOpen(false)
  }

  return (
    <aside className={'sidebar' + (isCollapsed ? ' sidebar--collapsed' : '')}>
      {isCollapsed ? (
        <>
          <div className="sidebar-collapsed__top">
            <button
              className="icon-button"
              aria-label={t('sidebar.expandSidebar')}
              onClick={() => setIsCollapsed(false)}
            >
              <i className="fa-solid fa-table-columns" />
            </button>
          </div>

          <button className="icon-button" aria-label={t('sidebar.newChat')} onClick={onNewChat}>
            <i className="fa-solid fa-plus" />
          </button>

          <button
            className="icon-button"
            aria-label={t('sidebar.search')}
            onClick={() => setIsSearchOpen(true)}
          >
            <i className="fa-solid fa-magnifying-glass" />
          </button>

          <div className="sidebar-collapsed__recents" ref={recentsWrapRef}>
            <button
              className={'icon-button' + (isRecentsOpen ? ' icon-button--active' : '')}
              aria-label={t('sidebar.recentChats')}
              onClick={() => setIsRecentsOpen((open) => !open)}
            >
              <i className="fa-solid fa-comment" />
            </button>

            {isRecentsOpen && (
              <div className="menu menu--recents">
                {conversations.length === 0 && (
                  <div className="menu__empty">{t('sidebar.noConversations')}</div>
                )}
                {conversations.slice(0, 10).map((conversation) => (
                  <button
                    key={conversation.id}
                    className={
                      'menu__item menu__item--recent' +
                      (conversation.id === activeConversationId ? ' menu__item--active' : '')
                    }
                    onClick={() => selectRecent(conversation.id)}
                  >
                    <span className="menu__item-text">{conversation.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-collapsed__spacer" />

          <UserMenu
            collapsed
            theme={theme}
            setTheme={setTheme}
            tone={tone}
            setTone={setTone}
            chatFont={chatFont}
            setChatFont={setChatFont}
            language={language}
            setLanguage={setLanguage}
          />
        </>
      ) : (
        <>
          <div className="sidebar-header">
            <div className="sidebar-header__brand">
              <img
                src="/logo.png"
                alt="FreshBrain"
                className="sidebar-header__logo sidebar-header__logo--light"
              />
              <img
                src="/logo-bright.png"
                alt="FreshBrain"
                className="sidebar-header__logo sidebar-header__logo--dark"
              />
              <span className="sidebar-header__title">FreshBrain</span>
            </div>
            <div className="sidebar-header__actions">
              <button
                className="icon-button"
                aria-label={t('sidebar.search')}
                onClick={() => setIsSearchOpen(true)}
              >
                <i className="fa-solid fa-magnifying-glass" />
              </button>
              <button
                className="icon-button"
                aria-label={t('sidebar.closeSidebar')}
                onClick={() => setIsCollapsed(true)}
              >
                <i className="fa-solid fa-table-columns" />
              </button>
            </div>
          </div>

          <button className="conversation-item conversation-item--new" onClick={onNewChat}>
            <i className="fa-solid fa-plus conversation-item__icon" />
            <span className="conversation-item__title">{t('sidebar.newChat')}</span>
          </button>

          <div className="sidebar-section">
            <div className="sidebar-section__label">{t('sidebar.recents')}</div>
            <ul className="conversation-list">
              {conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === activeConversationId}
                  isMenuOpen={openMenuId === conversation.id}
                  onSelect={() => onSelectConversation(conversation.id)}
                  onOpenMenu={() => setOpenMenuId(conversation.id)}
                  onCloseMenu={() => setOpenMenuId(null)}
                  onRename={(title) => onRenameConversation(conversation.id, title)}
                  onDelete={() => onDeleteConversation(conversation.id)}
                />
              ))}
            </ul>
          </div>

          <UserMenu
            theme={theme}
            setTheme={setTheme}
            tone={tone}
            setTone={setTone}
            chatFont={chatFont}
            setChatFont={setChatFont}
            language={language}
            setLanguage={setLanguage}
          />
        </>
      )}

      {isSearchOpen && (
        <SearchModal
          conversations={conversations}
          onSelect={selectFromSearch}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </aside>
  )
}
