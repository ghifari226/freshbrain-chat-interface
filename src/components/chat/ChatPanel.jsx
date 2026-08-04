import { useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage.jsx'
import MessageInput from './MessageInput.jsx'
import StagingModeToggle from './StagingModeToggle.jsx'
import { useT } from '../../hooks/useT.js'

export default function ChatPanel({ conversation, isLoading, onSend, onStop, onRetry, onFeedback, inputRef }) {
  const t = useT()
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages.length, isLoading])

  const isNewChat = !conversation || conversation.messages.length === 0

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

  // Retry only ever applies to the very last message, and only once
  // generation isn't in flight — a dangling last message with no reply
  // means the previous attempt was canceled (App.jsx's runSend leaves no
  // error bubble on a Stop, see isCanceled there), not a normal error.
  const lastMessage = conversation.messages[conversation.messages.length - 1]
  const canRetry = !isLoading && lastMessage?.role === 'user'

  return (
    <main className="chat-panel">
      <StagingModeToggle />
      <div className="chat-header">{conversation.title}</div>

      <div className="message-list">
        <div className="message-list__inner">
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
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      <MessageInput ref={inputRef} onSend={onSend} onStop={onStop} disabled={isLoading} />
      <p className="chat-disclaimer">{t('chat.disclaimer')}</p>
    </main>
  )
}
