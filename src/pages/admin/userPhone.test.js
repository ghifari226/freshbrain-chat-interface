import { describe, expect, it } from 'vitest'
import {
  digitsOnly,
  formatLocalPhoneDigits,
  formatPhoneForDisplay,
  localPhoneDigitsFromStored,
  phoneMatches,
  significantPhoneDigits,
} from './userPhone.js'

describe('user phone formatting', () => {
  it('normalizes local input without changing its grouping rules', () => {
    expect(formatLocalPhoneDigits('0812 3456-78901')).toBe('081-2345-67890')
    expect(significantPhoneDigits('081-2345-67890')).toBe('81234567890')
  })

  it('converts stored Indonesian numbers for editing and display', () => {
    expect(localPhoneDigitsFromStored('6281110000001')).toBe('811-1000-0001')
    expect(formatPhoneForDisplay('6281110000001')).toBe('+62 811-1000-0001')
  })

  it('matches both stored and familiar local prefixes', () => {
    const stored = digitsOnly('6281110000001')
    expect(phoneMatches(stored, '0811')).toBe(true)
    expect(phoneMatches(stored, '0001')).toBe(true)
    expect(phoneMatches(stored, '9999')).toBe(false)
  })
})
