import { useEffect, useRef, useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useT } from '../../hooks/useT.js'

const REASONS = [
  'reasonWrongData',
  'reasonIncomplete',
  'reasonMisunderstood',
  'reasonOther',
]

export default function MessageFeedback({ feedback, onChange }) {
  const t = useT()
  const [isReasonOpen, setIsReasonOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState(null)
  const [comment, setComment] = useState('')
  const reasonRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (isReasonOpen) reasonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [isReasonOpen])

  useEffect(() => {
    if (!isReasonOpen) return
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        onChange(null)
        setIsReasonOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isReasonOpen, onChange])

  function handleThumbsUp() {
    setIsReasonOpen(false)
    onChange(feedback?.rating === 'up' ? null : { rating: 'up', reason: null, comment: null })
  }

  function handleThumbsDown() {
    if (feedback?.rating === 'down') {
      onChange(null)
      setIsReasonOpen(false)
      return
    }
    setSelectedReason(null)
    setComment('')
    onChange({ rating: 'down', reason: null, comment: null })
    setIsReasonOpen(true)
  }

  function handleSubmitReason() {
    onChange({ rating: 'down', reason: selectedReason, comment: comment.trim() || null })
    setIsReasonOpen(false)
  }

  const isActive = Boolean(feedback?.rating) || isReasonOpen

  return (
    <div className="message-feedback" ref={wrapRef}>
      <div className={'message-feedback__actions' + (isActive ? ' message-feedback__actions--open' : '')}>
        <button
          type="button"
          className={
            'icon-button message-feedback__button' +
            (feedback?.rating === 'up' ? ' message-feedback__button--up' : '')
          }
          aria-label={t('feedback.thumbsUp')}
          aria-pressed={feedback?.rating === 'up'}
          onClick={handleThumbsUp}
        >
          <ThumbsUp fill={feedback?.rating === 'up' ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          className={
            'icon-button message-feedback__button' +
            (feedback?.rating === 'down' ? ' message-feedback__button--down' : '')
          }
          aria-label={t('feedback.thumbsDown')}
          aria-pressed={feedback?.rating === 'down'}
          onClick={handleThumbsDown}
        >
          <ThumbsDown fill={feedback?.rating === 'down' ? 'currentColor' : 'none'} />
        </button>
      </div>

      {isReasonOpen && (
        <div className="message-feedback__reason" ref={reasonRef}>
          <div className="message-feedback__reason-heading">{t('feedback.reasonPrompt')}</div>

          <div className="message-feedback__chips">
            {REASONS.map((reasonKey) => (
              <button
                key={reasonKey}
                type="button"
                className={
                  'message-feedback__chip' +
                  (selectedReason === reasonKey ? ' message-feedback__chip--selected' : '')
                }
                onClick={() => setSelectedReason(reasonKey)}
              >
                {t('feedback.' + reasonKey)}
              </button>
            ))}
          </div>

          <textarea
            className="message-feedback__comment"
            placeholder={t('feedback.commentPlaceholder')}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={2}
          />

          <div className="message-feedback__reason-actions">
            <button
              type="button"
              className="message-feedback__cancel"
              onClick={() => {
                onChange(null)
                setIsReasonOpen(false)
              }}
            >
              {t('feedback.cancel')}
            </button>
            <button
              type="button"
              className="message-feedback__submit"
              disabled={!selectedReason}
              onClick={handleSubmitReason}
            >
              {t('feedback.submit')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
