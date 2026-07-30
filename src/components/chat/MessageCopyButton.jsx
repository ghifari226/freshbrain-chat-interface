import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useT } from '../../hooks/useT.js'

export default function MessageCopyButton({ text }) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard can fail in insecure contexts — leave the button idle.
    }
  }

  return (
    <button
      type="button"
      className="icon-button message-feedback__button"
      aria-label={t(copied ? 'feedback.copied' : 'feedback.copy')}
      onClick={handleCopy}
    >
      {copied ? <Check /> : <Copy />}
    </button>
  )
}
