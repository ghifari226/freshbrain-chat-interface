import MessageCopyButton from './MessageCopyButton.jsx'
import MessageFeedback from './MessageFeedback.jsx'

export default function Message({ role, text, feedback, isError, onFeedbackChange }) {
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
            <MessageCopyButton text={text} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
