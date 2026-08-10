import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SquarePen,
} from 'lucide-react'
import ConversationItem from '../chat/ConversationItem.jsx'
import UserMenu from './UserMenu.jsx'
import SearchModal from '../modals/SearchModal.jsx'
import { useT } from '../../hooks/useT.js'
import { useAuth } from '../../hooks/useAuth.js'
import { ADMIN_NAV_ITEMS, ADMIN_NAV_SECTIONS } from '../../config/adminNav.js'

export default function Sidebar({
  variant = 'chat',
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
  const { session } = useAuth()
  const { pathname: path } = useLocation()
  const navigate = useNavigate()
  const isChat = variant === 'chat'
  const [openMenuId, setOpenMenuId] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767.98px)').matches,
  )
  const [isRecentsOpen, setIsRecentsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const recentsWrapRef = useRef(null)

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 767.98px)')
    const collapseForMobile = (event) => {
      if (event.matches) setIsCollapsed(true)
    }

    mobileViewport.addEventListener('change', collapseForMobile)
    return () => mobileViewport.removeEventListener('change', collapseForMobile)
  }, [])

  const visibleAdminItems = ADMIN_NAV_ITEMS.filter((item) => item.canSee(session))
  // Expanded sidebar groups admin items under labeled sections; a section
  // with zero visible items doesn't render at all (mirrors PermissionsPage's
  // groupedRows pattern). Collapsed sidebar stays flat — see visibleAdminItems.
  const groupedAdminItems = useMemo(
    () =>
      ADMIN_NAV_SECTIONS.map((section) => ({
        ...section,
        items: visibleAdminItems.filter((item) => item.section === section.id),
      })).filter((section) => section.items.length > 0),
    [visibleAdminItems],
  )

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
              className="icon-button sidebar-collapsed__toggle"
              aria-label={t('sidebar.expandSidebar')}
              data-tooltip={t('sidebar.expandSidebar')}
              onClick={() => setIsCollapsed(false)}
            >
              <img
                src="/assets/logos/freshbrain-icon.svg"
                alt=""
                className="sidebar-collapsed__toggle-logo sidebar-collapsed__toggle-logo--light"
              />
              <img
                src="/assets/logos/freshbrain-icon-inverse.svg"
                alt=""
                className="sidebar-collapsed__toggle-logo sidebar-collapsed__toggle-logo--dark"
              />
              <PanelLeftOpen className="sidebar-collapsed__toggle-icon" />
            </button>
          </div>

          {isChat ? (
            <>
              <button
                className="icon-button"
                aria-label={t('sidebar.newChat')}
                data-tooltip={t('sidebar.newChat')}
                onClick={onNewChat}
              >
                <SquarePen />
              </button>

              <button
                className="icon-button"
                aria-label={t('sidebar.search')}
                data-tooltip={t('sidebar.search')}
                onClick={() => setIsSearchOpen(true)}
              >
                <Search />
              </button>

              <div className="sidebar-collapsed__recents" ref={recentsWrapRef}>
                <button
                  className={'icon-button' + (isRecentsOpen ? ' icon-button--active' : '')}
                  aria-label={t('sidebar.recentChats')}
                  data-tooltip={isRecentsOpen ? undefined : t('sidebar.recentChats')}
                  onClick={() => setIsRecentsOpen((open) => !open)}
                >
                  <MessageSquare />
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
            </>
          ) : (
            <>
              <button
                className="icon-button"
                aria-label={t('config.backToChat')}
                data-tooltip={t('config.backToChat')}
                onClick={() => navigate('/')}
              >
                <ArrowLeft />
              </button>

              {visibleAdminItems.map((item) => (
                <button
                  key={item.path}
                  className={'icon-button' + (path === item.path ? ' icon-button--active' : '')}
                  aria-label={t(item.labelKey)}
                  data-tooltip={t(item.labelKey)}
                  onClick={() => navigate(item.path)}
                >
                  <item.Icon />
                </button>
              ))}
            </>
          )}

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
            <button
              className="sidebar-header__brand"
              aria-label={t('sidebar.newChat')}
              onClick={() => {
                onNewChat()
                navigate('/')
              }}
            >
              <img
                src="/assets/logos/freshbrain-horizontal.svg"
                alt="FreshBrain"
                className="sidebar-header__logo sidebar-header__logo--light"
              />
              <img
                src="/assets/logos/freshbrain-horizontal-inverse.svg"
                alt="FreshBrain"
                className="sidebar-header__logo sidebar-header__logo--dark"
              />
            </button>
            <div className="sidebar-header__actions">
              {isChat && (
                <button
                  className="icon-button"
                  aria-label={t('sidebar.search')}
                  data-tooltip={t('sidebar.search')}
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search />
                </button>
              )}
              <button
                className="icon-button"
                aria-label={t('sidebar.closeSidebar')}
                data-tooltip={t('sidebar.closeSidebar')}
                onClick={() => setIsCollapsed(true)}
              >
                <PanelLeftClose />
              </button>
            </div>
          </div>

          {isChat ? (
            <>
              <button className="conversation-item conversation-item--new" onClick={onNewChat}>
                <SquarePen className="conversation-item__icon" />
                <span className="conversation-item__title">{t('sidebar.newChat')}</span>
              </button>

              <div className="sidebar-section">
                {conversations.length > 0 && (
                  <>
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
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <button className="conversation-item conversation-item--new" onClick={() => navigate('/')}>
                <ArrowLeft className="conversation-item__icon" />
                <span className="conversation-item__title">{t('config.backToChat')}</span>
              </button>

              <div className="sidebar-section">
                {groupedAdminItems.map((section) => (
                  <div key={section.id} className="sidebar-nav-group">
                    <div className="sidebar-section__label">{t(section.labelKey)}</div>
                    <nav className="sidebar-nav">
                      {section.items.map((item) => (
                        <button
                          key={item.path}
                          className={
                            'sidebar-nav__item' + (path === item.path ? ' sidebar-nav__item--active' : '')
                          }
                          onClick={() => navigate(item.path)}
                        >
                          <item.Icon className="sidebar-nav__item-icon" />
                          <span className="sidebar-nav__item-label">{t(item.labelKey)}</span>
                        </button>
                      ))}
                    </nav>
                  </div>
                ))}
              </div>
            </>
          )}

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
