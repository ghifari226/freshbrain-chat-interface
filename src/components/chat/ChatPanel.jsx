import { useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage.jsx'
import MessageInput from './MessageInput.jsx'
import StagingModeToggle from './StagingModeToggle.jsx'
import { useT } from '../../hooks/useT.js'

export default function ChatPanel({ conversation, isLoading, onSend, onFeedback, inputRef }) {
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
            disabled={isLoading}
            autoFocus
          />
        </div>
      </main>
    )
  }

  return (
    <main className="chat-panel">
      <StagingModeToggle />
      <div className="chat-header">{conversation.title}</div>

      <div className="message-list">
        <div className="message-list__inner">
          {conversation.messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              text={message.text}
              feedback={message.feedback}
              isError={message.isError}
              onFeedbackChange={(feedback) => onFeedback(message.id, feedback)}
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

      <MessageInput ref={inputRef} onSend={onSend} disabled={isLoading} />
      <p className="chat-disclaimer">{t('chat.disclaimer')}</p>
    </main>
  )
}
