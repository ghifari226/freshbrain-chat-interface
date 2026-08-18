import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronDown,
  LogOut,
  Settings,
  UserShield,
} from 'lucide-react'
import { useT } from '@shared/i18n/useT.js'
import { useAuth } from '@features/authentication'
import { canAccessConfigSection } from '@features/access-control'

function isAdminPath(path) {
  return path.startsWith('/admin')
}

export default function UserMenu({
  collapsed = false,
  onNavigate,
  onOpenSettings,
  onOpenProfile,
}) {
  const t = useT()
  const { session, logout } = useAuth()
  const { pathname: path } = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
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
              onOpenProfile()
              setIsOpen(false)
              onNavigate?.()
            }}
          >
            <img src="/assets/user.svg" alt="" className="user-avatar" />
            <span className="menu__profile-name">{session?.name}</span>
          </button>
          <div className="menu__divider" />
          <button
            className="menu__item"
            onClick={() => {
              onOpenSettings()
              setIsOpen(false)
              onNavigate?.()
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
                onNavigate?.()
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
                  navigate('/admin')
                  setIsOpen(false)
                  onNavigate?.()
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
              onNavigate?.()
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
        <img src="/assets/user.svg" alt="" className="user-avatar" />
        {!collapsed && (
          <>
            <span className="user-menu__name">{session?.name}</span>
            <ChevronDown className="user-menu__chevron" />
          </>
        )}
      </button>
    </div>
  )
}
