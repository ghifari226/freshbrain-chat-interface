import { useState } from 'react'

export function useCopyToClipboard(resetDelayMs = 2000) {
  const [copied, setCopied] = useState(false)

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (resetDelayMs) window.setTimeout(() => setCopied(false), resetDelayMs)
      return true
    } catch {
      return false
    }
  }

  return [copied, copy]
}
