import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ChatMessage from './ChatMessage.jsx'
import MessageInput from './MessageInput.jsx'
import StagingModeToggle from './StagingModeToggle.jsx'
import { useT } from '../../hooks/useT.js'

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
  // Set right before an older-page fetch starts, holding the pre-prepend
  // scrollHeight/scrollTop so the useLayoutEffect below can restore the
  // user's visual position instead of the list jumping to the top.
  const prependAnchorRef = useRef(null)
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767.98px)').matches,
  )

  const isMessagesLoading = Boolean(conversation) && conversation.messages === undefined
  const messageCount = conversation?.messages?.length ?? 0

  // Suppresses handleMessageListScroll while WE move the scroll position
  // programmatically (initial prepend-restore, or the scrollTop this causes)
  // — otherwise that scroll event reads as "user scrolled near the top" and
  // fires another load-older request on its own.
  const isProgrammaticScrollRef = useRef(false)
  // Whether we've already done the very first scroll-to-bottom for the
  // conversation currently open. That first jump starts from scrollTop 0,
  // so it must be instant (no animation) — an animated scroll would pass
  // through low scrollTop values on the way down and spuriously trigger
  // load-older. Once settled, later appends (new messages) animate safely,
  // since they only move a short distance near the bottom.
  const hasScrolledToBottomRef = useRef(false)

  useEffect(() => {
    hasScrolledToBottomRef.current = false
  }, [conversation?.id])

  // Layout effects run before regular effects within the same commit, so
  // this restores scroll position first — but deliberately leaves
  // prependAnchorRef set. The bottom-scroll effect below checks it next and
  // is the one that clears it, since it also needs to know a prepend just
  // happened in order to skip its own scroll-to-bottom for this render.
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
    // No anchor yet (e.g. still on the isMessagesLoading branch, which
    // doesn't render one) — nothing to scroll, and don't mark "settled"
    // since the real first scroll hasn't happened yet.
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
