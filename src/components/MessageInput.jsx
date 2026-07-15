import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useT } from '../hooks/useT.js'

const MAX_LINES = 10
const LINE_HEIGHT = 24

const MessageInput = forwardRef(function MessageInput(
  { onSend, disabled, autoFocus },
  ref,
) {
  const t = useT()
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }))

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const maxHeight = LINE_HEIGHT * MAX_LINES
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }, [value])

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  return (
    <div className="message-input-bar">
      <form className="message-input" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.askPlaceholder')}
          disabled={disabled}
        />
        <button
          type="submit"
          className="message-input__send"
          aria-label={t('chat.sendMessage')}
          disabled={disabled || !value.trim()}
        >
          <i className="fa-solid fa-arrow-up" />
        </button>
      </form>
    </div>
  )
})

export default MessageInput
