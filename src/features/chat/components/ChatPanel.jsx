import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ChatMessage from './ChatMessage.jsx'
import MessageInput from './MessageInput.jsx'
import StagingModeToggle from './StagingModeToggle.jsx'
import { useT } from '@shared/i18n/useT.js'

const LOAD_OLDER_SCROLL_THRESHOLD = 150

export default function ChatPanel({
  conversation,
  isLoading,
  streamingStatus,
  onSend,
  onStop,
  onRetry,
  onFeedback,
  onLoadOlderMessages,
  hasMoreOlder,
  isLoadingOlder,
  inputRef,
}) {
  const t = useT()
  const scrollRef = useRef(null)
  const messageListRef = useRef(null)
  // Simpan jangkar scroll agar pemuatan pesan lama tidak menggeser posisi baca pengguna.
  const prependAnchorRef = useRef(null)
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767.98px)').matches,
  )

  const isMessagesLoading = Boolean(conversation) && conversation.messages === undefined
  const messageCount = conversation?.messages?.length ?? 0

  const isProgrammaticScrollRef = useRef(false)
  const hasScrolledToBottomRef = useRef(false)

  useEffect(() => {
    hasScrolledToBottomRef.current = false
  }, [conversation?.id])

  useLayoutEffect(() => {
    const anchor = prependAnchorRef.current
    const list = messageListRef.current
    if (!anchor || !list) return
    isProgrammaticScrollRef.current = true
    list.scrollTop = list.scrollHeight - anchor.scrollHeight + anchor.scrollTop
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false
    })
  }, [messageCount])

  useEffect(() => {
    if (prependAnchorRef.current) {
      prependAnchorRef.current = null
      return
    }
    if (!scrollRef.current) return
    scrollRef.current.scrollIntoView({ behavior: hasScrolledToBottomRef.current ? 'smooth' : 'auto' })
    hasScrolledToBottomRef.current = true
  }, [messageCount, isLoading])

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 767.98px)')
    const handleViewportChange = (event) => setIsMobileViewport(event.matches)
    mobileViewport.addEventListener('change', handleViewportChange)
    return () => mobileViewport.removeEventListener('change', handleViewportChange)
  }, [])

  function handleMessageListScroll() {
    if (isProgrammaticScrollRef.current) return
    if (!hasMoreOlder || isLoadingOlder) return
    const list = messageListRef.current
    if (!list || list.scrollTop >= LOAD_OLDER_SCROLL_THRESHOLD) return
    prependAnchorRef.current = { scrollHeight: list.scrollHeight, scrollTop: list.scrollTop }
    onLoadOlderMessages?.()
  }

  const isNewChat = !conversation || (!isMessagesLoading && conversation.messages.length === 0)

  if (isNewChat) {
    return (
      <main className="chat-panel chat-panel--welcome">
        <StagingModeToggle />
        <div className="welcome">
          <div className="welcome__greeting">
            <img src="/assets/logos/freshbrain-icon.svg" alt="" className="welcome__logo welcome__logo--light" />
            <img src="/assets/logos/freshbrain-icon-inverse.svg" alt="" className="welcome__logo welcome__logo--dark" />
            <p className="welcome__caption">{t('chat.greeting')}</p>
          </div>
          <MessageInput
            key={conversation?.id ?? 'no-conversation'}
            ref={inputRef}
            onSend={onSend}
            onStop={onStop}
            disabled={isLoading}
            autoFocus
          />
        </div>
      </main>
    )
  }
  if (isMessagesLoading) {
    return (
      <main className="chat-panel">
        <StagingModeToggle />
        <div className="chat-header">{conversation.title}</div>
        <div className="message-list">
          <div className="message-list__inner">
            <div className="message-list__status">{t('chat.loadingMessages')}</div>
          </div>
        </div>
        <MessageInput ref={inputRef} onSend={onSend} onStop={onStop} disabled />
      </main>
    )
  }

  const lastMessage = conversation.messages[conversation.messages.length - 1]
  const canRetry = !isLoading && lastMessage?.role === 'user'

  return (
    <main className="chat-panel">
      <StagingModeToggle />
      <div className="chat-header">{conversation.title}</div>

      <div className="message-list" ref={messageListRef} onScroll={handleMessageListScroll}>
        <div className="message-list__inner">
          {isLoadingOlder && (
            <div className="message-list__status">{t('chat.loadingOlderMessages')}</div>
          )}

          {conversation.messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              text={message.text}
              feedback={message.feedback}
              isError={message.isError}
              onFeedbackChange={(feedback) => onFeedback(message.id, feedback)}
              showRetry={canRetry && index === conversation.messages.length - 1}
              onRetry={onRetry}
            />
          ))}

          {isLoading && (
            <div className="message message--assistant">
              <div className="message__bubble message__bubble--loading">
                {streamingStatus && (
                  <span className="message__status">{t(`chat.status.${streamingStatus}`)}</span>
                )}
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          {isMobileViewport && !isLoading && (
            <p className="chat-disclaimer">{t('chat.disclaimer')}</p>
          )}

          <div ref={scrollRef} className="scroll-anchor" />
        </div>
      </div>

      <MessageInput ref={inputRef} onSend={onSend} onStop={onStop} disabled={isLoading} />
      {!isMobileViewport && <p className="chat-disclaimer">{t('chat.disclaimer')}</p>}
    </main>
  )
}
