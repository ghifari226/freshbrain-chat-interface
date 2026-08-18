export function mockDelay(minMs = 500, maxMs = 900, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('The request was aborted', 'AbortError'))
  }

  const duration = minMs + Math.random() * (maxMs - minMs)
  return new Promise((resolve, reject) => {
    function handleAbort() {
      clearTimeout(timeoutId)
      reject(new DOMException('The request was aborted', 'AbortError'))
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, duration)

    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}
