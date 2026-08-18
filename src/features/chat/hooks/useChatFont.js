import { useEffect, useState } from 'react'

const STORAGE_KEY = 'freshbrain-chat-font'

function getPreferredFont() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'sans' || stored === 'serif') return stored
  return 'sans'
}

export function useChatFont() {
  const [font, setFont] = useState(getPreferredFont)

  useEffect(() => {
    document.documentElement.dataset.font = font
    localStorage.setItem(STORAGE_KEY, font)
  }, [font])

  return [font, setFont]
}
