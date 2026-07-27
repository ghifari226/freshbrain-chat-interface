// Stands in for network latency across every mocked service call
// (authService, freshpedia, toolCatalog, roleScopes, apiClient). Abort-aware
// so it behaves like a real in-flight request under USE_MOCK_API: callers
// pass the same AbortController signal they'd hand a real Axios call, and an
// abort (component unmount, a page's effect re-running with a new
// conversation/filter) rejects immediately instead of resolving the mock
// data into a component that's no longer listening.
/**
 * @param {number} [minMs]
 * @param {number} [maxMs]
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
export function mockDelay(minMs = 500, maxMs = 900, signal) {
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
