import { RotateCcw } from 'lucide-react'
import { useT } from '../../hooks/useT.js'
import MessageCopyButton from './MessageCopyButton.jsx'
import MessageFeedback from './MessageFeedback.jsx'

export default function Message({ role, text, feedback, isError, onFeedbackChange, showRetry, onRetry }) {
  const t = useT()
  const isAssistant = role === 'assistant'

  return (
    <div className={'message' + (isAssistant ? ' message--assistant' : ' message--user')}>
      <div className="message__group">
        <div className={'message__bubble' + (isError ? ' message__bubble--error' : '')}>
          {text}
        </div>
        {isAssistant && !isError ? (
          <MessageFeedback text={text} feedback={feedback} onChange={onFeedbackChange} />
        ) : !isAssistant ? (
          <div className="message-actions">
            {showRetry && (
              <button
                type="button"
                className="icon-button message-feedback__button"
                aria-label={t('chat.retry')}
                onClick={onRetry}
              >
                <RotateCcw />
              </button>
            )}
            <MessageCopyButton text={text} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
