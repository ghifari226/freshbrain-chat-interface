export function mergeById(collections) {
  const merged = new Map()
  for (const item of collections.flat()) merged.set(item.id, item)
  return Array.from(merged.values())
}

export function replaceById(collection, replacement) {
  return collection.map((item) => (item.id === replacement.id ? replacement : item))
}

export function updateById(collection, id, update) {
  return collection.map((item) => (item.id === id ? update(item) : item))
}
