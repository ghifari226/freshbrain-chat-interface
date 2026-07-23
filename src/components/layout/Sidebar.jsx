import { useEffect, useRef, useState } from 'react'
import ConversationItem from '../chat/ConversationItem.jsx'
import UserMenu from './UserMenu.jsx'
import SearchModal from '../modals/SearchModal.jsx'
import SettingsModal from '../modals/SettingsModal.jsx'
import { useT } from '../../hooks/useT.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useRoute } from '../../hooks/useRoute.js'
import { canAccessFreshpedia, canAccessToolCatalog, canAccessConfigSection, canViewRoles, canViewUsers } from '../../config/permissions.js'

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
  const [path, navigate] = useRoute()
  const isChat = variant === 'chat'
  const [openMenuId, setOpenMenuId] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isRecentsOpen, setIsRecentsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isConfigFlyoutOpen, setIsConfigFlyoutOpen] = useState(false)
  const [isSettingsFromNav, setIsSettingsFromNav] = useState(false)
  // Expanded nav variant's Access Configuration group — starts open when
  // landing directly on a /config/* deep link, and re-opens any time
  // navigation (from here or elsewhere, e.g. UserMenu) lands on /config so
  // the group is never collapsed while one of its own children is active.
  const [isConfigNavOpen, setIsConfigNavOpen] = useState(() => path.startsWith('/config'))
  const recentsWrapRef = useRef(null)
  const configFlyoutRef = useRef(null)

  const canSeeFreshpedia = canAccessFreshpedia(session)
  const canSeeToolCatalog = canAccessToolCatalog(session)
  const canSeeConfig = canAccessConfigSection(session)
  const canSeeScopes = Boolean(session?.config_scopes_view)
  const canSeeRoles = canViewRoles(session)
  const canSeeUsers = canViewUsers(session)

  useEffect(() => {
    if (path.startsWith('/config')) setIsConfigNavOpen(true)
  }, [path])

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

  useEffect(() => {
    if (!isConfigFlyoutOpen) return
    function handleClickOutside(event) {
      if (configFlyoutRef.current && !configFlyoutRef.current.contains(event.target)) {
        setIsConfigFlyoutOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isConfigFlyoutOpen])

  function selectRecent(conversationId) {
    onSelectConversation(conversationId)
    setIsRecentsOpen(false)
  }

  function selectFromSearch(conversationId) {
    onSelectConversation(conversationId)
    setIsSearchOpen(false)
  }

  function navigateFromFlyout(nextPath) {
    navigate(nextPath)
    setIsConfigFlyoutOpen(false)
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

          {isChat ? (
            <>
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
            </>
          ) : (
            <>
              <button
                className="icon-button"
                aria-label={t('config.backToChat')}
                onClick={() => navigate('/')}
              >
                <i className="fa-solid fa-arrow-left" />
              </button>

              {canSeeFreshpedia && (
                <button
                  className={'icon-button' + (path === '/freshpedia' ? ' icon-button--active' : '')}
                  aria-label={t('userMenu.freshpedia')}
                  onClick={() => navigate('/freshpedia')}
                >
                  <i className="fa-solid fa-book-open" />
                </button>
              )}

              {canSeeToolCatalog && (
                <button
                  className={'icon-button' + (path === '/tool-catalog' ? ' icon-button--active' : '')}
                  aria-label={t('userMenu.toolCatalog')}
                  onClick={() => navigate('/tool-catalog')}
                >
                  <i className="fa-solid fa-toolbox" />
                </button>
              )}

              {canSeeConfig && (
                <div className="sidebar-collapsed__recents" ref={configFlyoutRef}>
                  <button
                    className={
                      'icon-button' +
                      (path.startsWith('/config') || isConfigFlyoutOpen ? ' icon-button--active' : '')
                    }
                    aria-label={t('userMenu.accessConfig')}
                    onClick={() => setIsConfigFlyoutOpen((open) => !open)}
                  >
                    <i className="fa-solid fa-shield-halved" />
                  </button>

                  {isConfigFlyoutOpen && (
                    <div className="menu menu--recents">
                      {canSeeScopes && (
                        <button
                          className="menu__item"
                          onClick={() => navigateFromFlyout('/config/scopes')}
                        >
                          <span className="menu__item-text">{t('config.navScopeCatalog')}</span>
                        </button>
                      )}
                      {canSeeRoles && (
                        <button
                          className="menu__item"
                          onClick={() => navigateFromFlyout('/config/role-catalog')}
                        >
                          <span className="menu__item-text">{t('config.navRoleCatalog')}</span>
                        </button>
                      )}
                      {canSeeRoles && (
                        <button
                          className="menu__item"
                          onClick={() => navigateFromFlyout('/config/role-scopes')}
                        >
                          <span className="menu__item-text">{t('config.navRoleScopes')}</span>
                        </button>
                      )}
                      {canSeeRoles && (
                        <button
                          className="menu__item"
                          onClick={() => navigateFromFlyout('/config/permission-catalog')}
                        >
                          <span className="menu__item-text">{t('config.navPermissionCatalog')}</span>
                        </button>
                      )}
                      {canSeeUsers && (
                        <button
                          className="menu__item"
                          onClick={() => navigateFromFlyout('/config/users')}
                        >
                          <span className="menu__item-text">{t('config.navUsers')}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                className="icon-button"
                aria-label={t('userMenu.settings')}
                onClick={() => setIsSettingsFromNav(true)}
              >
                <i className="fa-solid fa-gear" />
              </button>
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
            </button>
            <div className="sidebar-header__actions">
              {isChat && (
                <button
                  className="icon-button"
                  aria-label={t('sidebar.search')}
                  onClick={() => setIsSearchOpen(true)}
                >
                  <i className="fa-solid fa-magnifying-glass" />
                </button>
              )}
              <button
                className="icon-button"
                aria-label={t('sidebar.closeSidebar')}
                onClick={() => setIsCollapsed(true)}
              >
                <i className="fa-solid fa-table-columns" />
              </button>
            </div>
          </div>

          {isChat ? (
            <>
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
            </>
          ) : (
            <>
              <button className="conversation-item conversation-item--new" onClick={() => navigate('/')}>
                <i className="fa-solid fa-arrow-left conversation-item__icon" />
                <span className="conversation-item__title">{t('config.backToChat')}</span>
              </button>

              <div className="sidebar-section">
                <nav className="sidebar-nav">
                  {canSeeFreshpedia && (
                    <button
                      className={
                        'sidebar-nav__item' + (path === '/freshpedia' ? ' sidebar-nav__item--active' : '')
                      }
                      onClick={() => navigate('/freshpedia')}
                    >
                      <i className="fa-solid fa-book-open sidebar-nav__item-icon" />
                      <span className="sidebar-nav__item-label">{t('userMenu.freshpedia')}</span>
                    </button>
                  )}

                  {canSeeToolCatalog && (
                    <button
                      className={
                        'sidebar-nav__item' + (path === '/tool-catalog' ? ' sidebar-nav__item--active' : '')
                      }
                      onClick={() => navigate('/tool-catalog')}
                    >
                      <i className="fa-solid fa-toolbox sidebar-nav__item-icon" />
                      <span className="sidebar-nav__item-label">{t('userMenu.toolCatalog')}</span>
                    </button>
                  )}

                  {canSeeConfig && (
                    <div className="sidebar-nav__group">
                      <button
                        className={
                          'sidebar-nav__item' +
                          (path.startsWith('/config') ? ' sidebar-nav__item--active' : '')
                        }
                        onClick={() => setIsConfigNavOpen((open) => !open)}
                      >
                        <i className="fa-solid fa-shield-halved sidebar-nav__item-icon" />
                        <span className="sidebar-nav__item-label">{t('userMenu.accessConfig')}</span>
                        <i
                          className={
                            'fa-solid sidebar-nav__item-chevron ' +
                            (isConfigNavOpen ? 'fa-chevron-up' : 'fa-chevron-down')
                          }
                        />
                      </button>

                      {isConfigNavOpen && (
                        <div className="sidebar-nav__children">
                          {canSeeScopes && (
                            <button
                              className={
                                'sidebar-nav__child-item' +
                                (path === '/config/scopes' ? ' sidebar-nav__child-item--active' : '')
                              }
                              onClick={() => navigate('/config/scopes')}
                            >
                              {t('config.navScopeCatalog')}
                            </button>
                          )}
                          {canSeeRoles && (
                            <button
                              className={
                                'sidebar-nav__child-item' +
                                (path === '/config/role-catalog' ? ' sidebar-nav__child-item--active' : '')
                              }
                              onClick={() => navigate('/config/role-catalog')}
                            >
                              {t('config.navRoleCatalog')}
                            </button>
                          )}
                          {canSeeRoles && (
                            <button
                              className={
                                'sidebar-nav__child-item' +
                                (path === '/config/role-scopes' ? ' sidebar-nav__child-item--active' : '')
                              }
                              onClick={() => navigate('/config/role-scopes')}
                            >
                              {t('config.navRoleScopes')}
                            </button>
                          )}
                          {canSeeRoles && (
                            <button
                              className={
                                'sidebar-nav__child-item' +
                                (path === '/config/permission-catalog'
                                  ? ' sidebar-nav__child-item--active'
                                  : '')
                              }
                              onClick={() => navigate('/config/permission-catalog')}
                            >
                              {t('config.navPermissionCatalog')}
                            </button>
                          )}
                          {canSeeUsers && (
                            <button
                              className={
                                'sidebar-nav__child-item' +
                                (path === '/config/users' ? ' sidebar-nav__child-item--active' : '')
                              }
                              onClick={() => navigate('/config/users')}
                            >
                              {t('config.navUsers')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button className="sidebar-nav__item" onClick={() => setIsSettingsFromNav(true)}>
                    <i className="fa-solid fa-gear sidebar-nav__item-icon" />
                    <span className="sidebar-nav__item-label">{t('userMenu.settings')}</span>
                  </button>
                </nav>
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

      {isSettingsFromNav && (
        <SettingsModal
          onClose={() => setIsSettingsFromNav(false)}
          theme={theme}
          setTheme={setTheme}
          tone={tone}
          setTone={setTone}
          chatFont={chatFont}
          setChatFont={setChatFont}
          language={language}
          setLanguage={setLanguage}
        />
      )}
    </aside>
  )
}
