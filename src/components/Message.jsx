import MessageFeedback from './MessageFeedback.jsx'

export default function Message({ role, text, feedback, onFeedbackChange }) {
  const isAssistant = role === 'assistant'

  return (
    <div className={'message' + (isAssistant ? ' message--assistant' : ' message--user')}>
      <div className="message__group">
        <div className="message__bubble">{text}</div>
        {isAssistant && <MessageFeedback feedback={feedback} onChange={onFeedbackChange} />}
      </div>
    </div>
  )
}
