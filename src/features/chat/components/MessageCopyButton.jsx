import { Check, Copy } from 'lucide-react'
import { useT } from '@shared/i18n/useT.js'
import { useCopyToClipboard } from '@shared/hooks/useCopyToClipboard.js'

export default function MessageCopyButton({ text }) {
  const t = useT()
  const [copied, copy] = useCopyToClipboard()

  return (
    <button
      type="button"
      className="icon-button message-feedback__button"
      aria-label={t(copied ? 'feedback.copied' : 'feedback.copy')}
      onClick={() => copy(text)}
    >
      {copied ? <Check /> : <Copy />}
    </button>
  )
}
