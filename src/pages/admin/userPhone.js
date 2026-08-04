export const MIN_PHONE_DIGITS = 9

export function digitsOnly(value) {
  return value.replace(/\D/g, '')
}
export function formatLocalPhoneDigits(value) {
  const digits = digitsOnly(value).slice(0, 12)
  return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 12)].filter(Boolean).join('-')
}
export function localPhoneDigitsFromStored(phone) {
  const digits = digitsOnly(phone)
  const local = digits.startsWith('62') ? digits.slice(2) : digits
  return formatLocalPhoneDigits(local)
}

export function formatPhoneForDisplay(phone) {
  if (!phone) return ''
  return `+62 ${localPhoneDigitsFromStored(phone)}`
}
export function significantPhoneDigits(localPart) {
  const digits = digitsOnly(localPart)
  return digits.startsWith('0') ? digits.slice(1) : digits
}
export function phoneMatches(phoneDigits, queryDigits) {
  if (phoneDigits.includes(queryDigits)) return true
  if (queryDigits.startsWith('0')) return phoneDigits.includes(`62${queryDigits.slice(1)}`)
  return false
}
