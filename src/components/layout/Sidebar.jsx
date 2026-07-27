import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import ConversationItem from '../chat/ConversationItem.jsx'
import UserMenu from './UserMenu.jsx'
import SearchModal from '../modals/SearchModal.jsx'
import SettingsModal from '../modals/SettingsModal.jsx'
import { useT } from '../../hooks/useT.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useRoute } from '../../hooks/useRoute.js'
import { canAccessFreshpedia, canAccessToolCatalog, canAccessConfigSection, canViewRoles, canViewPermissions, canViewUsers } from '../../config/permissions.js'

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
  const [isCollapsed, setIsCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767.98px)').matches,
  )
  const [isRecentsOpen, setIsRecentsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSettingsFromNav, setIsSettingsFromNav] = useState(false)
  // Expanded nav variant's inline children list: independent open/closed
  // state (seeded from whether you're currently under /config, so landing
  // directly on e.g. /config/users via URL still shows it expanded), not
  // purely route-derived — see handleConfigNavClick below for why. The
  // collapsed rail's flyout is a floating overlay instead, so it gets a
  // different model entirely (pure CSS :hover/:focus-within, no JS state —
  // see sidebar.css): hover previews the children and closes the instant the
  // mouse leaves, while a click on the icon itself always just navigates to
  // /config, full stop.
  const [isConfigNavOpen, setIsConfigNavOpen] = useState(() => path.startsWith('/config'))
  // CSS :hover alone has no memory of a click — it'd stay open as long as
  // the mouse hasn't physically moved away, which reads as lingering after
  // a selection. This force-hides it the instant any item (or the icon
  // itself) is clicked, regardless of continued hover, and clears again on
  // a later mouseleave so the next hover-in opens it fresh.
  const [isConfigFlyoutSuppressed, setIsConfigFlyoutSuppressed] = useState(false)
  // Hiding the flyout out from under a stationary cursor (via the
  // suppression above) exposes whatever page content was underneath it,
  // which the browser correctly treats as "the mouse left the sidebar" —
  // a real mouseleave, not a glitch. But that means the mouse has
  // effectively moved onto the page, not back onto the sidebar, so no
  // further mouseleave will ever come along to clear the suppression flag
  // — it'd stay stuck until the user happened to hover the sidebar and
  // back off again. A fixed timeout clears it deterministically instead,
  // independent of whatever mouse events do or don't fire in between.
  const configFlyoutTimeoutRef = useRef(null)
  const recentsWrapRef = useRef(null)

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 767.98px)')
    const collapseForMobile = (event) => {
      if (event.matches) setIsCollapsed(true)
    }

    mobileViewport.addEventListener('change', collapseForMobile)
    return () => mobileViewport.removeEventListener('change', collapseForMobile)
  }, [])

  const canSeeFreshpedia = canAccessFreshpedia(session)
  const canSeeToolCatalog = canAccessToolCatalog(session)
  const canSeeConfig = canAccessConfigSection(session)
  const canSeeRoles = canViewRoles(session)
  const canSeePermissions = canViewPermissions(session)
  const canSeeUsers = canViewUsers(session)

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

  // Expanded nav's Access Config item is both a link and an accordion
  // toggle: collapsed -> click opens the /config overview and expands the
  // children; expanded -> click only collapses, it never re-navigates. That
  // second half matters because navigate('/config') while already sitting
  // on e.g. /config/users would otherwise bounce you back to the overview
  // page just for collapsing the list — this way collapsing never moves you.
  function handleConfigNavClick() {
    if (isConfigNavOpen) {
      setIsConfigNavOpen(false)
      return
    }
    setIsConfigNavOpen(true)
    navigate('/config')
  }

  function selectFromConfigFlyout(nextPath, event) {
    // Clicking a button gives it native focus, which persists even after it
    // becomes display:none — leaving :focus-within (added for keyboard
    // access) matching and reopening the menu right behind the suppression
    // below. Blur it explicitly so focus-within actually clears too.
    event.currentTarget.blur()
    navigate(nextPath)
    setIsConfigFlyoutSuppressed(true)
    clearTimeout(configFlyoutTimeoutRef.current)
    configFlyoutTimeoutRef.current = setTimeout(() => setIsConfigFlyoutSuppressed(false), 300)
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
                <Plus />
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

              {canSeeFreshpedia && (
                <button
                  className={'icon-button' + (path === '/freshpedia' ? ' icon-button--active' : '')}
                  aria-label={t('userMenu.freshpedia')}
                  data-tooltip={t('userMenu.freshpedia')}
                  onClick={() => navigate('/freshpedia')}
                >
                  <BookOpen />
                </button>
              )}

              {canSeeToolCatalog && (
                <button
                  className={'icon-button' + (path === '/tool-catalog' ? ' icon-button--active' : '')}
                  aria-label={t('userMenu.toolCatalog')}
                  data-tooltip={t('userMenu.toolCatalog')}
                  onClick={() => navigate('/tool-catalog')}
                >
                  <Wrench />
                </button>
              )}

              {canSeeConfig && (
                <div
                  className={
                    'sidebar-collapsed__recents sidebar-collapsed__config-flyout' +
                    (isConfigFlyoutSuppressed ? ' sidebar-collapsed__config-flyout--suppressed' : '')
                  }
                  onMouseLeave={() => {
                    clearTimeout(configFlyoutTimeoutRef.current)
                    setIsConfigFlyoutSuppressed(false)
                  }}
                >
                  <button
                    className={'icon-button' + (path.startsWith('/config') ? ' icon-button--active' : '')}
                    aria-label={t('userMenu.accessConfig')}
                    onClick={(event) => selectFromConfigFlyout('/config', event)}
                  >
                    <ShieldCheck />
                  </button>

                  <div className="menu menu--recents">
                    {canSeePermissions && (
                      <button
                        className="menu__item"
                        onClick={(event) => selectFromConfigFlyout('/config/permissions', event)}
                      >
                        <span className="menu__item-text">{t('config.navPermissions')}</span>
                      </button>
                    )}
                    {canSeeRoles && (
                      <button
                        className="menu__item"
                        onClick={(event) => selectFromConfigFlyout('/config/roles', event)}
                      >
                        <span className="menu__item-text">{t('config.navRoles')}</span>
                      </button>
                    )}
                    {canSeeUsers && (
                      <button
                        className="menu__item"
                        onClick={(event) => selectFromConfigFlyout('/config/users', event)}
                      >
                        <span className="menu__item-text">{t('config.navUsers')}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                className="icon-button"
                aria-label={t('userMenu.settings')}
                data-tooltip={t('userMenu.settings')}
                onClick={() => setIsSettingsFromNav(true)}
              >
                <Settings />
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
                <Plus className="conversation-item__icon" />
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
                <ArrowLeft className="conversation-item__icon" />
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
                      <BookOpen className="sidebar-nav__item-icon" />
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
                      <Wrench className="sidebar-nav__item-icon" />
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
                        onClick={handleConfigNavClick}
                      >
                        <ShieldCheck className="sidebar-nav__item-icon" />
                        <span className="sidebar-nav__item-label">{t('userMenu.accessConfig')}</span>
                        {isConfigNavOpen ? (
                          <ChevronUp className="sidebar-nav__item-chevron" />
                        ) : (
                          <ChevronDown className="sidebar-nav__item-chevron" />
                        )}
                      </button>

                      {isConfigNavOpen && (
                        <div className="sidebar-nav__children">
                          {canSeePermissions && (
                            <button
                              className={
                                'sidebar-nav__child-item' +
                                (path === '/config/permissions' ? ' sidebar-nav__child-item--active' : '')
                              }
                              onClick={() => navigate('/config/permissions')}
                            >
                              {t('config.navPermissions')}
                            </button>
                          )}
                          {canSeeRoles && (
                            <button
                              className={
                                'sidebar-nav__child-item' +
                                (path === '/config/roles' ? ' sidebar-nav__child-item--active' : '')
                              }
                              onClick={() => navigate('/config/roles')}
                            >
                              {t('config.navRoles')}
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

                  <button
                    className="sidebar-nav__item sidebar-nav__item--settings"
                    onClick={() => setIsSettingsFromNav(true)}
                  >
                    <Settings className="sidebar-nav__item-icon" />
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
