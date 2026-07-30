import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  LogOut,
  Settings,
  UserShield,
  CircleUserRound,
} from 'lucide-react'
import SettingsModal from '../modals/SettingsModal.jsx'
import ProfileModal from '../modals/ProfileModal.jsx'
import { useT } from '../../hooks/useT.js'
import { useAuth } from '../../hooks/useAuth.js'
import { canAccessConfigSection } from '../../config/permissions.js'

function isAdminPath(path) {
  return path.startsWith('/config') || path === '/freshpedia' || path === '/tool-catalog'
}

export default function UserMenu({
  collapsed = false,
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
  const { session, logout } = useAuth()
  const { pathname: path } = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const wrapRef = useRef(null)
  const onAdminPages = isAdminPath(path)
  const canSeeAdmin = canAccessConfigSection(session)

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className={'user-menu' + (collapsed ? ' user-menu--collapsed' : '')} ref={wrapRef}>
      {isOpen && (
        <div className={'menu menu--user' + (collapsed ? ' menu--user-collapsed' : '')}>
          <button
            className="menu__profile"
            aria-label={t('userMenu.viewProfile')}
            onClick={() => {
              setIsProfileOpen(true)
              setIsOpen(false)
            }}
          >
            <span className="user-avatar">
              <CircleUserRound />
            </span>
            <span className="menu__profile-name">{session?.name}</span>
          </button>
          <div className="menu__divider" />
          <button
            className="menu__item"
            onClick={() => {
              setIsSettingsOpen(true)
              setIsOpen(false)
            }}
          >
            <Settings className="menu__item-icon" />
            {t('userMenu.settings')}
          </button>
          {onAdminPages ? (
            <button
              className="menu__item"
              onClick={() => {
                navigate('/')
                setIsOpen(false)
              }}
            >
              <ArrowLeft className="menu__item-icon" />
              {t('config.backToChat')}
            </button>
          ) : (
            canSeeAdmin && (
              <button
                className="menu__item"
                onClick={() => {
                  navigate('/config')
                  setIsOpen(false)
                }}
              >
                <UserShield className="menu__item-icon" />
                {t('userMenu.admin')}
              </button>
            )
          )}
          <div className="menu__divider" />
          <button
            className="menu__item"
            onClick={() => {
              logout()
              setIsOpen(false)
            }}
          >
            <LogOut className="menu__item-icon" />
            {t('userMenu.logOut')}
          </button>
        </div>
      )}

      <button
        className={'user-menu__trigger' + (collapsed ? ' user-menu__trigger--collapsed' : '')}
        aria-label={t('userMenu.accountMenu')}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="user-avatar">
          <CircleUserRound />
        </span>
        {!collapsed && (
          <>
            <span className="user-menu__name">{session?.name}</span>
            <ChevronDown className="user-menu__chevron" />
          </>
        )}
      </button>

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
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

      {isProfileOpen && (
        <ProfileModal onClose={() => setIsProfileOpen(false)} session={session} />
      )}
    </div>
  )
}
