import { useEffect, useState } from 'react'

const STORAGE_KEY = 'freshbrain-tone'

function getPreferredTone() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'cool' || stored === 'warm') return stored
  return 'cool'
}

export function useTone() {
  const [tone, setTone] = useState(getPreferredTone)

  useEffect(() => {
    document.documentElement.dataset.tone = tone
    localStorage.setItem(STORAGE_KEY, tone)
  }, [tone])

  return [tone, setTone]
}
