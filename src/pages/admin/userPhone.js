export const MIN_PHONE_DIGITS = 9

export function digitsOnly(value) {
  return value.replace(/\D/g, '')
}

// Storage/wire format is pure digits, no +, space, or dash — "6281110000001"
// — matching how phone numbers actually live on the backend; auth-contract.md
// just says `"phone": "string"` and doesn't mandate a display format, so the
// dashed "+62 811-1000-0001" look is purely a presentation concern, applied
// only in this form's input (formatLocalPhoneDigits, the local part after the
// fixed +62 prefix) and the table column (formatPhoneForDisplay) below.
// 3-4-5 grouping, capped at 12 digits — Indonesian mobile numbers run up to
// 13 digits including the leading trunk 0 (e.g. 0812-3456-78901), and +62
// already stands in for that leading 0, so the local part alone maxes out
// at 12.
export function formatLocalPhoneDigits(value) {
  const digits = digitsOnly(value).slice(0, 12)
  return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 12)].filter(Boolean).join('-')
}

// Reverses formatLocalPhoneDigits — strips the leading 62 country code (if
// present) off a raw stored digit string, back into the dashed local part
// the form's input displays and edits.
export function localPhoneDigitsFromStored(phone) {
  const digits = digitsOnly(phone)
  const local = digits.startsWith('62') ? digits.slice(2) : digits
  return formatLocalPhoneDigits(local)
}

export function formatPhoneForDisplay(phone) {
  if (!phone) return ''
  return `+62 ${localPhoneDigitsFromStored(phone)}`
}

// A single leading 0 is the familiar local-format habit (0812-3456-7890) —
// accepted on input, but stripped before it's combined with +62 on submit,
// since +62 already stands in for that trunk 0 (otherwise it'd end up
// double-counted, e.g. 620812... instead of 62812...). Anything else is
// submitted as-is, as long as it clears the minimum length.
export function significantPhoneDigits(localPart) {
  const digits = digitsOnly(localPart)
  return digits.startsWith('0') ? digits.slice(1) : digits
}

// A query starting with "0" is ambiguous: it might be a local-format trunk
// prefix ("0811..." for stored "6281110000001") or just a substring that
// happens to start with 0 (e.g. the last-4-digits "0006"). Rather than
// guessing, try both readings and match if either is found in the phone's
// digits — phone numbers themselves are stored as pure digits starting with
// "62", never with a literal leading 0, so only the query needs the
// alternate form.
export function phoneMatches(phoneDigits, queryDigits) {
  if (phoneDigits.includes(queryDigits)) return true
  if (queryDigits.startsWith('0')) return phoneDigits.includes(`62${queryDigits.slice(1)}`)
  return false
}
