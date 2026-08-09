import { describe, expect, it } from 'vitest'
import { parseSseFrame } from './apiClient.ts'

describe('parseSseFrame', () => {
  it('parses a status frame', () => {
    expect(parseSseFrame('event: status\ndata: {"status": "understanding"}')).toEqual({
      event: 'status',
      data: { status: 'understanding' },
    })
  })

  it('parses a done frame with a full response payload', () => {
    const payload = { answer: 'Hi', conversation_id: 'c1', message_id: 'm1', title: null }
    expect(parseSseFrame(`event: done\ndata: ${JSON.stringify(payload)}`)).toEqual({
      event: 'done',
      data: payload,
    })
  })

  it('returns null for a frame missing an event line', () => {
    expect(parseSseFrame('data: {"status": "understanding"}')).toBeNull()
  })

  it('returns null for a frame missing a data line', () => {
    expect(parseSseFrame('event: status')).toBeNull()
  })

  it('returns null for an empty frame', () => {
    expect(parseSseFrame('')).toBeNull()
  })
})
