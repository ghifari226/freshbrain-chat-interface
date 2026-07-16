import { useEffect, useRef, useState } from 'react'
import SettingsModal from './SettingsModal.jsx'
import { useT } from '../hooks/useT.js'
import { useAuth } from '../hooks/useAuth.js'
import { useRoute } from '../hooks/useRoute.js'
import { ROLE_LABEL_KEYS } from '../lib/roles.js'

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
  const [, navigate] = useRoute()
  const roleLabel = ROLE_LABEL_KEYS[session?.role] ? t(ROLE_LABEL_KEYS[session.role]) : session?.role
  const [isOpen, setIsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const wrapRef = useRef(null)

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
          <div className="menu__profile">
            <span className="user-avatar">
              <i className="fa-solid fa-user" />
            </span>
            <span className="menu__profile-name">{roleLabel}</span>
          </div>
          <div className="menu__divider" />
          <button
            className="menu__item"
            onClick={() => {
              setIsSettingsOpen(true)
              setIsOpen(false)
            }}
          >
            <i className="fa-solid fa-gear menu__item-icon" />
            {t('userMenu.settings')}
          </button>
          {session?.role === 'Technology' && (
            <button
              className="menu__item"
              onClick={() => {
                navigate('/config')
                setIsOpen(false)
              }}
            >
              <i className="fa-solid fa-shield-halved menu__item-icon" />
              {t('userMenu.accessConfig')}
            </button>
          )}
          <div className="menu__divider" />
          <button
            className="menu__item"
            onClick={() => {
              logout()
              setIsOpen(false)
            }}
          >
            <i className="fa-solid fa-right-from-bracket menu__item-icon" />
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
          <i className="fa-solid fa-user" />
        </span>
        {!collapsed && (
          <>
            <span className="user-menu__name">{roleLabel}</span>
            <i className="fa-solid fa-chevron-down user-menu__chevron" />
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
    </div>
  )
}
