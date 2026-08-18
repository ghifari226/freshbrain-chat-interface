import { describe, expect, it } from 'vitest'
import { mergeById, replaceById, updateById } from './collections.js'

describe('collection helpers', () => {
  it('merges by id and lets later collections provide the current representation', () => {
    expect(mergeById([[{ id: 'a', value: 1 }], [{ id: 'a', value: 2 }, { id: 'b' }]])).toEqual([
      { id: 'a', value: 2 },
      { id: 'b' },
    ])
  })

  it('replaces one item without changing collection order', () => {
    const original = [{ id: 'a' }, { id: 'b', value: 1 }]
    expect(replaceById(original, { id: 'b', value: 2 })).toEqual([
      { id: 'a' },
      { id: 'b', value: 2 },
    ])
  })

  it('updates only the matching item', () => {
    const original = [{ id: 'a', value: 1 }, { id: 'b', value: 1 }]
    expect(updateById(original, 'b', (item) => ({ ...item, value: 2 }))).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ])
  })
})
