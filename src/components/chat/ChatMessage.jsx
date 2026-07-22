import MessageFeedback from './MessageFeedback.jsx'

export default function Message({ role, text, feedback, isError, onFeedbackChange }) {
  const isAssistant = role === 'assistant'

  return (
    <div className={'message' + (isAssistant ? ' message--assistant' : ' message--user')}>
      <div className="message__group">
        <div className={'message__bubble' + (isError ? ' message__bubble--error' : '')}>
          {text}
        </div>
        {isAssistant && !isError && (
          <MessageFeedback feedback={feedback} onChange={onFeedbackChange} />
        )}
      </div>
    </div>
  )
}
